import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateDriverInput, DriverResponse, DriversListResponse, UpdateDriverInput } from "shared";

import { DriversRepository } from "./drivers.repository";

type DriverRow = NonNullable<Awaited<ReturnType<DriversRepository["findById"]>>>;

@Injectable()
export class DriversService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async listDrivers(): Promise<DriversListResponse> {
    const drivers = await this.driversRepository.findMany();
    const driverResponses = drivers.map((d) => this.toResponse(d));

    return {
      drivers: driverResponses,
      summary: {
        total: driverResponses.length,
        active: driverResponses.filter((d) => d.isActive).length,
      },
    };
  }

  async createDriver(input: CreateDriverInput): Promise<DriverResponse> {
    const driver = await this.driversRepository.create(input);
    return this.toResponse(driver);
  }

  async updateDriver(id: string, input: UpdateDriverInput): Promise<DriverResponse> {
    await this.ensureDriverExists(id);
    const driver = await this.driversRepository.update(id, input);
    return this.toResponse(driver);
  }

  async toggleActive(id: string): Promise<DriverResponse> {
    const driver = await this.ensureDriverExists(id);
    const toggled = await this.driversRepository.setActive(id, !driver.isActive);
    return this.toResponse(toggled);
  }

  private async ensureDriverExists(id: string): Promise<DriverRow> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException("Entregador nao encontrado.");
    }
    return driver;
  }

  private toResponse(driver: DriverRow): DriverResponse {
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
