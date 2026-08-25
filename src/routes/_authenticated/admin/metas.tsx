import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/metas")({
  component: MetasPage,
});

type Meta = {
  id: string;
  nome: string;
  meta: string;
  descricao: string;
  iconUrl: string | null;
};

function MetasPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [metas, setMetas] = useState<Meta[]>([]);

  const filtered = metas.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Financeiro" subtitle="Gestão financeira">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Metas de progresso</h2>
            <p className="text-sm text-muted-foreground">
              Defina aqui os níveis de progresso para os produtores
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary"
          >
            Criar
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
          className="w-full max-w-md rounded-lg border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                {m.iconUrl ? (
                  <img src={m.iconUrl} alt={m.nome} className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-xs text-muted-foreground">
                    {m.nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">Meta: {m.meta}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <CriarMetaModal
          onClose={() => setOpen(false)}
          onCreate={(m) => {
            setMetas((prev) => [...prev, m]);
            setOpen(false);
            toast.success("Meta criada com sucesso");
          }}
        />
      )}
    </AdminShell>
  );
}

function CriarMetaModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (m: Meta) => void;
}) {
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState("");
  const [descricao, setDescricao] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconName, setIconName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  const MAX = 30 * 1024 * 1024;

  function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato de arquivo não suportado");
      return;
    }
    if (file.size > MAX) {
      toast.error("Arquivo maior que 30MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIconUrl(reader.result as string);
      setIconName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!nome.trim()) return toast.error("Informe o nome da meta");
    if (!meta.trim()) return toast.error("Informe a meta");
    onCreate({
      id: crypto.randomUUID(),
      nome: nome.trim(),
      meta: meta.trim(),
      descricao: descricao.trim(),
      iconUrl,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <h3 className="text-lg font-semibold">Criar meta</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nome da meta" required>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          <Field label="Meta" required>
            <input
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">Ícone</p>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-primary bg-primary/5" : "border-border bg-background/40"
              }`}
            >
              {iconUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={iconUrl} alt="Ícone" className="h-16 w-16 rounded-md object-cover" />
                  <p className="text-xs text-muted-foreground">{iconName}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIconUrl(null);
                      setIconName(null);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">Clique para enviar</span>{" "}
                    <span className="text-muted-foreground">ou arraste até aqui</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Apenas arquivos jpeg, gif, jpg, png, webp e svg são aceitos
                  </p>
                  <p className="text-xs text-muted-foreground">O tamanho máximo é 30MB</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm font-medium text-red-500 hover:underline"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
