export type ValueFromPropertyPath<TKey, TConfig> = TKey extends keyof TConfig
  ? TConfig[TKey]
  : TKey extends `${infer TFirst}.${infer TRest}`
  ? TFirst extends keyof TConfig
    ? ValueFromPropertyPath<TRest, TConfig[TFirst]>
    : never
  : never

export type TypedConfig<TConfig extends object, TOpaque> = {
  get<TPath extends PropertyPaths<TConfig, TOpaque>>(path: TPath): ValueFromPropertyPath<TPath, TConfig>
  has<TPath extends PropertyPaths<TConfig, TOpaque>>(path: TPath): boolean
}

export type JoinPaths<K, P> = K extends string | number ? (P extends string | number ? `${K}${'' extends P ? '' : '.'}${P}` : never) : never
export type DefaultOpaqueTypes = Date | Array<any>

/**
 * Returns true if T exists in TUnionOfTypes.
 *
 * Ensures that types are only considered equal if A is assignable to B AND B is assignable to A
 */
type ContainsType<T, TUnionOfTypes> = true extends (
  TUnionOfTypes extends any ? ([T, TUnionOfTypes] extends [TUnionOfTypes, T] ? true : false) : never
)
  ? true
  : false

export type PropertyPaths<T, TOpaque = DefaultOpaqueTypes, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? ContainsType<T, TOpaque> extends true
    ? ''
    : {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | (PropertyPaths<T[K], TOpaque, Prev[D]> extends infer R ? JoinPaths<K, R> : never)
          : never
      }[keyof T]
  : ''

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]]

/**
 * Create a typedConfig singleton
 * @param config the config singleton
 *
 * usage:
 * ```
 * import config from 'config'
 *
 * type MyConfig {
 *   mySetting: number
 * }
 *
 * const typedConfig = createTypedConfig<MyConfig>(config)
 *
 * const val = typedConfig.get('mySetting')
 * ```
 *
 * Optionally specify opaque types:
 *
 * Sub properties of an opaque type will not be expanded. This can improve editor performance when dealing with complex types when you
 * would never need to access a sub property directly from config.
 *
 * usage:
 * ```
 * import config from 'config'
 *
 * type MyConfig {
 *   msalConfig: MsalConfiguration
 * }
 *
 * const typedConfig1 = createTypedConfig<MyConfig>(config)
 * typedConfig1.has('msalConfig.system') ✅
 * const typedConfig2 = createTypedConfig<MyConfig, MsalConfiguration | DefaultOpaqueTypes>(config)
 * typedConfig2.has('msalConfig.system') ❌
 * typedConfig2.has('msalConfig') ✅
 *
 * ```
 */
export const createTypedConfig = <TConfig extends object, TOpaqueTypes = DefaultOpaqueTypes>(config: {
  get(path: string): unknown
  has(path: string): boolean
}) => config as TypedConfig<TConfig, TOpaqueTypes>
