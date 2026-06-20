import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchSalesHistory } from "@/lib/sales";

import { HistoryUi } from "./history-ui";

type SearchParams = Promise<{ status?: string }>;

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const { status } = await searchParams;
  const history = await fetchSalesHistory(cookieHeader, status ? { status } : undefined);

  return (
    <HistoryUi
      userRole={user.role}
      history={history}
      activeFilter={(status as "COMPLETED" | "CANCELED" | "PENDING_DELIVERY" | undefined) ?? undefined}
    />
  );
}
