"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  expenseCategoryValues,
  formatCentsToBRL,
  paymentMethodValues,
  type ExpenseResponse,
} from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, SelectInput, TextInput } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { createExpense, deleteExpense, updateExpense } from "@/lib/finance";

type ExpenseCategory = (typeof expenseCategoryValues)[number];
type PaymentMethod = (typeof paymentMethodValues)[number];

type ExpensesUiProps = {
  expenses: ExpenseResponse[];
};

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  MARMITA: "Marmita",
  GASOLINA: "Gasolina",
  MANUTENCAO: "Manutencao",
  OUTRO: "Outro",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

export function ExpensesUi({ expenses }: ExpensesUiProps) {
  const router = useRouter();
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("MARMITA");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  function closeForm() {
    setFormOpen(false);
    setEditingExpense(null);
  }

  function openCreateDrawer() {
    setEditingExpense(null);
    setDescription("");
    setValueInput("");
    setCategory("MARMITA");
    setPaymentMethod("CASH");
    setDate(todayDateString());
    setFormOpen(true);
  }

  function openEditDrawer(expense: ExpenseResponse) {
    setEditingExpense(expense);
    setDescription(expense.description);
    setValueInput(centsToReais(expense.amountCents));
    setCategory(expense.category ?? "MARMITA");
    setPaymentMethod(expense.paymentMethod ?? "CASH");
    setDate(expenseDateToInput(expense.date));
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        description: description.trim(),
        amountCents: reaisToCents(valueInput),
        category,
        paymentMethod,
        date,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }

      closeForm();
      refreshPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a despesa.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(expense: ExpenseResponse) {
    if (!window.confirm(`Excluir a despesa "${expense.description}"?`)) {
      return;
    }

    setError(null);

    try {
      await deleteExpense(expense.id);
      refreshPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a despesa.");
    }
  }

  const columns: Array<DataTableColumn<ExpenseResponse>> = [
    {
      key: "description",
      header: "Descricao",
      cell: (expense) => (
        <p className="font-medium text-[var(--foreground)]">{expense.description}</p>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "whitespace-nowrap font-medium",
      cell: (expense) => formatCentsToBRL(expense.amountCents),
    },
    {
      key: "category",
      header: "Categoria",
      cell: (expense) => (expense.category ? expenseCategoryLabels[expense.category] : "—"),
    },
    {
      key: "payment",
      header: "Pagamento",
      cell: (expense) =>
        expense.paymentMethod ? paymentMethodLabels[expense.paymentMethod] : "—",
    },
    {
      key: "date",
      header: "Data",
      className: "whitespace-nowrap",
      cell: (expense) => formatDateToBR(expense.date),
    },
    {
      key: "actions",
      header: "Acoes",
      className: "whitespace-nowrap",
      cell: (expense) => (
        <ExpenseRowActions expense={expense} onEdit={openEditDrawer} onDelete={handleDelete} />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        actions={<Button onClick={openCreateDrawer}>Nova despesa</Button>}
        description="Registre e acompanhe as despesas da loja."
        eyebrow="Financeiro"
        title="Despesas"
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Drawer
        badge={<Badge variant={editingExpense ? "info" : "success"}>{editingExpense ? "Edicao" : "Cadastro"}</Badge>}
        description={editingExpense ? "Atualize os dados da despesa." : "Registre uma nova despesa."}
        onClose={closeForm}
        open={formOpen}
        title={editingExpense ? "Editar despesa" : "Nova despesa"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Descricao">
            <TextInput
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <Field label="Valor (R$)">
            <TextInput
              inputMode="decimal"
              placeholder="0,00"
              required
              value={valueInput}
              onChange={(event) => setValueInput(event.target.value)}
            />
          </Field>

          <Field label="Categoria">
            <SelectInput
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            >
              {expenseCategoryValues.map((value) => (
                <option key={value} value={value}>
                  {expenseCategoryLabels[value]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Pagamento">
            <SelectInput
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              {paymentMethodValues.map((value) => (
                <option key={value} value={value}>
                  {paymentMethodLabels[value]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Data">
            <TextInput
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
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

      <DataTable
        rows={expenses}
        rowKey={(expense) => expense.id}
        columns={columns}
        empty={
          <EmptyState
            title="Nenhuma despesa registrada"
            description="Registre a primeira despesa para acompanhar o financeiro."
          />
        }
        renderMobileCard={(expense) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-[var(--foreground)]">{expense.description}</p>
              <p className="font-medium text-[var(--foreground)]">
                {formatCentsToBRL(expense.amountCents)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Categoria</dt>
                <dd className="text-[var(--foreground)]">
                  {expense.category ? expenseCategoryLabels[expense.category] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Pagamento</dt>
                <dd className="text-[var(--foreground)]">
                  {expense.paymentMethod ? paymentMethodLabels[expense.paymentMethod] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Data</dt>
                <dd className="text-[var(--foreground)]">{formatDateToBR(expense.date)}</dd>
              </div>
            </dl>
            <ExpenseRowActions expense={expense} onEdit={openEditDrawer} onDelete={handleDelete} />
          </div>
        )}
      />
    </section>
  );
}

function ExpenseRowActions({
  expense,
  onEdit,
  onDelete,
}: {
  expense: ExpenseResponse;
  onEdit: (expense: ExpenseResponse) => void;
  onDelete: (expense: ExpenseResponse) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        aria-label={`Editar ${expense.description}`}
        variant="secondary"
        onClick={() => onEdit(expense)}
      >
        Editar
      </Button>
      <Button
        aria-label={`Excluir ${expense.description}`}
        variant="danger"
        onClick={() => void onDelete(expense)}
      >
        Excluir
      </Button>
    </div>
  );
}

function reaisToCents(value: string): number {
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  return Number.isNaN(cents) ? 0 : Math.max(0, cents);
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expenseDateToInput(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function formatDateToBR(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
