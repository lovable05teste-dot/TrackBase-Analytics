import { PrivateSection } from "../private-section";
import { NotificationsBell } from "../notifications-bell";
export const dynamic = "force-dynamic";
export default function Page() {
  return <PrivateSection title="Notificações" description="Vendas recentes, aviso no celular, o que avisar e som da venda."><NotificationsBell inline /></PrivateSection>;
}
