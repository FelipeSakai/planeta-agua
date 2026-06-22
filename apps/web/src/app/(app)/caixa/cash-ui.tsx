"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  formatCentsToBRL,
  paymentMethodValues,
  type CashRegisterResponse,
} from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, TextInput } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { closeCashRegister, updateOpeningBalance } from "@/lib/finance";

type PaymentMethod = (typeof paymentMethodValues)[number];

export type PaymentSummary = {
  method: PaymentMethod;
  salesCents: number;
  expensesCents: number;
  expectedCents: number;
};

export type CashUiProps = {
  cashRegister: CashRegisterResponse;
  summary: PaymentSummary[];
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  OTHER: "Outro",
};

export function CashUi({ cashRegister, summary }: CashUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openingBalanceInput, setOpeningBalanceInput] = useState(
    centsToReais(cashRegister.openingBalanceCents),
  );
  const [isSavingOpening, setIsSavingOpening] = useState(false);
  const [isCloseDrawerOpen, setIsCloseDrawerOpen] = useState(false);
  const [countedInputs, setCountedInputs] = useState<Record<PaymentMethod, string>>(() => {
    const initial = {} as Record<PaymentMethod, string>;
    for (const method of paymentMethodValues) {
      const expected = summary.find((row) => row.method === method)?.expectedCents ?? 0;
      initial[method] = centsToReais(expected);
    }
    return initial;
  });
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = cashRegister.closedAt === null;

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  async function handleUpdateOpening() {
    if (isSavingOpening) {
      return;
    }

    setError(null);
    setIsSavingOpening(true);

    try {
      await updateOpeningBalance(reaisToCents(openingBalanceInput));
      refreshPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o fundo de caixa.");
    } finally {
      setIsSavingOpening(false);
    }
  }

  async function handleCloseCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isClosing) {
      return;
    }

    setError(null);
    setIsClosing(true);

    try {
      const counts: Record<string, { counted: number }> = {};
      for (const method of paymentMethodValues) {
        counts[method] = { counted: reaisToCents(countedInputs[method]) };
      }
      await closeCashRegister(counts);
      setIsCloseDrawerOpen(false);
      refreshPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel fechar o caixa.");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        actions={
          isOpen ? (
            <Button onClick={() => setIsCloseDrawerOpen(true)}>Fechar caixa</Button>
          ) : null
        }
        eyebrow="Operacao"
        title="Caixa de hoje"
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isOpen && cashRegister.openingBalanceCents === 0 ? (
        <Alert variant="warning">
          Fundo de caixa esta R$ 0,00. Informe o valor de abertura antes de fechar o dia.
        </Alert>
      ) : null}

      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Fundo de caixa</h2>
          <Badge variant={isOpen ? "success" : "neutral"}>{isOpen ? "Aberto" : "Fechado"}</Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Fundo de caixa (R$)">
            <TextInput
              disabled={!isOpen || isSavingOpening}
              inputMode="decimal"
              value={openingBalanceInput}
              onChange={(event) => setOpeningBalanceInput(event.target.value)}
            />
          </Field>
          {isOpen ? (
            <Button
              disabled={isSavingOpening || isPending}
              onClick={handleUpdateOpening}
              variant="secondary"
            >
              {isSavingOpening ? "Atualizando..." : "Atualizar fundo"}
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Saldo atual: {formatCentsToBRL(cashRegister.openingBalanceCents)}
        </p>
      </Panel>

      <Panel className="p-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Resumo por pagamento</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted)]">
                <th className="py-2 pr-4">Metodo</th>
                <th className="py-2 pr-4">Vendas</th>
                <th className="py-2 pr-4">Despesas</th>
                <th className="py-2">Esperado</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.method} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="py-3 pr-4 font-medium text-[var(--foreground)]">
                    {paymentMethodLabels[row.method]}
                  </td>
                  <td className="py-3 pr-4 text-[var(--foreground)]">{formatCentsToBRL(row.salesCents)}</td>
                  <td className="py-3 pr-4 text-[var(--muted)]">{formatCentsToBRL(row.expensesCents)}</td>
                  <td className="py-3 font-semibold text-[var(--foreground)]">{formatCentsToBRL(row.expectedCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {!isOpen ? (
        <Panel className="p-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Fechamento</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted)]">
                  <th className="py-2 pr-4">Metodo</th>
                  <th className="py-2 pr-4">Esperado</th>
                  <th className="py-2 pr-4">Contado</th>
                  <th className="py-2">Diferenca</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethodValues.map((method) => {
                  const count = cashRegister.counts[method];

                  if (!count) {
                    return null;
                  }

                  return (
                    <tr key={method} className="border-b border-[var(--border-soft)] last:border-0">
                      <td className="py-3 pr-4 font-medium text-[var(--foreground)]">
                        {paymentMethodLabels[method]}
                      </td>
                      <td className="py-3 pr-4 text-[var(--foreground)]">{formatCentsToBRL(count.expected)}</td>
                      <td className="py-3 pr-4 text-[var(--foreground)]">{formatCentsToBRL(count.counted)}</td>
                      <td
                        className={
                          count.difference < 0
                            ? "py-3 font-medium text-[var(--danger)]"
                            : "py-3 font-medium text-[var(--success)]"
                        }
                      >
                        {formatCentsToBRL(count.difference)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {isOpen ? (
        <Drawer
          badge={<Badge variant="warning">Fechamento</Badge>}
          description="Informe o valor contado por forma de pagamento para fechar o caixa."
          onClose={() => setIsCloseDrawerOpen(false)}
          open={isCloseDrawerOpen}
          title="Fechar caixa"
        >
          <form className="grid gap-4" onSubmit={handleCloseCash}>
            {paymentMethodValues.map((method) => {
              const row = summary.find((item) => item.method === method);
              const expected = row?.expectedCents ?? 0;
              const difference = reaisToCents(countedInputs[method]) - expected;

              return (
                <div
                  key={method}
                  className="space-y-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3"
                >
                  <Field label={paymentMethodLabels[method]}>
                    <TextInput
                      disabled={isClosing}
                      inputMode="decimal"
                      value={countedInputs[method]}
                      onChange={(event) =>
                        setCountedInputs({ ...countedInputs, [method]: event.target.value })
                      }
                    />
                  </Field>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                    <span>
                      Esperado:{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {formatCentsToBRL(expected)}
                      </span>
                    </span>
                    <span>
                      Diferenca:{" "}
                      <span
                        className={
                          difference < 0
                            ? "font-medium text-[var(--danger)]"
                            : "font-medium text-[var(--success)]"
                        }
                      >
                        {formatCentsToBRL(difference)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2">
              <Button disabled={isClosing || isPending} type="submit">
                {isClosing ? "Fechando..." : "Confirmar fechamento"}
              </Button>
              <Button disabled={isClosing} onClick={() => setIsCloseDrawerOpen(false)} variant="secondary">
                Cancelar
              </Button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </section>
  );
}

function reaisToCents(value: string): number {
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  return Number.isNaN(cents) ? 0 : Math.max(0, cents);
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
