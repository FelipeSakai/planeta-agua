import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";
import { searchSaleCustomers } from "@/lib/sales";

import { SalesUi } from "./sales-ui";

export default async function SalesPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const [productsData, customers] = await Promise.all([
    fetchProducts(cookieHeader),
    searchSaleCustomers("", { cookieHeader }),
  ]);

  return (
    <SalesUi
      userRole={user.role}
      products={productsData.products.filter((product) => product.isActive)}
      customers={customers}
    />
  );
}
