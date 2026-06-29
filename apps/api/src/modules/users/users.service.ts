import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type {
  CreateOperatorUserInput,
  OperatorUserResponse,
  OperatorUsersListResponse,
  ResetOperatorPasswordInput,
  UpdateOperatorUserInput,
} from "shared";

import { UsersRepository } from "./users.repository";

const SALT_ROUNDS = 12;

type UserRow = NonNullable<Awaited<ReturnType<UsersRepository["findById"]>>>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async listOperators(): Promise<OperatorUsersListResponse> {
    const users = await this.usersRepository.findOperators();
    return { users: users.map((user) => this.toResponse(user)) };
  }

  async createOperator(input: CreateOperatorUserInput): Promise<OperatorUserResponse> {
    const existing = await this.usersRepository.findByEmail(input.email);

    if (existing) {
      throw new BadRequestException("Ja existe um usuario com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.usersRepository.createOperator({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "OPERATOR",
      isActive: true,
    });

    return this.toResponse(user);
  }

  async updateOperator(id: string, input: UpdateOperatorUserInput): Promise<OperatorUserResponse> {
    await this.ensureOperator(id);
    const existing = await this.usersRepository.findByEmail(input.email);

    if (existing && existing.id !== id) {
      throw new BadRequestException("Ja existe um usuario com este e-mail.");
    }

    const user = await this.usersRepository.updateOperator(id, input);
    return this.toResponse(user);
  }

  async toggleActive(id: string): Promise<OperatorUserResponse> {
    const current = await this.ensureOperator(id);
    const user = await this.usersRepository.setActive(id, !current.isActive);
    return this.toResponse(user);
  }

  async resetPassword(id: string, input: ResetOperatorPasswordInput): Promise<OperatorUserResponse> {
    await this.ensureOperator(id);
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.usersRepository.updatePassword(id, passwordHash);
    return this.toResponse(user);
  }

  private async ensureOperator(id: string): Promise<UserRow> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException("Usuario nao encontrado.");
    }

    if (user.role !== "OPERATOR") {
      throw new ForbiddenException("Administrador principal nao pode ser alterado nesta tela.");
    }

    return user;
  }

  private toResponse(user: UserRow): OperatorUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "OPERATOR",
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
