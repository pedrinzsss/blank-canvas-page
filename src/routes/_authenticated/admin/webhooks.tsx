import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { WebhooksPanel } from "@/components/webhooks-panel";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({
  component: () => (
    <AdminShell title="Webhooks" subtitle="Configurações">
      <WebhooksPanel />
    </AdminShell>
  ),
});
