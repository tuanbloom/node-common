import { getCircularReplacer } from './index'

describe('getCircularReplacer', () => {
  describe('When stringifying an object with a circular reference', () => {
    const objectA = {
      prop: 'string',
      b: {},
    }
    const objectB = {
      a: objectA,
    }
    objectA.b = objectB
    it('Sets circular references to undefined', () => {
      const str = JSON.stringify(objectA, getCircularReplacer())

      expect(str).toBe(`{"prop":"string","b":{}}`)
    })
  })
})
