import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import placas from "@/assets/placas-premiacao.png.asset.json";
import pulseira from "@/assets/pulseira-paglink.png.asset.json";

export const Route = createFileRoute("/_authenticated/premiacoes")({
  component: PremiacoesPage,
});

type Item = {
  title: string;
  amount: string;
  description: string;
  image: string;
};

const items: Item[] = [
  {
    title: "Placa 10 Mil",
    amount: "R$ 10.000,00",
    description:
      "Sua primeira conquista. Uma placa que marca o começo da sua jornada rumo ao topo.",
    image: placas.url,
  },
  {
    title: "Placa 100 Mil",
    amount: "R$ 100.000,00",
    description:
      "Não é sorte. É consistência. Você ultrapassou a marca dos cem mil e mostrou que domina o jogo.",
    image: placas.url,
  },
  {
    title: "Placa 500 Mil",
    amount: "R$ 500.000,00",
    description:
      "Poucos chegam até aqui. Meio milhão faturado com visão, disciplina e inteligência.",
    image: placas.url,
  },
  {
    title: "Placa 1 Milhão",
    amount: "R$ 1.000.000,00",
    description:
      "Um marco reservado aos que enxergam além. Um milhão faturado e uma nova realidade conquistada.",
    image: placas.url,
  },
  {
    title: "Placa 5 Milhões",
    amount: "R$ 5.000.000,00",
    description:
      "Cinco milhões não são acaso. São resultado de visão, coragem e domínio total.",
    image: placas.url,
  },
  {
    title: "Pulseira Paglink",
    amount: "Edição especial",
    description:
      "A pulseira oficial Paglink — símbolo de quem faz parte do time e leva a marca aonde vai.",
    image: pulseira.url,
  },
];

function PremiacoesPage() {
  return (
    <AppShell title="Premiações" subtitle="Conquistas que marcam sua jornada">
      <div className="space-y-6 p-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Conquistas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Aqui você pode ver seu progresso de metas.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border md:block" />

            <div className="space-y-10">
              {items.map((item, i) => {
                const leftSide = i % 2 === 0;
                return (
                  <div
                    key={item.title}
                    className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr]"
                  >
                    {/* Left column */}
                    <div
                      className={
                        leftSide
                          ? "md:pr-8 md:text-right"
                          : "hidden md:block"
                      }
                    >
                      {leftSide && <ItemCard item={item} align="right" />}
                    </div>

                    {/* Center: image + dot */}
                    <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
                      <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-lg border border-border bg-secondary/40 p-1">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="hidden h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--card))] md:block" />
                    </div>

                    {/* Right column */}
                    <div
                      className={
                        !leftSide
                          ? "md:pl-8 md:text-left"
                          : "hidden md:block"
                      }
                    >
                      {!leftSide && <ItemCard item={item} align="left" />}
                    </div>

                    {/* Mobile fallback text (always shown below image) */}
                    <div className="md:hidden">
                      <ItemCard item={item} align="left" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ItemCard({ item, align }: { item: Item; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "md:ml-auto md:max-w-sm" : "md:mr-auto md:max-w-sm"}>
      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
      <p className="mt-1 text-xs font-medium text-primary">{item.amount}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {item.description}
      </p>
    </div>
  );
}
