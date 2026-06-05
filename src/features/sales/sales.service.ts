import type { CreateSaleInput } from "./sales.schemas";

export async function createSale(input: CreateSaleInput, userId: string) {
  void input;
  void userId;

  throw new Error("createSale ainda nao implementado");
}
