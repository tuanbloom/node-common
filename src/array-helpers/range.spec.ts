import { range } from './range'

describe('Range', () => {
  describe('When generating a range', () => {
    it('It is inclusive of the start and end number, and includes all numbers in-between', () => {
      const result = range(1, 5)

      expect(result).toStrictEqual([1, 2, 3, 4, 5])
    })
  })
  describe('When generating an invalid range', () => {
    it('Throws an error describing the issue', () => {
      expect(() => range(2, 1)).toThrowError(`Invalid start and end values. Start ${2} must be greater than end ${1}`)
    })
  })
})
