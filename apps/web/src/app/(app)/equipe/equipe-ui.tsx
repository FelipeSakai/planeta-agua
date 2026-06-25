import Link from "next/link";
import type { UserRole } from "shared";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

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
            <Link className="mt-4 inline-flex" href="/usuarios">
              <Button type="button" variant="secondary">
                Abrir usuarios
              </Button>
            </Link>
          </Panel>
        ) : null}

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Entregadores</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Cadastro simples de entregadores usados nas vendas com entrega.</p>
          <Link className="mt-4 inline-flex" href="/entregadores">
            <Button type="button" variant="secondary">
              Abrir entregadores
            </Button>
          </Link>
        </Panel>
      </div>
    </section>
  );
}
