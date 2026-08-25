import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/indicacoes")({
  component: () => (
    <AdminPlaceholder
      title="Indicações"
      subtitle="Gestão"
      description="Gerencie o programa de indicações, comissões e parceiros."
    />
  ),
});
