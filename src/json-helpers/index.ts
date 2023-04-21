/**
 * Allows you to safely stringify objects which may contain circular references
 *
 * Usage:
 *
 * JSON.stringify(someObject, getCircularReplacer(), 2)
 */
export const getCircularReplacer = () => {
  const seen = new WeakSet()
  return (_: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    if (typeof value === 'bigint') return value.toString()
    return value
  }
}
