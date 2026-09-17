"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-controls";
import { Panel } from "@/components/ui/panel";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });

    if (!response.ok) {
      setError("E-mail ou senha invalidos.");
      return;
    }

    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Panel className="w-full max-w-md p-6 md:p-8">
      <form action={handleSubmit}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--brand-soft)] text-[var(--brand)]">
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--muted)]">Planeta Agua</p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Acesso operacional</h1>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Entre para registrar vendas, consultar estoque e acompanhar o caixa do dia.
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <Field label="E-mail">
            <TextInput autoComplete="email" name="email" required type="email" />
          </Field>
          <Field label="Senha">
            <TextInput autoComplete="current-password" name="password" required type="password" />
          </Field>
        </div>
        {error ? (
          <Alert className="mt-4" variant="danger">
            {error}
          </Alert>
        ) : null}
        <Button className="mt-6 w-full" isLoading={isPending} type="submit">
          Entrar
        </Button>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">Sistema interno da loja</p>
      </form>
    </Panel>
  );
}
