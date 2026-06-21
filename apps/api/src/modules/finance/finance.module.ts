import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FinanceController } from "./finance.controller";
import { FinanceRepository } from "./finance.repository";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceRepository, FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
