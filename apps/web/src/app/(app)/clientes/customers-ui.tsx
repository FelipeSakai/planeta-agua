"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  formatCentsToBRL,
  paymentMethodValues,
  type CustomerBottleResponse,
  type CustomerDetailResponse,
  type CustomerResponse,
  type UserRole,
} from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/form-controls";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";
import { formatBottleExpiration, getBottleAlertVariant } from "@/lib/customers";

type PaymentMethod = (typeof paymentMethodValues)[number];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

const saleStatusLabels: Record<string, string> = {
  COMPLETED: "Concluida",
  CANCELED: "Cancelada",
  PENDING_DELIVERY: "Entrega pendente",
};

const saleStatusBadgeVariants: Record<string, "success" | "danger" | "warning"> = {
  COMPLETED: "success",
  CANCELED: "danger",
  PENDING_DELIVERY: "warning",
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type DrawerMode = "closed" | "view" | "create" | "edit";
type TabKey = "data" | "bottles" | "sales";

type CustomersUiProps = {
  userRole: UserRole;
  customers: CustomerResponse[];
  summary: { total: number; active: number; withAlert: number };
};

export function CustomersUi({ userRole, customers, summary }: CustomersUiProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("closed");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [bottleFormOpen, setBottleFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAdmin = userRole === "ADMIN";
  const filteredCustomers = customers.filter((customer) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return customer.name.toLowerCase().includes(term) || (customer.phone?.toLowerCase().includes(term) ?? false) || (customer.mobilePhone?.toLowerCase().includes(term) ?? false);
  });

  function closeDrawer() {
    setDrawerMode("closed");
    setSelectedCustomer(null);
    setCustomerDetail(null);
    setActiveTab("data");
    setError(null);
    setDuplicateWarning(null);
    setBottleFormOpen(false);
  }

  function openCreateDrawer() {
    setSelectedCustomer(null);
    setCustomerDetail(null);
    setActiveTab("data");
    setError(null);
    setDuplicateWarning(null);
    setDrawerMode("create");
  }

  function refreshData() {
    startTransition(() => router.refresh());
  }

  async function openViewDrawer(customer: CustomerResponse) {
    setSelectedCustomer(customer);
    setActiveTab("data");
    setError(null);
    setDuplicateWarning(null);
    setDrawerMode("view");
    setIsLoadingDetail(true);

    try {
      const response = await fetch(`/api/customers/${customer.id}`);
      if (!response.ok) {
        setError("Nao foi possivel carregar os detalhes do cliente.");
        return;
      }
      const data = (await response.json()) as CustomerDetailResponse;
      setCustomerDetail(data);
    } catch {
      setError("Nao foi possivel carregar os detalhes do cliente.");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function switchToEdit() {
    setDrawerMode("edit");
    setError(null);
    setDuplicateWarning(null);
  }

  async function saveCustomer(formData: FormData) {
    if (isSaving) return;
    setError(null);
    setDuplicateWarning(null);
    setIsSaving(true);

    try {
      const name = String(formData.get("name") ?? "").trim();
      const phone = String(formData.get("phone") ?? "").trim() || null;
      const mobilePhone = String(formData.get("mobilePhone") ?? "").trim() || null;
      const address = String(formData.get("address") ?? "").trim() || null;
      const notes = String(formData.get("notes") ?? "").trim() || null;

      const body = { name, phone, mobilePhone, address, notes };

      if (drawerMode === "create") {
        const dupParams = new URLSearchParams({ name });
        if (phone) dupParams.set("phone", phone);
        if (mobilePhone) dupParams.set("mobilePhone", mobilePhone);
        const dupResponse = await fetch(`/api/customers/duplicates?${dupParams}`);
        if (dupResponse.ok) {
          const dupData = (await dupResponse.json()) as { hasDuplicates: boolean; duplicates: Array<{ id: string; name: string; phone: string | null; mobilePhone: string | null }> };
          if (dupData.hasDuplicates) {
            setDuplicateWarning(`Possivel duplicidade: ${dupData.duplicates.map((d) => d.name).join(", ")}. Confirme salvando novamente.`);
          }
        }
      }

      const isEditing = drawerMode === "edit" && selectedCustomer;
      const url = isEditing ? `/api/customers/${selectedCustomer?.id}` : "/api/customers";
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError("Confira os dados do cliente.");
        return;
      }

      const saved = (await response.json()) as CustomerResponse;
      closeDrawer();
      refreshData();

      if (drawerMode === "create") {
        await openViewDrawer(saved);
      }
    } catch {
      setError("Confira os dados do cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(customer: CustomerResponse) {
    if (!isAdmin) return;
    setError(null);

    const response = await fetch(`/api/customers/${customer.id}/toggle-active`, { method: "PATCH" });
    if (!response.ok) {
      setError("Voce nao tem permissao para alterar clientes.");
      return;
    }

    refreshData();
    if (drawerMode === "view" && selectedCustomer?.id === customer.id) {
      await openViewDrawer({ ...customer, isActive: !customer.isActive });
    }
  }

  async function addBottle(formData: FormData) {
    if (!selectedCustomer || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const month = Number(formData.get("month"));
      const year = Number(formData.get("year"));
      const notes = String(formData.get("bottleNotes") ?? "").trim() || null;

      const response = await fetch(`/api/customers/${selectedCustomer.id}/bottles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, year, notes }),
      });

      if (!response.ok) {
        setError("Confira os dados do galao.");
        return;
      }

      setBottleFormOpen(false);
      await openViewDrawer(selectedCustomer);
      refreshData();
    } catch {
      setError("Confira os dados do galao.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateBottle(bottleId: string) {
    if (!selectedCustomer) return;
    setError(null);

    const response = await fetch(`/api/customers/${selectedCustomer.id}/bottles/${bottleId}/deactivate`, {
      method: "PATCH",
    });

    if (!response.ok) {
      setError("Nao foi possivel inativar o galao.");
      return;
    }

    await openViewDrawer(selectedCustomer);
    refreshData();
  }

  const columns: Array<DataTableColumn<CustomerResponse>> = [
    {
      key: "name",
      header: "Nome",
      cell: (customer) => (
        <button className="text-left font-medium text-[var(--foreground)] hover:underline" onClick={() => void openViewDrawer(customer)}>
          {customer.name}
        </button>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      cell: (customer) => (customer.phone ? `Tel: ${customer.phone}` : "—"),
    },
    {
      key: "mobilePhone",
      header: "Celular",
      cell: (customer) => (customer.mobilePhone ? `Cel: ${customer.mobilePhone}` : "—"),
    },
    {
      key: "address",
      header: "Endereco",
      className: "max-w-xs truncate",
      cell: (customer) => customer.address ?? "—",
    },
    {
      key: "alert",
      header: "Alerta",
      cell: (customer) => {
        if (!customer.hasBottleAlert) return <span className="text-xs text-[var(--muted)]">—</span>;
        return <Badge variant="warning">Galao</Badge>;
      },
    },
  ];

  const isDrawerOpen = drawerMode !== "closed";
  const isFormMode = drawerMode === "create" || drawerMode === "edit";
  const currentCustomer = customerDetail?.customer ?? selectedCustomer;

  return (
    <section className="space-y-6">
      <PageHeader title="Clientes" eyebrow="Cadastro" description="Consulte clientes, galoes e historico de vendas." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total" value={summary.total} detail="Clientes cadastrados" />
        <MetricCard label="Ativos" value={summary.active} detail="Disponiveis para venda" />
        <MetricCard label="Com alerta" value={summary.withAlert} detail="Galoes proximos do vencimento" tone={summary.withAlert > 0 ? "warning" : "success"} />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Drawer
        badge={
          drawerMode === "create" ? (
            <Badge variant="success">Cadastro</Badge>
          ) : drawerMode === "edit" ? (
            <Badge variant="info">Edicao</Badge>
          ) : null
        }
        description={
          isFormMode
            ? drawerMode === "create"
              ? "Cadastre o cliente com dados basicos."
              : "Atualize os dados do cliente."
            : "Veja dados, galoes e historico de vendas."
        }
        onClose={closeDrawer}
        open={isDrawerOpen}
        title={drawerMode === "create" ? "Novo cliente" : drawerMode === "edit" ? "Editar cliente" : currentCustomer?.name ?? "Cliente"}
      >
        {isFormMode ? (
          <CustomerForm
            customer={drawerMode === "edit" ? selectedCustomer : null}
            duplicateWarning={duplicateWarning}
            isSaving={isSaving || isPending}
            onSave={saveCustomer}
            onCancel={drawerMode === "edit" ? () => void openViewDrawer(selectedCustomer!) : closeDrawer}
          />
        ) : (
          <CustomerDetail
            activeTab={activeTab}
            customer={currentCustomer}
            bottles={customerDetail?.bottles ?? []}
            recentSales={customerDetail?.recentSales ?? []}
            isAdmin={isAdmin}
            isLoading={isLoadingDetail}
            bottleFormOpen={bottleFormOpen}
            isSavingBottle={isSaving}
            onTabChange={setActiveTab}
            onEdit={switchToEdit}
            onToggleActive={() => void toggleActive(selectedCustomer!)}
            onAddBottle={addBottle}
            onDeactivateBottle={(bottleId) => void deactivateBottle(bottleId)}
            onOpenBottleForm={() => setBottleFormOpen(true)}
            onCloseBottleForm={() => setBottleFormOpen(false)}
          />
        )}
      </Drawer>

      <Toolbar actions={isAdmin ? <Button onClick={openCreateDrawer}>Novo cliente</Button> : null}>
        <TextInput aria-label="Buscar cliente" placeholder="Buscar por nome, telefone ou celular" value={search} onChange={(event) => setSearch(event.target.value)} />
      </Toolbar>

      <DataTable
        rows={filteredCustomers}
        rowKey={(customer) => customer.id}
        columns={columns}
        empty={
          <EmptyState
            title={customers.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
            description={customers.length === 0 ? "Cadastre clientes antes de registrar vendas." : "Ajuste a busca."}
          />
        }
        renderMobileCard={(customer) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <button className="text-left font-medium text-[var(--foreground)] hover:underline" onClick={() => void openViewDrawer(customer)}>
                {customer.name}
              </button>
              {customer.hasBottleAlert ? <Badge variant="warning">Galao</Badge> : null}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Telefone</dt>
                <dd className="text-[var(--foreground)]">{customer.phone ? `Tel: ${customer.phone}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Celular</dt>
                <dd className="text-[var(--foreground)]">{customer.mobilePhone ? `Cel: ${customer.mobilePhone}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Status</dt>
                <dd>
                  <Badge variant={customer.isActive ? "success" : "neutral"}>{customer.isActive ? "Ativo" : "Inativo"}</Badge>
                </dd>
              </div>
            </dl>
            {customer.address ? <p className="text-xs text-[var(--muted)]">{customer.address}</p> : null}
          </div>
        )}
      />
    </section>
  );
}

function CustomerForm({
  customer,
  duplicateWarning,
  isSaving,
  onSave,
  onCancel,
}: {
  customer: CustomerResponse | null;
  duplicateWarning: string | null;
  isSaving: boolean;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSave} className="grid gap-4">
      <Field label="Nome">
        <TextInput defaultValue={customer?.name ?? ""} name="name" required />
      </Field>

      <Field label="Telefone">
        <TextInput defaultValue={customer?.phone ?? ""} name="phone" placeholder="(00) 0000-0000" />
      </Field>

      <Field label="Celular">
        <TextInput defaultValue={customer?.mobilePhone ?? ""} name="mobilePhone" placeholder="(00) 00000-0000" />
      </Field>

      <Field label="Endereco">
        <TextInput defaultValue={customer?.address ?? ""} name="address" />
      </Field>

      <Field label="Observacoes">
        <TextArea className="min-h-16" defaultValue={customer?.notes ?? ""} name="notes" />
      </Field>

      {duplicateWarning ? <Alert variant="warning">{duplicateWarning}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
        <Button disabled={isSaving} variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CustomerDetail({
  activeTab,
  customer,
  bottles,
  recentSales,
  isAdmin,
  isLoading,
  bottleFormOpen,
  isSavingBottle,
  onTabChange,
  onEdit,
  onToggleActive,
  onAddBottle,
  onDeactivateBottle,
  onOpenBottleForm,
  onCloseBottleForm,
}: {
  activeTab: TabKey;
  customer: CustomerResponse | null;
  bottles: CustomerBottleResponse[];
  recentSales: CustomerDetailResponse["recentSales"];
  isAdmin: boolean;
  isLoading: boolean;
  bottleFormOpen: boolean;
  isSavingBottle: boolean;
  onTabChange: (tab: TabKey) => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onAddBottle: (formData: FormData) => void;
  onDeactivateBottle: (bottleId: string) => void;
  onOpenBottleForm: () => void;
  onCloseBottleForm: () => void;
}) {
  if (isLoading || !customer) {
    return <p className="text-sm text-[var(--muted)]">Carregando...</p>;
  }

  const activeBottles = bottles.filter((b) => b.isActive);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "data", label: "Dados" },
    { key: "bottles", label: `Galoes (${activeBottles.length})` },
    { key: "sales", label: `Vendas (${recentSales.length})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-soft)] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === tab.key ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--card-muted)]"}`}
            onClick={() => onTabChange(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "data" ? (
        <DataTab customer={customer} isAdmin={isAdmin} onEdit={onEdit} onToggleActive={onToggleActive} />
      ) : null}

      {activeTab === "bottles" ? (
        <BottlesTab
          bottles={activeBottles}
          bottleFormOpen={bottleFormOpen}
          isSaving={isSavingBottle}
          onAddBottle={onAddBottle}
          onDeactivateBottle={onDeactivateBottle}
          onOpenForm={onOpenBottleForm}
          onCloseForm={onCloseBottleForm}
        />
      ) : null}

      {activeTab === "sales" ? <SalesTab sales={recentSales} /> : null}
    </div>
  );
}

function DataTab({
  customer,
  isAdmin,
  onEdit,
  onToggleActive,
}: {
  customer: CustomerResponse;
  isAdmin: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--muted)]">Telefone</dt>
          <dd className="text-sm text-[var(--foreground)]">{customer.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Celular</dt>
          <dd className="text-sm text-[var(--foreground)]">{customer.mobilePhone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Status</dt>
          <dd>
            <Badge variant={customer.isActive ? "success" : "neutral"}>{customer.isActive ? "Ativo" : "Inativo"}</Badge>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-[var(--muted)]">Endereco</dt>
          <dd className="text-sm text-[var(--foreground)]">{customer.address ?? "—"}</dd>
        </div>
        {customer.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--muted)]">Observacoes</dt>
            <dd className="text-sm text-[var(--foreground)]">{customer.notes}</dd>
          </div>
        ) : null}
      </dl>

      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button variant={customer.isActive ? "danger" : "secondary"} onClick={onToggleActive}>
            {customer.isActive ? "Inativar" : "Ativar"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BottlesTab({
  bottles,
  bottleFormOpen,
  isSaving,
  onAddBottle,
  onDeactivateBottle,
  onOpenForm,
  onCloseForm,
}: {
  bottles: CustomerBottleResponse[];
  bottleFormOpen: boolean;
  isSaving: boolean;
  onAddBottle: (formData: FormData) => void;
  onDeactivateBottle: (bottleId: string) => void;
  onOpenForm: () => void;
  onCloseForm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--foreground)]">Galoes ativos</p>
        <Button variant="secondary" onClick={bottleFormOpen ? onCloseForm : onOpenForm}>
          {bottleFormOpen ? "Cancelar" : "Adicionar galao"}
        </Button>
      </div>

      {bottleFormOpen ? (
        <form action={onAddBottle} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card-muted)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mes">
              <SelectInput name="month" required>
                <option value="">Selecione</option>
                {monthNames.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Ano">
              <TextInput defaultValue={new Date().getFullYear()} min={2000} max={new Date().getFullYear() + 1} name="year" required type="number" />
            </Field>
          </div>
          <Field label="Observacoes">
            <TextArea className="min-h-12" name="bottleNotes" />
          </Field>
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Salvar galao"}
          </Button>
        </form>
      ) : null}

      {bottles.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum galao ativo.</p>
      ) : (
        <div className="space-y-2">
          {bottles.map((bottle) => {
            const alertVariant = getBottleAlertVariant(bottle);
            return (
              <div key={bottle.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {monthNames[bottle.month - 1]}/{bottle.year}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Venc. {formatBottleExpiration(bottle.expiresAt)}</p>
                    {bottle.notes ? <p className="text-xs text-[var(--muted)]">{bottle.notes}</p> : null}
                  </div>
                  {alertVariant ? <Badge variant={alertVariant}>{bottle.isExpired ? "Vencido" : "Proximo do venc."}</Badge> : null}
                </div>
                <Button variant="danger" onClick={() => onDeactivateBottle(bottle.id)}>
                  Inativar
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SalesTab({ sales }: { sales: CustomerDetailResponse["recentSales"] }) {
  if (sales.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Nenhuma venda registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div key={sale.id} className="rounded-lg border border-[var(--border-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--foreground)]">{formatCentsToBRL(sale.totalAmountCents)}</p>
            <div className="flex items-center gap-2">
              <Badge variant={saleStatusBadgeVariants[sale.status] ?? "neutral"}>{saleStatusLabels[sale.status] ?? sale.status}</Badge>
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {paymentMethodLabels[sale.paymentMethod as PaymentMethod] ?? sale.paymentMethod} · {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
          </p>
          {sale.items.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {sale.items.map((item) => (
                <li key={item.id} className="text-xs text-[var(--muted)]">
                  {item.quantity}x {item.productNameSnapshot} — {formatCentsToBRL(item.totalPriceCents)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
