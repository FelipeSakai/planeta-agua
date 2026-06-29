import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { createOperatorUserSchema, resetOperatorPasswordSchema, updateOperatorUserSchema } from "shared";
import { z } from "zod";

import { AuthService } from "../auth/auth.service";
import { requireRequestUser } from "../auth/current-user";
import { UsersService } from "./users.service";

const idSchema = z.string().uuid();

function parseBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(message);
  }
  return result.data;
}

function parseId(id: string) {
  const result = idSchema.safeParse(id);
  if (!result.success) {
    throw new BadRequestException("Id invalido.");
  }
  return result.data;
}

@Controller("users")
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await this.requireAdmin(request);
    return this.usersService.listOperators();
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    await this.requireAdmin(request);
    const input = parseBody(createOperatorUserSchema, body, "Dados do usuario invalidos.");
    return this.usersService.createOperator(input);
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    await this.requireAdmin(request);
    const input = parseBody(updateOperatorUserSchema, body, "Dados do usuario invalidos.");
    return this.usersService.updateOperator(parseId(id), input);
  }

  @Post(":id/toggle-active")
  async toggleActive(@Req() request: Request, @Param("id") id: string) {
    await this.requireAdmin(request);
    return this.usersService.toggleActive(parseId(id));
  }

  @Post(":id/reset-password")
  async resetPassword(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    await this.requireAdmin(request);
    const input = parseBody(resetOperatorPasswordSchema, body, "Dados da senha invalidos.");
    return this.usersService.resetPassword(parseId(id), input);
  }

  private async requireAdmin(request: Request) {
    const user = await requireRequestUser(request, this.authService);
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Acesso restrito a administradores.");
    }
    return user;
  }
}
