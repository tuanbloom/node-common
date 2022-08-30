if (!process.env.NODE_ENV) throw new Error('NODE_ENV is not set')
export const environment = process.env.NODE_ENV
export const isLocalDev = process.env.NODE_ENV === 'localdev'
export const isDev = process.env.NODE_ENV === 'dev'
export const isProduction = process.env.NODE_ENV === 'production'
