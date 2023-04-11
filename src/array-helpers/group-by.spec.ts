import { groupBy } from './group-by'

describe('GroupBy', () => {
  describe('When grouping primitives', () => {
    it('Each group contains all instances of that primitive, order is based on the first occurrence of a key', () => {
      const items = ['a', 'b', 'e', 'a', 'c', 'b', 'a']

      const grouped = items.reduce(
        groupBy((x) => x),
        []
      )

      expect(grouped).toStrictEqual([
        { key: 'a', items: ['a', 'a', 'a'] },
        { key: 'b', items: ['b', 'b'] },
        { key: 'e', items: ['e'] },
        { key: 'c', items: ['c'] },
      ])
    })
  })
  describe('When grouping non-primitives', () => {
    it('Group items appear in the their original order', () => {
      const items = [
        { name: 'Frank', age: 2 },
        { name: 'Alex', age: 3 },
        { name: 'Same', age: 2 },
      ]

      const grouped = items.reduce(
        groupBy((x) => x.age),
        []
      )

      expect(grouped).toStrictEqual([
        { key: 2, items: [items[0], items[2]] },
        { key: 3, items: [items[1]] },
      ])
    })
  })
})
