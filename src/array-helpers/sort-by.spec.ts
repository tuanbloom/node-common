import { combineSortFn, sortBy, sortByIgnoreCase } from './sort-by'

describe('SortBy', () => {
  describe('When sorting an unordered list', () => {
    it('It orders the list', () => {
      const list = ['e', 'a', 'b', 'd', 'c']

      const sorted = list.slice().sort(sortBy((x) => x))

      expect(sorted).toStrictEqual(['a', 'b', 'c', 'd', 'e'])
    })
  })
  describe('When sorting an unordered list descending', () => {
    it('It orders the list descending', () => {
      const list = ['e', 'a', 'b', 'd', 'c']

      const sorted = list.slice().sort(sortBy((x) => x, 'desc'))

      expect(sorted).toStrictEqual(['e', 'd', 'c', 'b', 'a'])
    })
  })
})

describe('SortByIgnoreCase', () => {
  describe('When sorting an unordered list', () => {
    it('It orders the list', () => {
      const list = ['e', 'a', 'B', 'D', 'c']

      const sorted = list.slice().sort(sortByIgnoreCase((x) => x))

      expect(sorted).toStrictEqual(['a', 'B', 'c', 'D', 'e'])
    })
  })
})

describe('combineSortFn', () => {
  describe('When sorting an unordered list by multiple properties', () => {
    it('It applies sorting rules in order', () => {
      const users: Array<{ first: string; last: string; dob: Date }> = [
        {
          first: 'a',
          last: 'b',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'z',
          last: 'a',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'c',
          last: 'b',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'a',
          last: 'a',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'a',
          last: 'a',
          dob: new Date('2010-01-01'),
        },
      ]

      const sorted = users.slice().sort(
        combineSortFn(
          sortByIgnoreCase((x) => x.last),
          sortByIgnoreCase((x) => x.first),
          sortBy((x) => x.dob)
        )
      )

      expect(sorted).toStrictEqual([
        {
          first: 'a',
          last: 'a',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'a',
          last: 'a',
          dob: new Date('2010-01-01'),
        },
        {
          first: 'z',
          last: 'a',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'a',
          last: 'b',
          dob: new Date('2000-01-01'),
        },
        {
          first: 'c',
          last: 'b',
          dob: new Date('2000-01-01'),
        },
      ])
    })
  })
})
