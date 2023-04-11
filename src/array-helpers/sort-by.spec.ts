import { sortBy } from './sort-by'

describe('SortBy', () => {
  describe('When sorting an unordered list', () => {
    it('It orders the list', () => {
      const list = ['e', 'a', 'b', 'd', 'c']

      const sorted = list.slice().sort(sortBy((x) => x))

      expect(sorted).toStrictEqual(['a', 'b', 'c', 'd', 'e'])
    })
  })
})
