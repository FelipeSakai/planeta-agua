"use server";

import { listActiveProducts } from "./products.service";

export async function listActiveProductsAction() {
  return listActiveProducts();
}
