import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type KycStatus = Database["public"]["Enums"]["kyc_status"] | "none";

export function useKycStatus() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    const [kycResult, profileResult] = await Promise.all([
      supabase
        .from("kyc_submissions")
        .select("status")
        .eq("user_id", userRes.user.id)
        .maybeSingle(),
      (supabase as any)
        .from("profiles")
        .select("is_demo")
        .eq("id", userRes.user.id)
        .maybeSingle(),
    ]);
    setStatus((kycResult.data?.status as KycStatus | undefined) ?? "none");
    setIsDemo(profileResult.data?.is_demo === true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    status,
    isDemo,
    loading,
    refetch: load,
    isApproved: status === "approved" || isDemo,
  };
}
