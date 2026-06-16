"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
    <form action={handleSubmit} className="rounded-2xl border border-[#d3cec6] bg-white p-6 md:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.4px]">Entrar</h2>
        <p className="text-sm text-[#626260]">Use seu e-mail e senha de operador.</p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 text-base outline-none focus:border-[#111111]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 text-base outline-none focus:border-[#111111]"
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 h-11 w-full rounded-lg bg-[#111111] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
