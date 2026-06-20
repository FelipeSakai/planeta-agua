import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleHistoryFilterSchema,
} from "./sales.schemas";
import { SalesService } from "./sales.service";

const idSchema = z.string().uuid();

function parseSalesBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException(message);
  }

  return result.data;
}

function parseSaleId(id: string) {
  const result = idSchema.safeParse(id);

  if (!result.success) {
    throw new BadRequestException("Venda invalida.");
  }

  return result.data;
}

@Controller("sales")
export class SalesController {
  constructor(
    private readonly authService: AuthService,
    private readonly salesService: SalesService,
  ) {}

  @Get()
  async list(@Req() request: Request, @Query("status") status?: string) {
    await requireRequestUser(request, this.authService);
    const parsed = saleHistoryFilterSchema.safeParse({ status });
    return this.salesService.listSales(parsed.success ? parsed.data : {});
  }

  @Get("customers")
  async searchCustomers(@Req() request: Request, @Query("query") primaryQuery = "", @Query("secondary") secondaryQuery = "") {
    await requireRequestUser(request, this.authService);
    return this.salesService.searchCustomers(primaryQuery, secondaryQuery);
  }

  @Get(":id")
  async detail(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.salesService.getSaleDetail(parseSaleId(id));
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseSalesBody(createSaleInputSchema, body, "Dados da venda invalidos.");

    return this.salesService.createSale(user, input);
  }

  @Post("customers")
  async createCustomer(@Req() request: Request, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseSalesBody(quickCustomerInputSchema, body, "Dados do cliente invalidos.");

    return this.salesService.createQuickCustomer(input);
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const saleId = parseSaleId(id);
    const input = parseSalesBody(cancelSaleInputSchema, body, "Dados do cancelamento invalidos.");

    return this.salesService.cancelSale(user, saleId, input.reason);
  }

  @Post(":id/deliver")
  async deliver(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const saleId = parseSaleId(id);
    parseSalesBody(confirmDeliveryInputSchema, body, "Dados de entrega invalidos.");

    return this.salesService.confirmDelivery(user, saleId);
  }
}
