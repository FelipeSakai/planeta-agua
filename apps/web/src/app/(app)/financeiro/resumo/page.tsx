import { cookies } from "next/headers";

import { requireRole } from "@/lib/auth";
import { fetchFinanceSummary } from "@/lib/finance";

import { SummaryUi } from "./summary-ui";

type SearchParams = Promise<{ startDate?: string; endDate?: string }>;

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function FinanceSummaryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["ADMIN"]);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const { startDate, endDate } = await searchParams;
  const today = todayDateString();
  const effectiveStartDate = startDate ?? today;
  const effectiveEndDate = endDate ?? today;

  const summary = await fetchFinanceSummary(cookieHeader, effectiveStartDate, effectiveEndDate);

  return (
    <SummaryUi summary={summary} startDate={effectiveStartDate} endDate={effectiveEndDate} />
  );
}
