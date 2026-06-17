import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService } from "./auth.service";
import { SESSION_COOKIE_NAME } from "./session";

export async function requireRequestUser(request: Request, authService: AuthService) {
  const token = request.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedException("Sessao invalida.");
  }

  const user = await authService.getUserByToken(token);

  if (!user) {
    throw new UnauthorizedException("Sessao invalida.");
  }

  return user;
}
