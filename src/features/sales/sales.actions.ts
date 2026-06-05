"use server";

import { createSaleSchema } from "./sales.schemas";
import { createSale } from "./sales.service";

export async function createSaleAction(input: unknown) {
  const data = createSaleSchema.parse(input);

  // TODO: substituir por usuario da sessao quando auth estiver implementada.
  return createSale(data, "");
}
