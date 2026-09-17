import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-screen bg-[var(--background)] bg-cover bg-center text-[var(--foreground)]"
      style={{ backgroundImage: "url('/dc191b50-65ab-43b5-b47b-a53e22245a6c.png')" }}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-8 lg:justify-end lg:px-12 xl:px-16">
        <LoginForm />
      </section>
    </main>
  );
}
