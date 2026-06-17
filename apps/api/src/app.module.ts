import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductsModule } from "./modules/products/products.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule],
})
export class AppModule {}
