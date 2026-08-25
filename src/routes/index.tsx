import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projeto em preparação" },
      { name: "description", content: "Projeto em preparação" },
      { property: "og:title", content: "Projeto em preparação" },
      { property: "og:description", content: "Projeto em preparação" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-foreground">Projeto em preparação</p>
    </main>
  );
}
