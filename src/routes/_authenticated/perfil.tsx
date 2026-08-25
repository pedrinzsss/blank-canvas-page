import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <AppShell title="Perfil" subtitle="Minha conta">
      <div className="p-6">
        <PerfilTab />
      </div>
    </AppShell>
  );
}

function PerfilTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setAccountId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, display_name, phone, email, avatar_url")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p) {
        setFullName(p.full_name ?? "");
        setDisplayName(p.display_name ?? "");
        setPhone(p.phone ?? "");
        if (p.email) setEmail(p.email);
        setAvatarUrl(p.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!fullName.trim()) return toast.error("Informe seu nome");
    if (!phone.trim()) return toast.error("Informe seu telefone");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        display_name: displayName.trim() || null,
        phone: phone.trim(),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  async function handleFile(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return toast.error("Formato inválido. Use png, jpg ou webp.");
    }
    if (file.size > 30 * 1024 * 1024) {
      return toast.error("Tamanho máximo é 30MB");
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("platform-assets")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    const { data } = await supabase.storage.from("platform-assets").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl ?? path);
    setUploading(false);
    toast.success("Foto atualizada");
  }

  function copyAccount() {
    navigator.clipboard.writeText(accountId);
    toast.success("ID copiado");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h2 className="text-lg font-semibold">Detalhes da conta</h2>
      <button
        onClick={copyAccount}
        className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-3 w-3" />
        ID da conta: {accountId}
      </button>

      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        Ao alterar os detalhes, sua conta passará por uma nova avaliação pelo setor de Compliance.
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* Form */}
        <div className="space-y-4">
          <FloatField label="Nome" required value={fullName} onChange={setFullName} />
          <FloatField label="Nome de exibição" value={displayName} onChange={setDisplayName} />
          <FloatField label="Email" value={email} onChange={setEmail} disabled />
          <FloatField label="Telefone" required value={phone} onChange={setPhone} />
        </div>

        {/* Avatar */}
        <div>
          <p className="mb-3 text-sm font-semibold">Foto de perfil</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid w-full place-items-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/40 p-8 transition-colors hover:border-primary/50"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
            )}
            <p className="text-center text-sm">
              <span className="font-semibold text-foreground">Clique para enviar</span>{" "}
              <span className="text-muted-foreground">ou arraste até aqui</span>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Apenas arquivos png, jpeg, jpg e webp são aceitos
              <br />
              O tamanho máximo é 30MB
            </p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}

function FloatField({
  label,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Label className="pointer-events-none absolute left-3 top-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-14 bg-background pt-5 text-base"
      />
    </div>
  );
}
