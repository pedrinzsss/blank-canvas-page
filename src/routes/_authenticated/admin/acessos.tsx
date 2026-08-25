import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  component: () => (
    <AdminPlaceholder
      title="Acessos"
      subtitle="Gestão"
      description="Gerencie contas administrativas, papéis e permissões."
    />
  ),
});
