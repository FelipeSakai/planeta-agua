import Link from "next/link";
import { cookies } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { requireUser } from "@/lib/auth";
import { fetchCashRegisterDetails, fetchDashboard } from "@/lib/finance";
import {
  formatCentsToBRL,
  paymentMethodValues,
  type CashRegisterDetailsResponse,
  type DashboardResponse,
  type UserRole,
} from "shared";

type PaymentMethod = (typeof paymentMethodValues)[number];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

const recentSaleStatusLabels: Record<DashboardResponse["recentSales"][number]["status"], string> = {
  COMPLETED: "Concluida",
  PENDING_DELIVERY: "Pendente de entrega",
  CANCELED: "Cancelada",
};

function formatTimeOfDay(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

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

export function DashboardView({
  data,
  userRole,
  userName,
  cashDetails,
}: Readonly<{
  data: DashboardResponse;
  userRole: UserRole;
  userName: string | null;
  cashDetails: CashRegisterDetailsResponse | null;
}>) {
  void userName;
  const canOpenStock = userRole === "ADMIN";
  const lowStockCount = data.lowStockProducts.length;
  const lowStockTone = lowStockCount > 0 ? ("warning" as const) : ("success" as const);
  const lowStockDetail =
    lowStockCount > 0
      ? `${lowStockCount} produto${lowStockCount > 1 ? "s" : ""} abaixo do minimo`
      : "Nenhum produto abaixo do minimo";
  const cashRegisterStatus = cashDetails?.cashRegister?.closedAt
    ? "Fechado"
    : cashDetails?.cashRegister
      ? "Aberto"
      : "Nao aberto";
  const cashStatusTone = cashRegisterStatus === "Aberto" ? ("success" as const) : ("warning" as const);
  const cashSalesCents = cashDetails?.totalSalesCents ?? 0;
  const cashExpensesCents = cashDetails?.totalExpensesCents ?? 0;
  const expectedCashCents = cashDetails?.expectedCashCents ?? 0;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Resumo operacional"
        description="Acompanhe o dia da loja, veja alertas e acesse os fluxos principais."
        actions={
          <Link href="/vendas">
            <Button type="button">Nova venda</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Faturamento hoje"
          value={formatCentsToBRL(data.todayRevenueCents)}
          detail="Entradas confirmadas no dia"
        />
        <MetricCard
          label="Vendas hoje"
          value={data.todaySalesCount}
          detail={data.todaySalesCount > 0 ? "Vendas registradas hoje" : "Aguardando registros de venda"}
        />
        <MetricCard
          label="Estoque baixo"
          value={lowStockCount}
          detail={lowStockDetail}
          tone={lowStockTone}
        />
      </div>

      <Panel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Caixa de hoje</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Vendas {formatCentsToBRL(cashSalesCents)} · Despesas {formatCentsToBRL(cashExpensesCents)}
            </p>
          </div>
          <Badge variant={cashStatusTone}>{cashRegisterStatus}</Badge>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
          Saldo esperado: {formatCentsToBRL(expectedCashCents)}
        </p>
      </Panel>

      {data.pendingDeliveries.length > 0 ? (
        <Panel className="p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Entregas pendentes</h2>
              <p className="text-sm text-[var(--muted)]">
                Vendas que ainda precisam de confirmacao individual.
              </p>
            </div>
            <Link href="/entregas" className="text-sm font-medium text-[var(--brand)] hover:underline">
              Ver entregas
            </Link>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {data.pendingDeliveries.map((delivery) => (
              <li key={delivery.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {delivery.customerName ?? "Consumidor"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {delivery.customerAddress ?? "Endereco nao informado"} · {delivery.driverName ?? "Sem entregador"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCentsToBRL(delivery.totalAmountCents)}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{paymentMethodLabels[delivery.paymentMethod]}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-4">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Total por pagamento</h2>
            <p className="text-sm text-[var(--muted)]">
              Distribuicao das vendas concluidas hoje por forma de pagamento.
            </p>
          </div>

          {data.totalsByPaymentMethod.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {data.totalsByPaymentMethod.map((total) => (
                <li key={total.method} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {paymentMethodLabels[total.method]}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {total.salesCount} venda{total.salesCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCentsToBRL(total.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Sem vendas hoje."
              description="Os totais por forma de pagamento apareceram aqui conforme as vendas forem registradas."
            />
          )}
        </Panel>

        <Panel className="p-4">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Estoque baixo</h2>
            <p className="text-sm text-[var(--muted)]">Produtos abaixo do minimo aparecerao aqui.</p>
          </div>

          {data.lowStockProducts.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {data.lowStockProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{product.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Atual: {product.stockQuantity} · Minimo: {product.minimumStock}
                    </p>
                  </div>
                  {canOpenStock ? (
                    <Link
                      href="/estoque"
                      className="text-sm font-medium text-[var(--brand)] hover:underline"
                    >
                      Reposicao
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nenhum produto abaixo do minimo"
              description="Quando houver estoque baixo, o alerta ficara visivel neste painel."
            />
          )}
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Ultimas vendas</h2>
          <p className="text-sm text-[var(--muted)]">Movimento recente do dia.</p>
        </div>

        {data.recentSales.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {data.recentSales.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {sale.customerName ?? "Consumidor"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {paymentMethodLabels[sale.paymentMethod]} · {recentSaleStatusLabels[sale.status]} ·{" "}
                    {formatTimeOfDay(sale.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {formatCentsToBRL(sale.totalAmountCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nenhuma venda registrada hoje"
            description="As ultimas vendas aparecerao aqui assim que o operador finalizar o primeiro movimento."
          />
        )}
      </Panel>

      <Panel className="p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Atalhos operacionais</h2>
          <p className="text-sm text-[var(--muted)]">
            Acesse rapidamente os fluxos mais usados na rotina da loja.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/vendas">
            <Button className="w-full" type="button">
              Nova venda
            </Button>
          </Link>
          <Link href="/produtos">
            <Button className="w-full" type="button" variant="secondary">
              Produtos
            </Button>
          </Link>
          {canOpenStock ? (
            <Link href="/estoque">
              <Button className="w-full" type="button" variant="secondary">
                Estoque
              </Button>
            </Link>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}
