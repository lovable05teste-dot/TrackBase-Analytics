// Receita líquida a partir dos pedidos (status atual de cada um).
// Aprovado conta como venda e receita. Reembolso e chargeback saem da receita
// e da contagem de vendas, e aparecem à parte. Pendente não é receita.
export type OrderLike = { provider: string; status: string; value: number };

export type NetRevenue = {
  sales: number;
  revenue: number;
  refundedSales: number;
  refundedRevenue: number;
  pendingSales: number;
  pendingRevenue: number;
  byProvider: Record<string, { sales: number; revenue: number }>;
};

export function netRevenue(orders: OrderLike[]): NetRevenue {
  const out: NetRevenue = { sales: 0, revenue: 0, refundedSales: 0, refundedRevenue: 0, pendingSales: 0, pendingRevenue: 0, byProvider: {} };
  for (const o of orders) {
    const value = Number(o.value) || 0;
    if (o.status === "approved") {
      out.sales++;
      out.revenue += value;
      const p = (out.byProvider[o.provider] ??= { sales: 0, revenue: 0 });
      p.sales++;
      p.revenue += value;
    } else if (o.status === "refunded" || o.status === "chargeback") {
      out.refundedSales++;
      out.refundedRevenue += value;
    } else if (o.status === "pending") {
      out.pendingSales++;
      out.pendingRevenue += value;
    }
  }
  out.revenue = Math.round(out.revenue * 100) / 100;
  out.refundedRevenue = Math.round(out.refundedRevenue * 100) / 100;
  return out;
}
