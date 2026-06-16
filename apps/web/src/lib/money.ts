export function formatCurrencyFromCents(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function toCents(value: string) {
  const normalizedValue = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number(normalizedValue) * 100);
}
