import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchCashRegisterDetails } from "@/lib/finance";

import { CashUi } from "./cash-ui";

export default async function CaixaPage() {
  await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const details = await fetchCashRegisterDetails(cookieHeader);

  if (!details) {
    return (
      <section className="space-y-6">
        <p className="text-base text-[var(--muted)]">Nao foi possivel carregar o caixa.</p>
      </section>
    );
  }

  return <CashUi details={details} />;
}
