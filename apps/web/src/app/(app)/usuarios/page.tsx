import { cookies } from "next/headers";

import { requireRole } from "@/lib/auth";
import { fetchOperatorUsers } from "@/lib/users";

import { UsuariosUi } from "./usuarios-ui";

export default async function UsuariosPage() {
  await requireRole(["ADMIN"]);
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchOperatorUsers(cookieHeader);

  return <UsuariosUi users={data.users} />;
}
