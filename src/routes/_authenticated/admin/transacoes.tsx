import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/transacoes")({
  component: () => (
    <AdminPlaceholder
      title="Transações"
      subtitle="Financeiro"
      description="Acompanhe todas as transações financeiras da plataforma."
    />
  ),
});
