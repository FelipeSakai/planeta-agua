"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { SessionUser, UserRole } from "shared";

type AppShellProps = {
  user: SessionUser;
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  href: string;
  roles: readonly UserRole[];
};

const navigation: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "OPERATOR"] },
  { label: "Vendas", href: "/vendas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Produtos", href: "/produtos", roles: ["ADMIN", "OPERATOR"] },
  { label: "Clientes", href: "/clientes", roles: ["ADMIN", "OPERATOR"] },
  { label: "Estoque", href: "/estoque", roles: ["ADMIN"] },
  { label: "Financeiro", href: "/financeiro", roles: ["ADMIN"] },
  { label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
] as const;

export function getVisibleNavigation(role: UserRole) {
  return navigation.filter((item) => item.roles.includes(role));
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const visibleNavigation = getVisibleNavigation(user.role);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f1ec] text-[#111111]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#d3cec6] bg-[#f5f1ec] p-5 lg:block">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#ebe7e1]">
          <strong className="block text-lg font-medium">Planeta Agua</strong>
          <span className="mt-1 block text-xs text-[#626260]">{user.role}</span>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {visibleNavigation.map((item) => (
            <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-[#626260] hover:bg-white hover:text-[#111111]">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#d3cec6] bg-[#f5f1ec]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Planeta Agua</p>
              <p className="text-xs text-[#626260]">{user.name}</p>
            </div>
            <form action={handleLogout}>
              <button className="rounded-lg border border-[#d3cec6] bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isPending}>
                {isPending ? "Saindo..." : "Sair"}
              </button>
            </form>
          </div>

          <details className="mt-4 rounded-xl border border-[#d3cec6] bg-white p-2 lg:hidden">
            <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-[#111111]">Menu</summary>
            <nav className="mt-2 flex flex-col gap-1 border-t border-[#ebe7e1] pt-2">
              {visibleNavigation.map((item) => (
                <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-[#626260] hover:bg-[#f5f1ec] hover:text-[#111111]">
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
