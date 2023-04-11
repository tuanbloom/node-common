import { distinct } from './distinct'

describe('Distinct', () => {
  describe('When given a non distinct list', () => {
    it('Returns only the distinct items', () => {
      const list = ['a', 'a', 'a', 'b', 'b', 'c']

      const distinctList = list.filter(distinct((x) => x))

      expect(distinctList).toStrictEqual(['a', 'b', 'c'])
    })
  })
  describe('When given distinct objects with non-distinct keys', () => {
    it('Returns the first item for each duplicated key', () => {
      const list = [
        { userId: 1, name: 'Bob' },
        { userId: 2, name: 'Jane' },
        { userId: 1, name: 'Alice' },
      ]

      const distinctList = list.filter(distinct((x) => x.userId))

      expect(distinctList).toStrictEqual([list[0], list[1]])
    })
  })
})
