"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { OperatorUserResponse } from "shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput } from "@/components/ui/form-controls";
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

      <Panel className="p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Novo operador</h2>
            <p className="text-sm text-[var(--muted)]">Operadores fazem login para registrar vendas. Entregadores continuam em cadastro separado.</p>
          </div>
          <Badge variant="info">Acesso limitado</Badge>
        </div>
        <form className="mt-5 grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_180px_auto] lg:items-end" onSubmit={handleCreate}>
          <Field label="Nome">
            <TextInput
              name="name"
              placeholder="Ex.: Maria Souza"
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
            />
          </Field>
          <Field label="E-mail">
            <TextInput
              name="email"
              placeholder="email@loja.local"
              required
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))}
            />
          </Field>
          <Field label="Senha inicial">
            <TextInput
              name="password"
              placeholder="Minimo 6 caracteres"
              required
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))}
            />
          </Field>
          <Button className="min-h-11 whitespace-nowrap" disabled={isPending} type="submit">
            Criar operador
          </Button>
        </form>
      </Panel>

      <Panel className="p-5">
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
    <li className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--card)] p-4 transition duration-150 hover:border-[var(--brand)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
          <p className="text-sm text-[var(--muted)]">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.isActive ? "success" : "warning"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
          <Button
            className="min-h-9 px-3"
            disabled={disabled}
            type="button"
            variant={user.isActive ? "secondary" : "primary"}
            onClick={() => onAction(() => toggleOperatorUser(user.id), user.isActive ? "Operador inativado." : "Operador ativado.")}
          >
            {user.isActive ? "Inativar acesso" : "Ativar acesso"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <form className="rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3" onSubmit={handleEdit}>
          <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.3fr)_auto] lg:items-end">
            <Field label="Nome">
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="E-mail">
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Button className="min-h-11 whitespace-nowrap" disabled={disabled} type="submit" variant="secondary">
              Salvar dados
            </Button>
          </div>
        </form>

        <form className="rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3" onSubmit={handleReset}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="Senha">
              <TextInput
                className="min-w-0 flex-1"
                placeholder="Nova senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Button className="min-h-11 whitespace-nowrap" disabled={disabled || password.length === 0} type="submit" variant="ghost">
              Redefinir senha
            </Button>
          </div>
        </form>
      </div>
    </li>
  );
}
