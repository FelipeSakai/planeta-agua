import { cookies } from "next/headers";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { fetchCashRegisterToday, fetchDashboard, fetchExpenses } from "@/lib/finance";
import { paymentMethodValues } from "shared";

import { CashUi, type PaymentSummary } from "./cash-ui";

type PaymentMethod = (typeof paymentMethodValues)[number];

export default async function CaixaPage() {
  await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const cashRegister = await fetchCashRegisterToday(cookieHeader);

  if (!cashRegister) {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow="Operacao" title="Caixa de hoje" />
        <EmptyState
          title="Nenhuma venda registrada hoje"
          description="O caixa abre na primeira venda."
        />
      </section>
    );
  }

  const [dashboard, expenses] = await Promise.all([
    fetchDashboard(cookieHeader),
    fetchExpenses({ cookieHeader, startDate: cashRegister.date, endDate: cashRegister.date }),
  ]);

  const summary: PaymentSummary[] = paymentMethodValues.map((method: PaymentMethod) => {
    const salesCents =
      dashboard.totalsByPaymentMethod.find((total) => total.method === method)?.amountCents ?? 0;
    const expensesCents = expenses
      .filter((expense) => expense.paymentMethod === method)
      .reduce((sum, expense) => sum + expense.amountCents, 0);
    const expectedCents =
      method === "CASH"
        ? Math.max(0, cashRegister.openingBalanceCents + salesCents - expensesCents)
        : Math.max(0, salesCents - expensesCents);

    return { method, salesCents, expensesCents, expectedCents };
  });

  return <CashUi cashRegister={cashRegister} summary={summary} />;
}
