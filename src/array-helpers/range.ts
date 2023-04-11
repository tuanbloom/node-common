/**
 * Produces an array representing a range of numbers between the start number and the end number
 * @param start The start number of the range
 * @param end The end number of the range
 *
 * Usage:
 * ```
 * // Produces [1, 2, 3, 4, 5, 6]
 * const oneToSix = range(1, 6)
 * ```
 */
export const range = (start: number, end: number) => {
  if (start > end) throw new Error(`Invalid start and end values. Start ${start} must be greater than end ${end}`)
  return new Array(end - start + 1).fill(null).map((_, i) => start + i)
}
