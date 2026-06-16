import type { UserRole } from "shared";

type UserWithRole = {
  role: UserRole;
};

function isAdmin(user: UserWithRole) {
  return user.role === "ADMIN";
}

export function canAccessFinance(user: UserWithRole) {
  return isAdmin(user);
}

export function canCancelSale(user: UserWithRole) {
  return isAdmin(user);
}

export function canManageStock(user: UserWithRole) {
  return isAdmin(user);
}

export function canManageUsers(user: UserWithRole) {
  return isAdmin(user);
}
