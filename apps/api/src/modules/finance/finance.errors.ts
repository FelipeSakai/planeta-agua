export type FinanceRepositoryErrorCode =
  | "CASH_REGISTER_NOT_FOUND"
  | "CASH_REGISTER_ALREADY_CLOSED"
  | "CASH_REGISTER_CLOSED"
  | "EXPENSE_NOT_FOUND"
  | "EXPENSE_ALREADY_DELETED";

export class FinanceRepositoryError extends Error {
  readonly code: FinanceRepositoryErrorCode;

  constructor(code: FinanceRepositoryErrorCode, message: string) {
    super(message);
    this.name = "FinanceRepositoryError";
    this.code = code;
  }
}
