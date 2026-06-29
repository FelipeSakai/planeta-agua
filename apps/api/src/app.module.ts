import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DriversModule } from "./modules/drivers/drivers.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { ProductsModule } from "./modules/products/products.module";
import { SalesModule } from "./modules/sales/sales.module";
import { StockModule } from "./modules/stock/stock.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule, StockModule, SalesModule, FinanceModule, CustomersModule, DriversModule, UsersModule],
})
export class AppModule {}
