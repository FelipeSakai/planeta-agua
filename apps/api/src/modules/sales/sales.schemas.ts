import { z } from "zod";

import {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryFilterSchema,
  saleHistoryResponseSchema,
} from "shared";

export {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryFilterSchema,
  saleHistoryResponseSchema,
};

export type CancelSaleInput = z.infer<typeof cancelSaleInputSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliveryInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerInputSchema>;
export type SaleCustomerResponse = z.infer<typeof saleCustomerResponseSchema>;
export type SalesCustomersResponse = z.infer<typeof saleCustomersResponseSchema>;
export type SaleDetailResponse = z.infer<typeof saleDetailResponseSchema>;
export type SalesListResponse = z.infer<typeof saleHistoryResponseSchema>;
export type SaleHistoryFilter = z.infer<typeof saleHistoryFilterSchema>;
