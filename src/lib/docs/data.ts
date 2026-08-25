export type CodeSample = { lang: string; label: string; code: string };
export type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description?: string;
  headers?: Record<string, string>;
  body?: string;
  response?: string;
  samples?: CodeSample[];
};
export type DocSection = {
  id: string;
  title: string;
  intro?: string;
  content?: string;
  endpoint?: Endpoint;
  extraCode?: CodeSample[];
  table?: { headers: string[]; rows: string[][] };
};
export type DocGroup = { label: string; sections: DocSection[] };

const BASE_URL = "https://paglinkapp.com.br/api/public/v1";

const authCurl = `curl ${BASE_URL}/charges \\
  -H "Authorization: Bearer sk_test_xxxxxxxxx" \\
  -H "Content-Type: application/json"`;

const chargeBody = `{
  "amount_cents": 10000,
  "currency": "BRL",
  "payment_method": "pix",
  "description": "Pedido #123456",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "document": { "type": "cpf", "number": "00000000000" }
  },
  "metadata": { "order_id": "123456" }
}`;

const chargeResp = `{
  "id": "c3b1e2c4-...-uuid",
  "client_id": "b7a1...-uuid",
  "customer_id": null,
  "amount_cents": 10000,
  "currency": "BRL",
  "payment_method": "pix",
  "status": "pending",
  "description": "Pedido #123456",
  "acquirer": "medusa",
  "acquirer_ref": "12345",
  "pix": {
    "qrcode": "00020101021226830014br.gov.bcb.pix...",
    "expiration_date": "2026-07-16T12:30:00Z"
  },
  "secure_url": "https://checkout.paglink.com.br/c/...",
  "metadata": { "order_id": "123456" },
  "created_at": "2026-07-16T12:00:00Z"
}`;

const chargeSamples: CodeSample[] = [
  {
    lang: "bash",
    label: "cURL",
    code: `curl -X POST ${BASE_URL}/charges \\
  -H "Authorization: Bearer sk_test_xxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount_cents": 10000,
    "payment_method": "pix",
    "customer": {
      "name": "João da Silva",
      "email": "joao@email.com",
      "document": { "type": "cpf", "number": "00000000000" }
    }
  }'`,
  },
  {
    lang: "javascript",
    label: "JavaScript",
    code: `const response = await fetch("${BASE_URL}/charges", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_test_xxxxxxxxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amount_cents: 10000,
    payment_method: "pix",
    customer: {
      name: "João da Silva",
      email: "joao@email.com",
      document: { type: "cpf", number: "00000000000" }
    }
  })
});
const data = await response.json();`,
  },
  {
    lang: "javascript",
    label: "Node.js",
    code: `import fetch from "node-fetch";

const res = await fetch("${BASE_URL}/charges", {
  method: "POST",
  headers: {
    Authorization: "Bearer sk_test_xxxxxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount_cents: 10000,
    payment_method: "pix",
    customer: {
      name: "João da Silva",
      email: "joao@email.com",
      document: { type: "cpf", number: "00000000000" },
    },
  }),
});
console.log(await res.json());`,
  },
  {
    lang: "php",
    label: "PHP",
    code: `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${BASE_URL}/charges");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer sk_test_xxxxxxxxx",
  "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  "amount_cents" => 10000,
  "payment_method" => "pix",
  "customer" => [
    "name" => "João da Silva",
    "email" => "joao@email.com",
    "document" => ["type" => "cpf", "number" => "00000000000"],
  ],
]));
$response = curl_exec($ch);
curl_close($ch);`,
  },
  {
    lang: "python",
    label: "Python",
    code: `import requests

r = requests.post(
    "${BASE_URL}/charges",
    headers={
        "Authorization": "Bearer sk_test_xxxxxxxxx",
        "Content-Type": "application/json",
    },
    json={
        "amount_cents": 10000,
        "payment_method": "pix",
        "customer": {
            "name": "João da Silva",
            "email": "joao@email.com",
            "document": {"type": "cpf", "number": "00000000000"},
        },
    },
)
print(r.json())`,
  },
];

export const docGroups: DocGroup[] = [
  {
    label: "Introdução",
    sections: [
      {
        id: "visao-geral",
        title: "Visão geral",
        intro: "A API Paglink oferece uma infraestrutura completa para processamento de pagamentos.",
        content:
          `Nossa API REST permite integrar pagamentos PIX, cartão de crédito e boleto de forma simples e segura. Todos os endpoints utilizam HTTPS, retornam JSON e seguem padrões RESTful.\n\nBase URL:\n${BASE_URL}`,
      },
      {
        id: "como-funciona",
        title: "Como funciona",
        content:
          "1. Você obtém suas API Keys no painel Paglink.\n2. Faz requisições autenticadas para nossos endpoints.\n3. Recebe respostas em JSON e eventos via Webhooks.\n4. Concilia pagamentos e transações em tempo real.",
      },
      {
        id: "primeiros-passos",
        title: "Primeiros passos",
        content:
          "Crie sua conta, gere uma API Key no ambiente Sandbox, faça uma cobrança de teste e configure seus webhooks para receber eventos.",
      },
      {
        id: "envelopes",
        title: "Formato de resposta",
        content:
          "Respostas de um único recurso retornam o objeto diretamente em JSON.\n\nRespostas de listagem retornam um envelope { \"data\": [...] } — parâmetro opcional ?limit= (padrão e máximos variam por endpoint).\n\nErros retornam { \"error\": { \"code\", \"message\" } }.",
      },
    ],
  },
  {
    label: "Ambientes",
    sections: [
      {
        id: "autenticacao",
        title: "Autenticação",
        intro: "A API Paglink utiliza autenticação via Bearer Token.",
        content:
          "Envie sua Secret Key no header Authorization em todas as requisições:\n\nAuthorization: Bearer sk_test_xxxxxxxxx\n\nAs chaves seguem o padrão sk_test_<hex> ou sk_live_<hex>. Nunca exponha sua Secret Key em código client-side.",
        extraCode: [{ lang: "bash", label: "cURL", code: authCurl }],
      },
      {
        id: "api-keys",
        title: "API Keys",
        content:
          "Cada conta possui chaves por ambiente:\n\n• Secret Key (sk_test_ / sk_live_) — uso server-side, nunca exponha.\n• Webhook Secret — gerado ao cadastrar um endpoint de webhook, usado para validar as assinaturas recebidas.",
      },
      {
        id: "sandbox",
        title: "Ambiente Sandbox",
        content:
          "Use chaves sk_test_ para testes. Nenhuma cobrança real é processada. Ideal para desenvolvimento e homologação.",
      },
      {
        id: "producao",
        title: "Ambiente Produção",
        content:
          "Use chaves sk_live_. Todas as transações são reais. Certifique-se de ter concluído o KYC antes de ativar.",
      },
    ],
  },
  {
    label: "Clientes",
    sections: [
      {
        id: "criar-cliente",
        title: "Criar cliente",
        endpoint: {
          method: "POST",
          path: "/v1/customers",
          description: "Cadastra um novo cliente na sua conta.",
          headers: {
            Authorization: "Bearer sk_test_xxxxxxxxx",
            "Content-Type": "application/json",
          },
          body: `{
  "name": "João da Silva",
  "email": "joao@email.com",
  "document": "00000000000",
  "phone": "+5511999998888",
  "metadata": { "external_id": "u_42" }
}`,
          response: `{
  "id": "6f1c...-uuid",
  "client_id": "b7a1...-uuid",
  "name": "João da Silva",
  "email": "joao@email.com",
  "document": "00000000000",
  "phone": "+5511999998888",
  "metadata": { "external_id": "u_42" },
  "created_at": "2026-07-16T12:00:00Z",
  "updated_at": "2026-07-16T12:00:00Z"
}`,
        },
      },
      {
        id: "listar-clientes",
        title: "Listar clientes",
        endpoint: {
          method: "GET",
          path: "/v1/customers?limit=50",
          description: "Lista os clientes cadastrados. Parâmetro opcional limit (máx 100, padrão 50). Retorno: { \"data\": [...] }.",
        },
      },
      {
        id: "consultar-cliente",
        title: "Consultar cliente",
        endpoint: {
          method: "GET",
          path: "/v1/customers/{id}",
          description: "Retorna os dados de um cliente específico.",
        },
      },
    ],
  },
  {
    label: "Pagamentos",
    sections: [
      {
        id: "criar-cobranca",
        title: "Criar cobrança",
        endpoint: {
          method: "POST",
          path: "/v1/charges",
          description:
            "Cria uma nova cobrança. Informe amount_cents (inteiro em centavos), payment_method (pix | credit_card | boleto) e opcionalmente customer inline OU customer_id de um cliente já cadastrado.",
          headers: {
            Authorization: "Bearer sk_test_xxxxxxxxx",
            "Content-Type": "application/json",
          },
          body: chargeBody,
          response: chargeResp,
          samples: chargeSamples,
        },
      },
      {
        id: "consultar-cobranca",
        title: "Consultar cobrança",
        endpoint: {
          method: "GET",
          path: "/v1/charges/{id}",
          description: "Retorna os detalhes de uma cobrança.",
        },
      },
      {
        id: "listar-cobrancas",
        title: "Listar cobranças",
        endpoint: {
          method: "GET",
          path: "/v1/charges?limit=50",
          description: "Lista cobranças. Parâmetro opcional limit (máx 100, padrão 50). Retorno: { \"data\": [...] }.",
        },
      },
      {
        id: "cancelar-cobranca",
        title: "Cancelar cobrança",
        endpoint: {
          method: "POST",
          path: "/v1/cancel",
          description:
            "Cancela uma cobrança pendente. Envie { \"charge_id\": \"<uuid>\" }. Retorna 409 se a cobrança já foi paga, expirada ou cancelada.",
          body: `{ "charge_id": "c3b1e2c4-...-uuid" }`,
        },
      },
      {
        id: "estornar-cobranca",
        title: "Estornar cobrança",
        endpoint: {
          method: "POST",
          path: "/v1/refunds",
          description:
            "Estorna (parcial ou total) uma cobrança paga. amount_cents não pode exceder o valor da cobrança.",
          body: `{
  "charge_id": "c3b1e2c4-...-uuid",
  "amount_cents": 10000,
  "reason": "Solicitação do cliente"
}`,
          response: `{
  "id": "r1a2...-uuid",
  "client_id": "b7a1...-uuid",
  "charge_id": "c3b1e2c4-...-uuid",
  "amount_cents": 10000,
  "reason": "Solicitação do cliente",
  "status": "pending",
  "created_at": "2026-07-16T12:05:00Z"
}`,
        },
      },
    ],
  },
  {
    label: "Métodos de pagamento",
    sections: [
      {
        id: "pix",
        title: "PIX",
        content:
          "Status possíveis: pending, processing, paid, expired, failed, canceled.\n\nA resposta contém pix.qrcode (payload copia-e-cola do BR Code) e pix.expiration_date. Utilize secure_url para redirecionar o comprador para uma página de checkout hospedada.",
        endpoint: {
          method: "POST",
          path: "/v1/charges",
          body: `{
  "amount_cents": 10000,
  "payment_method": "pix",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "document": { "type": "cpf", "number": "00000000000" }
  }
}`,
          response: `{
  "id": "c3b1...-uuid",
  "status": "pending",
  "pix": {
    "qrcode": "00020101021226830014br.gov.bcb.pix...",
    "expiration_date": "2026-07-16T12:30:00Z"
  },
  "secure_url": "https://checkout.paglink.com.br/c/..."
}`,
        },
      },
      {
        id: "cartao-credito",
        title: "Cartão de crédito",
        content:
          "Envie payment_method: credit_card. O processamento é concluído via checkout hospedado — utilize o secure_url retornado para redirecionar o comprador. Nunca envie dados brutos de cartão.",
        endpoint: {
          method: "POST",
          path: "/v1/charges",
          body: `{
  "amount_cents": 10000,
  "payment_method": "credit_card",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "document": { "type": "cpf", "number": "00000000000" }
  }
}`,
        },
      },
      {
        id: "boleto",
        title: "Boleto",
        content:
          "Envie payment_method: boleto. O boleto é gerado e disponibilizado através do secure_url retornado na resposta.",
        endpoint: {
          method: "POST",
          path: "/v1/charges",
          body: `{
  "amount_cents": 10000,
  "payment_method": "boleto",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "document": { "type": "cpf", "number": "00000000000" }
  }
}`,
        },
      },
    ],
  },
  {
    label: "Links de pagamento",
    sections: [
      {
        id: "criar-link",
        title: "Criar link",
        endpoint: {
          method: "POST",
          path: "/v1/payment-links",
          description: "Cria um link de pagamento reutilizável.",
          body: `{
  "name": "Curso de React",
  "amount_cents": 19900,
  "currency": "BRL",
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": { "sku": "curso-react" }
}`,
          response: `{
  "id": "pl_...-uuid",
  "client_id": "b7a1...-uuid",
  "name": "Curso de React",
  "amount_cents": 19900,
  "currency": "BRL",
  "url_slug": "a1b2c3d4e5f6",
  "url": "https://paglinkapp.com.br/pay/a1b2c3d4e5f6",
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": { "sku": "curso-react" },
  "created_at": "2026-07-16T12:00:00Z"
}`,
        },
      },
      {
        id: "listar-links",
        title: "Listar links",
        endpoint: {
          method: "GET",
          path: "/v1/payment-links",
          description: "Lista os links criados (até 100). Retorno: { \"data\": [...] }.",
        },
      },
    ],
  },
  {
    label: "Transações",
    sections: [
      {
        id: "listar-transacoes",
        title: "Listar transações",
        endpoint: {
          method: "GET",
          path: "/v1/transactions?limit=100",
          description:
            "Retorna o extrato de transações (charges, refunds, payouts, fees, adjustments). Parâmetro opcional limit (máx 500, padrão 100). Retorno: { \"data\": [...] }.",
        },
      },
    ],
  },
  {
    label: "Saldo e saques",
    sections: [
      {
        id: "consultar-saldo",
        title: "Consultar saldo",
        endpoint: {
          method: "GET",
          path: "/v1/balance",
          description: "Retorna o saldo consolidado da sua conta em centavos.",
          response: `{
  "currency": "BRL",
  "available_cents": 152340,
  "pending_cents": 0
}`,
        },
      },
      {
        id: "solicitar-saque",
        title: "Solicitar saque",
        endpoint: {
          method: "POST",
          path: "/v1/payouts",
          description:
            "Solicita um saque. Se o campo bank_account não for enviado, o saque será direcionado para a conta bancária padrão configurada no painel.",
          body: `{
  "amount_cents": 50000,
  "bank_account": {
    "bank": "001",
    "agency": "0001",
    "account": "12345-6",
    "type": "checking"
  }
}`,
          response: `{
  "id": "po_...-uuid",
  "client_id": "b7a1...-uuid",
  "amount_cents": 50000,
  "status": "requested",
  "bank_account": { "...": "..." },
  "created_at": "2026-07-16T12:00:00Z"
}`,
        },
      },
    ],
  },
  {
    label: "Webhooks",
    sections: [
      {
        id: "webhooks-intro",
        title: "Introdução",
        content:
          "Webhooks são notificações HTTP enviadas em tempo real quando eventos acontecem em sua conta. Configure um endpoint no painel para receber os eventos.",
      },
      {
        id: "webhooks-listar",
        title: "Listar endpoints",
        endpoint: {
          method: "GET",
          path: "/v1/webhooks",
          description: "Lista os endpoints de webhook cadastrados na sua conta. Retorno: { \"data\": [...] }.",
        },
      },
      {
        id: "webhooks-eventos",
        title: "Eventos",
        content:
          "Eventos de ciclo de vida da cobrança emitidos pela plataforma:\n\n• charge.paid\n• charge.failed\n• charge.refunded\n• charge.canceled\n• charge.expired",
        extraCode: [
          {
            lang: "json",
            label: "Payload",
            code: `{
  "id": "evt_123456",
  "type": "charge.paid",
  "created_at": "2026-07-16T12:00:00Z",
  "data": {
    "charge_id": "c3b1...-uuid",
    "amount_cents": 10000,
    "status": "paid"
  }
}`,
          },
        ],
      },
      {
        id: "webhooks-assinatura",
        title: "Assinatura",
        content:
          "Cada requisição de webhook inclui os headers:\n\n• X-Webhook-Signature: t=<timestamp>,v1=<hmac>\n• X-Webhook-Event: <tipo do evento>\n• X-Webhook-Id: <id da entrega>\n\nA assinatura é HMAC-SHA256 hex de \"<timestamp>.<raw_body>\" usando o Webhook Secret gerado ao cadastrar o endpoint. Compare em tempo constante e rejeite requisições com timestamp fora de uma janela de tolerância (ex.: 5 minutos).",
        extraCode: [
          {
            lang: "javascript",
            label: "Node.js — validação",
            code: `import { createHmac, timingSafeEqual } from "crypto";

function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=")),
  );
  const expected = createHmac("sha256", secret)
    .update(\`\${parts.t}.\${rawBody}\`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}`,
          },
        ],
      },
      {
        id: "webhooks-tentativas",
        title: "Tentativas",
        content:
          "Se seu endpoint não responder com HTTP 2xx, tentamos reenviar com backoff exponencial: 1min, 5min, 30min, 2h, 6h, 12h — até 6 tentativas no total (aprox. 21 horas).",
      },
      {
        id: "webhooks-reenvio",
        title: "Reenvio manual",
        content: "Reenvie manualmente qualquer evento pelo painel de Webhooks na aba Logs.",
      },
    ],
  },
  {
    label: "Códigos de erro",
    sections: [
      {
        id: "erros-tabela",
        title: "Códigos HTTP",
        table: {
          headers: ["Código", "Descrição"],
          rows: [
            ["400", "Bad Request — payload inválido ou JSON malformado"],
            ["401", "Unauthorized — API Key ausente ou inválida"],
            ["403", "Forbidden — sem permissão para o recurso"],
            ["404", "Not Found — recurso não encontrado"],
            ["409", "Conflict — operação não permitida no estado atual (ex.: cancelar cobrança já paga)"],
            ["500", "Internal Server Error"],
          ],
        },
        extraCode: [
          {
            lang: "json",
            label: "Resposta de erro",
            code: `{
  "error": {
    "code": "invalid_request",
    "message": "O valor da cobrança é obrigatório."
  }
}`,
          },
        ],
      },
    ],
  },
];

export function flattenSections() {
  return docGroups.flatMap((g) => g.sections.map((s) => ({ ...s, group: g.label })));
}
