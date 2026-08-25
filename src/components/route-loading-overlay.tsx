import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteLoadingOverlay() {
  const status = useRouterState({ select: (s) => s.status });
  const isLoading = status === "pending";
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  // Initial page-load / refresh overlay
  useEffect(() => {
    const t = setTimeout(() => setFading(true), 400);
    const t2 = setTimeout(() => setVisible(false), 800);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  // Show again on route transitions
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setFading(false);
    } else if (visible) {
      const t = setTimeout(() => setFading(true), 150);
      const t2 = setTimeout(() => setVisible(false), 450);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-300"
      style={{ opacity: fading ? 0 : 1, pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}
