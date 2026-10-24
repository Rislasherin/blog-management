/**
 * Safe string normalization utility
 */
export const normalizeString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};
