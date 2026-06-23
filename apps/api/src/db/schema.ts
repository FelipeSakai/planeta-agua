import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "OPERATOR"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "CANCELED", "PENDING_DELIVERY"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["IN", "OUT", "ADJUSTMENT", "SALE", "CANCELED_SALE"]);
export const bottleTypeEnum = pgEnum("bottle_type", ["NONE", "COMPLETE", "EXCHANGE"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("OPERATOR"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  salePriceCents: integer("sale_price_cents").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  bottleType: bottleTypeEnum("bottle_type").notNull().default("NONE"),
  ...timestamps,
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  totalAmountCents: integer("total_amount_cents").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  status: saleStatusEnum("status").notNull().default("COMPLETED"),
  bottleMonth: integer("bottle_month"),
  bottleYear: integer("bottle_year"),
  bottleNotes: text("bottle_notes"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  canceledByUserId: uuid("canceled_by_user_id").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveredByUserId: uuid("delivered_by_user_id").references(() => users.id),
  ...timestamps,
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  totalPriceCents: integer("total_price_cents").notNull(),
  discountCents: integer("discount_cents"),
  finalUnitPriceCents: integer("final_unit_price_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: text("category"),
  paymentMethod: paymentMethodEnum("payment_method"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  ...timestamps,
});

export const cashRegisters = pgTable("cash_registers", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  openedByUserId: uuid("opened_by_user_id").notNull().references(() => users.id),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedByUserId: uuid("closed_by_user_id").references(() => users.id),
  counts: jsonb("counts").$type<Record<string, { expected: number; counted: number; difference: number }>>().notNull().default({}),
  ...timestamps,
});

export const customerBottles = pgTable("customer_bottles", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  saleId: uuid("sale_id").references(() => sales.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  createdSales: many(sales, { relationName: "saleCreatedByUser" }),
  canceledSales: many(sales, { relationName: "saleCanceledByUser" }),
  deliveredSales: many(sales, { relationName: "saleDeliveredByUser" }),
  stockMovements: many(stockMovements),
  expenses: many(expenses, { relationName: "expenseCreatedBy" }),
  deletedExpenses: many(expenses, { relationName: "expenseDeletedBy" }),
  openedCashRegisters: many(cashRegisters, { relationName: "cashRegisterOpenedBy" }),
  closedCashRegisters: many(cashRegisters, { relationName: "cashRegisterClosedBy" }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  bottles: many(customerBottles),
}));

export const customerBottlesRelations = relations(customerBottles, ({ one }) => ({
  customer: one(customers, {
    fields: [customerBottles.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [customerBottles.saleId],
    references: [sales.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  saleItems: many(saleItems),
  stockMovements: many(stockMovements),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
    relationName: "saleCreatedByUser",
  }),
  canceledByUser: one(users, {
    fields: [sales.canceledByUserId],
    references: [users.id],
    relationName: "saleCanceledByUser",
  }),
  deliveredByUser: one(users, {
    fields: [sales.deliveredByUserId],
    references: [users.id],
    relationName: "saleDeliveredByUser",
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
    relationName: "expenseCreatedBy",
  }),
  deletedByUser: one(users, {
    fields: [expenses.deletedBy],
    references: [users.id],
    relationName: "expenseDeletedBy",
  }),
}));

export const cashRegistersRelations = relations(cashRegisters, ({ one }) => ({
  openedByUser: one(users, {
    fields: [cashRegisters.openedByUserId],
    references: [users.id],
    relationName: "cashRegisterOpenedBy",
  }),
  closedByUser: one(users, {
    fields: [cashRegisters.closedByUserId],
    references: [users.id],
    relationName: "cashRegisterClosedBy",
  }),
}));
