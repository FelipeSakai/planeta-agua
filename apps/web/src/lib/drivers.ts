import { driversListResponseSchema, type DriversListResponse } from "shared";

import { getServerApiUrl } from "./api";

const emptyResponse: DriversListResponse = {
  drivers: [],
  summary: { total: 0, active: 0 },
};

export async function fetchDrivers(cookieHeader: string): Promise<DriversListResponse> {
  const response = await fetch(`${getServerApiUrl()}/drivers`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyResponse;
  }

  return driversListResponseSchema.parse(await response.json());
}