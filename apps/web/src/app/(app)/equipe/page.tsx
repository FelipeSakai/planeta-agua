import { requireUser } from "@/lib/auth";

import { EquipeUi } from "./equipe-ui";

export default async function EquipePage() {
  const user = await requireUser();

  return <EquipeUi userRole={user.role} />;
}
