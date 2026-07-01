"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCentsToBRL, type SaleDetailResponse } from "shared";

import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { confirmSaleDelivery } from "@/lib/sales";

type DeliveriesUiProps = {
  deliveries: SaleDetailResponse[];
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Credito",
  DEBIT_CARD: "Debito",
  OTHER: "Outro",
};

export function DeliveriesUi({ deliveries }: DeliveriesUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<SaleDetailResponse | null>(null);

  async function confirmDelivery(saleId: string) {
    setError(null);

    try {
      await confirmSaleDelivery(saleId);
      startTransition(() => router.refresh());
    } catch (deliveryError) {
      setError(deliveryError instanceof Error ? deliveryError.message : "Nao foi possivel confirmar a entrega.");
    }
  }

  function handlePrint(sale: SaleDetailResponse) {
    setError(null);
    setPrintSale(sale);
    setTimeout(() => printRecibo(), 100);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Entregas pendentes"
        description="Confirme entregas uma por vez e imprima o recibo quando precisar conferir com o cliente."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {printSale ? <PrintRecibo sale={printSale} /> : null}

      {deliveries.length === 0 ? (
        <EmptyState title="Nenhuma entrega pendente" description="Todas as entregas foram confirmadas." />
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => {
            const itemSummary = delivery.items.map((item) => `${item.quantity}x ${item.productNameSnapshot}`).join(", ");
            const customerPhones = [delivery.sale.customerMobilePhone, delivery.sale.customerPhone].filter(Boolean).join(" / ") || "Nao informado";

            return (
              <Panel key={delivery.sale.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--foreground)]">
                        {delivery.sale.customerName ?? "Consumidor"}
                      </h2>
                      <Badge variant="warning">Pendente</Badge>
                    </div>
                    <div className="grid gap-1 text-sm text-[var(--muted)] md:grid-cols-2">
                      <p>Endereco: {delivery.sale.customerAddress ?? "Nao informado"}</p>
                      <p>Telefone: {customerPhones}</p>
                      <p>Entregador: {delivery.sale.driverName ?? "Sem entregador"}</p>
                      <p>Pagamento: {paymentMethodLabels[delivery.sale.paymentMethod] ?? delivery.sale.paymentMethod}</p>
                    </div>
                    <p className="text-sm text-[var(--foreground)]">Itens: {itemSummary}</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                    <strong className="text-lg text-[var(--foreground)]">
                      {formatCentsToBRL(delivery.sale.totalAmountCents)}
                    </strong>
                    <div className="flex flex-wrap gap-2">
                      <Button className="no-print" variant="secondary" onClick={() => handlePrint(delivery)} disabled={isPending}>
                        Imprimir recibo
                      </Button>
                      <Button onClick={() => void confirmDelivery(delivery.sale.id)} disabled={isPending}>
                        {isPending ? "Confirmando..." : "Confirmar entrega"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </section>
  );
}
