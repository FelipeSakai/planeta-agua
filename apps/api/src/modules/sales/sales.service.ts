import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { hasBottleMismatch, isBottleExpired, type SessionUser } from "shared";

import { SalesRepository } from "./sales.repository";
import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  type CreateSaleInput,
  type QuickCustomerInput,
  type SaleDetailResponse,
  type SalesListResponse,
} from "./sales.schemas";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type SaleListRow = Awaited<ReturnType<SalesRepository["listSales"]>>[number];
type SaleDetailRow = NonNullable<Awaited<ReturnType<SalesRepository["getSaleDetail"]>>>;
type SalesCustomerRow = Awaited<ReturnType<SalesRepository["searchCustomers"]>>[number];
type SalesCustomerSummary = Pick<SalesCustomerRow, "id" | "name" | "phone">;

@Injectable()
export class SalesService {
  constructor(private readonly salesRepository: SalesRepository) {}

  async listSales(): Promise<SalesListResponse> {
    const sales = await this.salesRepository.listSales();

    return sales.map((sale) => this.toHistoryResponse(sale));
  }

  async getSaleDetail(id: string): Promise<SaleDetailResponse> {
    const detail = await this.salesRepository.getSaleDetail(id);

    if (!detail) {
      throw new NotFoundException("Venda nao encontrada.");
    }

    return this.toDetailResponse(detail);
  }

  async createSale(user: PermissionUser, input: CreateSaleInput) {
    const parsedInput = createSaleInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new BadRequestException("Dados da venda invalidos.");
    }

    try {
      return await this.salesRepository.createSale({ ...parsedInput.data, userId: user.id });
    } catch (error) {
      throw this.mapCreateSaleError(error);
    }
  }

  async cancelSale(user: PermissionUser, saleId: string, reason: string) {
    const parsedInput = cancelSaleInputSchema.safeParse({ reason });

    if (!parsedInput.success) {
      throw new BadRequestException("Motivo do cancelamento invalido.");
    }

    try {
      return await this.salesRepository.cancelSale({ saleId, userId: user.id, reason: parsedInput.data.reason });
    } catch (error) {
      throw this.mapCancelSaleError(error);
    }
  }

  async searchCustomers(query: string): Promise<SalesCustomerSummary[]> {
    const customers = await this.salesRepository.searchCustomers(query);

    return customers.map((customer) => this.toCustomerSummary(customer));
  }

  async createQuickCustomer(input: QuickCustomerInput): Promise<SalesCustomerSummary> {
    const parsedInput = quickCustomerInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new BadRequestException("Dados do cliente invalidos.");
    }

    const customer = await this.salesRepository.createQuickCustomer(parsedInput.data);

    return this.toCustomerSummary(customer);
  }

  private mapCreateSaleError(error: unknown) {
    const message = this.getErrorMessage(error);

    if (
      message?.includes("nao encontrado") ||
      message?.includes("esta inativo") ||
      message?.includes("Estoque insuficiente")
    ) {
      return new BadRequestException(message);
    }

    return new BadRequestException("Nao foi possivel finalizar a venda.");
  }

  private mapCancelSaleError(error: unknown) {
    const message = this.getErrorMessage(error);

    if (message?.includes("nao encontrada")) {
      return new NotFoundException("Venda nao encontrada.");
    }

    if (message?.includes("ja cancelada")) {
      return new BadRequestException("Venda ja cancelada.");
    }

    return new BadRequestException("Nao foi possivel cancelar a venda.");
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : null;
  }

  private toHistoryResponse(sale: SaleListRow): SalesListResponse[number] {
    return {
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.customer?.name ?? null,
      userId: sale.userId,
      userName: sale.user.name,
      totalAmountCents: sale.totalAmountCents,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      canceledAt: sale.canceledAt?.toISOString() ?? null,
      cancellationReason: sale.cancellationReason,
    };
  }

  private toDetailResponse(detail: SaleDetailRow): SaleDetailResponse {
    const bottle = this.toBottleRecord(detail.sale.bottleMonth, detail.sale.bottleYear, detail.sale.bottleNotes);

    return {
      sale: {
        id: detail.sale.id,
        customerId: detail.sale.customerId,
        customerName: detail.sale.customer?.name ?? null,
        userId: detail.sale.userId,
        userName: detail.sale.user.name,
        totalAmountCents: detail.sale.totalAmountCents,
        paymentMethod: detail.sale.paymentMethod,
        status: detail.sale.status,
        createdAt: detail.sale.createdAt.toISOString(),
        canceledAt: detail.sale.canceledAt?.toISOString() ?? null,
        cancellationReason: detail.sale.cancellationReason,
        bottle,
        previousBottle: detail.previousBottle,
      },
      items: detail.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
      })),
      bottleAlerts: {
        expired: isBottleExpired(bottle, new Date()),
        mismatch: hasBottleMismatch(detail.previousBottle, bottle),
      },
    };
  }

  private toBottleRecord(month: number | null, year: number | null, notes: string | null) {
    if (month === null || year === null) {
      return null;
    }

    return {
      month,
      year,
      notes,
    };
  }

  private toCustomerSummary(customer: SalesCustomerRow): SalesCustomerSummary {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    };
  }
}
