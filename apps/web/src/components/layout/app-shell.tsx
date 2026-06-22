"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

type NavigationItemWithState = NavigationItem & {
  isActive: boolean;
};

const navigation: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "OPERATOR"] },
  { label: "Vendas", href: "/vendas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Caixa", href: "/caixa", roles: ["ADMIN", "OPERATOR"] },
  { label: "Produtos", href: "/produtos", roles: ["ADMIN", "OPERATOR"] },
  { label: "Clientes", href: "/clientes", roles: ["ADMIN", "OPERATOR"] },
  { label: "Estoque", href: "/estoque", roles: ["ADMIN"] },
  { label: "Financeiro", href: "/financeiro/despesas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
] as const;

const navLinkBaseClassName = "rounded-xl px-3 py-2 text-sm font-medium";
const navLinkActiveClassName = `${navLinkBaseClassName} bg-[var(--brand)] text-white`;
const navLinkInactiveClassName = `${navLinkBaseClassName} text-[var(--muted)] transition duration-150 hover:bg-[var(--card-muted)] hover:text-[var(--foreground)] motion-reduce:transition-none`;

export function getVisibleNavigation(role: UserRole) {
  return navigation.filter((item) => item.roles.includes(role));
}

export function getNavigationItems(role: UserRole, pathname: string): NavigationItemWithState[] {
  return getVisibleNavigation(role).map((item) => ({
    ...item,
    isActive: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
}

function getNavLinkClassName(isActive: boolean) {
  return isActive ? navLinkActiveClassName : navLinkInactiveClassName;
}

function AppShellNavLink({ item }: { item: NavigationItemWithState }) {
  return (
    <a href={item.href} aria-current={item.isActive ? "page" : undefined} className={getNavLinkClassName(item.isActive)}>
      {item.label}
    </a>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const visibleNavigation = getNavigationItems(user.role, pathname);

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-white p-4 lg:block">
        <div className="rounded-[var(--radius-panel)] bg-[var(--card-muted)] p-4">
          <strong className="block text-lg font-semibold tracking-[-0.02em]">Planeta Agua</strong>
          <span className="mt-1 block text-xs font-medium text-[var(--muted)]">{user.role}</span>
        </div>

        <nav className="mt-5 flex flex-col gap-1">
          {visibleNavigation.map((item) => (
            <AppShellNavLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Planeta Agua</p>
              <p className="text-xs text-[var(--muted)]">{user.name}</p>
            </div>
            <form action={handleLogout}>
              <Button
                className="motion-reduce:transition-none"
                variant="secondary"
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Saindo..." : "Sair"}
              </Button>
            </form>
          </div>

          <details className="mt-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-white p-2 lg:hidden">
            <summary className="cursor-pointer rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-[var(--foreground)]">Menu</summary>
            <nav className="mt-2 flex flex-col gap-1 border-t border-[var(--border-soft)] pt-2">
              {visibleNavigation.map((item) => (
                <AppShellNavLink key={item.href} item={item} />
              ))}
            </nav>
          </details>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
