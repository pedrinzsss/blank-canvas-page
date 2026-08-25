export function calculateSplitAmountCents(
  grossAmountCents: number,
  percentage: number,
) {
  if (!Number.isInteger(grossAmountCents) || grossAmountCents < 0) {
    throw new Error("O valor bruto deve ser informado em centavos.");
  }
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    throw new Error("A porcentagem deve estar entre 0 e 100.");
  }

  return Math.round((grossAmountCents * percentage) / 100);
}

export function validateSplitAllocation(percentages: number[]) {
  if (percentages.some((percentage) => !Number.isFinite(percentage) || percentage <= 0)) {
    return false;
  }

  return percentages.reduce((total, percentage) => total + percentage, 0) <= 100;
}
