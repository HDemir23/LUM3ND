import { redirect, notFound } from "next/navigation";
import { roleSession } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import OrderDetail from "@/components/order-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await roleSession("user");
  if (!session?.wallet) redirect("/login");
  const { id } = await params;
  const o = await getOrder(id, session.wallet).catch(() => null);
  if (!o) notFound();
  return <OrderDetail initial={JSON.parse(JSON.stringify(o))} />;
}
