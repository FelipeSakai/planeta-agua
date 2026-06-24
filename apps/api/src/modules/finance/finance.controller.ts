import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { FinanceService } from "./finance.service";

const idSchema = z.string().uuid();

function parseExpenseId(id: string) {
  const result = idSchema.safeParse(id);

  if (!result.success) {
    throw new BadRequestException("ID invalido.");
  }

  return result.data;
}

@Controller()
export class FinanceController {
  constructor(
    private readonly authService: AuthService,
    private readonly financeService: FinanceService,
  ) {}

  @Get("finance/dashboard")
  async dashboard(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.financeService.getDashboardData();
  }

  @Get("cash-register/today")
  async cashRegisterToday(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.financeService.getCashRegisterForToday();
  }

  @Get("cash-register/today/details")
  async cashRegisterDetails(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.financeService.getCashRegisterDetailsForToday();
  }

  @Post("cash-register/today/opening-balance")
  async updateOpeningBalance(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.updateOpeningBalance(user, body);
  }

  @Post("cash-register/today/close")
  async closeCashRegister(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.closeCashRegister(user, body);
  }

  @Get("expenses")
  async listExpenses(@Req() request: Request, @Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    await requireRequestUser(request, this.authService);
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date(new Date().setUTCHours(23, 59, 59, 999));
    return this.financeService.listExpenses({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: end,
    });
  }

  @Post("expenses")
  async createExpense(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.createExpense(user, body);
  }

  @Patch("expenses/:id")
  async updateExpense(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.updateExpense(user, parseExpenseId(id), body);
  }

  @Delete("expenses/:id")
  async deleteExpense(@Param("id") id: string, @Req() request: Request) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.softDeleteExpense(user, parseExpenseId(id));
  }

  @Get("finance/summary")
  async summary(@Req() request: Request, @Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const user = await requireRequestUser(request, this.authService);

    if (user.role !== "ADMIN") {
      throw new BadRequestException("Acesso restrito ao ADMIN.");
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date(new Date().setUTCHours(23, 59, 59, 999));
    return this.financeService.getFinanceSummary(start, end);
  }
}
