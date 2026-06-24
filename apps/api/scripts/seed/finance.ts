import { db } from "../../src/db";
import { cashRegisters, expenses } from "../../src/db/schema";

export async function seedFinance(): Promise<void> {
  console.log("Seeding finance...");

  const adminId = "11111111-1111-1111-1111-111111111111";
  const op1Id = "22222222-2222-2222-2222-222222222222";
  const now = new Date();

  const cashRegistersData: (typeof cashRegisters.$inferInsert)[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];

    cashRegistersData.push({
      id: `cash-${dateStr.replace(/-/g, "")}-0000-0000-000000000000`,
      date: dateStr,
      openingBalanceCents: 5000 + Math.floor(Math.random() * 15000),
      openedAt: new Date(date.setHours(8, 0, 0, 0)),
      openedByUserId: adminId,
      closedAt: null,
      closedByUserId: null,
      counts: {},
    });
  }

  await db.insert(cashRegisters).values(cashRegistersData);

  const expensesData: (typeof expenses.$inferInsert)[] = [];
  const categories = ["Combustivel", "Manutencao", "Material de escritorio", "Alimentacao", "Outros"];
  const paymentMethods = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"] as const;

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const expenseDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const userId = i % 2 === 0 ? adminId : op1Id;

    expensesData.push({
      id: `expense-${String(i + 1).padStart(4, "0")}-0000-0000-000000000000`,
      description: `Despesa ${i + 1} - seed`,
      amountCents: 5000 + Math.floor(Math.random() * 20000),
      category: categories[i % categories.length],
      paymentMethod: paymentMethods[i % paymentMethods.length],
      date: expenseDate,
      createdBy: userId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
  }

  await db.insert(expenses).values(expensesData);

  console.log(`Created ${cashRegistersData.length} cash registers and ${expensesData.length} expenses.`);
}
