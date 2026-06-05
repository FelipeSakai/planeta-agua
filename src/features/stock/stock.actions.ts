"use server";

import { stockAdjustmentSchema } from "./stock.schemas";
import { adjustStock } from "./stock.service";

export async function adjustStockAction(input: unknown) {
  const data = stockAdjustmentSchema.parse(input);

  // TODO: substituir por usuario da sessao quando auth estiver implementada.
  return adjustStock(data, "");
}
