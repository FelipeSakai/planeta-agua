export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#626260]">Dashboard</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Resumo operacional</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Vendas hoje</p>
          <strong className="mt-3 block text-3xl font-medium">0</strong>
        </article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Faturamento hoje</p>
          <strong className="mt-3 block text-3xl font-medium">R$ 0,00</strong>
        </article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Estoque baixo</p>
          <strong className="mt-3 block text-3xl font-medium">0</strong>
        </article>
      </div>
    </section>
  );
}
