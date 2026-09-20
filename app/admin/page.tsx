import { redirect } from "next/navigation";
import { roleSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Admin from "@/components/admin";
export default async function Page() {
  if (!(await roleSession("admin"))) redirect("/login?role=admin");
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true, stores: true, address: true,
      attempts: {
        select: { hash: true, state: true, maxTime: true, payer: true },
      },
    },
    take: 100,
  });
  return <Admin initial={JSON.parse(JSON.stringify(orders))} />;
}
