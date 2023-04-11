type SortFn<T> = (a: T, b: T) => number

type SortDir = 'asc' | 'desc'

/**
 * Returns a function that can be passed to Array.prototype.sort.
 * @param keySelector A lambda which when given an item, returns a value that should be used to sort that item.
 * @param dir The sorting direction 'asc' or 'desc'. 'asc' by default.
 *
 * Usage:
 * ```
 * const items = unsortedItems.slice().sort(sortBy(x => x.name))
 * ```
 *
 * Notes:
 * Array.prototype.sort is impure (it mutates the collection it is called on) so you should clone the array
 * through filter, map, or slice for example if this is a concern.
 */
export const sortBy =
  <T, TKey>(keySelector: (item: T) => TKey, dir: SortDir = 'asc') =>
  (a: T, b: T) => {
    const keyA = keySelector(a)
    const keyB = keySelector(b)
    return (dir === 'desc' ? -1 : 1) * (keyA < keyB ? -1 : keyA > keyB ? 1 : 0)
  }

/**
 * A special version of the sortBy helper which allows you to sort by strings in a case-insensitive manner.
 * @param keySelector A lambda which when given an item, returns a value that should be used to sort that item.
 * @param dir The sorting direction 'asc' or 'desc'. 'asc' by default.
 *
 * Usage:
 * ```
 * const users = allUsers.slice().sort(sortByIgnoreCase(x => x.familyName))
 * ```
 */
export const sortByIgnoreCase =
  <T>(keySelector: (item: T) => string | null | undefined, dir: SortDir = 'asc') =>
  (a: T, b: T) => {
    const keyA = keySelector(a)
    const keyB = keySelector(b)

    return (dir === 'desc' ? -1 : 1) * (keyA ?? '').localeCompare(keyB ?? '', undefined, { sensitivity: 'base' })
  }

/**
 * Combine multiple sort functions to construct a more advanced sort by _this_ then by _that_ function.
 * @param sortFunctions one or more sort functions (the return type of sortBy, and sortByIgnoreCase)
 *
 * Usage:
 * ```
 * const users = allUsers.slice().sort(
 *   combineSortFn(
 *     sortByIgnoreCase(x => x.familyName),
 *     sortByIgnoreCase(x => x.givenName),
 *     sortBy(x => x.dateOfBirth)
 *   )
 * )
 * ```
 */
export const combineSortFn =
  <T>(...sortFunctions: SortFn<T>[]): SortFn<T> =>
  (a, b) => {
    for (const fn of sortFunctions) {
      const res = fn(a, b)
      if (res !== 0) {
        return res
      }
    }
    return 0
  }
