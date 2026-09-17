import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <LoginForm />
      </section>
    </main>
  );
}
