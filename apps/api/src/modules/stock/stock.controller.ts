import { BadRequestException, Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { AuthService } from "../auth/auth.service";
import { requireRequestUser } from "../auth/current-user";
import { stockAdjustmentSchema, stockEntrySchema } from "./stock.schemas";
import { StockService } from "./stock.service";

function parseStockBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException("Dados do estoque invalidos.");
  }

  return result.data;
}

@Controller("stock")
export class StockController {
  constructor(
    private readonly authService: AuthService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.stockService.getStockPage();
  }

  @Post("entries")
  async createEntry(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseStockBody(stockEntrySchema, body);

    return this.stockService.createEntry(user, input);
  }

  @Post("adjustments")
  async createAdjustment(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseStockBody(stockAdjustmentSchema, body);

    return this.stockService.createAdjustment(user, input);
  }
}
