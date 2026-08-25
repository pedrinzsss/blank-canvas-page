import { ShieldCheck } from "lucide-react";

export function CheckoutFooter() {
  const year = new Date().getFullYear();
  return (
    <div className="mt-4 space-y-4 text-center">
      <div className="flex items-center justify-center gap-3 text-left">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-800">Ambiente seguro</div>
          <div className="text-xs text-neutral-500">Seus dados confidenciais</div>
        </div>
      </div>

      <p className="mx-auto max-w-xl text-[11px] leading-relaxed text-neutral-500">
        Ao clicar em "Assinar agora", declaro que a Paglink apenas intermedia o
        pagamento, não sendo responsável pelo conteúdo ou oferta do infoproduto.
        *O valor parcelado possui acréscimo. Concordo com os{" "}
        <a href="#" className="underline hover:text-neutral-700">Termos de Compra</a>{" "}
        e{" "}
        <a href="#" className="underline hover:text-neutral-700">Política de Privacidade</a>.
        Este site está protegido pelo reCAPTCHA e aplicam-se a{" "}
        <a href="#" className="underline hover:text-neutral-700">Política de Privacidade</a>{" "}
        e os{" "}
        <a href="#" className="underline hover:text-neutral-700">Termos de Serviço</a>{" "}
        do Google.
      </p>

      <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500">
        <span>Paglink © {year}</span>
        <span className="text-neutral-300">|</span>
        <span>Todos os direitos reservados</span>
      </div>
    </div>
  );
}
