import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import type { SessionUser } from "shared";

import {
  stockAdjustmentSchema,
  stockEntrySchema,
  type StockAdjustmentInput,
  type StockEntryInput,
  type StockMovementResponse,
  type StockMutationResponse,
  type StockPageResponse,
  type StockProductResponse,
} from "./stock.schemas";
import { StockRepository, type StockMovementRow, type StockProductRow } from "./stock.repository";

type PermissionUser = Pick<SessionUser, "id" | "role">;

@Injectable()
export class StockService {
  constructor(private readonly stockRepository: StockRepository) {}

  async getStockPage(): Promise<StockPageResponse> {
    const products = (await this.stockRepository.findStockProducts()).map((product) => this.toProductResponse(product));
    const movements = (await this.stockRepository.findRecentMovements()).map((movement) => this.toMovementResponse(movement));

    return {
      products,
      movements,
      summary: {
        totalProducts: products.length,
        lowStockProducts: products.filter((product) => product.isLowStock).length,
        totalUnits: products.reduce((sum, product) => sum + product.stockQuantity, 0),
      },
    };
  }

  async createEntry(user: PermissionUser, input: StockEntryInput): Promise<StockMutationResponse> {
    this.requireAdmin(user);
    const safeInput = stockEntrySchema.parse(input);
    const result = await this.stockRepository.createEntry(safeInput, user.id);

    if (!result) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    const movement = await this.rereadMovement(result.movement.id);

    return {
      product: this.toProductResponse(result.product),
      movement: this.toMovementResponse(movement),
    };
  }

  async createAdjustment(user: PermissionUser, input: StockAdjustmentInput): Promise<StockMutationResponse> {
    this.requireAdmin(user);
    const safeInput = stockAdjustmentSchema.parse(input);
    const result = await this.stockRepository.createAdjustment(safeInput, user.id);

    if (!result) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    const movement = await this.rereadMovement(result.movement.id);

    return {
      product: this.toProductResponse(result.product),
      movement: this.toMovementResponse(movement),
    };
  }

  private async rereadMovement(movementId: string): Promise<StockMovementRow> {
    const movement = await this.stockRepository.findMovementById(movementId);

    if (!movement) {
      throw new InternalServerErrorException("Nao foi possivel confirmar a movimentacao de estoque.");
    }

    return movement;
  }

  private requireAdmin(user: PermissionUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Voce nao tem permissao para alterar estoque.");
    }
  }

  private toProductResponse(product: StockProductRow): StockProductResponse {
    return {
      id: product.id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      minimumStock: product.minimumStock,
      isActive: product.isActive,
      isLowStock: product.stockQuantity <= product.minimumStock,
    };
  }

  private toMovementResponse(movement: StockMovementRow): StockMovementResponse {
    return {
      id: movement.id,
      productId: movement.productId,
      productName: movement.product.name,
      userId: movement.userId,
      userName: movement.user.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
