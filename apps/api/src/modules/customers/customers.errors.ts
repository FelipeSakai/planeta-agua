export type CustomersRepositoryErrorCode =
  | "CUSTOMER_NOT_FOUND"
  | "CUSTOMER_DUPLICATE_PHONE"
  | "BOTTLE_NOT_FOUND";

export class CustomersRepositoryError extends Error {
  readonly code: CustomersRepositoryErrorCode;

  constructor(code: CustomersRepositoryErrorCode, message: string) {
    super(message);
    this.name = "CustomersRepositoryError";
    this.code = code;
  }
}
