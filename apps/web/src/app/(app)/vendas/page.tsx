import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";
import { fetchSalesHistory, searchSaleCustomers } from "@/lib/sales";

import { SalesUi } from "./sales-ui";

export default async function SalesPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const [productsData, history, customers] = await Promise.all([
    fetchProducts(cookieHeader),
    fetchSalesHistory(cookieHeader),
    searchSaleCustomers("", { cookieHeader }),
  ]);

  return (
    <SalesUi
      userRole={user.role}
      history={history}
      products={productsData.products.filter((product) => product.isActive)}
      customers={customers}
    />
  );
}
