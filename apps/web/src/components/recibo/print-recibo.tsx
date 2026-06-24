"use client";

import { formatCentsToBRL, type SaleDetailResponse } from "shared";

const paymentMethodLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Credito",
  DEBIT_CARD: "Debito",
  OTHER: "Outro",
};

const statusLabels: Record<string, string> = {
  COMPLETED: "Concluida",
  PENDING_DELIVERY: "Pendente de entrega",
  CANCELED: "Cancelada",
};

export function PrintRecibo({ sale }: { sale: SaleDetailResponse }) {
  const isDelivery = sale.sale.status === "PENDING_DELIVERY" || Boolean(sale.sale.driverName);
  const customerName = sale.sale.customerName ?? "Consumidor";
  const saleDate = new Date(sale.sale.createdAt).toLocaleString("pt-BR");

  return (
    <div className="print-area hidden">
      <div className="mx-auto max-w-2xl space-y-4 font-mono text-sm text-black">
        <div className="text-center">
          <h1 className="text-lg font-bold">Planeta Agua</h1>
          <p className="text-xs">Recibo de Venda</p>
        </div>

        <div className="space-y-1 border-y border-black py-2">
          <p>Data: {saleDate}</p>
          <p>Venda: {sale.sale.id.slice(0, 8).toUpperCase()}</p>
          <p>Cliente: {customerName}</p>
          {isDelivery ? (
            <>
              <p>Telefone: {sale.sale.customerPhone ?? "Nao informado"}</p>
              <p>Endereco: {sale.sale.customerAddress ?? "Nao informado"}</p>
              <p>Entregador: {sale.sale.driverName ?? "Nao informado"}</p>
              <p>Status: {statusLabels[sale.sale.status] ?? sale.sale.status}</p>
            </>
          ) : null}
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">Produto</th>
              <th className="py-1 text-right">Qtd</th>
              <th className="py-1 text-right">Unit</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-dashed border-black">
                <td className="py-1 text-left">{item.productNameSnapshot}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{formatCentsToBRL(item.finalUnitPriceCents ?? item.unitPriceCents)}</td>
                <td className="py-1 text-right">{formatCentsToBRL(item.totalPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 border-t border-black pt-2">
          <p className="text-right font-bold">Total: {formatCentsToBRL(sale.sale.totalAmountCents)}</p>
          <p>Forma de pagamento: {paymentMethodLabels[sale.sale.paymentMethod] ?? sale.sale.paymentMethod}</p>
        </div>

        <div className="pt-4 text-center text-xs">
          <p>Obrigado pela preferencia!</p>
        </div>
      </div>
    </div>
  );
}

export function printRecibo() {
  window.print();
}
