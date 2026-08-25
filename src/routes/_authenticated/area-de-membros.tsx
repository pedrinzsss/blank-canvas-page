import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/area-de-membros")({
  head: () => ({
    meta: [
      { title: "Área De Membros" },
      { name: "description", content: "Gerencie a área de membros dos seus produtos." },
    ],
  }),
  component: AreaDeMembrosPage,
});

function AreaDeMembrosPage() {
  return (
    <AppShell title="Área De Membros" subtitle="Gerencie a área de membros">
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Área De Membros</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Em breve você poderá gerenciar a área de membros dos seus produtos por aqui.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
