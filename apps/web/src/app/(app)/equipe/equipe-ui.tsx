import Link from "next/link";
import type { UserRole } from "shared";

import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

const secondaryLinkClassName =
  "mt-4 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)]";

export function EquipeUi({ userRole }: { userRole: UserRole }) {
  const isAdmin = userRole === "ADMIN";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Equipe"
        description="Gerencie quem opera o sistema e quem realiza entregas."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin ? (
          <Panel className="p-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Usuarios</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Acesso ao sistema, perfis e usuarios ativos.</p>
            <Link className={secondaryLinkClassName} href="/usuarios">
              Abrir usuarios
            </Link>
          </Panel>
        ) : null}

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Entregadores</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Cadastro simples de entregadores usados nas vendas com entrega.</p>
          <Link className={secondaryLinkClassName} href="/entregadores">
            Abrir entregadores
          </Link>
        </Panel>
      </div>
    </section>
  );
}
