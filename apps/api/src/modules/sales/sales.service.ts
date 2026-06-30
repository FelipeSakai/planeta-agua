import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { hasBottleMismatch, isBottleExpired, type SessionUser } from "shared";

import { FinanceService } from "../finance/finance.service";
import { SalesRepository } from "./sales.repository";
import { SalesRepositoryError } from "./sales.errors";
import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleHistoryFilterSchema,
  type CreateSaleInput,
  type QuickCustomerInput,
  type SaleCustomerResponse,
  type SaleDetailResponse,
  type SalesListResponse,
} from "./sales.schemas";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type SaleListRow = Awaited<ReturnType<SalesRepository["listSales"]>>[number];
type SaleDetailRow = NonNullable<Awaited<ReturnType<SalesRepository["getSaleDetail"]>>>;
type SalesCustomerRow = Awaited<ReturnType<SalesRepository["searchCustomers"]>>[number];
type SalesCustomerSummary = SaleCustomerResponse;

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly financeService: FinanceService,
  ) {}

  async listSales(options: { status?: "COMPLETED" | "CANCELED" | "PENDING_DELIVERY" } = {}): Promise<SalesListResponse> {
    const parsed = saleHistoryFilterSchema.safeParse(options);
    const sales = await this.salesRepository.listSales(parsed.success ? parsed.data : {});

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

    await this.financeService.ensureCashRegisterForToday(user.id);

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

  async confirmDelivery(user: PermissionUser, saleId: string) {
    try {
      return await this.salesRepository.confirmDelivery({ saleId, userId: user.id });
    } catch (error) {
      throw this.mapConfirmDeliveryError(error);
    }
  }

  async searchCustomers(primaryQuery: string, secondaryQuery = ""): Promise<SalesCustomerSummary[]> {
    const customers = await this.salesRepository.searchCustomers(primaryQuery, secondaryQuery);

    return Promise.all(customers.map((customer) => this.toCustomerSummary(customer)));
  }

  async createQuickCustomer(input: QuickCustomerInput): Promise<SalesCustomerSummary> {
    const parsedInput = quickCustomerInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new BadRequestException("Dados do cliente invalidos.");
    }

    const customer = await this.salesRepository.createQuickCustomer(parsedInput.data);

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
      code: customer.code ?? null,
      address: customer.address ?? null,
      previousBottle: null,
    };
  }

  private mapCreateSaleError(error: unknown) {
    if (error instanceof SalesRepositoryError) {
      return new BadRequestException(error.message);
    }

    return new BadRequestException("Nao foi possivel finalizar a venda.");
  }

  private mapCancelSaleError(error: unknown) {
    if (error instanceof SalesRepositoryError) {
      if (error.code === "SALE_NOT_FOUND") {
        return new NotFoundException("Venda nao encontrada.");
      }

      if (error.code === "SALE_ALREADY_CANCELED") {
        return new BadRequestException("Venda ja cancelada.");
      }

      return new BadRequestException(error.message);
    }

    return new BadRequestException("Nao foi possivel cancelar a venda.");
  }

  private mapConfirmDeliveryError(error: unknown) {
    if (error instanceof SalesRepositoryError) {
      if (error.code === "SALE_NOT_FOUND") {
        return new NotFoundException("Venda nao encontrada.");
      }

      return new BadRequestException(error.message);
    }

    return new BadRequestException("Nao foi possivel confirmar a entrega.");
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
      deliveredAt: sale.deliveredAt?.toISOString() ?? null,
      deliveredByUserId: sale.deliveredByUserId ?? null,
      driverId: sale.driverId ?? null,
      driverName: sale.driver?.name ?? null,
    };
  }

  private toDetailResponse(detail: SaleDetailRow): SaleDetailResponse {
    const bottle = this.toBottleRecord(detail.sale.bottleMonth, detail.sale.bottleYear, detail.sale.bottleNotes);

    return {
      sale: {
        id: detail.sale.id,
        customerId: detail.sale.customerId,
        customerName: detail.sale.customer?.name ?? null,
        customerPhone: detail.sale.customer?.phone ?? null,
        customerAddress: detail.sale.customer?.address ?? null,
        userId: detail.sale.userId,
        userName: detail.sale.user.name,
        totalAmountCents: detail.sale.totalAmountCents,
        paymentMethod: detail.sale.paymentMethod,
        status: detail.sale.status,
        createdAt: detail.sale.createdAt.toISOString(),
        canceledAt: detail.sale.canceledAt?.toISOString() ?? null,
        cancellationReason: detail.sale.cancellationReason,
        deliveredAt: detail.sale.deliveredAt?.toISOString() ?? null,
        deliveredByUserId: detail.sale.deliveredByUserId ?? null,
        driverId: detail.sale.driverId ?? null,
        driverName: detail.sale.driver?.name ?? null,
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
        discountCents: item.discountCents ?? null,
        finalUnitPriceCents: item.finalUnitPriceCents ?? null,
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

  private async toCustomerSummary(customer: SalesCustomerRow): Promise<SalesCustomerSummary> {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
      code: customer.code ?? null,
      address: customer.address ?? null,
      previousBottle: await this.salesRepository.getLatestBottleForCustomer(customer.id),
    };
  }
}
