"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatCentsToBRL,
  hasBottleMismatch,
  isBottleExpired,
  paymentMethodValues,
  type DriverResponse,
  type ProductResponse,
  type SaleDetailResponse,
  type UserRole,
} from "shared";
import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, SelectInput, TextInput } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import {
  buildBottleAlerts,
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

type CartItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  finalUnitPriceCents?: number;
  discountCents?: number;
  priceInput: string;
  discountInput: string;
};

type SalesUiProps = {
  userRole: UserRole;
  products: ProductResponse[];
  customers: SalesCustomerOption[];
  drivers: DriverResponse[];
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

export function SalesUi({ products, customers, drivers }: SalesUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerDirectory, setCustomerDirectory] = useState<SalesCustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<SalesCustomerOption[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("PIX");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [bottleMonth, setBottleMonth] = useState("");
  const [bottleYear, setBottleYear] = useState("");
  const [bottleNotes, setBottleNotes] = useState("");
  const [bottleSourceKey, setBottleSourceKey] = useState("");
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickCustomerMobilePhone, setQuickCustomerMobilePhone] = useState("");
  const [quickCustomerCode, setQuickCustomerCode] = useState("");
  const [quickCustomerAddress, setQuickCustomerAddress] = useState("");
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSaleDetail, setLastSaleDetail] = useState<SaleDetailResponse | null>(null);

  const syncedCustomers = syncCustomersFromProps({
    customers,
    customerDirectory,
    selectedCustomerId,
  });
  const selectedCustomer = syncedCustomers.selectedCustomer;
  const productResults = productQuery.trim()
    ? products
        .filter((product) => product.name.toLowerCase().includes(productQuery.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  const selectedBottleSourceKey = getBottleSourceKey(selectedCustomer);
  const isCurrentBottleSource = bottleSourceKey === selectedBottleSourceKey;
  const { resolvedBottleMonth, resolvedBottleYear, resolvedBottleNotes, bottleAlerts } = resolveBottleState({
    selectedCustomer,
    isCurrentBottleSource,
    bottleMonth,
    bottleYear,
    bottleNotes,
  });
  const totalAmountCents = cartItems.reduce((total, item) => {
    const effectiveUnitPrice = item.finalUnitPriceCents ?? item.unitPriceCents;
    const effectiveDiscount = item.discountCents ?? 0;
    return total + Math.max(0, effectiveUnitPrice * item.quantity - effectiveDiscount);
  }, 0);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  function syncBottleFields(customer: SalesCustomerOption | null) {
    setBottleMonth(customer?.previousBottle?.month ? String(customer.previousBottle.month) : "");
    setBottleYear(customer?.previousBottle?.year ? String(customer.previousBottle.year) : "");
    setBottleNotes("");
    setBottleSourceKey(getBottleSourceKey(customer));
  }

  function selectCustomerFromSearch(customer: SalesCustomerOption) {
    setSelectedCustomerId(customer.id);
    setCustomerDirectory((current) => mergeSaleCustomers(current, [customer]));
    setCustomerResults([]);
    setCustomerQuery("");
    syncBottleFields(customer);
  }

  function clearSelectedCustomer() {
    setSelectedCustomerId("");
    setCustomerResults([]);
    setCustomerQuery("");
    syncBottleFields(null);
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
          priceInput: centsToReais(product.salePriceCents),
          discountInput: "0,00",
        },
      ];
    });
    setProductQuery("");
    setError(null);
    setSuccessMessage(null);
    setLastSaleDetail(null);
  }

  function updateCartQuantity(productId: string, nextValue: string) {
    const parsedQuantity = Number(nextValue);
    const quantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }

  function updateCartPrice(productId: string, nextValue: string) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, priceInput: nextValue, finalUnitPriceCents: reaisToCents(nextValue) }
          : item,
      ),
    );
  }

  function updateCartDiscount(productId: string, nextValue: string) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, discountInput: nextValue, discountCents: reaisToCents(nextValue) }
          : item,
      ),
    );
  }

  function removeCartItem(productId: string) {
    setCartItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
  }

  async function searchCustomers() {
    if (isSearchingCustomers) {
      return;
    }

    const { primaryQuery, secondaryQuery } = buildCustomerSearchRequest(customerQuery);

    if (!primaryQuery && !secondaryQuery) {
      setCustomerResults([]);
      return;
    }

    setError(null);
    setIsSearchingCustomers(true);

    try {
      const result = await searchSaleCustomers(primaryQuery, { secondaryQuery });
      setCustomerResults(result);
      setCustomerDirectory((current) => mergeSaleCustomers(current, result));
    } catch {
      setError("Nao foi possivel buscar os clientes.");
      setCustomerResults([]);
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
        mobilePhone: quickCustomerMobilePhone.trim() || null,
        code: quickCustomerCode.trim() || null,
        address: quickCustomerAddress.trim() || null,
      });
      setCustomerDirectory((current) => mergeSaleCustomers(current, [createdCustomer]));
      setSelectedCustomerId(createdCustomer.id);
      syncBottleFields(createdCustomer);
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setQuickCustomerMobilePhone("");
      setQuickCustomerCode("");
      setQuickCustomerAddress("");
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
    setLastSaleDetail(null);
    setIsSavingSale(true);

    try {
      const storeCustomer = findStoreCustomer(customerDirectory);
      const saleCustomerId = selectedCustomerId || storeCustomer?.id || null;

      if (!saleCustomerId) {
        setError("Cliente Loja nao encontrado. Rode o seed ou cadastre o cliente Loja.");
        return;
      }

      const payload = saleFormToPayload({
        customerId: saleCustomerId,
        paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          finalUnitPriceCents: item.finalUnitPriceCents ?? item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
        })),
        bottleMonth: selectedCustomerId ? resolvedBottleMonth : "",
        bottleYear: selectedCustomerId ? resolvedBottleYear : "",
        bottleNotes: selectedCustomerId ? resolvedBottleNotes : "",
        deliveryPending,
        driverId: selectedDriverId || null,
      });
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await getResponseMessage(response, "Nao foi possivel finalizar a venda."));
        return;
      }

      const createdSale = await response.json().catch(() => null) as { id?: string } | null;

      if (createdSale?.id) {
        const detailResponse = await fetch(`/api/sales/${createdSale.id}`);
        if (detailResponse.ok) {
          const detail = await detailResponse.json() as SaleDetailResponse;
          setLastSaleDetail(detail);
        }
      }

      const paymentLabel = paymentMethodLabels[paymentMethod];
      const totalFormatted = formatCentsToBRL(totalAmountCents);
      const cashNote = paymentMethod === "CASH" ? " Entrou no caixa de hoje." : "";
      setSuccessMessage(`Venda registrada! Total: ${totalFormatted} - Forma: ${paymentLabel}.${cashNote}`);

      setCartItems([]);
      setProductQuery("");
      setDeliveryPending(false);
      setSelectedDriverId("");
      refreshPage();
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : "Nao foi possivel finalizar a venda.");
    } finally {
      setIsSavingSale(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="Operacao"
          title="Vendas"
          description="Registre venda, pagamento e entrega em um fluxo rapido. O estoque baixa automaticamente ao finalizar."
        />
        <Link
          href="/vendas/historico"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)] md:w-auto"
        >
          Ver historico
        </Link>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {successMessage && lastSaleDetail ? (
        <div className="space-y-2">
          <Alert variant="success">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{successMessage}</span>
              <Button className="no-print" variant="secondary" onClick={printRecibo}>
                Imprimir recibo
              </Button>
            </div>
          </Alert>
          <PrintRecibo sale={lastSaleDetail} />
        </div>
      ) : successMessage ? (
        <Alert variant="success">{successMessage}</Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">
        <div className="space-y-6">
          <Panel className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">1. Cliente</h2>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => setIsCustomerDrawerOpen(true)}
                variant="secondary"
              >
                Cadastrar cliente
              </Button>
            </div>

            {selectedCustomer ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-[var(--foreground)]">{selectedCustomer.name}</p>
                    <p className="text-[var(--muted)]">{formatCustomerPhones(selectedCustomer)}</p>
                    {selectedCustomer.code ? (
                      <p className="text-xs text-[var(--muted)]">Codigo: {selectedCustomer.code}</p>
                    ) : null}
                    {selectedCustomer.address ? (
                      <p className="text-xs text-[var(--muted)]">{selectedCustomer.address}</p>
                    ) : null}
                    <p className="text-xs text-[var(--subtle)]">
                      Ultimo galao: {formatBottleRecord(selectedCustomer.previousBottle)}
                    </p>
                  </div>
                  <Button onClick={clearSelectedCustomer} variant="ghost">Trocar</Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Mes do galao">
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
                  <Field label="Ano do galao">
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
                  <Field label="Observacao">
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
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3 text-sm text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">Venda na loja:</span> se nenhum cliente for escolhido, a venda sera registrada como Loja.
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void searchCustomers();
                  }}
                >
                  <TextInput
                    aria-label="Buscar cliente"
                    placeholder="Nome, telefone, celular, codigo ou endereco"
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button className="w-full sm:w-auto" disabled={isSearchingCustomers} type="submit" variant="secondary">
                      {isSearchingCustomers ? "Buscando..." : "Buscar cliente"}
                    </Button>
                  </div>
                </form>
                {customerResults.length > 0 ? (
                  <ul
                    aria-label="Resultados de clientes"
                    className="max-h-72 overflow-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)]"
                  >
                    {customerResults.map((customer) => (
                      <li key={customer.id}>
                        <button
                          className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm transition duration-150 hover:bg-[var(--card-muted)]"
                          onClick={() => selectCustomerFromSearch(customer)}
                          type="button"
                        >
                          <span className="font-medium text-[var(--foreground)]">{customer.name}</span>
                          <span className="text-xs text-[var(--muted)]">
                            {[customer.phone, customer.mobilePhone, customer.code, customer.address].filter(Boolean).join(" · ") || "Sem detalhes"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">2. Produto</h2>
              </div>
              <Badge variant="neutral">{cartItems.length} no carrinho</Badge>
            </div>

            <div className="relative mt-4">
              <TextInput
                aria-label="Buscar produto"
                placeholder="Buscar produto ativo"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
              />
              {productQuery.trim() && productResults.length > 0 ? (
                <ul
                  aria-label="Resultados de produtos"
                  className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] shadow-lg"
                >
                  {productResults.map((product) => {
                    const outOfStock = product.stockQuantity <= 0;
                    return (
                      <li key={product.id}>
                        <button
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition duration-150 hover:bg-[var(--card-muted)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                          disabled={outOfStock}
                          onClick={() => addProductToCart(product)}
                          type="button"
                        >
                          <span>
                            <span className="font-medium text-[var(--foreground)]">{product.name}</span>
                            <span className="ml-2 text-xs text-[var(--muted)]">
                              {outOfStock ? "sem estoque" : `Estoque ${product.stockQuantity}`}
                            </span>
                          </span>
                          {outOfStock ? (
                            <span className="flex flex-col items-end gap-1">
                              <span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
                              <span className="text-xs text-[var(--muted)]">Indisponivel</span>
                            </span>
                          ) : (
                            <span className="flex flex-col items-end gap-1">
                              <span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
                              <span className="text-xs text-[var(--brand)]">Adicionar item</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            {productQuery.trim() && productResults.length === 0 ? (
              <p className="mt-3 rounded-[var(--radius-control)] bg-[var(--card-muted)] p-3 text-sm text-[var(--muted)]">
                Nenhum produto ativo encontrado com esse nome.
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">3. Carrinho e pagamento</h2>
            </div>
            <Badge variant={totalAmountCents > 0 ? "success" : "neutral"}>{formatCentsToBRL(totalAmountCents)}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {cartItems.length > 0 ? (
              <ul className="space-y-3">
                {cartItems.map((item) => {
                  const effectiveUnitPrice = item.finalUnitPriceCents ?? item.unitPriceCents;
                  const effectiveDiscount = item.discountCents ?? 0;
                  const subtotal = Math.max(0, effectiveUnitPrice * item.quantity - effectiveDiscount);

                  return (
                    <li className="space-y-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3" key={item.productId}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                        <Button
                          aria-label={`Remover ${item.name}`}
                          onClick={() => removeCartItem(item.productId)}
                          variant="ghost"
                        >
                          Remover item
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Field label="Quantidade">
                          <TextInput
                            min="1"
                            type="number"
                            value={String(item.quantity)}
                            onChange={(event) => updateCartQuantity(item.productId, event.target.value)}
                          />
                        </Field>
                        <Field label="Preco">
                          <TextInput
                            inputMode="decimal"
                            value={item.priceInput}
                            onChange={(event) => updateCartPrice(item.productId, event.target.value)}
                          />
                        </Field>
                        <Field label="Desconto">
                          <TextInput
                            inputMode="decimal"
                            value={item.discountInput}
                            onChange={(event) => updateCartDiscount(item.productId, event.target.value)}
                          />
                        </Field>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        Subtotal: <span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(subtotal)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="Carrinho vazio" description="Adicione produtos para liberar a finalizacao." />
            )}
          </div>

          <div className="mt-4 space-y-4 border-t border-[var(--border-soft)] pt-4">
            <Field label="Pagamento">
              <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | "")}>
                <option value="">Selecione</option>
                {paymentMethodValues.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3 text-sm text-[var(--foreground)]">
              <input
                checked={deliveryPending}
                className="mt-1"
                type="checkbox"
                onChange={(event) => setDeliveryPending(event.target.checked)}
              />
              <span>
                <span className="block font-medium">Entregar depois</span>
                <span className="block text-xs text-[var(--muted)]">Marque quando a venda fica pendente de entrega.</span>
              </span>
            </label>

            <Field label="Entregador">
              <SelectInput
                value={selectedDriverId}
                onChange={(event) => setSelectedDriverId(event.target.value)}
              >
                <option value="">Sem entregador</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="rounded-[var(--radius-control)] bg-[var(--card-muted)] p-3">
              <p className="text-sm font-medium text-[var(--muted)]">Total da venda</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{formatCentsToBRL(totalAmountCents)}</p>
            </div>

            <p className="text-xs text-[var(--muted)]">A venda baixa estoque automaticamente ao finalizar.</p>

            <Button
              className="w-full"
              disabled={cartItems.length === 0 || !paymentMethod || isSavingSale || isPending}
              onClick={finalizeSale}
            >
              {isSavingSale ? "Finalizando..." : "Finalizar venda"}
            </Button>
          </div>
        </Panel>
      </div>

      <Drawer
        badge={<Badge variant="info">Cliente</Badge>}
        description="Cadastre o necessario para continuar a venda."
        onClose={() => setIsCustomerDrawerOpen(false)}
        open={isCustomerDrawerOpen}
        title="Cadastrar cliente"
      >
        <QuickCustomerForm
          isSavingCustomer={isSavingCustomer}
          quickCustomerAddress={quickCustomerAddress}
          quickCustomerCode={quickCustomerCode}
          quickCustomerMobilePhone={quickCustomerMobilePhone}
          quickCustomerName={quickCustomerName}
          quickCustomerPhone={quickCustomerPhone}
          onCancel={() => setIsCustomerDrawerOpen(false)}
          onSubmit={createQuickCustomer}
          setQuickCustomerAddress={setQuickCustomerAddress}
          setQuickCustomerCode={setQuickCustomerCode}
          setQuickCustomerMobilePhone={setQuickCustomerMobilePhone}
          setQuickCustomerName={setQuickCustomerName}
          setQuickCustomerPhone={setQuickCustomerPhone}
        />
      </Drawer>
    </section>
  );
}

type QuickCustomerFormProps = {
  isSavingCustomer: boolean;
  quickCustomerAddress: string;
  quickCustomerCode: string;
  quickCustomerMobilePhone: string;
  quickCustomerName: string;
  quickCustomerPhone: string;
  onCancel: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  setQuickCustomerAddress: (value: string) => void;
  setQuickCustomerCode: (value: string) => void;
  setQuickCustomerMobilePhone: (value: string) => void;
  setQuickCustomerName: (value: string) => void;
  setQuickCustomerPhone: (value: string) => void;
};

export function QuickCustomerForm({
  isSavingCustomer,
  quickCustomerAddress,
  quickCustomerCode,
  quickCustomerMobilePhone,
  quickCustomerName,
  quickCustomerPhone,
  onCancel,
  onSubmit,
  setQuickCustomerAddress,
  setQuickCustomerCode,
  setQuickCustomerMobilePhone,
  setQuickCustomerName,
  setQuickCustomerPhone,
}: QuickCustomerFormProps) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Field label="Nome">
        <TextInput required value={quickCustomerName} onChange={(event) => setQuickCustomerName(event.target.value)} />
      </Field>
      <Field label="Celular">
        <TextInput inputMode="tel" value={quickCustomerMobilePhone} onChange={(event) => setQuickCustomerMobilePhone(event.target.value)} />
      </Field>
      <Field label="Telefone">
        <TextInput inputMode="tel" value={quickCustomerPhone} onChange={(event) => setQuickCustomerPhone(event.target.value)} />
      </Field>
      <Field label="Codigo">
        <TextInput value={quickCustomerCode} onChange={(event) => setQuickCustomerCode(event.target.value)} />
      </Field>
      <Field label="Endereco">
        <TextInput value={quickCustomerAddress} onChange={(event) => setQuickCustomerAddress(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSavingCustomer} type="submit">{isSavingCustomer ? "Salvando..." : "Salvar cliente"}</Button>
        <Button disabled={isSavingCustomer} onClick={onCancel} variant="secondary">Cancelar</Button>
      </div>
    </form>
  );
}

function formatBottleRecord(bottle: BottleRecord | null | undefined) {
  if (!bottle) {
    return "Sem historico registrado";
  }

  const month = String(bottle.month).padStart(2, "0");
  const notes = bottle.notes?.trim();

  return notes ? `${month}/${bottle.year} · ${notes}` : `${month}/${bottle.year}`;
}

export function buildCustomerSearchRequest(query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean);

  if (terms.length <= 1) {
    return { primaryQuery: terms[0] ?? "", secondaryQuery: "" };
  }

  return {
    primaryQuery: terms.slice(0, -1).join(" "),
    secondaryQuery: terms.at(-1) ?? "",
  };
}

export function findStoreCustomer(customers: SalesCustomerOption[]) {
  return customers.find((customer) => customer.name.trim().toLocaleLowerCase("pt-BR") === "loja") ?? null;
}

function formatCustomerPhones(customer: SalesCustomerOption) {
  const phones = [customer.phone, customer.mobilePhone].filter(Boolean);

  return phones.length > 0 ? phones.join(" · ") : "Telefone nao informado";
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

function reaisToCents(value: string): number {
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  return Number.isNaN(cents) ? 0 : cents;
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
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
