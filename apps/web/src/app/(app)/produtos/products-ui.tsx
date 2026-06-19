"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCentsToBRL, type ProductResponse, type UserRole } from "shared";

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
import { getProductStatusLabel, productFormToPayload } from "@/lib/products";

import { filterProducts, type ProductStatusFilter } from "./product-view-model";

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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("ALL");
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";
  const rows = filterProducts(products, { search, status });

  function closeForm() {
    setFormOpen(false);
    setEditingProduct(null);
  }

  function openCreateDrawer() {
    setEditingProduct(null);
    setFormOpen(true);
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

  function editProduct(product: ProductResponse) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  const columns: Array<DataTableColumn<ProductResponse>> = [
    {
      key: "product",
      header: "Produto",
      cell: (product) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{product.name}</p>
          <p className="text-xs text-[var(--muted)]">{product.description ?? "Sem descricao"}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Preço",
      className: "whitespace-nowrap font-medium",
      cell: (product) => formatCentsToBRL(product.salePriceCents),
    },
    {
      key: "stock",
      header: "Estoque",
      className: "whitespace-nowrap",
      cell: (product) => (
        <div>
          <p className={product.isLowStock ? "font-medium text-[var(--danger)]" : "font-medium text-[var(--foreground)]"}>{product.stockQuantity}</p>
          <p className="text-xs text-[var(--muted)]">Min. {product.minimumStock}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (product) => <ProductStatusBadges product={product} />,
    },
    {
      key: "actions",
      header: "Ações",
      className: "whitespace-nowrap",
      cell: (product) => <ProductRowActions isAdmin={isAdmin} product={product} onEdit={editProduct} onToggle={toggleProduct} />,
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader title="Produtos" eyebrow="Cadastro" description="Consulte produtos, precos e estoque. Alteracoes ficam restritas ao administrador." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total" value={summary.total} detail="Produtos cadastrados" />
        <MetricCard label="Ativos" value={summary.active} detail="Disponiveis para venda" />
        <MetricCard label="Estoque baixo" value={summary.lowStock} detail="Abaixo do minimo" tone={summary.lowStock > 0 ? "danger" : "success"} />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isAdmin ? (
        <Drawer
          badge={<Badge variant={editingProduct ? "info" : "success"}>{editingProduct ? "Edicao" : "Cadastro"}</Badge>}
          description={editingProduct ? "Atualize dados comerciais. Ajustes de quantidade ficam no modulo de estoque." : "Cadastre o produto com preco e estoque inicial."}
          onClose={closeForm}
          open={formOpen}
          title={editingProduct ? "Editar produto" : "Novo produto"}
        >
          <form action={saveProduct} className="grid gap-4">
            <Field label="Nome">
              <TextInput defaultValue={editingProduct?.name ?? ""} name="name" required />
            </Field>

            <Field label="Preco de venda">
              <TextInput defaultValue={editingProduct ? String(editingProduct.salePriceCents / 100).replace(".", ",") : ""} inputMode="decimal" name="salePrice" placeholder="12,50" required />
            </Field>

            <Field help={editingProduct ? "Use o modulo de estoque para ajustar quantidade." : undefined} label="Estoque atual">
              <TextInput
                className="read-only:bg-[var(--card-muted)] read-only:text-[var(--muted)]"
                defaultValue={editingProduct?.stockQuantity ?? 0}
                min="0"
                name="stockQuantity"
                readOnly={Boolean(editingProduct)}
                required
                type="number"
              />
            </Field>

            <Field label="Estoque minimo">
              <TextInput defaultValue={editingProduct?.minimumStock ?? 0} min="0" name="minimumStock" required type="number" />
            </Field>

            <Field label="Descricao">
              <TextArea className="min-h-16" defaultValue={editingProduct?.description ?? ""} name="description" />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving || isPending} type="submit">
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button disabled={isSaving || isPending} variant="secondary" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Drawer>
      ) : null}

      <Toolbar
        actions={
          isAdmin ? (
            <Button onClick={openCreateDrawer}>
              Novo produto
            </Button>
          ) : null
        }
      >
        <TextInput aria-label="Buscar produto" placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
        <SelectInput aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as ProductStatusFilter)}>
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="LOW">Estoque baixo</option>
          <option value="INACTIVE">Inativos</option>
        </SelectInput>
      </Toolbar>

      <DataTable
        rows={rows}
        rowKey={(product) => product.id}
        columns={columns}
        empty={
          <EmptyState
            title={products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
            description={products.length === 0 ? "Cadastre produtos antes de registrar vendas." : "Ajuste a busca ou o filtro de status."}
          />
        }
        renderMobileCard={(product) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-[var(--foreground)]">{product.name}</h2>
                <p className="text-xs text-[var(--muted)]">{product.description ?? "Sem descricao"}</p>
              </div>
              <ProductStatusBadges product={product} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Preço</dt>
                <dd className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Estoque</dt>
                <dd className={product.isLowStock ? "font-medium text-[var(--danger)]" : "font-medium text-[var(--foreground)]"}>
                  {product.stockQuantity} / min. {product.minimumStock}
                </dd>
              </div>
            </dl>
            <ProductRowActions isAdmin={isAdmin} product={product} onEdit={editProduct} onToggle={toggleProduct} />
          </div>
        )}
      />
    </section>
  );
}

function ProductStatusBadges({ product }: { product: ProductResponse }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={product.isActive ? "success" : "neutral"}>{getProductStatusLabel(product.isActive)}</Badge>
      {product.isLowStock ? <Badge variant="danger">Estoque baixo</Badge> : null}
    </div>
  );
}

function ProductRowActions({
  isAdmin,
  product,
  onEdit,
  onToggle,
}: {
  isAdmin: boolean;
  product: ProductResponse;
  onEdit: (product: ProductResponse) => void;
  onToggle: (product: ProductResponse) => void | Promise<void>;
}) {
  if (!isAdmin) {
    return <span className="text-xs text-[var(--muted)]">Somente consulta</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button aria-label={`Editar ${product.name}`} variant="secondary" onClick={() => onEdit(product)}>
        Editar
      </Button>
      <Button aria-label={`${product.isActive ? "Inativar" : "Ativar"} ${product.name}`} variant={product.isActive ? "danger" : "secondary"} onClick={() => void onToggle(product)}>
        {product.isActive ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}
