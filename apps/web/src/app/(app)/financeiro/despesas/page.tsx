import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchExpenses } from "@/lib/finance";

import { ExpensesUi } from "./expenses-ui";

export default async function DespesasPage() {
  await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const expenses = await fetchExpenses({ cookieHeader });

  return <ExpensesUi expenses={expenses} />;
}
