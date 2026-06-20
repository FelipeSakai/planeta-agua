import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { customers, saleItems, sales } from "../../db/schema";
import type { saleHistoryStatusFilterValues } from "shared";

export type SaleRow = InferSelectModel<typeof sales>;
export type NewSaleRow = InferInsertModel<typeof sales>;
export type SaleItemRow = InferSelectModel<typeof saleItems>;
export type CustomerRow = InferSelectModel<typeof customers>;
export type PaymentMethod = SaleRow["paymentMethod"];
export type SaleStatus = SaleRow["status"];
export type SaleHistoryStatusFilter = (typeof saleHistoryStatusFilterValues)[number];

export type SaleItemRepositoryInput = {
  productId: string;
  quantity: number;
  finalUnitPriceCents?: number;
  discountCents?: number;
};

export type CreateSaleRepositoryInput = {
  customerId: string | null;
  userId: string;
  paymentMethod: PaymentMethod;
  items: SaleItemRepositoryInput[];
  bottle: { month: number; year: number; notes?: string | null } | null;
  deliveryPending: boolean;
};

export type ConfirmDeliveryRepositoryInput = {
  saleId: string;
  userId: string;
};

export type ListSalesOptions = {
  status?: SaleHistoryStatusFilter;
};
