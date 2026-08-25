import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { getPublicManualCharge } from "@/lib/manual-charges.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/pagar/$id")({
  head: () => ({
    meta: [
      { title: "Compra Segura — Pagamento PIX | Paglink" },
      {
        name: "description",
        content:
          "Finalize seu pagamento por PIX com segurança. Escaneie o QR Code ou copie o código para concluir a transação.",
      },
      { property: "og:title", content: "Compra Segura — Pagamento PIX" },
      {
        property: "og:description",
        content: "Escaneie o QR Code PIX ou copie o código para finalizar seu pagamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PagarPage,
});

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

function PagarPage() {
  const { id } = Route.useParams();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public-manual-charge", id],
    queryFn: () => getPublicManualCharge({ data: { id } }),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (data?.status === "paid") toast.success("Pagamento confirmado!");
  }, [data?.status]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f8]">
        <p className="text-sm text-slate-500">Carregando cobrança…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f8] p-6">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Cobrança não encontrada</h1>
          <p className="mt-2 text-sm text-slate-500">
            O link pode ter expirado ou estar incorreto.
          </p>
        </div>
      </main>
    );
  }

  const paid = data.status === "paid" || data.status === "approved";

  const handleCopy = () => {
    if (!data.qrcode) return;
    navigator.clipboard.writeText(data.qrcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código PIX copiado!");
  };

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-10">
      <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 border-b border-slate-100 py-5">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-base font-bold text-emerald-600">Compra Segura</span>
        </div>

        <div className="px-6 py-6 text-center">
          <h1 className="text-[15px] font-bold leading-6 text-emerald-600">
            Finalize seu pagamento de {formatBRL(data.amountCents)} para
            <br />
            {data.sellerName}
          </h1>
        </div>

        {/* PIX block */}
        <div className="mx-6 mb-6 rounded-sm bg-emerald-600 px-5 py-6 text-center text-white">
          {paid ? (
            <div className="py-10">
              <Check className="mx-auto h-12 w-12" />
              <p className="mt-4 text-lg font-bold">Pagamento aprovado!</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold">Pague por PIX utilizando o QR Code</p>
              <p className="mx-auto mt-2 max-w-[260px] text-[11px] font-semibold leading-4 text-white/90">
                Abra o app em que vai fazer a transferência, escaneie a imagem ou cole o código
                do QR Code
              </p>

              {data.qrcode && (
                <div className="mx-auto mt-5 w-fit bg-white p-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data.qrcode)}`}
                    alt={`QR Code PIX para pagamento de ${formatBRL(data.amountCents)}`}
                    className="h-[124px] w-[124px]"
                  />
                </div>
              )}

              <p className="mt-5 text-2xl font-extrabold">{formatBRL(data.amountCents)}</p>

              <button
                onClick={handleCopy}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-white py-3 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar código do QR Code
              </button>
            </>
          )}
        </div>

        {!paid && (
          <p className="pb-5 text-center text-[11px] text-slate-500">
            Realizou seu pagamento?{" "}
            <button
              onClick={() => refetch()}
              className="font-semibold text-emerald-600 underline"
            >
              Clique aqui
            </button>
          </p>
        )}

        <div className="border-t border-slate-100 px-6 py-5 text-center">
          <p className="text-sm font-bold text-slate-800">{data.description} x1</p>
          <p className="mt-1 text-sm text-emerald-600">{formatBRL(data.amountCents)}</p>
        </div>

        <div className="border-t border-slate-100 px-6 py-5 text-center">
          <p className="text-sm font-bold text-slate-800">Dados do cliente</p>
          <p className="mt-2 text-sm text-emerald-600">{data.customerName}</p>
          {data.maskedEmail && (
            <p className="text-sm text-emerald-600">{data.maskedEmail}</p>
          )}
        </div>

        <div className="border-t border-slate-100 py-4 text-center text-[11px] text-slate-400">
          Pagamento processado por{" "}
          <span className="font-bold text-emerald-600">Paglink</span>
        </div>
      </div>
    </main>
  );
}
