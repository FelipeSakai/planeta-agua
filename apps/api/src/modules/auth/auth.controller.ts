import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";

import { env } from "../../env";
import { loginSchema } from "./auth.schemas";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE_NAME } from "./session";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = loginSchema.parse(body);
    const result = await this.authService.login(input);

    response.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt,
    });

    return { user: result.user };
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (token) {
      await this.authService.logout(token);
    }

    response.clearCookie(SESSION_COOKIE_NAME, { path: "/" });

    return { ok: true };
  }

  @Get("me")
  async me(@Req() request: Request) {
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException("Sessao invalida.");
    }

    const user = await this.authService.getUserByToken(token);

    if (!user) {
      throw new UnauthorizedException("Sessao invalida.");
    }

    return { user };
  }
}
