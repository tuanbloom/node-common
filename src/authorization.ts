import fetch from 'node-fetch'
import { HttpResponseError } from './http'

interface AccessTokenResponseData {
  access_token: string
  expires_in: number
}

export class AccessTokenResponse {
  constructor({ access_token, expires_in }: AccessTokenResponseData) {
    this.access_token = access_token
    this.expires_in = expires_in
    this.expires = new Date(Date.now() + expires_in * 1000)
  }
  readonly access_token: string
  readonly expires_in: number
  readonly expires: Date
  get isExpired(): boolean {
    return Date.now() >= this.expires.getTime()
  }
  willExpire(withinSeconds: number): boolean {
    return Date.now() >= this.expires.getTime() - withinSeconds * 1000
  }
}

export interface ClientCredentialsConfig {
  tokenUrl: string
  clientId: string
  clientSecret: string
  scope: string
}

export const getClientCredentialsToken = async ({
  tokenUrl,
  clientId,
  clientSecret,
  scope,
}: ClientCredentialsConfig): Promise<AccessTokenResponse> => {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: scope,
    }),
  })

  if (!response.ok) throw await HttpResponseError.create(response, 'Request for client_credentials failed')

  const data = (await response.json()) as AccessTokenResponseData
  if (!data.access_token) throw new HttpResponseError(response, 'No access_token was returned from client_credentials request')

  return new AccessTokenResponse(data)
}

export type OnBehalfOfConfig = ClientCredentialsConfig & {
  assertionToken: string
}

export const getOnBehalfOfToken = async ({
  tokenUrl,
  clientId,
  clientSecret,
  scope,
  assertionToken,
}: OnBehalfOfConfig): Promise<AccessTokenResponse> => {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      client_id: clientId,
      client_secret: clientSecret,
      assertion: assertionToken,
      scope,
      requested_token_use: 'on_behalf_of',
    }),
  })

  if (!response.ok) throw await HttpResponseError.create(response, 'Request for on-behalf-of failed')

  const data = (await response.json()) as AccessTokenResponseData
  if (!data.access_token) throw new HttpResponseError(response, 'No access_token was returned from on-behalf-of request')

  return new AccessTokenResponse(data)
}

const base64Encode = (value: string): string => Buffer.from(value, 'utf-8').toString('base64')

export const getBasicAuthHeader = (username: string, password: string): string => `Basic ${base64Encode(`${username}:${password}`)}`

export type AuthHeaders = Record<string, string>
export type Context = Record<string, string>
export type HttpAuthFactory<TContext = never> = (context: TContext) => Promise<AuthHeaders>

export const createClientCredentialsAuthFactory = (clientCredentialsConfig: ClientCredentialsConfig): HttpAuthFactory => {
  let promise: Promise<AccessTokenResponse> | undefined
  return async () => {
    if (!promise) promise = getClientCredentialsToken(clientCredentialsConfig)
    let tokenResponse = await promise
    if (tokenResponse.isExpired) {
      promise = getClientCredentialsToken(clientCredentialsConfig)
      tokenResponse = await promise
    }
    return {
      authorization: `Bearer ${tokenResponse.access_token}`,
    }
  }
}

export const createOnBehalfOfAuthFactory = (
  onBehalfOfConfig: Omit<OnBehalfOfConfig, 'assertionToken'>
): HttpAuthFactory<{ assertionToken: string }> => {
  return async ({ assertionToken }) => {
    const config: OnBehalfOfConfig = { assertionToken, ...onBehalfOfConfig }
    const tokenResponse = await getOnBehalfOfToken(config)
    return {
      authorization: `Bearer ${tokenResponse.access_token}`,
    }
  }
}

export interface BasicAuthConfig {
  username: string
  password: string
}

export const createBasicAuthFactory = ({ username, password }: BasicAuthConfig): HttpAuthFactory => {
  const headers = {
    authorization: getBasicAuthHeader(username, password),
  }
  return () => Promise.resolve(headers)
}
