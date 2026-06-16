import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "shared";

import { AuthRepository } from "./auth.repository";
import type { LoginInput } from "./auth.schemas";
import { verifyPassword } from "./password";
import { createSessionExpiresAt, createSessionToken, hashSessionToken } from "./session";

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(input: LoginInput) {
    const user = await this.authRepository.findActiveUserByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException("E-mail ou senha invalidos.");
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("E-mail ou senha invalidos.");
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = createSessionExpiresAt();

    await this.authRepository.createSession({ userId: user.id, tokenHash, expiresAt });

    return {
      token,
      expiresAt,
      user: this.toSessionUser(user),
    };
  }

  async getUserByToken(token: string): Promise<SessionUser | null> {
    const session = await this.authRepository.findUserBySessionHash(hashSessionToken(token));

    if (!session?.user || !session.user.isActive) {
      return null;
    }

    return this.toSessionUser(session.user);
  }

  async logout(token: string) {
    await this.authRepository.deleteSessionByHash(hashSessionToken(token));
  }

  private toSessionUser(user: { id: string; name: string; email: string; role: "ADMIN" | "OPERATOR" }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    } satisfies SessionUser;
  }
}
