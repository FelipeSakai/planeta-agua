import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { createCustomerBottleSchema, createCustomerSchema, updateCustomerBottleSchema, updateCustomerSchema } from "./customers.schemas";
import { CustomersService } from "./customers.service";

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

@Controller("customers")
export class CustomersController {
  constructor(
    private readonly authService: AuthService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.customersService.listCustomers();
  }

  @Get("duplicates")
  async checkDuplicates(
    @Req() request: Request,
    @Query("name") name = "",
    @Query("phone") phone: string | undefined,
    @Query("mobilePhone") mobilePhone: string | undefined,
    @Query("excludeId") excludeId: string | undefined,
  ) {
    await requireRequestUser(request, this.authService);
    return this.customersService.checkDuplicates(name, phone ?? null, mobilePhone ?? null, excludeId);
  }

  @Get(":id")
  async getById(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.customersService.getCustomerDetail(parseId(id));
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseBody(createCustomerSchema, body, "Dados do cliente invalidos.");

    return this.customersService.createCustomer(user, input);
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const customerId = parseId(id);
    const input = parseBody(updateCustomerSchema, body, "Dados do cliente invalidos.");

    return this.customersService.updateCustomer(customerId, user, input);
  }

  @Patch(":id/toggle-active")
  async toggle(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);

    return this.customersService.toggleActive(parseId(id));
  }

  @Post(":id/bottles")
  async addBottle(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseBody(createCustomerBottleSchema, body, "Dados do galao invalidos.");

    return this.customersService.addBottle(parseId(id), user, input);
  }

  @Patch(":id/bottles/:bottleId")
  async updateBottle(@Req() request: Request, @Param("id") id: string, @Param("bottleId") bottleId: string, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseBody(updateCustomerBottleSchema, body, "Dados do galao invalidos.");

    return this.customersService.updateBottle(parseId(bottleId), input);
  }

  @Patch(":id/bottles/:bottleId/deactivate")
  async deactivateBottle(@Req() request: Request, @Param("id") id: string, @Param("bottleId") bottleId: string) {
    await requireRequestUser(request, this.authService);

    return this.customersService.deactivateBottle(parseId(bottleId));
  }
}
