"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  formatCentsToBRL,
  hasBottleMismatch,
  isBottleExpired,
  paymentMethodValues,
  type ProductResponse,
  type UserRole,
} from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, SelectInput, TextInput } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Toolbar } from "@/components/ui/toolbar";
import {
  buildBottleAlerts,
  cancelSalePayload,
  createSaleCustomer,
  saleFormToPayload,
  searchSaleCustomers,
  type SaleCustomerResponse,
} from "@/lib/sales";

type PaymentMethod = (typeof paymentMethodValues)[number];

type BottleRecord = {
  month: number;
  year: number;
  notes?: string | null;
};

type SalesCustomerOption = SaleCustomerResponse;

type SalesHistoryEntry = {
  id: string;
  customerName: string | null;
  userName: string;
  totalAmountCents: number;
  paymentMethod: PaymentMethod;
  status: "COMPLETED" | "CANCELED" | "PENDING_DELIVERY";
  createdAt: string;
  canceledAt: string | null;
  cancellationReason: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

type SalesUiProps = {
  userRole: UserRole;
  history: SalesHistoryEntry[];
  products: ProductResponse[];
  customers: SalesCustomerOption[];
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  OTHER: "Outro",
};

export function SalesUi({ userRole, history, products, customers }: SalesUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [knownCustomersOverride, setKnownCustomersOverride] = useState<SalesCustomerOption[] | null>(null);
  const [customerDirectory, setCustomerDirectory] = useState<SalesCustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("PIX");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [bottleMonth, setBottleMonth] = useState("");
  const [bottleYear, setBottleYear] = useState("");
  const [bottleNotes, setBottleNotes] = useState("");
  const [bottleSourceKey, setBottleSourceKey] = useState("");
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [cancelingSaleId, setCancelingSaleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncedCustomers = syncCustomersFromProps({
    customers,
    customerDirectory,
    selectedCustomerId,
  });
  const knownCustomers = knownCustomersOverride ?? syncedCustomers.knownCustomers;
  const selectedCustomer = syncedCustomers.selectedCustomer;
  const customerOptions = sortSaleCustomers(
    mergeSaleCustomers(knownCustomers, selectedCustomer ? [selectedCustomer] : []),
  );
  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(productQuery.trim().toLowerCase()));
  const selectedBottleSourceKey = getBottleSourceKey(selectedCustomer);
  const isCurrentBottleSource = bottleSourceKey === selectedBottleSourceKey;
  const { resolvedBottleMonth, resolvedBottleYear, resolvedBottleNotes, bottleAlerts } = resolveBottleState({
    selectedCustomer,
    isCurrentBottleSource,
    bottleMonth,
    bottleYear,
    bottleNotes,
  });
  const totalAmountCents = cartItems.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);

  const historyColumns: Array<DataTableColumn<SalesHistoryEntry>> = [
    {
      key: "customer",
      header: "Cliente",
      cell: (sale) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{sale.customerName ?? "Venda sem cliente"}</p>
          <p className="text-xs text-[var(--muted)]">{sale.userName}</p>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Pagamento",
      cell: (sale) => paymentMethodLabels[sale.paymentMethod],
    },
    {
      key: "total",
      header: "Total",
      className: "whitespace-nowrap font-medium",
      cell: (sale) => formatCentsToBRL(sale.totalAmountCents),
    },
    {
      key: "status",
      header: "Status",
      cell: (sale) => <HistoryStatusBadge sale={sale} />,
    },
    {
      key: "createdAt",
      header: "Horário",
      className: "whitespace-nowrap text-xs text-[var(--muted)]",
      cell: (sale) => new Date(sale.createdAt).toLocaleString("pt-BR"),
    },
    {
      key: "actions",
      header: "Ações",
      className: "whitespace-nowrap",
      cell: (sale) => (
        <HistoryActions
          sale={sale}
          userRole={userRole}
          isPending={isPending}
          isCanceling={cancelingSaleId === sale.id}
          onCancel={() => cancelSale(sale)}
        />
      ),
    },
  ];

  function refreshPage() {
    setKnownCustomersOverride(null);
    startTransition(() => router.refresh());
  }

  function syncBottleFields(customer: SalesCustomerOption | null) {
    setBottleMonth(customer?.previousBottle?.month ? String(customer.previousBottle.month) : "");
    setBottleYear(customer?.previousBottle?.year ? String(customer.previousBottle.year) : "");
    setBottleNotes("");
    setBottleSourceKey(getBottleSourceKey(customer));
  }

  function replaceKnownCustomers(nextCustomers: SalesCustomerOption[]) {
    setKnownCustomersOverride(nextCustomers);
    setCustomerDirectory((currentCustomers) => mergeSaleCustomers(currentCustomers, nextCustomers));
  }

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);

    if (!customerId) {
      syncBottleFields(null);
      return;
    }

    const customer = customerDirectory.find((item) => item.id === customerId)
      ?? syncedCustomers.customerDirectory.find((item) => item.id === customerId)
      ?? knownCustomers.find((item) => item.id === customerId)
      ?? null;

    syncBottleFields(customer);
  }

  function addProductToCart(product: ProductResponse) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...currentItems,
        {
          productId: product.id,
          name: product.name,
          unitPriceCents: product.salePriceCents,
          quantity: 1,
        },
      ];
    });
    setError(null);
  }

  function updateCartQuantity(productId: string, nextValue: string) {
    const parsedQuantity = Number(nextValue);
    const quantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }

  function removeCartItem(productId: string) {
    setCartItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
  }

  async function searchCustomers() {
    if (isSearchingCustomers) {
      return;
    }

    const query = customerQuery.trim();

    if (!query) {
      setKnownCustomersOverride(null);
      return;
    }

    setError(null);
    setIsSearchingCustomers(true);

    try {
      const result = await searchSaleCustomers(query);
      replaceKnownCustomers(result);
    } catch {
      setError("Não foi possível buscar os clientes.");
    } finally {
      setIsSearchingCustomers(false);
    }
  }

  async function createQuickCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingCustomer) {
      return;
    }

    setError(null);
    setIsSavingCustomer(true);

    try {
      const createdCustomer = await createSaleCustomer({
        name: quickCustomerName,
        phone: quickCustomerPhone.trim() || null,
      });
      setKnownCustomersOverride(null);
      setCustomerDirectory((currentCustomers) => mergeSaleCustomers(currentCustomers, [createdCustomer]));
      setSelectedCustomerId(createdCustomer.id);
      syncBottleFields(createdCustomer);
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setIsCustomerDrawerOpen(false);
      refreshPage();
    } catch {
      setError("Confira os dados do cliente.");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function finalizeSale() {
    if (isSavingSale || cartItems.length === 0 || !paymentMethod) {
      return;
    }

    setError(null);
    setIsSavingSale(true);

    try {
      const payload = saleFormToPayload({
        customerId: selectedCustomerId || null,
        paymentMethod,
        items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        bottleMonth: selectedCustomerId ? resolvedBottleMonth : "",
        bottleYear: selectedCustomerId ? resolvedBottleYear : "",
        bottleNotes: selectedCustomerId ? resolvedBottleNotes : "",
        deliveryPending: false,
      });
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await getResponseMessage(response, "Não foi possível finalizar a venda."));
        return;
      }

      setCartItems([]);
      setProductQuery("");
      refreshPage();
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : "Não foi possível finalizar a venda.");
    } finally {
      setIsSavingSale(false);
    }
  }

  async function cancelSale(sale: SalesHistoryEntry) {
    if (sale.status !== "COMPLETED" || cancelingSaleId) {
      return;
    }

    const reason = window.prompt("Informe o motivo do cancelamento.");

    if (reason === null) {
      return;
    }

    setError(null);
    setCancelingSaleId(sale.id);

    try {
      const payload = cancelSalePayload(reason);
      const response = await fetch(`/api/sales/${sale.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await getResponseMessage(response, "Não foi possível cancelar a venda."));
        return;
      }

      refreshPage();
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : "Não foi possível cancelar a venda.");
    } finally {
      setCancelingSaleId(null);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Vendas"
        eyebrow="Operação"
        description="Registre uma venda em poucos cliques e acompanhe o histórico recente com cancelamento rastreável."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Panel className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Cliente opcional</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Você pode finalizar a venda sem cliente ou vincular um atendimento para registrar o galão.</p>
              </div>
              <Button onClick={() => setIsCustomerDrawerOpen(true)} variant="secondary">Cadastrar cliente rápido</Button>
            </div>

            <Toolbar actions={<Button disabled={isSearchingCustomers} onClick={searchCustomers} variant="secondary">{isSearchingCustomers ? "Buscando..." : "Buscar"}</Button>}>
              <TextInput
                aria-label="Buscar cliente"
                placeholder="Buscar cliente por nome ou telefone"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
              />
            </Toolbar>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Cliente">
                <SelectInput value={selectedCustomerId} onChange={(event) => selectCustomer(event.target.value)}>
                  <option value="">Sem cliente</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                {selectedCustomer ? (
                  <>
                    <p className="font-medium text-[var(--foreground)]">{selectedCustomer.name}</p>
                    <p>{selectedCustomer.phone ?? "Telefone não informado"}</p>
                    <p className="mt-2 text-xs text-[var(--subtle)]">
                      Último galão conhecido: {formatBottleRecord(selectedCustomer.previousBottle)}
                    </p>
                  </>
                ) : (
                  <p>Siga sem cliente quando o atendimento for rápido de balcão.</p>
                )}
              </div>
            </div>

            {selectedCustomer ? (
              <div className="mt-4 space-y-4 border-t border-[var(--border-soft)] pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Mês do galão">
                    <TextInput
                      inputMode="numeric"
                      max="12"
                      min="1"
                      placeholder="6"
                      value={resolvedBottleMonth}
                      onChange={(event) => {
                        setBottleMonth(event.target.value);
                        setBottleSourceKey(selectedBottleSourceKey);
                      }}
                    />
                  </Field>
                  <Field label="Ano do galão">
                    <TextInput
                      inputMode="numeric"
                      max="2100"
                      min="2000"
                      placeholder="2026"
                      value={resolvedBottleYear}
                      onChange={(event) => {
                        setBottleYear(event.target.value);
                        setBottleSourceKey(selectedBottleSourceKey);
                      }}
                    />
                  </Field>
                  <Field label="Observação">
                    <TextInput
                      placeholder="Cor ou detalhe curto"
                      value={resolvedBottleNotes}
                      onChange={(event) => {
                        setBottleNotes(event.target.value);
                        setBottleSourceKey(selectedBottleSourceKey);
                      }}
                    />
                  </Field>
                </div>

                {bottleAlerts.length > 0 ? (
                  <div className="space-y-2">
                    {bottleAlerts.map((message) => (
                      <Alert key={message} variant="warning">{message}</Alert>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Buscar produto</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Somente produtos ativos aparecem aqui para manter a operação segura.</p>
              </div>
              <Badge variant="neutral">{cartItems.length} itens no carrinho</Badge>
            </div>

            <Toolbar>
              <TextInput
                aria-label="Buscar produto"
                placeholder="Buscar produto"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
              />
            </Toolbar>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredProducts.slice(0, 8).map((product) => (
                <button
                  key={product.id}
                  className="rounded-[var(--radius-control)] border border-[var(--border)] p-4 text-left transition duration-150 hover:border-[var(--brand)] hover:bg-[var(--card-muted)]"
                  onClick={() => addProductToCart(product)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{product.name}</p>
                      <p className="text-xs text-[var(--muted)]">Estoque atual {product.stockQuantity}</p>
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
                  </div>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                Nenhum produto encontrado na busca atual.
              </p>
            ) : null}

            <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Carrinho</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Ajuste quantidades rapidamente antes de finalizar.</p>
                </div>
                <Badge variant={totalAmountCents > 0 ? "success" : "neutral"}>{formatCentsToBRL(totalAmountCents)}</Badge>
              </div>

              {cartItems.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {cartItems.map((item) => (
                    <li className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4 md:grid-cols-[minmax(0,1fr)_96px_auto_auto] md:items-center" key={item.productId}>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                        <p className="text-xs text-[var(--muted)]">{formatCentsToBRL(item.unitPriceCents)} por unidade</p>
                      </div>
                      <TextInput
                        aria-label={`Quantidade de ${item.name}`}
                        min="1"
                        type="number"
                        value={String(item.quantity)}
                        onChange={(event) => updateCartQuantity(item.productId, event.target.value)}
                      />
                      <p className="text-sm font-medium text-[var(--foreground)]">{formatCentsToBRL(item.unitPriceCents * item.quantity)}</p>
                      <Button aria-label={`Remover ${item.name}`} onClick={() => removeCartItem(item.productId)} variant="ghost">Remover</Button>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title="Carrinho vazio"
                  description="Adicione ao menos um produto para registrar a venda."
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Resumo da venda</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Confira forma de pagamento, total e confirme somente quando o carrinho estiver correto.</p>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Forma de pagamento">
                <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | "")}>
                  <option value="">Selecione</option>
                  {paymentMethodValues.map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabels[method]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="rounded-[var(--radius-control)] bg-[var(--card-muted)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Total</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{formatCentsToBRL(totalAmountCents)}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{cartItems.length} item(ns) no carrinho.</p>
              </div>

              <Button disabled={cartItems.length === 0 || !paymentMethod || isSavingSale || isPending} onClick={finalizeSale}>
                {isSavingSale ? "Finalizando..." : "Finalizar venda"}
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <Drawer
        badge={<Badge variant="info">Cliente</Badge>}
        description="Cadastre somente o necessário para continuar a venda sem sair da tela."
        onClose={() => setIsCustomerDrawerOpen(false)}
        open={isCustomerDrawerOpen}
        title="Cadastrar cliente rápido"
      >
        <form className="grid gap-4" onSubmit={createQuickCustomer}>
          <Field label="Nome">
            <TextInput required value={quickCustomerName} onChange={(event) => setQuickCustomerName(event.target.value)} />
          </Field>
          <Field label="Telefone">
            <TextInput inputMode="tel" value={quickCustomerPhone} onChange={(event) => setQuickCustomerPhone(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSavingCustomer} type="submit">{isSavingCustomer ? "Salvando..." : "Salvar cliente"}</Button>
            <Button disabled={isSavingCustomer} onClick={() => setIsCustomerDrawerOpen(false)} variant="secondary">Cancelar</Button>
          </div>
        </form>
      </Drawer>

      <Panel className="p-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Histórico recente</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Veja vendas concluídas, cancelamentos e registre um motivo quando precisar desfazer uma operação.</p>
          </div>
          <Badge variant="neutral">{history.length} registros</Badge>
        </div>

        <div className="mt-4">
          <DataTable
            rows={history}
            rowKey={(sale) => sale.id}
            columns={historyColumns}
            empty={
              <EmptyState
                title="Nenhuma venda registrada"
                description="As vendas finalizadas aparecerão aqui para conferência e cancelamento." 
              />
            }
            renderMobileCard={(sale) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">{sale.customerName ?? "Venda sem cliente"}</h3>
                    <p className="text-xs text-[var(--muted)]">{sale.userName}</p>
                  </div>
                  <HistoryStatusBadge sale={sale} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Pagamento</dt>
                    <dd>{paymentMethodLabels[sale.paymentMethod]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Total</dt>
                    <dd className="font-medium text-[var(--foreground)]">{formatCentsToBRL(sale.totalAmountCents)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-[var(--muted)]">Horário</dt>
                    <dd>{new Date(sale.createdAt).toLocaleString("pt-BR")}</dd>
                  </div>
                </dl>
                <HistoryActions
                  sale={sale}
                  userRole={userRole}
                  isPending={isPending}
                  isCanceling={cancelingSaleId === sale.id}
                  onCancel={() => cancelSale(sale)}
                />
              </div>
            )}
          />
        </div>
      </Panel>
    </section>
  );
}

function HistoryActions({
  sale,
  userRole,
  isPending,
  isCanceling,
  onCancel,
}: {
  sale: SalesHistoryEntry;
  userRole: UserRole;
  isPending: boolean;
  isCanceling: boolean;
  onCancel: () => void;
}) {
  if (sale.status !== "COMPLETED") {
    return <span className="text-xs text-[var(--muted)]">{sale.cancellationReason ?? "Venda cancelada"}</span>;
  }

  if (userRole !== "ADMIN" && userRole !== "OPERATOR") {
    return <span className="text-xs text-[var(--muted)]">Somente consulta</span>;
  }

  return (
    <Button disabled={isPending || isCanceling} onClick={onCancel} variant="danger">
      {isCanceling ? "Cancelando..." : "Cancelar venda"}
    </Button>
  );
}

function HistoryStatusBadge({ sale }: { sale: SalesHistoryEntry }) {
  if (sale.status === "CANCELED") {
    return <Badge variant="warning">Cancelada</Badge>;
  }

  return <Badge variant="success">Concluída</Badge>;
}

function formatBottleRecord(bottle: BottleRecord | null | undefined) {
  if (!bottle) {
    return "Sem histórico registrado";
  }

  const month = String(bottle.month).padStart(2, "0");
  const notes = bottle.notes?.trim();

  return notes ? `${month}/${bottle.year} · ${notes}` : `${month}/${bottle.year}`;
}

function formatBottleFieldValue(value: number | null | undefined) {
  return value ? String(value) : "";
}

function getBottleSourceKey(customer: SalesCustomerOption | null) {
  if (!customer) {
    return "";
  }

  return [
    customer.id,
    customer.previousBottle?.month ?? "",
    customer.previousBottle?.year ?? "",
    customer.previousBottle?.notes?.trim() ?? "",
  ].join(":");
}

async function getResponseMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;

  return payload?.message ?? fallback;
}

function mergeSaleCustomers(
  currentCustomers: SalesCustomerOption[],
  nextCustomers: SalesCustomerOption[],
) {
  const customerMap = new Map(currentCustomers.map((customer) => [customer.id, customer]));

  for (const customer of nextCustomers) {
    customerMap.set(customer.id, customer);
  }

  return Array.from(customerMap.values());
}

export function syncCustomersFromProps({
  customers,
  customerDirectory,
  selectedCustomerId,
}: {
  customers: SalesCustomerOption[];
  customerDirectory: SalesCustomerOption[];
  selectedCustomerId: string;
}) {
  const nextCustomerDirectory = mergeSaleCustomers(customerDirectory, customers);

  return {
    knownCustomers: customers,
    customerDirectory: nextCustomerDirectory,
    selectedCustomerId,
    selectedCustomer: nextCustomerDirectory.find((customer) => customer.id === selectedCustomerId) ?? null,
  };
}

export function resolveBottleState({
  selectedCustomer,
  isCurrentBottleSource,
  bottleMonth,
  bottleYear,
  bottleNotes,
  now = new Date(),
}: {
  selectedCustomer: SalesCustomerOption | null;
  isCurrentBottleSource: boolean;
  bottleMonth: string;
  bottleYear: string;
  bottleNotes: string;
  now?: Date;
}) {
  const usePreviousBottle = selectedCustomer !== null && !isCurrentBottleSource;
  const resolvedBottleMonth = usePreviousBottle
    ? formatBottleFieldValue(selectedCustomer?.previousBottle?.month)
    : bottleMonth;
  const resolvedBottleYear = usePreviousBottle
    ? formatBottleFieldValue(selectedCustomer?.previousBottle?.year)
    : bottleYear;
  const resolvedBottleNotes = usePreviousBottle ? "" : bottleNotes;
  const currentBottle = selectedCustomer && resolvedBottleMonth.trim() && resolvedBottleYear.trim()
    ? {
        month: Number(resolvedBottleMonth),
        year: Number(resolvedBottleYear),
        notes: resolvedBottleNotes.trim() || null,
      }
    : null;
  const bottleAlerts = selectedCustomer
    ? buildBottleAlerts({
        expired: isBottleExpired(currentBottle ?? selectedCustomer.previousBottle ?? null, now),
        mismatch: hasBottleMismatch(selectedCustomer.previousBottle ?? null, currentBottle),
      })
    : [];

  return {
    resolvedBottleMonth,
    resolvedBottleYear,
    resolvedBottleNotes,
    currentBottle,
    bottleAlerts,
  };
}

function sortSaleCustomers(customersToSort: SalesCustomerOption[]) {
  return [...customersToSort].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
