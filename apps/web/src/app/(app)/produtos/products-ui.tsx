"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCentsToBRL, type ProductResponse, type UserRole } from "shared";

import { getProductStatusLabel, productFormToPayload } from "@/lib/products";

type ProductsUiProps = {
  userRole: UserRole;
  products: ProductResponse[];
  summary: { total: number; active: number; lowStock: number };
};

export function ProductsUi({ userRole, products, summary }: ProductsUiProps) {
  const router = useRouter();
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";

  function closeForm() {
    setFormOpen(false);
    setEditingProduct(null);
  }

  function refreshProducts() {
    startTransition(() => router.refresh());
  }

  async function saveProduct(formData: FormData) {
    if (!isAdmin || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = productFormToPayload(formData);
      const isEditing = Boolean(editingProduct);
      const url = isEditing ? `/api/products/${editingProduct?.id}` : "/api/products";
      const body = isEditing
        ? {
            name: payload.name,
            description: payload.description,
            salePriceCents: payload.salePriceCents,
            minimumStock: payload.minimumStock,
          }
        : payload;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError("Confira os dados do produto.");
        return;
      }

      closeForm();
      refreshProducts();
    } catch {
      setError("Confira os dados do produto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProduct(product: ProductResponse) {
    if (!isAdmin) {
      return;
    }

    setError(null);
    const action = product.isActive ? "deactivate" : "activate";
    const response = await fetch(`/api/products/${product.id}/${action}`, { method: "PATCH" });

    if (!response.ok) {
      setError("Voce nao tem permissao para alterar produtos.");
      return;
    }

    refreshProducts();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#626260]">Produtos</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Cadastro de produtos</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#626260]">
            Consulte produtos, precos e estoque. Alteracoes ficam restritas ao administrador.
          </p>
        </div>

        {isAdmin ? (
          <button
            className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
            type="button"
          >
            Novo produto
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Ativos" value={summary.active} />
        <SummaryCard label="Estoque baixo" value={summary.lowStock} />
      </div>

      {error ? (
        <p aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {isAdmin && formOpen ? (
        <form action={saveProduct} className="grid gap-4 rounded-2xl border border-[#d3cec6] bg-white p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Nome</span>
            <input
              className="h-11 w-full rounded-lg border border-[#d3cec6] px-3"
              defaultValue={editingProduct?.name ?? ""}
              name="name"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Preco de venda</span>
            <input
              className="h-11 w-full rounded-lg border border-[#d3cec6] px-3"
              defaultValue={editingProduct ? String(editingProduct.salePriceCents / 100).replace(".", ",") : ""}
              inputMode="decimal"
              name="salePrice"
              placeholder="12,50"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Estoque atual</span>
            <input
              className="h-11 w-full rounded-lg border border-[#d3cec6] px-3 read-only:bg-[#f5f1ec] read-only:text-[#626260]"
              defaultValue={editingProduct?.stockQuantity ?? 0}
              min="0"
              name="stockQuantity"
              readOnly={Boolean(editingProduct)}
              required
              type="number"
            />
            {editingProduct ? <span className="text-xs text-[#626260]">Use o modulo de estoque para ajustar quantidade.</span> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Estoque minimo</span>
            <input
              className="h-11 w-full rounded-lg border border-[#d3cec6] px-3"
              defaultValue={editingProduct?.minimumStock ?? 0}
              min="0"
              name="minimumStock"
              required
              type="number"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Descricao</span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-[#d3cec6] px-3 py-2"
              defaultValue={editingProduct?.description ?? ""}
              name="description"
            />
          </label>

          <div className="flex gap-2 md:col-span-2">
            <button className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isSaving || isPending} type="submit">
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
            <button className="rounded-lg border border-[#d3cec6] bg-white px-4 py-2 text-sm font-medium" onClick={closeForm} type="button">
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#d3cec6] bg-white">
        {products.length === 0 ? <p className="p-5 text-sm text-[#626260]">Nenhum produto cadastrado.</p> : null}

        {products.map((product) => (
          <article
            className="grid gap-3 border-b border-[#ebe7e1] p-5 last:border-b-0 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-center"
            key={product.id}
          >
            <div>
              <h2 className="text-lg font-medium">{product.name}</h2>
              <p className="text-sm text-[#626260]">{product.description ?? "Sem descricao"}</p>
            </div>

            <p className="text-sm">
              <span className="text-[#626260]">Preco</span>
              <br />
              {formatCentsToBRL(product.salePriceCents)}
            </p>

            <p className="text-sm">
              <span className="text-[#626260]">Estoque</span>
              <br />
              {product.stockQuantity} / min. {product.minimumStock}
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f5f1ec] px-3 py-1 text-xs font-medium">{getProductStatusLabel(product.isActive)}</span>
              {product.isLowStock ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Estoque baixo</span> : null}
            </div>

            {isAdmin ? (
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[#d3cec6] px-3 py-2 text-sm"
                  onClick={() => {
                    setEditingProduct(product);
                    setFormOpen(true);
                  }}
                  type="button"
                >
                  Editar
                </button>
                <button className="rounded-lg border border-[#d3cec6] px-3 py-2 text-sm" onClick={() => void toggleProduct(product)} type="button">
                  {product.isActive ? "Inativar" : "Ativar"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
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
