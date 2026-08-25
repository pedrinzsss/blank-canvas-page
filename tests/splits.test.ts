import { describe, expect, it } from "vitest";
import { calculateSplitAmountCents, validateSplitAllocation } from "@/lib/splits";

describe("regras de split", () => {
  it("calcula o repasse em centavos e arredonda no menor valor monetário", () => {
    expect(calculateSplitAmountCents(1_999, 1.5)).toBe(30);
  });

  it("recusa percentuais inválidos", () => {
    expect(() => calculateSplitAmountCents(1_000, 0)).toThrow();
    expect(() => calculateSplitAmountCents(1_000, 101)).toThrow();
  });

  it("aceita uma distribuição total de até cem por cento", () => {
    expect(validateSplitAllocation([10, 15.5, 74.5])).toBe(true);
  });

  it("recusa distribuições acima de cem por cento ou não positivas", () => {
    expect(validateSplitAllocation([60, 41])).toBe(false);
    expect(validateSplitAllocation([10, 0])).toBe(false);
  });
});
