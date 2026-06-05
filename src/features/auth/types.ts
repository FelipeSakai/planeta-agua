export type UserRole = "ADMIN" | "OPERATOR";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
