import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";

export function AdminPlaceholder({
  title,
  subtitle,
  description,
  children,
}: {
  title: string;
  subtitle?: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          {children ?? (
            <div className="mt-8 grid h-64 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Sem registros no momento
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
