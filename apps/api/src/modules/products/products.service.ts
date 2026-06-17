import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { SessionUser } from "shared";

import { ProductsRepository } from "./products.repository";
import { createProductSchema, updateProductSchema, type CreateProductInput, type ProductResponse, type ProductsListResponse, type UpdateProductInput } from "./products.schemas";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type ProductRow = NonNullable<Awaited<ReturnType<ProductsRepository["findById"]>>>;

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async listProducts(): Promise<ProductsListResponse> {
    const products = (await this.productsRepository.findMany()).map((product) => this.toResponse(product));

    return {
      products,
      summary: {
        total: products.length,
        active: products.filter((product) => product.isActive).length,
        lowStock: products.filter((product) => product.isLowStock).length,
      },
    };
  }

  async getProduct(id: string): Promise<ProductResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    return this.toResponse(product);
  }

  async createProduct(user: PermissionUser, input: CreateProductInput): Promise<ProductResponse> {
    this.requireAdmin(user);
    const safeInput = createProductSchema.parse(input);

    return this.toResponse(await this.productsRepository.create(safeInput, user.id));
  }

  async updateProduct(id: string, user: PermissionUser, input: UpdateProductInput): Promise<ProductResponse> {
    this.requireAdmin(user);
    await this.ensureProductExists(id);
    const safeInput = updateProductSchema.parse(input);

    return this.toResponse(await this.productsRepository.update(id, safeInput));
  }

  async activateProduct(id: string, user: PermissionUser): Promise<ProductResponse> {
    this.requireAdmin(user);
    await this.ensureProductExists(id);

    return this.toResponse(await this.productsRepository.setActive(id, true));
  }

  async deactivateProduct(id: string, user: PermissionUser): Promise<ProductResponse> {
    this.requireAdmin(user);
    await this.ensureProductExists(id);

    return this.toResponse(await this.productsRepository.setActive(id, false));
  }

  private async ensureProductExists(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Produto nao encontrado.");
    }
  }

  private requireAdmin(user: PermissionUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Voce nao tem permissao para alterar produtos.");
    }
  }

  private toResponse(product: ProductRow): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      salePriceCents: product.salePriceCents,
      stockQuantity: product.stockQuantity,
      minimumStock: product.minimumStock,
      isActive: product.isActive,
      isLowStock: product.stockQuantity <= product.minimumStock,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
