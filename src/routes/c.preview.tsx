import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckoutPreview,
  CHECKOUT_STORAGE_KEY,
  DEFAULT_CONFIG,
  normalizeConfig,
  type CheckoutConfig,
} from "@/components/checkout-preview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/c/preview")({
  head: () => ({
    meta: [
      { title: "Checkout — Preview" },
      { name: "description", content: "Página de checkout final para teste." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutFinalPage,
});

function CheckoutFinalPage() {
  const [config, setConfig] = useState<CheckoutConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
        if (raw) setConfig(normalizeConfig(JSON.parse(raw)));
      } catch {
        /* ignore */
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHECKOUT_STORAGE_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 py-8">
      <div
        className={cn(
          "mx-auto overflow-hidden rounded-lg bg-white shadow-sm transition-all",
          config.device === "mobile" ? "max-w-sm" : "max-w-4xl",
        )}
      >
        <CheckoutPreview config={config} />
      </div>
      <div className="mx-auto mt-4 max-w-4xl px-4 text-center text-xs text-neutral-500">
        Página de teste do checkout publicado.
      </div>
    </div>
  );
}
