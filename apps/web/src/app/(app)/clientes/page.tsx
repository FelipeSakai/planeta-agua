import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchCustomers } from "@/lib/customers";

import { CustomersUi } from "./customers-ui";

export default async function CustomersPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchCustomers(cookieHeader);

  return <CustomersUi userRole={user.role} customers={data.customers} summary={data.summary} />;
}
