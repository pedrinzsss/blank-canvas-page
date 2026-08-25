import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // Check for collaborator access in localStorage
    if (typeof window !== "undefined" && localStorage.getItem("admin_access") === "true") {
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/" });
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
      
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
