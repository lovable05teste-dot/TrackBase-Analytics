// Clientes = compradores agrupados por e-mail (ou telefone, quando não há e-mail).
// Receita e compras contam só pedidos aprovados; pendentes aparecem à parte.

export type CustomerOrder = {
  externalId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  value: number;
  currency: string;
  createdAt: number;
};

export type Customer = {
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  approvedCount: number;
  pendingCount: number;
  revenue: number;
  averageTicket: number;
  firstOrderAt: number;
  lastOrderAt: number;
  currency: string;
};

export function customerKey(order: Pick<CustomerOrder, "customerEmail" | "customerPhone">): string | null {
  const email = order.customerEmail?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = order.customerPhone?.replace(/\D/g, "");
  if (phone && phone.length >= 8) return `phone:${phone}`;
  return null;
}

export function aggregateCustomers(orders: CustomerOrder[]): Customer[] {
  const byKey = new Map<string, Customer>();
  for (const o of orders) {
    const key = customerKey(o);
    if (!key) continue;
    let c = byKey.get(key);
    if (!c) {
      c = {
        key,
        name: null,
        email: o.customerEmail?.trim().toLowerCase() || null,
        phone: o.customerPhone?.trim() || null,
        approvedCount: 0,
        pendingCount: 0,
        revenue: 0,
        averageTicket: 0,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
        currency: o.currency,
      };
      byKey.set(key, c);
    }
    // Nome mais recente que não estiver vazio.
    if (o.customerName?.trim()) c.name = o.customerName.trim();
    if (!c.email && o.customerEmail) c.email = o.customerEmail.trim().toLowerCase();
    if (!c.phone && o.customerPhone) c.phone = o.customerPhone.trim();
    c.firstOrderAt = Math.min(c.firstOrderAt, o.createdAt);
    c.lastOrderAt = Math.max(c.lastOrderAt, o.createdAt);
    if (o.status === "approved") {
      c.approvedCount++;
      c.revenue += Number(o.value) || 0;
    } else if (o.status === "pending") {
      c.pendingCount++;
    }
  }
  const list = [...byKey.values()].map((c) => ({ ...c, averageTicket: c.approvedCount ? c.revenue / c.approvedCount : 0, revenue: Math.round(c.revenue * 100) / 100 }));
  return list.sort((a, b) => b.revenue - a.revenue || b.lastOrderAt - a.lastOrderAt);
}
