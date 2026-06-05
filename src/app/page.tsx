const modules = [
  {
    title: "Vendas",
    description: "Fluxo principal com cliente opcional, carrinho, pagamento e baixa de estoque.",
  },
  {
    title: "Estoque",
    description: "Entradas, ajustes com motivo e alerta de produtos abaixo do minimo.",
  },
  {
    title: "Produtos",
    description: "Cadastro de itens vendidos, preco, status e quantidade atual.",
  },
  {
    title: "Financeiro",
    description: "Resumo diario de vendas, formas de pagamento e despesas simples.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff4ff,transparent_32%),linear-gradient(135deg,#f7fbff,#eef8ff)] px-6 py-8 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-sky-100 bg-white/85 p-8 shadow-sm backdrop-blur md:p-10">
          <div className="flex flex-col gap-3">
            <span className="w-fit rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-800">
              MVP operacional
            </span>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
              Planeta Agua
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Sistema web interno para registrar vendas, controlar estoque e acompanhar o financeiro simples da loja.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-sky-950 p-5 text-white">
              <p className="text-sm text-sky-200">Prioridade 1</p>
              <strong className="mt-2 block text-2xl">Venda correta</strong>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-sky-100">
              <p className="text-sm text-slate-500">Prioridade 2</p>
              <strong className="mt-2 block text-2xl">Estoque confiavel</strong>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-sky-100">
              <p className="text-sm text-slate-500">Prioridade 3</p>
              <strong className="mt-2 block text-2xl">Resumo financeiro</strong>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <article key={module.title} className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
