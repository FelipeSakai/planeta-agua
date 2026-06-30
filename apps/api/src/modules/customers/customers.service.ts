import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { isCustomerBottleExpired, isBottleNearExpiration, type SessionUser } from "shared";

import { CustomersRepository } from "./customers.repository";
import { createCustomerBottleSchema, createCustomerSchema, updateCustomerBottleSchema, updateCustomerSchema } from "./customers.schemas";
import type {
  CreateCustomerBottleInput,
  CreateCustomerInput,
  CustomerBottleResponse,
  CustomerDetailResponse,
  CustomerResponse,
  CustomersListResponse,
  DuplicateCheckResponse,
  UpdateCustomerBottleInput,
  UpdateCustomerInput,
} from "./customers.schemas";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type CustomerRow = NonNullable<Awaited<ReturnType<CustomersRepository["findById"]>>>;
type BottleRow = NonNullable<Awaited<ReturnType<CustomersRepository["findBottleById"]>>>;

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async listCustomers(): Promise<CustomersListResponse> {
    const customers = await this.customersRepository.findMany();
    const now = new Date();

    const customerResponses = await Promise.all(
      customers.map(async (customer) => {
        const bottles = await this.customersRepository.findBottlesByCustomerId(customer.id);
        const hasAlert = bottles.some(
          (bottle) => isBottleNearExpiration(bottle.expiresAt, now) || isCustomerBottleExpired(bottle.expiresAt, now),
        );

        return this.toCustomerResponse(customer, hasAlert);
      }),
    );

    return {
      customers: customerResponses,
      summary: {
        total: customerResponses.length,
        active: customerResponses.filter((c) => c.isActive).length,
        withAlert: customerResponses.filter((c) => c.hasBottleAlert).length,
      },
    };
  }

  async getCustomerDetail(id: string): Promise<CustomerDetailResponse> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    const bottles = await this.customersRepository.findBottlesByCustomerId(id);
    const recentSales = await this.customersRepository.findRecentSalesByCustomerId(id);
    const now = new Date();

    return {
      customer: this.toCustomerResponse(
        customer,
        bottles.some((b) => isBottleNearExpiration(b.expiresAt, now) || isCustomerBottleExpired(b.expiresAt, now)),
      ),
      bottles: bottles.map((b) => this.toBottleResponse(b, now)),
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        totalAmountCents: sale.totalAmountCents,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          id: item.id,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents,
        })),
      })),
    };
  }

  async createCustomer(user: PermissionUser, input: CreateCustomerInput): Promise<CustomerResponse> {
    const parsedInput = createCustomerSchema.parse(input);

    const duplicates = await this.customersRepository.findDuplicates(
      parsedInput.name,
      parsedInput.phone ?? null,
      parsedInput.mobilePhone ?? null,
    );

    if (duplicates.some((d) => d.phone && d.phone === parsedInput.phone)) {
      throw new BadRequestException("Ja existe um cliente com este telefone.");
    }

    if (duplicates.some((d) => d.mobilePhone && d.mobilePhone === parsedInput.mobilePhone)) {
      throw new BadRequestException("Ja existe um cliente com este celular.");
    }

    const customer = await this.customersRepository.create(parsedInput);

    return this.toCustomerResponse(customer, false);
  }

  async updateCustomer(id: string, user: PermissionUser, input: UpdateCustomerInput): Promise<CustomerResponse> {
    await this.ensureCustomerExists(id);
    const parsedInput = updateCustomerSchema.parse(input);

    const duplicates = await this.customersRepository.findDuplicates(
      parsedInput.name ?? "",
      parsedInput.phone ?? null,
      parsedInput.mobilePhone ?? null,
      id,
    );

    if (duplicates.some((d) => d.phone && d.phone === parsedInput.phone)) {
      throw new BadRequestException("Ja existe um cliente com este telefone.");
    }

    if (duplicates.some((d) => d.mobilePhone && d.mobilePhone === parsedInput.mobilePhone)) {
      throw new BadRequestException("Ja existe um cliente com este celular.");
    }

    const customer = await this.customersRepository.update(id, parsedInput);

    return this.toCustomerResponse(customer, false);
  }

  async toggleActive(id: string): Promise<CustomerResponse> {
    const customer = await this.ensureCustomerExists(id);
    const toggled = await this.customersRepository.setActive(id, !customer.isActive);

    return this.toCustomerResponse(toggled, false);
  }

  async checkDuplicates(name: string, phone: string | null, mobilePhone: string | null, excludeId?: string): Promise<DuplicateCheckResponse> {
    const duplicates = await this.customersRepository.findDuplicates(name, phone, mobilePhone, excludeId);

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map((d) => ({ id: d.id, name: d.name, phone: d.phone, mobilePhone: d.mobilePhone })),
    };
  }

  async addBottle(customerId: string, user: PermissionUser, input: CreateCustomerBottleInput): Promise<CustomerBottleResponse> {
    await this.ensureCustomerExists(customerId);
    const parsedInput = createCustomerBottleSchema.parse(input);
    const bottle = await this.customersRepository.createBottle({
      customerId,
      ...parsedInput,
    });

    return this.toBottleResponse(bottle, new Date());
  }

  async updateBottle(bottleId: string, input: UpdateCustomerBottleInput): Promise<CustomerBottleResponse> {
    const parsedInput = updateCustomerBottleSchema.parse(input);
    const bottle = await this.customersRepository.updateBottle(bottleId, parsedInput);

    return this.toBottleResponse(bottle, new Date());
  }

  async deactivateBottle(bottleId: string): Promise<CustomerBottleResponse> {
    const bottle = await this.customersRepository.deactivateBottle(bottleId);

    return this.toBottleResponse(bottle, new Date());
  }

  private async ensureCustomerExists(id: string): Promise<CustomerRow> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    return customer;
  }

  private toCustomerResponse(customer: CustomerRow, hasBottleAlert: boolean): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
      address: customer.address,
      notes: customer.notes,
      isActive: customer.isActive,
      hasBottleAlert,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  private toBottleResponse(bottle: BottleRow, now: Date): CustomerBottleResponse {
    return {
      id: bottle.id,
      customerId: bottle.customerId,
      saleId: bottle.saleId,
      month: bottle.month,
      year: bottle.year,
      notes: bottle.notes,
      isActive: bottle.isActive,
      expiresAt: bottle.expiresAt.toISOString(),
      isNearExpiration: isBottleNearExpiration(bottle.expiresAt, now),
      isExpired: isCustomerBottleExpired(bottle.expiresAt, now),
      createdAt: bottle.createdAt.toISOString(),
      updatedAt: bottle.updatedAt.toISOString(),
    };
  }
}
