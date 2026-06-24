import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { DriversService } from "./drivers.service";
import { createDriverSchema, updateDriverSchema } from "shared";

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

@Controller("drivers")
export class DriversController {
  constructor(
    private readonly authService: AuthService,
    private readonly driversService: DriversService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.driversService.listDrivers();
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseBody(createDriverSchema, body, "Dados do entregador invalidos.");
    return this.driversService.createDriver(input);
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseBody(updateDriverSchema, body, "Dados do entregador invalidos.");
    return this.driversService.updateDriver(parseId(id), input);
  }

  @Patch(":id/toggle-active")
  async toggle(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.driversService.toggleActive(parseId(id));
  }
}
