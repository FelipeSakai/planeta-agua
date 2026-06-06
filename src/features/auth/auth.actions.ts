"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, isProduction } from "@/lib/session";

import { loginSchema } from "./auth.schemas";
import { InvalidCredentialsError, login, logout } from "./auth.service";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(_state: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    const session = await login(parsed.data);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      expires: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { error: error.message };
    }

    return { error: "Nao foi possivel entrar agora." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await logout(token);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
