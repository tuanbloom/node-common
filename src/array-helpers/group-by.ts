export type GroupedResultItem<T, TKey> = { key: TKey; items: T[] }

/**
 * Can be used with Array.prototype.reduce to group a collection of items by a specified key
 * @param keySelector A lambda which when given an item, returns they key that item should be grouped by
 *
 * Usage:
 * ```
 * const bookingsByUserId = bookings.reduce(groupBy(b => b.userId), [])
 * ```
 *
 * Notes:
 *
 * You need to specify a value for reduce's _initialValue_ parameter in order for this function to work.
 * Most of the time it will just be an empty array however a non-empty array also works if it satisfies the
 * GroupedResultItem type.
 */
export function groupBy<T, TKey>(keySelector: (item: T) => TKey) {
  return (acc: GroupedResultItem<T, TKey>[], cur: T): GroupedResultItem<T, TKey>[] => {
    const key = keySelector(cur)
    let group = acc.find((g) => g.key === key)
    if (!group) {
      acc.push(
        (group = {
          key,
          items: [],
        })
      )
    }
    group.items.push(cur)
    return acc
  }
}
