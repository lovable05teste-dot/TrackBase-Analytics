// Pedidos são a fonte do status atual; eventos são o histórico financeiro.
export type SaleOrder = { id:string; projectId:string; provider:string; externalId:string; eventId:string|null; status:string; value:number; currency:string; createdAt:number; utmSource:string|null; utmCampaign:string|null };
export type SaleEvent = { id:string; projectId:string; eventId:string; eventName:string; occurredAt:number; value:number|null; currency:string|null; source:string; visitorId:string|null; utmSource:string|null; utmCampaign:string|null; product:string; payment:string; country:string; payload?:string|null };
export function sumMoney(rows: Array<{value:number|null}>) {
  return rows.reduce((sum,row)=>sum+(Number.isFinite(Number(row.value))?Math.round(Number(row.value)*100):0),0)/100;
}
export function reconcileSales<T extends SaleEvent>(orders:SaleOrder[], events:T[], range:{start:number;end:number}, isTest:(event:T)=>boolean, source:string|null, product:string|null) {
  const saleNames=new Set(['Purchase','PaymentPending','PaymentCancelled','Refund','Chargeback']);
  const aliases=new Map<string,SaleOrder|null>();
  for(const order of orders) {
    const provider=order.provider.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'gateway';
    const suffix=order.status==='approved'?'':`_${order.status}`;
    const base=order.eventId&&suffix&&order.eventId.endsWith(suffix)?order.eventId.slice(0,-suffix.length):order.eventId;
    const ids=[`purchase_${provider}_${order.externalId}`, ...['pending','cancelled','refunded','chargeback'].map(status=>`gw_${provider}_${order.externalId}_${status}`),order.eventId,base,...(base?['pending','cancelled','refunded','chargeback'].map(status=>`${base}_${status}`):[])];
    for(const id of ids.filter(Boolean)) {
      const key=`${order.projectId}:${id}`;
      if(aliases.has(key)&&aliases.get(key)?.id!==order.id) aliases.set(key,null);
      else aliases.set(key,order);
    }
  }
  const externalOrders=new Map<string,SaleOrder|null>();
  for(const o of orders) {
    const key=`${o.projectId}:${o.externalId}`;
    externalOrders.set(key,externalOrders.has(key)?null:o);
  }
  const orderFor=(e:T)=>{
    const direct=aliases.get(`${e.projectId}:${e.eventId}`);
    if(direct)return direct;
    let body:Record<string,unknown>={};
    try{body=JSON.parse(e.payload||'{}')}catch{}
    for(const path of ['transaction_hash','transactionHash','transaction.id','reference','reference_id','order_number','id','transaction_id','transactionId','sale_id','saleId','data.id','data.transaction.id','order.id']) {
      let value:unknown=body;
      for(const part of path.split('.'))value=value&&typeof value==='object'?(value as Record<string,unknown>)[part]:undefined;
      if(value!==undefined&&value!==null&&value!=='')return externalOrders.get(`${e.projectId}:${String(value)}`);
    }
    return undefined;
  };
  const testOrders=new Set(events.filter(isTest).map(e=>orderFor(e)?.id).filter(Boolean));
  const metadata=new Map<string,T>();
  for(const e of [...events].sort((a,b)=>a.occurredAt-b.occurredAt)) {
    const order=orderFor(e);
    if(order&&!isTest(e)) {
      const prev=metadata.get(order.id);
      metadata.set(order.id,{...e,product:e.product==='Sem produto'?prev?.product||e.product:e.product,payment:e.payment==='Não informado'?prev?.payment||e.payment:e.payment,country:e.country==='Sem país'?prev?.country||e.country:e.country});
    }
  }
  const matches=(e:{utmSource:string|null;product:string})=>(!source||(e.utmSource||'Direto')===source)&&(!product||e.product===product);
  const initiated=orders.filter(o=>o.createdAt>=range.start&&o.createdAt<=range.end&&!testOrders.has(o.id)).map(o=>({...o,product:metadata.get(o.id)?.product||'Sem produto',payment:metadata.get(o.id)?.payment||'Não informado',country:metadata.get(o.id)?.country||'Sem país'})).filter(matches);
  const pending=initiated.filter(o=>o.status==='pending');
  // Um pedido por tipo de evento, mesmo se o gateway reenviar com outro event_id.
  const unique=new Map<string,T>();
  for(const e of [...events].sort((a,b)=>a.occurredAt-b.occurredAt)) {
    const o=orderFor(e);
    if(!saleNames.has(e.eventName)||e.eventName==='PaymentPending'||isTest(e)||(o&&testOrders.has(o.id)))continue;
    const key=`${e.projectId}:${o?.id||e.eventId}:${e.eventName}`;
    if(!unique.has(key))unique.set(key,{...e,utmSource:o?.utmSource||e.utmSource,utmCampaign:o?.utmCampaign||e.utmCampaign,product:o?metadata.get(o.id)?.product||e.product:e.product});
  }
  const financial=[...unique.values()].filter(e=>e.occurredAt>=range.start&&e.occurredAt<=range.end&&matches(e));
  const paidInitiated=initiated.filter(o=>['approved','refunded','chargeback'].includes(o.status)).length;
  return {initiated,pending,financial,approvalRate:initiated.length?paidInitiated/initiated.length*100:null};
}
