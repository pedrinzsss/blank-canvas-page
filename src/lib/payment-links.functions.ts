import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusTab = z.enum(["ativos", "inativos", "todos"]);
const MethodKey = z.enum(["pix", "card", "boleto", "installments"]);
const ChargeKey = z.enum(["single", "cash", "recurring"]);

const InputSchema = z.object({
  tab: StatusTab.default("ativos"),
  methods: z.array(MethodKey).default([]),
  charges: z.array(ChargeKey).default([]),
  search: z.string().trim().max(200).default(""),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
});

export type PaymentLinkRow = {
  id: string;
  name: string;
  url_slug: string;
  status: "active" | "inactive" | "expired";
  amount_cents: number;
  created_at: string;
  metadata: Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;
};

export type ListPaymentLinksResult = {
  rows: PaymentLinkRow[];
  total: number;
  page: number;
  perPage: number;
};

export const listPaymentLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ListPaymentLinksResult> => {
    const { supabase } = context;
    const sel = (s: string): string => s;

    let q = supabase
      .from("payment_links")
      .select(sel("id, name, url_slug, status, amount_cents, created_at, metadata"), {
        count: "exact",
      });

    // Status tab
    if (data.tab === "ativos") q = q.eq("status", "active");
    else if (data.tab === "inativos") q = q.in("status", ["inactive", "expired"]);

    // Search on name / slug
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(`name.ilike.%${s}%,url_slug.ilike.%${s}%`);
    }

    // Method filter (metadata.methods is a jsonb array)
    if (data.methods.length > 0 && data.methods.length < 4) {
      const map: Record<string, string> = {
        pix: "pix",
        card: "credit_card",
        boleto: "boleto",
        installments: "installments",
      };
      const values = data.methods.map((m) => map[m]);
      q = q.overlaps("metadata->methods", values);
    }

    // Charge type filter (metadata.charge_type)
    if (data.charges.length > 0 && data.charges.length < 3) {
      q = q.in("metadata->>charge_type", data.charges);
    }

    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;

    const { data: rows, error, count } = await q
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<PaymentLinkRow[]>();

    if (error) throw new Error(error.message);

    return {
      rows: rows ?? [],
      total: count ?? 0,
      page: data.page,
      perPage: data.perPage,
    };
  });
