import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/indique-e-ganhe")({
  component: () => (
    <AdminPlaceholder
      title="Indique e Ganhe"
      subtitle="Configurações"
      description="Configure o programa de indicação e recompensas para os seus usuários."
    />
  ),
});
