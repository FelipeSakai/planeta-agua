import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchDrivers } from "@/lib/drivers";

import { DriversUi } from "./drivers-ui";

export default async function DriversPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchDrivers(cookieHeader);

  return <DriversUi userRole={user.role} drivers={data.drivers} summary={data.summary} />;
}