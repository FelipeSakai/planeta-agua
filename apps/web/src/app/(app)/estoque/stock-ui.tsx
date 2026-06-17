"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getStockMovementTypeLabel, type StockPageResponse, type UserRole } from "shared";

import { stockAdjustmentFormToPayload, stockEntryFormToPayload } from "@/lib/stock";

type StockUiProps = {
  userRole: UserRole;
  data: StockPageResponse;
};

export function StockUi({ userRole, data }: StockUiProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mutationInFlight = useRef(false);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";

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

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#626260]">Estoque</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Controle de estoque</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#626260]">
          Consulte saldo, acompanhe movimentacoes e registre entradas ou ajustes com rastreabilidade.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Produtos" value={data.summary.totalProducts} />
        <SummaryCard label="Estoque baixo" value={data.summary.lowStockProducts} />
        <SummaryCard label="Unidades em estoque" value={data.summary.totalUnits} />
      </div>

      {error ? (
        <p aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <StockForm
            action={submitEntry}
            disabled={isSaving || isPending}
            products={data.products}
            quantityLabel="Quantidade de entrada"
            quantityMin="1"
            quantityName="quantity"
            submitLabel="Salvar entrada"
            title="Registrar entrada"
          />
          <StockForm
            action={submitAdjustment}
            disabled={isSaving || isPending}
            products={data.products}
            quantityLabel="Quantidade final"
            quantityMin="0"
            quantityName="newQuantity"
            submitLabel="Salvar ajuste"
            title="Registrar ajuste"
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-[#d3cec6] bg-white">
          {data.products.length === 0 ? <p className="p-5 text-sm text-[#626260]">Nenhum produto cadastrado.</p> : null}

          {data.products.map((product) => (
            <article
              className="grid gap-3 border-b border-[#ebe7e1] p-5 last:border-b-0 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] md:items-center"
              key={product.id}
            >
              <div>
                <h2 className="text-lg font-medium">{product.name}</h2>
                <p className="text-sm text-[#626260]">{product.isActive ? "Ativo" : "Inativo"}</p>
              </div>

              <p className="text-sm">
                <span className="text-[#626260]">Atual</span>
                <br />
                {product.stockQuantity}
              </p>

              <p className="text-sm">
                <span className="text-[#626260]">Minimo</span>
                <br />
                {product.minimumStock}
              </p>

              <div>
                {product.isLowStock ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Estoque baixo</span>
                ) : (
                  <span className="rounded-full bg-[#f5f1ec] px-3 py-1 text-xs font-medium">OK</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <h2 className="text-lg font-medium">Movimentacoes recentes</h2>
          <div className="mt-4 space-y-4">
            {data.movements.length === 0 ? <p className="text-sm text-[#626260]">Nenhuma movimentacao registrada.</p> : null}

            {data.movements.map((movement) => (
              <article className="border-b border-[#ebe7e1] pb-4 last:border-b-0 last:pb-0" key={movement.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">{movement.productName}</h3>
                    <p className="text-xs text-[#626260]">
                      {getStockMovementTypeLabel(movement.type)} por {movement.userName}
                    </p>
                  </div>
                  <strong className={movement.quantity < 0 ? "text-sm text-red-700" : "text-sm text-green-700"}>
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </strong>
                </div>
                <p className="mt-2 text-sm text-[#626260]">{movement.reason ?? "Sem motivo informado"}</p>
                <p className="mt-1 text-xs text-[#9c9fa5]">{new Date(movement.createdAt).toLocaleString("pt-BR")}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StockForm({
  title,
  quantityName,
  quantityLabel,
  quantityMin,
  submitLabel,
  products,
  action,
  disabled,
}: {
  title: string;
  quantityName: "quantity" | "newQuantity";
  quantityLabel: string;
  quantityMin: "0" | "1";
  submitLabel: string;
  products: StockPageResponse["products"];
  action: (formData: FormData) => void | Promise<void>;
  disabled: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-[#d3cec6] bg-white p-5">
      <h2 className="text-lg font-medium">{title}</h2>

      <label className="space-y-2">
        <span className="text-sm font-medium">Produto</span>
        <select className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="productId" required>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium">{quantityLabel}</span>
        <input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" min={quantityMin} name={quantityName} required type="number" />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium">Motivo</span>
        <textarea className="min-h-20 w-full rounded-lg border border-[#d3cec6] px-3 py-2" name="reason" required />
      </label>

      <button className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={disabled} type="submit">
        {disabled ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
      <p className="text-sm text-[#626260]">{label}</p>
      <strong className="mt-3 block text-3xl font-medium">{value}</strong>
    </article>
  );
}
