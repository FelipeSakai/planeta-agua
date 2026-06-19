import { z } from "zod";

import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
} from "shared";

export {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
};

export type CancelSaleInput = z.infer<typeof cancelSaleInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerInputSchema>;
export type SaleCustomerResponse = z.infer<typeof saleCustomerResponseSchema>;
export type SalesCustomersResponse = z.infer<typeof saleCustomersResponseSchema>;
export type SaleDetailResponse = z.infer<typeof saleDetailResponseSchema>;
export type SalesListResponse = z.infer<typeof saleHistoryResponseSchema>;
