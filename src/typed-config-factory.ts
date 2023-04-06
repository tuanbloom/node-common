type ExtractValue<TKey, TConfig> = TKey extends keyof TConfig
  ? TConfig[TKey]
  : TKey extends `${infer TFirst}.${infer TRest}`
  ? TFirst extends keyof TConfig
    ? ExtractValue<TRest, TConfig[TFirst]>
    : never
  : never

export type TypedConfig<TConfig extends object> = {
  get<TPath extends Paths<TConfig>>(path: TPath): ExtractValue<TPath, TConfig>
  has<TPath extends Paths<TConfig>>(path: TPath): boolean
}

type Join<K, P> = K extends string | number ? (P extends string | number ? `${K}${'' extends P ? '' : '.'}${P}` : never) : never
type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number ? `${K}` | (Paths<T[K], Prev[D]> extends infer R ? Join<K, R> : never) : never
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
 */
export const createTypedConfig = <TConfig extends object>(config: { get(path: string): unknown; has(path: string): boolean }) =>
  config as TypedConfig<TConfig>
