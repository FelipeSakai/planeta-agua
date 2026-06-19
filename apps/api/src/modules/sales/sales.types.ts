import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { customers, saleItems, sales } from "../../db/schema";

export type SaleRow = InferSelectModel<typeof sales>;
export type NewSaleRow = InferInsertModel<typeof sales>;
export type SaleItemRow = InferSelectModel<typeof saleItems>;
export type CustomerRow = InferSelectModel<typeof customers>;
export type PaymentMethod = SaleRow["paymentMethod"];
export type SaleStatus = SaleRow["status"];
export type CreateSaleRepositoryInput = {
  customerId: string | null;
  userId: string;
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; quantity: number }>;
  bottle: { month: number; year: number; notes?: string | null } | null;
};
