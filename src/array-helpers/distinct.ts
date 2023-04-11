/**
 * Can be used to filter a collection to a set of distinct items as determined by a specified key.
 * @param keySelector A lambda which when given an item, returns the items unique identifier
 *
 * Usage:
 *
 * ```
 * const distinctItems = nonDistinctItems.filter(distinct(x => x.uniqueId))
 * ```
 */
export const distinct = <T>(keySelector?: (item: T) => unknown) => {
  const ks = keySelector || ((x: T) => x)
  const set = new Set()
  return (item: T) => {
    if (set.has(ks(item))) {
      return false
    }

    set.add(ks(item))
    return true
  }
}
