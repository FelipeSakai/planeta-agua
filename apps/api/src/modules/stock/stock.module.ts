import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StockController } from "./stock.controller";
import { StockRepository } from "./stock.repository";
import { StockService } from "./stock.service";

@Module({
  imports: [AuthModule],
  controllers: [StockController],
  providers: [StockRepository, StockService],
})
export class StockModule {}
