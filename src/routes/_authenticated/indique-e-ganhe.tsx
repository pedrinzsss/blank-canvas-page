import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, Clock, Users, UserX, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/indique-e-ganhe")({
  component: IndiqueEGanhePage,
});

function IndiqueEGanhePage() {
  return (
    <AppShell title="Indique e ganhe" subtitle="Compartilhe seu link e receba comissões">
      <IndiqueContent />
    </AppShell>
  );
}

type Stats = {
  liberated_cents: number;
  pending_cents: number;
  liberated_count: number;
  pending_count: number;
  active_count: number;
  inactive_count: number;
};

const emptyStats: Stats = {
  liberated_cents: 0,
  pending_cents: 0,
  liberated_count: 0,
  pending_count: 0,
  active_count: 0,
  inactive_count: 0,
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function IndiqueContent() {
  const [pixelId, setPixelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.facebook_pixel_id === "string") setPixelId(meta.facebook_pixel_id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && profile?.referral_code) setReferralCode(profile.referral_code);

      const { data: statsRow, error: statsError } = await supabase
        .rpc("get_referral_stats", { _user_id: user.id })
        .maybeSingle();
      if (!cancelled) {
        if (!statsError && statsRow) {
          setStats({
            liberated_cents: Number(statsRow.liberated_cents ?? 0),
            pending_cents: Number(statsRow.pending_cents ?? 0),
            liberated_count: Number(statsRow.liberated_count ?? 0),
            pending_count: Number(statsRow.pending_count ?? 0),
            active_count: Number(statsRow.active_count ?? 0),
            inactive_count: Number(statsRow.inactive_count ?? 0),
          });
        }
        setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const referralLink = referralCode
    ? `https://paglinkapp.com.br/auth/register?code=${referralCode}`
    : "Gerando seu link...";

  const statCards = [
    {
      label: "Comissões liberadas",
      value: formatBRL(stats.liberated_cents),
      extra: String(stats.liberated_count),
      tone: "var(--primary)",
      icon: DollarSign,
    },
    {
      label: "Comissões pendentes",
      value: formatBRL(stats.pending_cents),
      extra: String(stats.pending_count),
      tone: "#eab308",
      icon: Clock,
    },
    {
      label: "Indicações ativas",
      value: String(stats.active_count),
      extra: String(stats.active_count),
      tone: "var(--primary)",
      icon: Users,
    },
    {
      label: "Indicações inativas",
      value: String(stats.inactive_count),
      extra: String(stats.inactive_count),
      tone: "#f97316",
      icon: UserX,
    },
  ];

  const copyLink = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const savePixel = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.auth.updateUser({
        data: { facebook_pixel_id: pixelId },
      });
      if (error) throw error;
      toast.success("Alterações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Programa de indicações</h2>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <span
                  className="grid h-9 w-9 place-items-center rounded-lg"
                  style={{ background: `${s.tone}22`, color: s.tone }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs text-muted-foreground">
                  {loadingStats ? "—" : s.extra}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">
                {loadingStats ? "—" : s.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Link de divulgação</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Ganhe 1% da comissão das pessoas que você indicar, durante 12 meses.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Input readOnly value={referralLink} className="bg-secondary/50" />
          <Button
            variant="secondary"
            size="icon"
            onClick={copyLink}
            aria-label="Copiar link"
            disabled={!referralCode}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Pixel do Facebook</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Adicione o ID do seu Pixel Facebook para rastrear conversões. Nós disparamos o evento{" "}
          <span className="font-semibold text-foreground">CompleteRegistration</span>.
        </p>
        <div className="mt-4">
          <Input
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder=""
            className="bg-secondary/50"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={savePixel}
            disabled={saving}
            className="bg-primary text-white hover:bg-primary"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </section>
    </div>
  );
}
