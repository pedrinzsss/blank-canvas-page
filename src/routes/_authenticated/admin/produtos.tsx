import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: () => (
    <AdminPlaceholder
      title="Produtos"
      subtitle="Gestão"
      description="Aprove produtos, categorias e políticas de venda da plataforma."
    />
  ),
});
