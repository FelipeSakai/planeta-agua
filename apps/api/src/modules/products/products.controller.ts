import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { AuthService } from "../auth/auth.service";
import { requireRequestUser } from "../auth/current-user";
import { createProductSchema, updateProductSchema } from "./products.schemas";
import { ProductsService } from "./products.service";

const idSchema = z.string().uuid();

function parseProductBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException("Dados do produto invalidos.");
  }

  return result.data;
}

function parseProductId(id: string) {
  const result = idSchema.safeParse(id);

  if (!result.success) {
    throw new BadRequestException("Produto invalido.");
  }

  return result.data;
}

@Controller("products")
export class ProductsController {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.productsService.listProducts();
  }

  @Get(":id")
  async getById(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return { product: await this.productsService.getProduct(parseProductId(id)) };
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseProductBody(createProductSchema, body);

    return { product: await this.productsService.createProduct(user, input) };
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const productId = parseProductId(id);
    const input = parseProductBody(updateProductSchema, body);

    return { product: await this.productsService.updateProduct(productId, user, input) };
  }

  @Patch(":id/activate")
  async activate(@Req() request: Request, @Param("id") id: string) {
    const user = await requireRequestUser(request, this.authService);

    return { product: await this.productsService.activateProduct(parseProductId(id), user) };
  }

  @Patch(":id/deactivate")
  async deactivate(@Req() request: Request, @Param("id") id: string) {
    const user = await requireRequestUser(request, this.authService);

    return { product: await this.productsService.deactivateProduct(parseProductId(id), user) };
  }
}
