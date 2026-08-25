import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/saldo")({
  component: () => (
    <AdminPlaceholder
      title="Saldo"
      subtitle="Financeiro"
      description="Acompanhe o saldo disponível, a receber e bloqueado de cada usuário."
    />
  ),
});
