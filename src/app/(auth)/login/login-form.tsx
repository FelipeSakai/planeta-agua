"use client";

import { useActionState } from "react";

import { loginAction } from "@/features/auth/auth.actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="rounded-2xl border border-[#d3cec6] bg-white p-6 md:p-8">
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

      {state.error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-11 w-full rounded-lg bg-[#111111] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
