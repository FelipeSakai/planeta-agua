import type { StockAdjustmentInput } from "./stock.schemas";

export async function adjustStock(input: StockAdjustmentInput, userId: string) {
  void input;
  void userId;

  throw new Error("adjustStock ainda nao implementado");
}
