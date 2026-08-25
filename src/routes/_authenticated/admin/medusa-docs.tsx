import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const Route = createFileRoute("/_authenticated/admin/medusa-docs")({
  component: MedusaDocsPage,
});

const nodeAuthSample = `const url = 'https://api.medusapayments.pro/v1/transactions';
const publicKey = process.env.MEDUSA_PUBLIC_KEY;
const secretKey = process.env.MEDUSA_SECRET_KEY;
const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');

const response = await fetch(url, {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100, paymentMethod: 'pix', /* ... */ }),
});
const data = await response.json();`;

const createPixSample = `POST https://api.medusapayments.pro/v1/transactions
Authorization: Basic base64(publicKey:secretKey)
Content-Type: application/json

{
  "amount": 10000,
  "currency": "BRL",
  "paymentMethod": "pix",
  "items": [
    { "title": "Produto Teste", "unitPrice": 10000, "quantity": 1, "tangible": false }
  ],
  "customer": {
    "name": "Carlos Exemplar",
    "email": "carlos@exemplo.com",
    "phone": "11987654321",
    "document": { "type": "cpf", "number": "00011122233" }
  },
  "postbackUrl": "https://paglinkapp.com.br/api/public/v1/medusa/webhook",
  "externalRef": "charge-uuid-aqui",
  "metadata": "{\\"orderId\\":123}"
}`;

const pixResponse = `{
  "id": 123456,
  "status": "waiting_payment",
  "amount": 10000,
  "paymentMethod": "pix",
  "secureId": "abcd-1234",
  "secureUrl": "https://pagamento.medusa.../pagar/abcd-1234",
  "pix": {
    "qrcode": "00020101021226870014br.gov.bcb.pix...",
    "expirationDate": "2026-07-17",
    "end2EndId": null,
    "receiptUrl": null
  },
  "externalRef": "charge-uuid-aqui"
}`;

const postbackPix = `{
  "type": "transaction",
  "objectId": "123456",
  "url": "https://paglinkapp.com.br/api/public/v1/medusa/webhook",
  "data": {
    "id": 123456,
    "amount": 10000,
    "paymentMethod": "pix",
    "status": "paid",
    "paidAt": "2026-07-16T12:02:00.000Z",
    "externalRef": "charge-uuid-aqui",
    "pix": { "qrcode": "...", "expirationDate": "2026-07-17" },
    "customer": { "name": "...", "email": "...", "document": { "type": "cpf", "number": "..." } }
  }
}`;

const withdrawSample = `POST https://api.medusapayments.pro/v1/withdraw
Authorization: Basic base64(publicKey:secretKey)
Content-Type: application/json

{
  "amount": 5000,
  "pixKey": "00011122233",
  "pixKeyType": "cpf",
  "description": "Saque via Paglink",
  "postbackUrl": "https://paglinkapp.com.br/api/public/v1/medusa/webhook",
  "externalRef": "payout-uuid-aqui"
}`;

const balanceSample = `GET https://api.medusapayments.pro/v1/balance
Authorization: Basic base64(publicKey:secretKey)

// Response
{ "available": 1250000, "pending": 30000, "currency": "BRL" }`;

const statusTable: Array<[string, string]> = [
  ["waiting_payment", "Aguardando pagamento (PIX gerado)"],
  ["pending", "Em processo de confirmação"],
  ["approved", "Pagamento aprovado (mapeia para paid)"],
  ["paid", "Pagamento confirmado"],
  ["refused", "Recusado (mapeia para failed)"],
  ["cancelled", "Cancelado"],
  ["refunded", "Estornado"],
  ["in_protest", "Em contestação"],
  ["chargeback", "Chargeback (mapeia para failed)"],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function MedusaDocsPage() {
  return (
    <AdminShell
      title="Documentação Medusa Payments"
      subtitle="Referência interna (apenas admin) da integração com a Medusa como adquirente PIX."
    >
      <div className="space-y-8 p-6">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200">
          <strong>Visibilidade:</strong> esta página está oculta para usuários finais e disponível apenas
          no painel administrativo. Use-a como referência técnica ao configurar as credenciais em
          <em> Configurações → Adquirentes → Conexões → Medusa Payments</em>.
        </div>

        <Section id="overview" title="Visão geral">
          <p>
            A Medusa Payments é a nossa adquirente padrão para <strong>PIX</strong>. Todo produto, link
            de pagamento ou depósito via PIX é roteado pela API da Medusa (Base URL{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">https://api.medusapayments.pro/v1</code>)
            usando as credenciais armazenadas em <code>platform_settings.adquirentes_conexoes.medusa_payments</code>.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Chave pública</strong> (usuário do Basic Auth).</li>
            <li><strong>Chave privada</strong> (senha do Basic Auth).</li>
            <li><strong>Chave de saque externo</strong> (usada para autorizar saques PIX).</li>
            <li>Toggle <strong>Ativa</strong> — quando desativada, o roteamento é ignorado.</li>
          </ul>
        </Section>

        <Section id="auth" title="Autenticação">
          <p>
            A Medusa usa <strong>Basic Access Authentication</strong>. O cabeçalho é montado a partir
            das chaves pública e privada da conta:
          </p>
          <CodeBlock lang="node" code={nodeAuthSample} />
          <p>
            No nosso backend, isso é feito pelo módulo <code>src/lib/acquirers/medusa.server.ts</code>
            (função <code>getMedusaConfig()</code>). Nunca exponha a chave privada no cliente.
          </p>
        </Section>

        <Section id="pix" title="Criar cobrança PIX">
          <p>
            Requisição enviada automaticamente pelo endpoint público <code>POST /api/public/v1/charges</code>
            sempre que <code>payment_method</code> for <code>pix</code> e a conexão Medusa estiver ativa.
          </p>
          <CodeBlock lang="http" code={createPixSample} />
          <p className="pt-2">Resposta esperada (200):</p>
          <CodeBlock lang="json" code={pixResponse} />
        </Section>

        <Section id="postbacks" title="Postbacks (Webhook Medusa → Paglink)">
          <p>
            A Medusa envia atualizações da transação para a URL passada em <code>postbackUrl</code>. Nossa
            rota receptora é:
          </p>
          <CodeBlock
            lang="url"
            code={"POST https://paglinkapp.com.br/api/public/v1/medusa/webhook"}
          />
          <p>
            A rota <em>não</em> confia no corpo cru: ela re-consulta a transação via{" "}
            <code>GET /v1/transactions/:id</code> com nossas credenciais antes de atualizar a cobrança
            correspondente (buscando pelo <code>externalRef</code> = <code>charges.id</code>). Depois
            do update, disparamos os webhooks do lojista via <code>webhook_deliveries</code>.
          </p>
          <p className="pt-2">Exemplo de payload PIX:</p>
          <CodeBlock lang="json" code={postbackPix} />
        </Section>

        <Section id="status" title="Mapeamento de status">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Medusa</th>
                  <th className="px-4 py-2 text-left">Interno (charge_status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statusTable.map(([m, i]) => (
                  <tr key={m}>
                    <td className="px-4 py-2 font-mono text-xs">{m}</td>
                    <td className="px-4 py-2">{i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="withdraw" title="Saque PIX">
          <p>
            Saques usam a <em>chave de saque externo</em> configurada na conexão. O endpoint é{" "}
            <code>POST /v1/withdraw</code>:
          </p>
          <CodeBlock lang="http" code={withdrawSample} />
          <p>
            Tipos de <code>pixKeyType</code> aceitos: <code>cpf</code>, <code>cnpj</code>,{" "}
            <code>email</code>, <code>phone</code>, <code>evp</code>, <code>copypaste</code>.
          </p>
        </Section>

        <Section id="balance" title="Consultar saldo">
          <CodeBlock lang="http" code={balanceSample} />
        </Section>

        <Section id="config" title="Como configurar em produção">
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              Acesse a Medusa Payments em <code>https://app.medusapayments.pro/integrations</code> e
              gere as chaves pública, privada e de saque externo.
            </li>
            <li>
              No painel Paglink, vá em <strong>Configurações → Adquirentes → Conexões</strong>, clique
              em <strong>Integrar</strong> no card <em>Medusa Payments</em>.
            </li>
            <li>Cole as três chaves e marque <strong>Ativa</strong>. Salve.</li>
            <li>
              A partir desse momento toda cobrança PIX criada via API ou link de pagamento é gerada na
              Medusa e o QR Code volta em <code>pix.qrcode</code> da resposta.
            </li>
            <li>
              Confirme na Medusa que a URL de postback aceita chamadas para{" "}
              <code>https://paglinkapp.com.br/api/public/v1/medusa/webhook</code>.
            </li>
          </ol>
        </Section>

        <Section id="endpoints" title="Endpoints Medusa suportados">
          <ul className="ml-5 list-disc space-y-1">
            <li><code>POST /v1/transactions</code> — criar venda (PIX, boleto, cartão).</li>
            <li><code>GET /v1/transactions/:id</code> — buscar venda.</li>
            <li><code>GET /v1/transactions</code> — listar vendas.</li>
            <li><code>POST /v1/transactions/:id/refund</code> — estornar.</li>
            <li><code>POST /v1/withdraw</code> — criar saque.</li>
            <li><code>POST /v1/withdraw/:id/cancel</code> — cancelar saque.</li>
            <li><code>GET /v1/withdraw/:id</code> — buscar saque.</li>
            <li><code>GET /v1/balance</code> — consultar saldo.</li>
            <li><code>GET /v1/company</code> — dados da empresa.</li>
          </ul>
        </Section>
      </div>
    </AdminShell>
  );
}
