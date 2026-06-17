import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";

import { ProductsUi } from "./products-ui";

export default async function ProductsPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchProducts(cookieHeader);

  return <ProductsUi userRole={user.role} products={data.products} summary={data.summary} />;
}
