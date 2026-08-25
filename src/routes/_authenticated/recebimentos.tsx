import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/recebimentos")({
  component: RecebimentosPage,
});

function RecebimentosPage() {
  return (
    <AppShell title="Recebimentos" subtitle="Gestão de entradas e recebimentos">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">Nenhum recebimento encontrado.</p>
      </div>
    </AppShell>
  );
}
