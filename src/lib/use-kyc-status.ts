import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type KycStatus = Database["public"]["Enums"]["kyc_status"] | "none";

export function useKycStatus() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("kyc_submissions")
      .select("status")
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    setStatus((data?.status as KycStatus | undefined) ?? "none");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, loading, refetch: load, isApproved: status === "approved" };
}
