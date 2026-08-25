import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import logo from "@/assets/logo.png.asset.json";
import { useLogoUrl } from "@/lib/images-applier";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const dynamicLogo = useLogoUrl();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function validate() {
    const next: { password?: string; confirm?: string } = {};
    if (password.length < 8) next.password = "A senha deve ter no mínimo 8 caracteres.";
    else if (!/[A-Za-zÀ-ÿ]/.test(password) || !/[0-9]/.test(password))
      next.password = "A senha deve conter letras e números.";
    if (!confirm) next.confirm = "Confirme a nova senha.";
    else if (password !== confirm) next.confirm = "As senhas não coincidem.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso! Faça login novamente.");
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("expired") || msg.includes("invalid"))
        toast.error("Link de recuperação inválido ou expirado. Solicite um novo.");
      else if (msg.includes("should be different"))
        toast.error("A nova senha deve ser diferente da atual.");
      else toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-panel)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-40"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div className="relative mx-auto flex min-h-screen min-h-[100dvh] max-w-md flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center sm:mb-8">
          <img src={dynamicLogo ?? logo.url} alt="Paglink" className="h-9 w-auto max-w-[170px] object-contain sm:h-10" />
        </div>
        <div
          className="w-full rounded-lg border border-border bg-card p-5 sm:p-8"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina uma nova senha para sua conta.
          </p>


          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                aria-invalid={!!errors.password}
                className={`bg-background/50 border-border ${errors.password ? "border-red-500" : ""}`}
              />
              {errors.password ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errors.password}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Mínimo de 8 caracteres, com letras e números.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setErrors((p) => ({ ...p, confirm: undefined }));
                }}
                aria-invalid={!!errors.confirm}
                className={`bg-background/50 border-border ${errors.confirm ? "border-red-500" : ""}`}
              />
              {errors.confirm && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errors.confirm}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !ready}
              className="w-full font-semibold text-white hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
            </Button>
            {!ready && (
              <p className="text-center text-xs text-muted-foreground">
                Aguardando link de recuperação...
              </p>
            )}
          </form>
        </div>
      </div>
      <Toaster theme="dark" />
    </div>
  );
}
