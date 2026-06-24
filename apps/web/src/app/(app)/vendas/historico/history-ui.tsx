"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatCentsToBRL,
  paymentMethodValues,
  saleHistoryResponseSchema,
  type SaleDetailResponse,
  type UserRole,
} from "shared";
import { z } from "zod";

import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { cancelSalePayload, confirmSaleDelivery } from "@/lib/sales";

type SaleHistoryEntry = z.infer<typeof saleHistoryResponseSchema>[number];
type PaymentMethod = (typeof paymentMethodValues)[number];
type SaleStatus = SaleHistoryEntry["status"];
type HistoryFilter = SaleStatus | undefined;

type HistoryUiProps = {
  userRole: UserRole;
  history: SaleHistoryEntry[];
  activeFilter: HistoryFilter;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

const statusLabels: Record<SaleStatus, string> = {
  COMPLETED: "Concluida",
  PENDING_DELIVERY: "Pendente de entrega",
  CANCELED: "Cancelada",
};

const statusBadgeVariants: Record<SaleStatus, "success" | "warning" | "danger"> = {
  COMPLETED: "success",
  PENDING_DELIVERY: "warning",
  CANCELED: "danger",
};

const statusFilters: Array<{ label: string; href: string; value: HistoryFilter }> = [
  { label: "Todos", href: "/vendas/historico", value: undefined },
  { label: "Concluidas", href: "/vendas/historico?status=COMPLETED", value: "COMPLETED" },
  { label: "Pendentes de entrega", href: "/vendas/historico?status=PENDING_DELIVERY", value: "PENDING_DELIVERY" },
  { label: "Canceladas", href: "/vendas/historico?status=CANCELED", value: "CANCELED" },
];

export function HistoryUi({ history, activeFilter }: HistoryUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [actingSaleId, setActingSaleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<SaleDetailResponse | null>(null);

  const visibleHistory = useMemo(() => {
    if (!showTodayOnly) {
      return history;
    }
    const today = new Date();
    return history.filter((sale) => isSameDay(new Date(sale.createdAt), today));
  }, [history, showTodayOnly]);

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  async function handleConfirmDelivery(saleId: string) {
    if (actingSaleId) {
      return;
    }
    setError(null);
    setActingSaleId(saleId);
    try {
      await confirmSaleDelivery(saleId);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nao foi possivel confirmar a entrega.");
    } finally {
      setActingSaleId(null);
    }
  }

  async function handleCancel(saleId: string) {
    if (actingSaleId) {
      return;
    }
    const reason = window.prompt("Motivo do cancelamento (minimo 3 caracteres):");
    if (!reason) {
      return;
    }
    setError(null);
    setActingSaleId(saleId);
    try {
      const payload = cancelSalePayload(reason);
      const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? "Nao foi possivel cancelar a venda.");
        return;
      }
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nao foi possivel cancelar a venda.");
    } finally {
      setActingSaleId(null);
    }
  }

  async function handlePrint(saleId: string) {
    setError(null);

    try {
      const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}`);
      if (!response.ok) {
        setError("Nao foi possivel carregar o recibo.");
        return;
      }
      const detail = await response.json() as SaleDetailResponse;
      setPrintSale(detail);
      setTimeout(() => printRecibo(), 100);
    } catch {
      setError("Nao foi possivel carregar o recibo.");
    }
  }

  function renderActions(row: SaleHistoryEntry) {
    if (row.status === "CANCELED") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button className="no-print" variant="secondary" onClick={() => void handlePrint(row.id)}>
            Imprimir
          </Button>
          <span className="text-sm text-[var(--muted)]">Cancelada</span>
        </div>
      );
    }

    const isActing = actingSaleId === row.id || isPending;

    return (
      <div className="flex flex-wrap gap-2">
        <Button className="no-print" variant="secondary" onClick={() => void handlePrint(row.id)} disabled={isActing}>
          Imprimir
        </Button>
        {row.status === "PENDING_DELIVERY" ? (
          <Button
            disabled={isActing}
            onClick={() => handleConfirmDelivery(row.id)}
            variant="secondary"
          >
            Confirmar entrega
          </Button>
        ) : null}
        <Button
          disabled={isActing}
          onClick={() => handleCancel(row.id)}
          variant="ghost"
        >
          Cancelar venda
        </Button>
      </div>
    );
  }

  const columns: Array<DataTableColumn<SaleHistoryEntry>> = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (row) => row.customerName ?? "Consumidor final",
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => formatCentsToBRL(row.totalAmountCents),
    },
    {
      key: "pagamento",
      header: "Pagamento",
      cell: (row) => paymentMethodLabels[row.paymentMethod],
    },
    {
      key: "entregador",
      header: "Entregador",
      cell: (row) => row.driverName ?? "-",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <Badge variant={statusBadgeVariants[row.status]}>{statusLabels[row.status]}</Badge>,
    },
    {
      key: "horario",
      header: "Horario",
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "acoes",
      header: "Acoes",
      className: "text-right",
      cell: (row) => <div className="flex flex-wrap justify-end gap-2">{renderActions(row)}</div>,
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Operacao" title="Historico de vendas" />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {printSale ? <PrintRecibo sale={printSale} /> : null}

      <Panel className="p-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const isActive = !showTodayOnly && activeFilter === filter.value;
            return (
              <Link
                key={filter.label}
                href={filter.href}
                className={filterTabClassName(isActive)}
                onClick={() => setShowTodayOnly(false)}
              >
                {filter.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setShowTodayOnly((current) => !current)}
            className={filterTabClassName(showTodayOnly)}
          >
            Hoje
          </button>
        </div>
      </Panel>

      <DataTable
        rows={visibleHistory}
        rowKey={(row) => row.id}
        columns={columns}
        empty={
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Ajuste os filtros ou registre uma nova venda."
          />
        }
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-[var(--foreground)]">{row.customerName ?? "Consumidor final"}</p>
              <Badge variant={statusBadgeVariants[row.status]}>{statusLabels[row.status]}</Badge>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {formatCentsToBRL(row.totalAmountCents)} · {paymentMethodLabels[row.paymentMethod]}
            </p>
            {row.driverName ? (
              <p className="text-xs text-[var(--muted)]">Entregador: {row.driverName}</p>
            ) : null}
            <p className="text-xs text-[var(--muted)]">{formatDateTime(row.createdAt)}</p>
            <div className="pt-2">{renderActions(row)}</div>
          </div>
        )}
      />
    </section>
  );
}

function filterTabClassName(isActive: boolean) {
  return [
    "inline-flex min-h-9 items-center justify-center rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition duration-150",
    isActive
      ? "bg-[var(--brand)] text-white"
      : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  ].join(" ");
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
