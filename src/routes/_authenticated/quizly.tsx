import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Funnel = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/quizly")({
  head: () => ({
    meta: [
      { title: "Quizly" },
      { name: "description", content: "Crie quizzes interativos para engajar seus clientes." },
    ],
  }),
  component: QuizlyPage,
});

function QuizlyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: funnels = [], isLoading } = useQuery({
    queryKey: ["funnels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Funnel[];
    },
  });

  const createFunnel = useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("funnels")
        .insert({ title: name, user_id: userData.user.id })
        .select("id, title")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      setOpen(false);
      setTitulo("");
      navigate({ to: "/funil", search: { titulo: data.title, id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar funil"),
  });

  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funil apagado");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao apagar funil"),
  });

  function handleStart() {
    const nome = titulo.trim() || "Funil sem título";
    createFunnel.mutate(nome);
  }

  return (
    <AppShell title="Quizly">
      <div className="p-6 space-y-6">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Crie Seu Funil Interativo</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Crie agora seu Quiz Interativo e aumente até 30% sua conversão.
              </p>
              <Button className="mt-6" size="lg" onClick={() => setOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Criar Funil
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Meus Funis
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : funnels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum funil criado ainda. Clique em “Criar Funil” para começar.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {funnels.map((f) => (
                <div
                  key={f.id}
                  className="group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                      Ativo
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() =>
                        navigate({ to: "/funil", search: { titulo: f.title, id: f.id } })
                      }
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Personalizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(f.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informe o título do Funil</DialogTitle>
            <DialogDescription>
              Dê um nome para identificar seu funil interativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="funil-titulo">Título do Funil</Label>
            <Input
              id="funil-titulo"
              placeholder="Ex.: Quiz de qualificação de leads"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStart} disabled={createFunnel.isPending}>
              {createFunnel.isPending ? "Criando..." : "Começar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar funil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O funil será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteFunnel.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
