import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchCashRegisterDetails, fetchDashboard } from "@/lib/finance";

import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const [data, cashDetails] = await Promise.all([
    fetchDashboard(cookieHeader),
    fetchCashRegisterDetails(cookieHeader),
  ]);

  return <DashboardView data={data} userRole={user.role} userName={user.name} cashDetails={cashDetails} />;
}
