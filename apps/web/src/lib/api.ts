const browserApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const serverApiUrl = process.env.API_INTERNAL_URL ?? browserApiUrl;

export function getBrowserApiUrl() {
  return browserApiUrl;
}

export function getServerApiUrl() {
  return serverApiUrl;
}
