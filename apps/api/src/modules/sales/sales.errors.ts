export type SalesRepositoryErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "INSUFFICIENT_STOCK"
  | "SALE_NOT_FOUND"
  | "SALE_ALREADY_CANCELED"
  | "SALE_ALREADY_DELIVERED"
  | "SALE_NOT_DELIVERABLE"
  | "INVALID_ITEM_PRICE";

export class SalesRepositoryError extends Error {
  readonly code: SalesRepositoryErrorCode;

  constructor(code: SalesRepositoryErrorCode, message: string) {
    super(message);
    this.name = "SalesRepositoryError";
    this.code = code;
  }
}
