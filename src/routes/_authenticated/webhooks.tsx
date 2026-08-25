import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { WebhooksPanel } from "@/components/webhooks-panel";

export const Route = createFileRoute("/_authenticated/webhooks")({
  component: () => (
    <AppShell title="Webhooks" subtitle="Notificações em tempo real">
      <WebhooksPanel />
    </AppShell>
  ),
});
