import { requireRole } from "@/lib/auth";

import { UsuariosUi } from "./usuarios-ui";

export default async function UsuariosPage() {
  await requireRole(["ADMIN"]);

  return <UsuariosUi />;
}
