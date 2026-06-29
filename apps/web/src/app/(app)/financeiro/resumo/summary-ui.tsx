"use client";

import Link from "next/link";
import {
  formatCentsToBRL,
  paymentMethodValues,
  type FinanceSummaryResponse,
} from "shared";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

type PaymentMethod = (typeof paymentMethodValues)[number];
type PaymentMethodRow = FinanceSummaryResponse["totalsByPaymentMethod"][number];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

type PeriodKey = "HOJE" | "SEMANA" | "MES";

type PeriodOption = {
  key: PeriodKey;
  label: string;
  startDate: string;
  endDate: string;
  href: string;
};

type SummaryUiProps = {
  summary: FinanceSummaryResponse;
  startDate: string;
  endDate: string;
};

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPeriodOptions(now: Date): PeriodOption[] {
  const todayStr = toDateString(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 29);

  const weekStartStr = toDateString(weekStart);
  const monthStartStr = toDateString(monthStart);

  return [
    {
      key: "HOJE",
      label: "Hoje",
      startDate: todayStr,
      endDate: todayStr,
      href: "/financeiro/resumo",
    },
    {
      key: "SEMANA",
      label: "Semana",
      startDate: weekStartStr,
      endDate: todayStr,
      href: `/financeiro/resumo?startDate=${weekStartStr}&endDate=${todayStr}`,
    },
    {
      key: "MES",
      label: "Mes",
      startDate: monthStartStr,
      endDate: todayStr,
      href: `/financeiro/resumo?startDate=${monthStartStr}&endDate=${todayStr}`,
    },
  ];
}

function filterTabClassName(isActive: boolean) {
  return [
    "inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition duration-150",
    isActive
      ? "bg-[var(--brand)] text-white"
      : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  ].join(" ");
}

export function SummaryUi({ summary, startDate, endDate }: SummaryUiProps) {
  const periodOptions = buildPeriodOptions(new Date());
  const activePeriod = periodOptions.find(
    (option) => option.startDate === startDate && option.endDate === endDate,
  );
  const balanceTone = summary.balanceCents >= 0 ? "success" : "danger";
  const balanceDetail =
    summary.balanceCents >= 0 ? "Saldo positivo no periodo" : "Saidas acima das entradas";

  const columns: Array<DataTableColumn<PaymentMethodRow>> = [
    {
      key: "method",
      header: "Metodo",
      cell: (row) => (
        <p className="font-medium text-[var(--foreground)]">{paymentMethodLabels[row.method]}</p>
      ),
    },
    {
      key: "revenue",
      header: "Entradas",
      className: "whitespace-nowrap font-medium",
      cell: (row) => formatCentsToBRL(row.revenueCents),
    },
    {
      key: "expenses",
      header: "Saidas",
      className: "whitespace-nowrap text-[var(--muted)]",
      cell: (row) => formatCentsToBRL(row.expensesCents),
    },
    {
      key: "balance",
      header: "Saldo",
      className: "whitespace-nowrap font-medium",
      cell: (row) => (
        <span className={row.balanceCents < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}>
          {formatCentsToBRL(row.balanceCents)}
        </span>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Resumo financeiro"
        description="Acompanhe entradas, saidas e o saldo do periodo selecionado."
      />

      <Panel className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Periodo</h2>
            <p className="text-sm text-[var(--muted)]">
              Escolha um periodo para atualizar o resumo financeiro.
            </p>
          </div>
          <nav aria-label="Filtro de periodo" className="flex flex-wrap gap-2">
            {periodOptions.map((option) => {
              const isActive = activePeriod?.key === option.key;
              return (
                <Link
                  key={option.key}
                  href={option.href}
                  aria-current={isActive ? "page" : undefined}
                  className={filterTabClassName(isActive)}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Entradas"
          value={formatCentsToBRL(summary.totalRevenueCents)}
          detail="Total de entradas no periodo"
        />
        <MetricCard
          label="Saidas"
          value={formatCentsToBRL(summary.totalExpensesCents)}
          detail="Total de saidas no periodo"
        />
        <MetricCard
          label="Saldo"
          value={formatCentsToBRL(summary.balanceCents)}
          detail={balanceDetail}
          tone={balanceTone}
        />
      </div>

      <Panel className="p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Totais por forma de pagamento
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Entradas, saidas e saldo por metodo no periodo selecionado.
          </p>
        </div>

        <DataTable
          rows={summary.totalsByPaymentMethod}
          rowKey={(row) => row.method}
          columns={columns}
          empty={
            <EmptyState
              title="Nenhum movimento no periodo"
              description="Os totais por forma de pagamento apareceram aqui conforme vendas e despesas forem registradas."
            />
          }
          renderMobileCard={(row) => (
            <div className="space-y-2">
              <p className="font-medium text-[var(--foreground)]">
                {paymentMethodLabels[row.method]}
              </p>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Entradas</dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {formatCentsToBRL(row.revenueCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Saidas</dt>
                  <dd className="text-[var(--foreground)]">
                    {formatCentsToBRL(row.expensesCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Saldo</dt>
                  <dd
                    className={
                      row.balanceCents < 0
                        ? "font-medium text-[var(--danger)]"
                        : "font-medium text-[var(--success)]"
                    }
                  >
                    {formatCentsToBRL(row.balanceCents)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        />
      </Panel>
    </section>
  );
}
