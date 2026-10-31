export function isValidIndianMobile(value: unknown): value is string {
  return typeof value === "string" && /^[6-9]\d{9}$/.test(value);
}

export function normalizeIndianMobileForInput(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return digits.slice(0, 10);
}
