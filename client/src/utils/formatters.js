/**
 * Capitalizes the first letter of each word or segment in a name.
 * e.g., "john" -> "John", "de la cruz" -> "De La Cruz", "mary-jane" -> "Mary-Jane"
 * Preserves the exact length and subsequent characters to keep cursor position smooth.
 */
export const capitalizeFirstLetter = (val) => {
  if (!val) return '';
  return val.replace(/(^|[\s'-])(\p{L})/gu, (_, prefix, char) => prefix + char.toUpperCase());
};
