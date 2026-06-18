import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Resumo operacional"
        description="Acompanhe o dia da loja, veja alertas e acesse os fluxos principais."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Vendas hoje" value="0" detail="Aguardando registros de venda" />
        <MetricCard label="Faturamento hoje" value="R$ 0,00" detail="Entradas confirmadas no dia" />
        <MetricCard label="Estoque baixo" value="0" detail="Nenhum produto abaixo do minimo" tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Atalhos operacionais</h2>
            <p className="text-sm text-[var(--muted)]">Acesse rapidamente os fluxos mais usados na rotina da loja.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <form action="/vendas" method="get">
              <Button className="w-full" type="submit">
                Nova venda
              </Button>
            </form>
            <form action="/produtos" method="get">
              <Button className="w-full" type="submit" variant="secondary">
                Produtos
              </Button>
            </form>
            <form action="/estoque" method="get">
              <Button className="w-full" type="submit" variant="secondary">
                Estoque
              </Button>
            </form>
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Alertas de estoque</h2>
            <p className="text-sm text-[var(--muted)]">Produtos abaixo do minimo aparecerao aqui.</p>
          </div>

          <EmptyState title="Nenhum alerta critico por enquanto." description="Quando houver estoque baixo, o alerta ficara visivel neste painel." />
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Fechamento de caixa</h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Relatorio diario e mensal entrara apos o modulo de vendas alimentar dados reais.
          </p>
        </div>
      </Panel>
    </section>
  );
}
