import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("account_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.account_status === "blocked") {
      await supabase.auth.signOut();
      throw redirect({ to: "/" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
