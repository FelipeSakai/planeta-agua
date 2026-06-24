import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchSaleDetail, fetchSalesHistory } from "@/lib/sales";

import { DeliveriesUi } from "./deliveries-ui";

export default async function EntregasPage() {
  await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const history = await fetchSalesHistory(cookieHeader, { status: "PENDING_DELIVERY" });
  const deliveries = await Promise.all(history.map((sale) => fetchSaleDetail(cookieHeader, sale.id)));

  return <DeliveriesUi deliveries={deliveries} />;
}
