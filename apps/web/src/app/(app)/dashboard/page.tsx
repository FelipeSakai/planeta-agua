import Link from "next/link";
import { cookies } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
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
  const maxPaymentAmount = Math.max(...data.totalsByPaymentMethod.map((total) => total.amountCents), 0);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Panel className="flex min-h-56 flex-col justify-between bg-[var(--foreground)] p-6 text-white">
          <div>
            <p className="text-sm text-white/70">{userName ? `Bom dia, ${userName}` : "Resumo do dia"}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Pronto para vender</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Inicie a venda, acompanhe entregas e confira o caixa sem procurar pelos atalhos.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/vendas"
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)]"
            >
              Comecar venda
            </Link>
            <Link
              href="/entregas"
              className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ver entregas
            </Link>
            <Link
              href="/caixa"
              className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ver caixa
            </Link>
            <Link
              href="/produtos"
              className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Produtos
            </Link>
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Pendencias agora</h2>
          <div className="mt-4 grid gap-3">
            <OperationalStatusRow label="Entregas pendentes" value={data.pendingDeliveriesTotal} href="/entregas" />
            <OperationalStatusRow label="Estoque critico" value={lowStockCount} href={canOpenStock ? "/estoque" : undefined} />
            <OperationalStatusRow label="Caixa" value={cashRegisterStatus} href="/caixa" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Vendas hoje"
          value={data.todaySalesCount}
          detail={formatCentsToBRL(data.todayRevenueCents)}
        />
        <MetricCard
          label="Entregas pendentes"
          value={data.pendingDeliveriesTotal}
          detail="Aguardando confirmacao"
          tone={data.pendingDeliveriesTotal > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Estoque critico"
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
            <h2 className="text-base font-semibold text-[var(--foreground)]">Resumo por pagamento</h2>
            <p className="text-sm text-[var(--muted)]">
              Distribuicao das vendas concluidas hoje por forma de pagamento.
            </p>
          </div>

          {data.totalsByPaymentMethod.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {data.totalsByPaymentMethod.map((total) => (
                <li key={total.method} className="py-3">
                  <div className="flex items-center justify-between gap-3">
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
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--card-muted)]">
                    <div
                      className="payment-bar h-full rounded-full bg-[var(--brand)]"
                      style={{
                        width: `${maxPaymentAmount > 0 ? Math.max(8, (total.amountCents / maxPaymentAmount) * 100) : 0}%`,
                      }}
                    />
                  </div>
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
    </section>
  );
}

function OperationalStatusRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] px-3 py-2">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <strong className="text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function formatTimeOfDay(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
