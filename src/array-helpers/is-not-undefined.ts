/**
 * Returns true if x is not undefined. Includes a type assertion so the inferred type of the value passed to x will exclude undefined
 * @param x Any value that is potentially undefined
 *
 * Usage:
 * ```
 * const items: Array<number | undefined> = [...]
 *
 * // Inferred type of filteredItems will be Array<number>, not Array<number | undefined>
 * const filteredItems = items.filter(isNotUndefined)
 * ```
 */
export const isNotUndefined = <T>(x: T): x is Exclude<T, undefined> => x !== undefined

/**
 * Same as isNotUndefined, but will also exclude null values
 * @param x Any value that is potentially null or undefined
 */
export const isNotNullOrUndefined = <T>(x: T): x is Exclude<T, undefined | null> => x !== undefined && x !== null

/**
 * Same as is isNotUndefined, but will exclude all falsy values
 * @param x Any value which should be tested for truthy-ness
 */
export const isNotFalsy = <T>(x: T): x is Exclude<T, 0 | '' | false | null | undefined> => {
  return Boolean(x)
}
