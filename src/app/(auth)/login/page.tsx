import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f1ec] px-6 py-10 text-[#111111]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-sm font-medium text-[#626260]">Planeta Agua</p>
          <h1 className="max-w-xl text-5xl font-medium tracking-[-1.2px] md:text-6xl">
            Operacao da loja em uma tela clara.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-[#626260]">
            Entre para registrar vendas, acompanhar estoque e consultar o resumo financeiro do dia.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
