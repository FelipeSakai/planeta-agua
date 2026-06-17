import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchStockPage } from "@/lib/stock";

import { StockUi } from "./stock-ui";

export default async function StockPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchStockPage(cookieHeader);

  return <StockUi userRole={user.role} data={data} />;
}
