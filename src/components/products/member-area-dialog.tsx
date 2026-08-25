import { useEffect, useRef, useState } from "react";
import { UploadCloud, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_SIZE = 30 * 1024 * 1024;
const ACCEPTED_IMAGES = ".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif";

const COMMENT_OPTIONS = [
  { value: "approve_auto", label: "Aprovar automaticamente" },
  { value: "moderate", label: "Moderar comentários" },
  { value: "disabled", label: "Desativar comentários" },
];

export function MemberAreaDialog({ productId, open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [commentsConfig, setCommentsConfig] = useState("approve_auto");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function load() {
    if (!productId) return;
    setLoading(true);
    const { data } = await supabase
      .from("member_areas" as any)
      .select("id, title, description, comments_config, cover_url")
      .eq("product_id", productId)
      .maybeSingle();
    setLoading(false);
    const row = data as any;
    if (row) {
      setExistingId(row.id);
      setTitle(row.title ?? "");
      setDescription(row.description ?? "");
      setCommentsConfig(row.comments_config ?? "approve_auto");
      setCoverUrl(row.cover_url ?? null);
    } else {
      setExistingId(null);
      setTitle("");
      setDescription("");
      setCommentsConfig("approve_auto");
      setCoverUrl(null);
    }
    setPendingFile(null);
  }

  useEffect(() => {
    if (open && productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function handleFile(f: File | null) {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) {
      toast.error("Apenas png, jpeg, jpg, webp e gif são aceitos");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Arquivo excede 30MB");
      return;
    }
    setPendingFile(f);
  }

  async function handleSave() {
    if (!productId) return;
    if (!title.trim()) {
      toast.error("Informe o título");
      return;
    }
    setSaving(true);
    let uploadedUrl: string | null = coverUrl;
    if (pendingFile) {
      const ext = pendingFile.name.split(".").pop() ?? "png";
      const path = `${productId}/member-area-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("products")
        .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });
      if (upErr) {
        setSaving(false);
        toast.error(`Erro ao enviar imagem: ${upErr.message}`);
        return;
      }
      const { data: signed } = await supabase.storage
        .from("products")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      uploadedUrl = signed?.signedUrl ?? path;
    }

    const payload: any = {
      product_id: productId,
      title: title.trim(),
      description: description || null,
      comments_config: commentsConfig,
      cover_url: uploadedUrl,
    };

    const { error } = existingId
      ? await supabase.from("member_areas" as any).update(payload).eq("id", existingId)
      : await supabase.from("member_areas" as any).insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Área de membros salva");
    onOpenChange(false);
  }

  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : coverUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 border-border bg-card p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-semibold">Criar área de membros</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <Input
              placeholder="Nome do produto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Textarea
              placeholder="Descrição da área de membros"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Configuração de Comentários
            </label>
            <Select value={commentsConfig} onValueChange={setCommentsConfig}>
              <SelectTrigger className="bg-background">
                <SelectValue />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {COMMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/40 px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-muted/30"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Capa" className="max-h-32 rounded-lg object-contain" />
            ) : (
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-sm font-semibold text-primary">
              Clique para enviar{" "}
              <span className="font-normal text-muted-foreground">ou arraste até aqui</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Apenas arquivos png, jpeg, jpg, webp e gif são aceitos
            </div>
            <div className="text-xs text-muted-foreground">O tamanho máximo é 30MB</div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGES}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <p className="text-center text-xs text-muted-foreground">
            A criação de módulos e aulas vai ser feita após você criar a área de membros.
          </p>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Salvando..." : "Criar Área de Membros"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
