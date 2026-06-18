"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getStockMovementTypeLabel, type StockPageResponse, type UserRole } from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/form-controls";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Toolbar } from "@/components/ui/toolbar";
import { stockAdjustmentFormToPayload, stockEntryFormToPayload } from "@/lib/stock";

import { filterAndSortStockProducts, getRecentStockMovements, type StockProductRow, type StockSort, type StockStatusFilter } from "./stock-view-model";

type StockUiProps = {
  userRole: UserRole;
  data: StockPageResponse;
};

type StockActionMode = "ENTRY" | "ADJUSTMENT";

export function StockUi({ userRole, data }: StockUiProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StockStatusFilter>("ALL");
  const [sort, setSort] = useState<StockSort>("LOWEST_STOCK");
  const firstProductId = data.products[0]?.id ?? "";
  const [selectedProductId, setSelectedProductId] = useState(firstProductId);
  const [actionMode, setActionMode] = useState<StockActionMode>("ENTRY");
  const mutationInFlight = useRef(false);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";
  const rows = filterAndSortStockProducts(data.products, data.movements, { search, status, sort });
  const recentMovements = getRecentStockMovements(data.movements);
  const activeForm = actionMode === "ENTRY" ? entryFormConfig : adjustmentFormConfig;
  const activeProductId = data.products.some((product) => product.id === selectedProductId) ? selectedProductId : firstProductId;

  function refreshStock() {
    startTransition(() => router.refresh());
  }

  async function submitEntry(formData: FormData) {
    if (!isAdmin || mutationInFlight.current) {
      return;
    }

    mutationInFlight.current = true;
    setError(null);
    setIsSaving(true);

    try {
      const payload = stockEntryFormToPayload(formData);
      const response = await fetch("/api/stock/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError("Confira produto, quantidade e motivo da entrada.");
        return;
      }

      refreshStock();
    } catch {
      setError("Confira produto, quantidade e motivo da entrada.");
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  }

  async function submitAdjustment(formData: FormData) {
    if (!isAdmin || mutationInFlight.current) {
      return;
    }

    mutationInFlight.current = true;
    setError(null);
    setIsSaving(true);

    try {
      const payload = stockAdjustmentFormToPayload(formData);
      const response = await fetch("/api/stock/adjustments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError("Confira produto, quantidade final e motivo do ajuste.");
        return;
      }

      refreshStock();
    } catch {
      setError("Confira produto, quantidade final e motivo do ajuste.");
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  }

  const columns: Array<DataTableColumn<StockProductRow>> = [
    {
      key: "product",
      header: "Produto",
      cell: (row) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{row.name}</p>
          <p className="text-xs text-[var(--muted)]">{row.isActive ? "Produto ativo" : "Produto inativo"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StockStatusBadges row={row} />,
    },
    {
      key: "current",
      header: "Atual",
      className: "whitespace-nowrap font-medium",
      cell: (row) => row.stockQuantity,
    },
    {
      key: "minimum",
      header: "Mínimo",
      className: "whitespace-nowrap text-[var(--muted)]",
      cell: (row) => row.minimumStock,
    },
    {
      key: "difference",
      header: "Diferença",
      className: "whitespace-nowrap font-medium",
      cell: (row) => <span className={row.difference < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}>{formatDifference(row.difference)}</span>,
    },
    {
      key: "lastMovement",
      header: "Última movimentação",
      cell: (row) => <LastMovement movement={row.lastMovement} />,
    },
    {
      key: "actions",
      header: "Ações",
      className: "whitespace-nowrap",
      cell: (row) => <StockRowActions isAdmin={isAdmin} productId={row.id} productName={row.name} setActionMode={setActionMode} setSelectedProductId={setSelectedProductId} />,
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Estoque"
        eyebrow="Controle"
        description="Confira saldos, veja alertas e registre entradas ou ajustes com rastreabilidade."
        actions={
          isAdmin ? (
            <>
              <Button onClick={() => setActionMode("ENTRY")}>Registrar entrada</Button>
              <Button variant="secondary" onClick={() => setActionMode("ADJUSTMENT")}>Registrar ajuste</Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Produtos" value={data.summary.totalProducts} detail="Itens acompanhados no estoque" />
        <MetricCard label="Estoque baixo" value={data.summary.lowStockProducts} detail="Abaixo do mínimo configurado" tone={data.summary.lowStockProducts > 0 ? "danger" : "success"} />
        <MetricCard label="Unidades em estoque" value={data.summary.totalUnits} detail="Soma das quantidades atuais" />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isAdmin ? (
        <Panel className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">{activeForm.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{activeForm.description}</p>
            </div>
            <Badge variant={actionMode === "ENTRY" ? "info" : "warning"}>{actionMode === "ENTRY" ? "Entrada" : "Ajuste"}</Badge>
          </div>

          <StockForm
            action={actionMode === "ENTRY" ? submitEntry : submitAdjustment}
            disabled={isSaving || isPending}
            products={data.products}
            quantityLabel={activeForm.quantityLabel}
            quantityMin={activeForm.quantityMin}
            quantityName={activeForm.quantityName}
            selectedProductId={activeProductId}
            setSelectedProductId={setSelectedProductId}
            submitLabel={activeForm.submitLabel}
            title={activeForm.title}
          />
        </Panel>
      ) : null}

      <Toolbar>
        <TextInput aria-label="Buscar produto" placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
        <SelectInput aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as StockStatusFilter)}>
          <option value="ALL">Todos</option>
          <option value="LOW">Estoque baixo</option>
          <option value="OK">OK</option>
          <option value="INACTIVE">Inativos</option>
        </SelectInput>
        <SelectInput aria-label="Ordenar" value={sort} onChange={(event) => setSort(event.target.value as StockSort)}>
          <option value="LOWEST_STOCK">Menor estoque</option>
          <option value="HIGHEST_STOCK">Maior estoque</option>
          <option value="NAME">Nome</option>
          <option value="RECENT_MOVEMENT">Movimentação recente</option>
        </SelectInput>
      </Toolbar>

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        columns={columns}
        empty={
          <EmptyState
            title={data.products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
            description={data.products.length === 0 ? "Cadastre produtos antes de movimentar o estoque." : "Ajuste a busca ou os filtros de status."}
          />
        }
        renderMobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-[var(--foreground)]">{row.name}</h2>
                <p className="text-xs text-[var(--muted)]">
                  Atual {row.stockQuantity} · mínimo {row.minimumStock}
                </p>
              </div>
              <StockStatusBadges row={row} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Diferença</dt>
                <dd className={row.difference < 0 ? "font-medium text-[var(--danger)]" : "font-medium text-[var(--success)]"}>{formatDifference(row.difference)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Última movimentação</dt>
                <dd>
                  <LastMovement movement={row.lastMovement} />
                </dd>
              </div>
            </dl>
            <StockRowActions isAdmin={isAdmin} productId={row.id} productName={row.name} setActionMode={setActionMode} setSelectedProductId={setSelectedProductId} />
          </div>
        )}
      />

      <Panel className="p-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Movimentações recentes</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Histórico compacto das últimas entradas, ajustes e saídas registradas.</p>
          </div>
          <Badge variant="neutral">{recentMovements.length} registros</Badge>
        </div>

        {recentMovements.length > 0 ? (
          <ol className="mt-4 divide-y divide-[var(--border-soft)]">
            {recentMovements.map((movement) => (
              <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between" key={movement.id}>
                <div>
                  <p className="font-medium text-[var(--foreground)]">{movement.productName}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {getStockMovementTypeLabel(movement.type)} {formatMovementQuantity(movement.quantity)} · {movement.reason ?? "Sem motivo informado"}
                  </p>
                  <p className="text-xs text-[var(--subtle)]">Registrado por {movement.userName}</p>
                </div>
                <time className="text-xs text-[var(--subtle)]" dateTime={movement.createdAt}>
                  {new Date(movement.createdAt).toLocaleString("pt-BR")}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">Nenhuma movimentação registrada ainda.</p>
        )}
      </Panel>
    </section>
  );
}

const entryFormConfig = {
  title: "Registrar entrada",
  description: "Use para compras, reposições ou recebimentos com motivo rastreável.",
  quantityName: "quantity",
  quantityLabel: "Quantidade de entrada",
  quantityMin: "1",
  submitLabel: "Salvar entrada",
} as const;

const adjustmentFormConfig = {
  title: "Registrar ajuste",
  description: "Use quando a contagem física precisar corrigir o saldo final do produto.",
  quantityName: "newQuantity",
  quantityLabel: "Quantidade final",
  quantityMin: "0",
  submitLabel: "Salvar ajuste",
} as const;

function StockForm({
  title,
  quantityName,
  quantityLabel,
  quantityMin,
  submitLabel,
  selectedProductId,
  setSelectedProductId,
  products,
  action,
  disabled,
}: {
  title: string;
  quantityName: "quantity" | "newQuantity";
  quantityLabel: string;
  quantityMin: "0" | "1";
  submitLabel: string;
  selectedProductId: string;
  setSelectedProductId: (productId: string) => void;
  products: StockPageResponse["products"];
  action: (formData: FormData) => void | Promise<void>;
  disabled: boolean;
}) {
  return (
    <form action={action} aria-label={title} className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_minmax(220px,1.2fr)_auto] lg:items-end">
      <Field label="Produto">
        <SelectInput disabled={disabled} name="productId" onChange={(event) => setSelectedProductId(event.target.value)} required value={selectedProductId}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label={quantityLabel}>
        <TextInput disabled={disabled} min={quantityMin} name={quantityName} required type="number" />
      </Field>

      <Field label="Motivo">
        <TextArea disabled={disabled} name="reason" required />
      </Field>

      <Button className="lg:mb-0.5" disabled={disabled} type="submit">
        {disabled ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function StockStatusBadges({ row }: { row: StockProductRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!row.isActive ? <Badge variant="neutral">Inativo</Badge> : null}
      {row.isLowStock ? <Badge variant="danger">Estoque baixo</Badge> : <Badge variant="success">OK</Badge>}
    </div>
  );
}

function LastMovement({ movement }: { movement: StockPageResponse["movements"][number] | null }) {
  if (!movement) {
    return <span className="text-xs text-[var(--muted)]">Sem movimentação</span>;
  }

  return (
    <div className="text-sm">
      <p className="font-medium text-[var(--foreground)]">
        {getStockMovementTypeLabel(movement.type)} {formatMovementQuantity(movement.quantity)}
      </p>
      <p className="text-xs text-[var(--muted)]">{movement.reason ?? "Sem motivo informado"}</p>
      <p className="text-xs text-[var(--subtle)]">{new Date(movement.createdAt).toLocaleString("pt-BR")}</p>
    </div>
  );
}

function StockRowActions({
  isAdmin,
  productId,
  productName,
  setActionMode,
  setSelectedProductId,
}: {
  isAdmin: boolean;
  productId: string;
  productName: string;
  setActionMode: (mode: StockActionMode) => void;
  setSelectedProductId: (productId: string) => void;
}) {
  if (!isAdmin) {
    return <span className="text-xs text-[var(--muted)]">Somente consulta</span>;
  }

  function openAction(mode: StockActionMode) {
    setSelectedProductId(productId);
    setActionMode(mode);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button aria-label={`Registrar entrada para ${productName}`} variant="secondary" onClick={() => openAction("ENTRY")}>Entrada</Button>
      <Button aria-label={`Registrar ajuste para ${productName}`} variant="ghost" onClick={() => openAction("ADJUSTMENT")}>Ajuste</Button>
    </div>
  );
}

function formatDifference(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatMovementQuantity(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
