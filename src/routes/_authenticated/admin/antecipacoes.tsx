import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/antecipacoes")({
  component: () => (
    <AdminPlaceholder
      title="Antecipações"
      subtitle="Financeiro"
      description="Gerencie solicitações de antecipação de recebíveis e condições aplicadas."
    />
  ),
});
