import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, KeyRound, Webhook } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { WebhooksPanel } from "@/components/webhooks-panel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/integracao-api")({
  component: ApiPixPage,
});

function ApiPixPage() {
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  return (
    <AppShell title="API PIX" subtitle="Configurações">
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">API</h1>
            <p className="text-sm text-muted-foreground">
              Chaves de integração e webhooks outbound.
            </p>
          </div>
          <a href="/docs" target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Documentação completa
            </Button>
          </a>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setTab("keys")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "keys"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Chaves
          </button>
          <button
            onClick={() => setTab("webhooks")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "webhooks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Webhook className="h-4 w-4" />
            Webhooks
          </button>
        </div>

        {tab === "keys" ? <ApiKeysPanel /> : <WebhooksPanel />}
      </div>
    </AppShell>
  );
}
