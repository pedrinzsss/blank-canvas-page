import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/register")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  component: RegisterRedirect,
});

function RegisterRedirect() {
  const { code } = Route.useSearch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (code) {
      try {
        sessionStorage.setItem("referral_code", code.toUpperCase());
      } catch {
        // ignore
      }
    }
    setReady(true);
  }, [code]);

  if (!ready) return null;
  return <Navigate to="/" search={{ mode: "signup" }} replace />;
}
