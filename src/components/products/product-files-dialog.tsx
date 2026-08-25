import { useEffect, useRef, useState } from "react";
import { UploadCloud, Trash2, FileText, X } from "lucide-react";
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

interface FilesDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileRow {
  id: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  description: string | null;
  video_source: string | null;
  video_url: string | null;
}

const MAX_SIZE = 30 * 1024 * 1024; // 30MB
const ACCEPTED = ".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed";
const VIDEO_SOURCES = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "panda", label: "Panda Video" },
  { value: "outro", label: "Outro" },
];

export function ProductFilesDialog({ productId, open, onOpenChange }: FilesDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [videoSource, setVideoSource] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function load() {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_files" as any)
      .select("id, file_url, file_name, file_size, description, video_source, video_url")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar arquivos");
      return;
    }
    const list = (data ?? []) as unknown as FileRow[];
    setRows(list);
    const latest = list[0];
    setDescription(latest?.description ?? "");
    setVideoSource(latest?.video_source ?? "");
    setVideoUrl(latest?.video_url ?? "");
  }

  useEffect(() => {
    if (open && productId) {
      setPendingFile(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function handleFileSelected(f: File | null) {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!(name.endsWith(".pdf") || name.endsWith(".zip"))) {
      toast.error("Apenas arquivos PDF e ZIP são aceitos");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Arquivo excede 30MB");
      return;
    }
    setPendingFile(f);
  }

  async function handleRemove(row: FileRow) {
    if (!confirm("Remover este arquivo?")) return;
    if (row.file_url) {
      const marker = "/products/";
      const idx = row.file_url.indexOf(marker);
      if (idx >= 0) {
        const path = row.file_url.slice(idx + marker.length);
        await supabase.storage.from("products").remove([path]);
      }
    }
    const { error } = await supabase.from("product_files" as any).delete().eq("id", row.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Arquivo removido");
    load();
  }

  async function handleSave() {
    if (!productId) return;
    setSaving(true);
    let uploadedUrl: string | null = null;
    let uploadedName: string | null = null;
    let uploadedSize: number | null = null;

    if (pendingFile) {
      setUploading(true);
      const ext = pendingFile.name.split(".").pop() ?? "bin";
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("products")
        .upload(path, pendingFile, { upsert: false, contentType: pendingFile.type });
      setUploading(false);
      if (upErr) {
        setSaving(false);
        toast.error(`Erro ao enviar arquivo: ${upErr.message}`);
        return;
      }
      const { data: signed } = await supabase.storage.from("products").createSignedUrl(path, 60 * 60 * 24 * 365);
      uploadedUrl = signed?.signedUrl ?? path;
      uploadedName = pendingFile.name;
      uploadedSize = pendingFile.size;
    }

    const payload: any = {
      product_id: productId,
      description: description || null,
      video_source: videoSource || null,
      video_url: videoUrl || null,
    };
    if (uploadedUrl) {
      payload.file_url = uploadedUrl;
      payload.file_name = uploadedName;
      payload.file_size = uploadedSize;
    }

    const { error } = await supabase.from("product_files" as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alterações salvas");
    setPendingFile(null);
    load();
  }

  function humanSize(bytes: number | null) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 border-border bg-card p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="text-lg font-semibold">Conteúdo do produto</h3>
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
          <p className="text-xs text-muted-foreground">
            Se seu arquivo for muito grande, recomendamos que comprima usando as seguintes plataformas:
            {" "}
            <a href="https://www.ilovepdf.com/pt/comprimir_pdf" target="_blank" rel="noreferrer" className="text-primary underline">Compressor de PDF</a>,{" "}
            <a href="https://www.iloveimg.com/pt/comprimir-imagem" target="_blank" rel="noreferrer" className="text-primary underline">Compressor de Imagem</a>,{" "}
            <a href="https://www.ezyzip.com/pt/" target="_blank" rel="noreferrer" className="text-primary underline">Compressor de Arquivos</a>.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-muted/30"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-semibold">
              {pendingFile ? pendingFile.name : "Clique para enviar"}{" "}
              {!pendingFile && <span className="font-normal text-muted-foreground">ou arraste até aqui</span>}
            </div>
            <div className="text-xs text-primary">Apenas arquivos pdf e zip são aceitos</div>
            <div className="text-xs text-muted-foreground">O tamanho máximo é 30MB</div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
          />

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Arquivos enviados
              </div>
              {rows.map((r) =>
                r.file_url ? (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
                  >
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2 hover:underline"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{r.file_name ?? "arquivo"}</span>
                      {r.file_size ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {humanSize(r.file_size)}
                        </span>
                      ) : null}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemove(r)}
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div>
            <Textarea
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-background"
            />
          </div>

          <div>
            <Select value={videoSource} onValueChange={setVideoSource}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Origem do vídeo" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              placeholder="URL do vídeo"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="bg-background"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || uploading || loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {uploading ? "Enviando arquivo..." : saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
