import {ThemeToggle} from "../theme-toggle";

export const metadata={title:"Documentação de integração — TrackBase Analytics",description:"Como gateways e plataformas enviam vendas para a TrackBase: script, webhook, campos, status e testes."};
const H="https://track-base-analytics.vercel.app";
function Code({children}:{children:string}){return <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100"><code>{children}</code></pre>}
function Th({children}:{children?:React.ReactNode}){return <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">{children}</th>}
function Td({children}:{children?:React.ReactNode}){return <td className="border-b border-slate-200 px-3 py-2 align-top text-sm">{children}</td>}
function Table({head,rows}:{head:string[];rows:string[][]}){return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[640px] border-collapse bg-white text-slate-900"><thead><tr>{head.map(h=><Th key={h}>{h}</Th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><Td key={j}>{c}</Td>)}</tr>)}</tbody></table></div>}
function Sec({id,n,title,children}:{id:string;n:string;title:string;children:React.ReactNode}){return <section id={id} className="metric-card scroll-mt-6 rounded-2xl p-6"><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-600">{n}</p><h2 className="mt-1 text-xl font-semibold">{title}</h2><div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">{children}</div></section>}

export default function Docs(){
 const items:[string,string][]=[["visao","1 · Visão geral"],["script","2 · Script na página"],["webhook","3 · Webhook de vendas"],["campos","4 · Campos aceitos"],["status","5 · Status"],["fortpay","6 · FortPay"],["valores","7 · Valores e moeda"],["dedup","8 · Deduplicação"],["respostas","9 · Respostas e erros"],["testes","10 · Testando"],["seguranca","11 · Segurança"],["faq","12 · Perguntas frequentes"]];
 return <main className="min-h-screen bg-slate-50 text-slate-900">
  <header className="border-b border-slate-200 bg-card/80 backdrop-blur"><div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-3"><img src="/trackbase-logo.png" alt="TrackBase Analytics" className="h-9 w-14 object-contain"/><div><p className="text-xs font-medium uppercase tracking-[.18em] text-blue-600">TrackBase Analytics</p><h1 className="text-lg font-semibold leading-tight">Documentação de integração para gateways</h1></div></div><div className="flex items-center gap-2"><ThemeToggle/><a href="/login" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:border-blue-300 hover:text-blue-600">Entrar</a></div></div></header>
  <div className="mx-auto grid max-w-[1100px] gap-6 px-5 py-8 lg:grid-cols-[220px_1fr]">
   <nav className="metric-card h-fit rounded-2xl p-4 lg:sticky lg:top-6"><p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nesta página</p><div className="mt-2 space-y-1">{items.map(([id,label])=><a key={id} href={`#${id}`} className="block rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">{label}</a>)}</div></nav>
   <div className="space-y-6">
    <Sec id="visao" n="Parte 1" title="Visão geral — como a venda chega">
     <p>O TrackBase recebe vendas em 3 peças que trabalham juntas. O gateway só precisa implementar a peça 2; as demais já funcionam sozinhas:</p>
     <Table head={["Peça","O que faz","Quem instala"]} rows={[["1 · Script do navegador","Salva UTMs e cliques por 90 dias, registra PageView, ViewContent e InitiateCheckout, e leva a atribuição até o checkout.","Dono da página de vendas (1 linha de código)"],["2 · Webhook do gateway","Avisa cada venda: aprovada, pendente, reembolsada, chargeback ou cancelada. É a fonte oficial da venda.","Você (dono do gateway) — esta documentação"],["3 · Conversions API","O TrackBase repassa a venda aprovada para a Meta com o mesmo identificador (sem duplicar).","Automático, sem código extra"]]}/>
     <p>Regra de ouro: <b>compra aprovada só entra pelo webhook do gateway</b>. O endpoint de eventos do navegador recusa <code>Purchase</code> de propósito, para o número oficial sempre bater com o dinheiro real.</p>
    </Sec>
    <Sec id="script" n="Parte 2" title="Script na página de vendas">
     <p>Cole antes do fechamento do <code>&lt;/head&gt;</code> da página de vendas e do checkout. Troque <code>SUA_PUBLIC_KEY</code> pela chave do projeto (aba UTMs → Script de vendas):</p>
     <Code>{`<script async src="${H}/tracker.js?key=SUA_PUBLIC_KEY"></script>`}</Code>
     <p>O que ele faz sozinho: guarda <code>utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid</code> por 90 dias, envia <code>PageView</code> e <code>ViewContent</code>, repassa os parâmetros nos links/botões até o checkout e dispara o Pixel da Meta se houver um conectado.</p>
     <p>Botão de checkout (opcional, marca o início da compra):</p>
     <Code>{`<a href="/checkout" data-trackbase-event="InitiateCheckout" data-value="69.90" data-currency="BRL">Comprar agora</a>`}</Code>
     <p>Página de obrigado (opcional, reforça a atribuição — o webhook continua sendo obrigatório):</p>
     <Code>{`<script>TrackBase.purchase({value:69.90,currency:"BRL",externalId:"PEDIDO_ID"})</script>`}</Code>
    </Sec>
    <Sec id="webhook" n="Parte 3" title="Webhook de vendas">
     <p>Envie um <code>POST</code> com JSON para:</p>
     <Code>{`POST ${H}/api/webhooks/gateway`}</Code>
     <p>Autenticação — use UMA das 3 formas (o token é gerado na aba Gateways do SaaS, um por gateway):</p>
     <Code>{`Authorization: Bearer SEU_TOKEN\n// ou\nx-trackbase-key: SEU_TOKEN\n// ou\nPOST ${H}/api/webhooks/gateway?token=SEU_TOKEN`}</Code>
     <p>Exemplo mínimo (venda aprovada):</p>
     <Code>{`{\n  "id": "PEDIDO_123",\n  "status": "paid",\n  "amount": 69.90,\n  "currency": "BRL"\n}`}</Code>
     <p>Exemplo completo (com atribuição e dados para a CAPI):</p>
     <Code>{`{\n  "id": "PEDIDO_123",\n  "status": "paid",\n  "amount": 69.90,\n  "currency": "BRL",\n  "paid_at": "2026-09-08T12:00:00-03:00",\n  "email": "cliente@email.com",\n  "phone": "5511999999999",\n  "fbclid": "ABC123...",\n  "fbp": "fb.1.123...",
  "fbc": "fb.1.123...ABC123",\n  "tb_vid": "visitante-xyz",\n  "utm_source": "facebook",\n  "utm_campaign": "CAMPANHA|123",\n  "event_id": "meu-id-unico-123"\n}`}</Code>
     <p>Dica: o script da página já anexa <code>fbclid, fbp, fbc, tb_vid</code> e UTMs nos formulários e links do checkout — basta o gateway repassar esses campos no webhook.</p>
    </Sec>
    <Sec id="campos" n="Parte 4" title="Campos aceitos">
     <p>O TrackBase procura cada informação em vários nomes comuns. Basta enviar UM deles por linha:</p>
     <Table head={["Informação","Nomes aceitos"]} rows={[["ID da venda","transaction_hash, transactionHash, reference, reference_id, order_number, id, transaction_id, transactionId, sale_id, saleId, data.id, data.transaction.id, order.id"],["Status","status, payment_status, transaction_status, event, type, data.status, data.payment_status, data.transaction.status, order.status"],["Valor em centavos","amount_cents, amountCents, total_cents, data.amount_cents, data.transaction.amount_cents, order.total_cents"],["Valor decimal","value, amount, total, price, data.value, data.amount, data.transaction.amount, order.total"],["Moeda","currency, data.currency, data.transaction.currency (padrão BRL)"],["ID do evento","event_id, eventId, tracking.event_id, metadata.event_id, data.event_id"],["Data do pagamento","paid_at, data.paid_at"],["E-mail do cliente","email, customer.email, data.customer.email, buyer.email"],["Telefone","phone, customer.phone, data.customer.phone, buyer.phone"],["Facebook (CAPI)","fbc, fbp, fbclid (também em tracking.*, metadata.*, data.tracking.*)"],["Visitante","tb_vid (também em tracking.*, metadata.*, data.tracking.*)"],["UTMs","utm_source, utm_medium, utm_campaign, utm_content, utm_term (também em tracking.*, metadata.*, data.tracking.*)"]]}/>
    </Sec>
    <Sec id="status" n="Parte 5" title="Status — o que cada valor vira">
     <Table head={["Você envia (exemplos)","Vira no painel","Evento gerado"]} rows={[["approved, authorized, paid, completed, succeeded, settled, captured, aprovado, pago, liquidado","Aprovada","Purchase"],["pending, waiting, processing, created, initiated, in_review, awaiting, aguardando, criado","Pendente","PaymentPending"],["refund, reembols*","Reembolsada","Refund"],["chargeback, contestad*","Chargeback","Chargeback"],["cancel, failed, recusad*, expired","Cancelada","PaymentCancelled"]]}/>
     <p>Valores fora dessa lista retornam <code>HTTP 400</code> com <code>{"{"}"error": "Status de pagamento não reconhecido"{"}"}</code> e nada é salvo. Reenviar o mesmo ID atualiza a venda (mudança de pendente → aprovada funciona sozinha).</p>
    </Sec>
    <Sec id="fortpay" n="Parte 6" title="Caso especial: FortPay">
     <p>A FortPay envia o pedido aninhado: ID em <code>transaction.id</code>, valor em <code>transaction.amount</code> <b>em centavos</b> (777 = R$ 7,77), produto em <code>items[0].title</code> e UTMs em <code>tracking.*</code>:</p>
     <Code>{`{\n  "event": "transaction",\n  "status": "waiting_payment",\n  "platform": "FortPay",\n  "method": "pix",\n  "customer": {"name": "...", "email": "...", "phone": "..."},\n  "transaction": {"id": "abc123", "amount": 777},\n  "items": [{"title": "NOME DO PRODUTO", "price": "777"}],\n  "tracking": {"utm_source": "...", "utm_campaign": "NOME|ID"}\n}`}</Code>
     <p>O TrackBase usa <code>transaction.id</code> para atualizar a venda (pendente → aprovada) sem duplicar, converte centavos sozinho e mostra só o <b>nome</b> da campanha (antes do <code>|</code>). Sem UTMs, a campanha fica vazia.</p>
    </Sec>
    <Sec id="valores" n="Parte 7" title="Valores e moeda">
     <p>Se enviar valor em centavos (<code>amount_cents: 6990</code>), o TrackBase divide por 100. Se enviar decimal (<code>amount: 69.90</code>), usa direto. Valores negativos ou inválidos retornam <code>HTTP 400</code>. Moeda padrão: <code>BRL</code>.</p>
    </Sec>
    <Sec id="dedup" n="Parte 8" title="Deduplicação (evitar venda dobrada)">
     <p>Cada venda tem um <code>event_id</code>: se você não enviar, o TrackBase gera <code>purchase_ID-DA-VENDA</code> para aprovadas. O mesmo <code>event_id</code> é usado no navegador (Pixel) e no servidor (CAPI), então a Meta conta uma vez só. Reenvios com o mesmo ID da venda apenas atualizam o registro.</p>
    </Sec>
    <Sec id="respostas" n="Parte 9" title="Respostas e erros">
     <Table head={["Código","Quando","Corpo"]} rows={[["200","Venda registrada/atualizada",'{"{"}"received": true, "orderId": "...", "status": "approved", "event": "Purchase"{"}"}'],["400","JSON inválido, status desconhecido ou valor inválido",'{"{"}"error": "motivo"{"}"}'],["401","Sem token ou token inválido/revogado",'{"{"}"error": "Credencial inválida"{"}"}']]}/>
     <p>Qualquer origem pode chamar (CORS liberado). Em caso de instabilidade, reenvie: o processamento é idempotente pelo ID da venda.</p>
    </Sec>
    <Sec id="testes" n="Parte 10" title="Testando a integração">
     <p>1. Crie a credencial na aba Gateways e copie o token. 2. Envie uma venda de teste com status pendente e depois aprovada usando o mesmo ID. 3. Confira em Vendas (painel) e na lista de credenciais (coluna de último uso). 4. Para apagar o teste, exclua o projeto de teste na aba UTMs — eventos, vendas e credenciais dele são removidos juntos.</p>
    </Sec>
    <Sec id="seguranca" n="Parte 11" title="Segurança">
     <p>Um token por gateway (nunca reutilize entre plataformas). O token aparece uma única vez na criação — guarde em segredo. Para revogar, apague a credencial na aba Gateways: o webhook passa a responder 401 na hora. E-mail e telefone são gravados com hash SHA-256 antes de ir à Meta.</p>
    </Sec>
    <Sec id="faq" n="Parte 12" title="Perguntas frequentes">
     <p><b>Preciso enviar todos os campos?</b> Não — só ID, status e valor. O resto melhora atribuição e CAPI.<br/><b>E se meu gateway usa outros nomes?</b> A tabela da parte 4 cobre os mais comuns, incluindo objetos aninhados (<code>data.*</code>). Faltou algum? Fale com a equipe TrackBase que adicionamos.<br/><b>O Purchase do navegador basta?</b> Não — a venda oficial sempre vem do webhook. O navegador é apoio de atribuição.<br/><b>Quem cria o Pixel da Meta?</b> O dono da operação, dentro do SaaS (aba Pixel &amp; CAPI) — não é tarefa do gateway.</p>
    </Sec>
   </div>
  </div>
  <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">TrackBase Analytics · Documentação de integração · {H}</footer>
 </main>
}