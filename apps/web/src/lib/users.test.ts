import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOperatorUser, fetchOperatorUsers } from "./users";

vi.mock("./api", () => ({
  getServerApiUrl: vi.fn(() => "http://api.local"),
}));

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

const usersPayload = {
  users: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Operador",
      email: "op@planetaagua.local",
      role: "OPERATOR",
      isActive: true,
      createdAt: "2026-06-29T00:00:00.000Z",
      updatedAt: "2026-06-29T00:00:00.000Z",
    },
  ],
};

describe("web users helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches operator users from the API", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(usersPayload) });

    await expect(fetchOperatorUsers("planeta_agua_session=token")).resolves.toEqual(usersPayload);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/users", {
      headers: { cookie: "planeta_agua_session=token" },
      cache: "no-store",
    });
  });

  it("returns an empty list when list request fails", async () => {
    mockedFetch.mockResolvedValue({ ok: false });

    await expect(fetchOperatorUsers("bad=token")).resolves.toEqual({ users: [] });
  });

  it("surfaces API messages from mutations", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ message: "Ja existe um usuario com este e-mail." }) });

    await expect(createOperatorUser({ name: "Operador", email: "op@planetaagua.local", password: "senha123" })).rejects.toThrow(
      "Ja existe um usuario com este e-mail.",
    );
  });
});
