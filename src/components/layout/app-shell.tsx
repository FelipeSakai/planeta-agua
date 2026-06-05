type AppShellProps = {
  children: React.ReactNode;
};

const navigation = ["Dashboard", "Vendas", "Produtos", "Clientes", "Estoque", "Financeiro"];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 lg:block">
        <strong className="text-xl">Planeta Agua</strong>
        <nav className="mt-8 flex flex-col gap-2">
          {navigation.map((item) => (
            <a key={item} href="#" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-800">
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
