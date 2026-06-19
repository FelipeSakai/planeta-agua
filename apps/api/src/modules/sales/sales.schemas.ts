import { z } from "zod";

import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
} from "shared";

export {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
};

export type CancelSaleInput = z.infer<typeof cancelSaleInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerInputSchema>;
export type SaleDetailResponse = z.infer<typeof saleDetailResponseSchema>;
export type SalesListResponse = z.infer<typeof saleHistoryResponseSchema>;
