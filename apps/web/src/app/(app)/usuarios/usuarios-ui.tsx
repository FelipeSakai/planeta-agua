"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { OperatorUserResponse } from "shared";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { createOperatorUser, resetOperatorPassword, toggleOperatorUser, updateOperatorUser } from "@/lib/users";

type FormState = {
  name: string;
  email: string;
  password: string;
};

const initialFormState: FormState = { name: "", email: "", password: "" };

export function UsuariosUi({ users }: Readonly<{ users: OperatorUserResponse[] }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createForm, setCreateForm] = useState(initialFormState);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage(success);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o usuario.");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await createOperatorUser(createForm);
      setCreateForm(initialFormState);
    }, "Operador criado com sucesso.");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Usuarios"
        description="Cadastre operadores que acessam o sistema para registrar vendas e consultar rotinas permitidas."
      />

      {message ? (
        <Panel className="border-[var(--brand)] bg-[var(--hero-surface-muted)] p-4 text-sm text-[var(--foreground)]">
          {message}
        </Panel>
      ) : null}

      <Panel className="p-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Novo operador</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Operadores fazem login para registrar vendas. Entregadores continuam em cadastro separado.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]" onSubmit={handleCreate}>
          <input
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            name="name"
            placeholder="Nome"
            required
            value={createForm.name}
            onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
          />
          <input
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            name="email"
            placeholder="email@loja.local"
            required
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))}
          />
          <input
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            name="password"
            placeholder="Senha inicial"
            required
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))}
          />
          <button
            className="min-h-11 rounded-[var(--radius-control)] bg-[var(--brand)] px-4 text-sm font-medium text-white disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            Criar
          </button>
        </form>
      </Panel>

      <Panel className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Operadores</h2>
            <p className="text-sm text-[var(--muted)]">Gerencie acesso de quem opera vendas no sistema.</p>
          </div>
          <Badge>{users.length} operador{users.length === 1 ? "" : "es"}</Badge>
        </div>

        {users.length > 0 ? (
          <ul className="space-y-3">
            {users.map((user) => (
              <OperatorRow key={user.id} disabled={isPending} onAction={runAction} user={user} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum operador cadastrado" description="Crie o primeiro operador para que ele consiga registrar vendas." />
        )}
      </Panel>
    </section>
  );
}

function OperatorRow({
  user,
  disabled,
  onAction,
}: Readonly<{
  user: OperatorUserResponse;
  disabled: boolean;
  onAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}>) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAction(() => updateOperatorUser(user.id, { name, email }), "Operador atualizado com sucesso.");
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAction(async () => {
      await resetOperatorPassword(user.id, { password });
      setPassword("");
    }, "Senha redefinida com sucesso.");
  }

  return (
    <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card-muted)] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
          <p className="text-sm text-[var(--muted)]">{user.email}</p>
        </div>
        <Badge variant={user.isActive ? "success" : "warning"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto]">
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={handleEdit}>
          <input
            aria-label={`Nome de ${user.name}`}
            className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            aria-label={`Email de ${user.name}`}
            className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-medium" disabled={disabled} type="submit">
            Editar
          </button>
        </form>

        <form className="flex gap-2" onSubmit={handleReset}>
          <input
            aria-label={`Nova senha de ${user.name}`}
            className="min-h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            placeholder="Nova senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-medium" disabled={disabled} type="submit">
            Redefinir senha
          </button>
        </form>

        <button
          className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-medium"
          disabled={disabled}
          type="button"
          onClick={() => onAction(() => toggleOperatorUser(user.id), user.isActive ? "Operador inativado." : "Operador ativado.")}
        >
          {user.isActive ? "Inativar" : "Ativar"}
        </button>
      </div>
    </li>
  );
}
