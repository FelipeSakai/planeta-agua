import { db } from "../../src/db";
import { products } from "../../src/db/schema";

export async function seedProducts(): Promise<void> {
  console.log("Seeding products...");

  await db.insert(products).values([
    { id: "44444444-4444-4444-8444-444444444444", name: "Galao 20L Completo", description: "Galao de agua mineral 20L - venda completa", salePriceCents: 1200, stockQuantity: 50, minimumStock: 10, isActive: true, bottleType: "COMPLETE" },
    { id: "55555555-5555-4555-8555-555555555555", name: "Galao 20L Troca", description: "Galao de agua mineral 20L - troca", salePriceCents: 800, stockQuantity: 50, minimumStock: 10, isActive: true, bottleType: "EXCHANGE" },
    { id: "66666666-6666-4666-8666-666666666666", name: "Agua 500ml (fardo 12un)", description: "Fardo com 12 garrafas de 500ml", salePriceCents: 1800, stockQuantity: 30, minimumStock: 5, isActive: true, bottleType: "NONE" },
    { id: "77777777-7777-4777-8777-777777777777", name: "Agua 1,5L", description: "Garrafa de agua mineral 1,5L", salePriceCents: 500, stockQuantity: 20, minimumStock: 5, isActive: true, bottleType: "NONE" },
    { id: "88888888-8888-4888-8888-888888888888", name: "Gas P13", description: "Botijao de gas P13", salePriceCents: 4500, stockQuantity: 10, minimumStock: 3, isActive: true, bottleType: "NONE" },
    { id: "99999999-9999-4999-8999-999999999999", name: "Bomba para galao", description: "Bomba eletrica para galao 20L", salePriceCents: 3500, stockQuantity: 8, minimumStock: 2, isActive: true, bottleType: "NONE" },
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Suporte para galao", description: "Suporte plastico para galao 20L", salePriceCents: 1500, stockQuantity: 15, minimumStock: 5, isActive: true, bottleType: "NONE" },
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Dispenser de agua", description: "Dispenser eletrico com refrigeracao", salePriceCents: 25000, stockQuantity: 4, minimumStock: 1, isActive: true, bottleType: "NONE" },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Produto Inativo 1", description: "Este produto esta descontinuado", salePriceCents: 1000, stockQuantity: 0, minimumStock: 0, isActive: false, bottleType: "NONE" },
    { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Produto Inativo 2", description: "Este produto esta descontinuado", salePriceCents: 2000, stockQuantity: 0, minimumStock: 0, isActive: false, bottleType: "NONE" },
    { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", name: "Produto Estoque Baixo", description: "Este produto tem estoque critico", salePriceCents: 3000, stockQuantity: 2, minimumStock: 10, isActive: true, bottleType: "NONE" },
    { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", name: "Produto Estoque Zero", description: "Este produto esta sem estoque", salePriceCents: 4000, stockQuantity: 0, minimumStock: 5, isActive: true, bottleType: "NONE" },
  ]);

  console.log("Created 12 products (2 galoes, 3 acessorios, 2 inativos, 5 variados).");
}
