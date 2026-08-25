export const CHECKOUT_BASE_URL = "https://paglinkapp.com.br";

export function getCheckoutUrl(token: string): string {
  return `${CHECKOUT_BASE_URL}/checkout/${token}`;
}

export function formatPriceCents(cents: number | null | undefined): string {
  if (cents == null) return "R$ 0,00";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parsePriceInput(v: string): number {
  const cleaned = v.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
