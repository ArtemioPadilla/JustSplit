/**
 * Ensures that a filename ends with the .csv extension.
 * If the filename already ends with .csv, it returns the original filename.
 * Otherwise, it appends .csv to the filename.
 *
 * @param filename The filename to check.
 * @returns The filename with the .csv extension.
 */
export const ensureCSVExtension = (filename: string): string => {
  if (!filename.toLowerCase().endsWith('.csv')) {
    return `${filename}.csv`;
  }
  return filename;
};
