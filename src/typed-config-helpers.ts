export type EnvVarParsingRule = { __name: string; __format: string }

export type EnvVarSubstitution<T> = {
  [key in keyof T]?:
    | Uppercase<string>
    | EnvVarParsingRule
    | (T[key] extends Date ? never : T[key] extends object ? EnvVarSubstitution<T[key]> : never)
}

export const json = <T extends Uppercase<string>>(varName: T): { __name: T; __format: 'json' } => ({
  __name: varName,
  __format: 'json',
})
