import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type KycStatus = Database["public"]["Enums"]["kyc_status"] | "none";

export function useKycStatus() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [accountKind, setAccountKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setStatus(null);
      setIsDemo(false);
      setAccountKind(null);
      setLoading(false);
      return;
    }
    const isDedicatedDemoAccount =
      userRes.user.email?.toLowerCase() === "teste.zunvipay.20260825@gmail.com";
    const [kycResult, profileResult] = await Promise.all([
      supabase
        .from("kyc_submissions")
        .select("status")
        .eq("user_id", userRes.user.id)
        .maybeSingle(),
      (supabase as any)
        .from("profiles")
        .select("is_demo, account_kind")
        .eq("id", userRes.user.id)
        .maybeSingle(),
    ]);
    setStatus((kycResult.data?.status as KycStatus | undefined) ?? "none");
    // The exact homologation account remains usable while a newly imported
    // Lovable project is still applying the database migration.
    setIsDemo(isDedicatedDemoAccount || profileResult.data?.is_demo === true);
    setAccountKind(profileResult.data?.account_kind ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    status,
    isDemo,
    accountKind,
    loading,
    refetch: load,
    isApproved: status === "approved" || isDemo,
  };
}
