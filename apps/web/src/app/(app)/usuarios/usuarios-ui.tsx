import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

export function UsuariosUi() {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Usuarios"
        description="Area administrativa reservada para o futuro cadastro de usuarios do sistema."
      />

      <Panel className="p-4">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium text-[var(--foreground)]">Funcionalidade em preparacao</p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Somente administradores podem acessar esta area. O cadastro completo de usuarios ainda nao foi implementado para manter o MVP focado em vendas, estoque e financeiro simples.
          </p>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)]"
            href="/equipe"
          >
            Voltar para equipe
          </Link>
        </div>
      </Panel>
    </section>
  );
}
