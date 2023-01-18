import { randomUUID } from 'crypto'
import fetch, { RequestInit, Response } from 'node-fetch'
import { AuthHeaders, HttpAuthFactory } from './authorization'
import { Logger } from './logger'

export class HttpResponseError extends Error {
  constructor(responseInfo: LoggableHttpResponseInfo, message?: string) {
    super(`${message ?? 'HTTP Error'}: ${responseInfo.status} ${responseInfo.statusText}`)
    this.responseInfo = responseInfo
  }
  public responseInfo: LoggableHttpResponseInfo

  public static create = async (response: Response, message?: string): Promise<HttpResponseError> => {
    const error = new HttpResponseError(response, message)
    error.responseInfo = await extractErrorResponseInfo(response)
    return error
  }
}

export type LoggableHttpResponseInfo = Pick<Response, 'status' | 'statusText'> & {
  responseText?: string
  responseJson?: unknown
}

export const extractErrorResponseInfo = async (response: Response): Promise<LoggableHttpResponseInfo> => {
  const info: LoggableHttpResponseInfo = {
    status: response.status,
    statusText: response.statusText,
  }
  try {
    info.responseJson = await response.json()
  } catch {
    try {
      info.responseText = await response.text()
    } catch {
      /* ignore */
    }
  }
  return info
}

export interface HttpClientOptions<TContext = never> {
  baseUrl?: string
  service?: string
  logger?: Logger
  authFactory?: HttpAuthFactory<TContext>
  requestContext?: TContext
  correlationId?: string
  headers?: Record<string, string>
}

const toUrlParams = (data: Record<string, unknown>): string => {
  const params = new URLSearchParams()

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((value) => {
        if (value !== null && value !== undefined) params.append(key, `${value}`)
      })
    } else if (value !== null && value !== undefined) {
      params.append(key, `${value}`)
    }
  })

  return params.toString()
}

export class HttpClient<TContext = never> {
  options: HttpClientOptions<TContext>

  constructor(options: HttpClientOptions<TContext>) {
    this.options = options ?? {}
  }

  public async get<T>(url: string, options?: { params?: Record<string, unknown>; init?: RequestInit }): Promise<T> {
    const urlWithParams = options?.params ? `${url}?${toUrlParams(options.params)}` : url
    return this.request<T>(urlWithParams, { init: { ...options?.init, method: 'GET' } })
  }

  public async post<T>(url: string, { data, init }: { data?: unknown; init?: RequestInit }): Promise<T> {
    return this.request<T>(url, { data, init: { ...init, method: 'POST' } })
  }

  public async postForm<T>(url: string, { data, init }: { data: URLSearchParams; init?: RequestInit }): Promise<T> {
    return this.request<T>(url, { data, init: { ...init, method: 'POST' } })
  }

  public async put<T>(url: string, { data, init }: { data?: unknown; init?: RequestInit }): Promise<T> {
    return this.request<T>(url, { data, init: { ...init, method: 'PUT' } })
  }

  public async patch<T>(url: string, { data, init }: { data?: unknown; init?: RequestInit }): Promise<T> {
    return this.request<T>(url, { data, init: { ...init, method: 'PATCH' } })
  }

  public async delete<T>(url: string, options?: { data?: unknown; init?: RequestInit }): Promise<T> {
    return this.request<T>(url, { data: options?.data, init: { ...options?.init, method: 'DELETE' } })
  }

  public async request<T>(url: string, args: { data?: unknown; init?: RequestInit }): Promise<T> {
    const response = await this.requestRaw(url, args)
    return (await response.json()) as T
  }

  public async requestRaw(url: string, { data, init }: { data?: unknown; init?: RequestInit }): Promise<Response> {
    const { baseUrl, authFactory, requestContext, correlationId, headers: baseHeaders, logger, service } = this.options

    // compose URL
    const combinedUrl = typeof baseUrl === 'string' ? new URL(url, baseUrl).href : url

    // compose headers
    let authHeaders: AuthHeaders | undefined = undefined
    try {
      authHeaders = authFactory ? await authFactory(requestContext as TContext) : {}
    } catch (error) {
      logger?.error('Authentication via authFactory failed', { error })
    }
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...authHeaders,
    }
    if (correlationId) headers['X-Correlation-ID'] = correlationId

    return makeHttpRequest({
      fetchInit: init,
      method: init?.method ?? 'GET',
      url: combinedUrl,
      headers,
      contentType: data instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json',
      logger,
      ensureSuccessStatusCode: true,
      data,
      logContext: { service },
    })
  }
}

export type HttpRequestOptions = {
  /**
   * The full url of the resource to fetch
   */
  url: string
  /**
   * The http method to use with the request
   */
  method: string
  /**
   * A data object to be sent in the request body
   */
  data?: unknown
  /**
   * Any additional headers to be sent with the request
   */
  headers?: Record<string, string>
  /**
   * A value for the http 'Content-Type' header.
   * THe default is 'application/json'
   */
  contentType?: string
  /**
   * A value for the http 'Accept'' header
   */
  accept?: string
  /**
   * A logger instance to be used to log requests and errors
   */
  logger?: Logger
  /**
   * Any additional values to be set on the fetch RequestInit object
   */
  fetchInit?: Partial<Omit<RequestInit, 'method' | 'body' | 'headers'>>
  /**
   * Any additional properties to append to log messages
   */
  logContext?: Record<string, unknown>
  /**
   * The level to log all http requests before they are sent.
   * The default is 'none' (ie. don't log)
   */
  requestLogLevel?: 'none' | keyof Logger
  /**
   * The level to log all successful responses.
   * The default is 'verbose'
   */
  successResponseLogLevel?: 'none' | keyof Logger
  /**
   * The level to log all unsuccessful responses.
   * The default is 'error'
   */
  errorResponseLogLevel?: 'none' | keyof Logger
  /**
   * If true, will throw an exception for none 2xx status code responses
   */
  ensureSuccessStatusCode?: boolean
  /**
   * An array of headers that should be considered sensitive and as such, omitted from the logs
   * The default values are 'Authorization' and 'X-API-Key'
   */
  sensitiveHeaders?: string[]
}

export async function makeHttpRequest({
  url,
  contentType = 'application/json',
  accept,
  ensureSuccessStatusCode = true,
  method,
  data,
  headers,
  logger,
  logContext,
  requestLogLevel = 'none',
  successResponseLogLevel = 'verbose',
  errorResponseLogLevel = 'error',
  fetchInit,
  sensitiveHeaders = ['Authorization', 'X-API-Key'],
}: HttpRequestOptions) {
  // compose request
  const request: RequestInit = {
    ...fetchInit,
    method,
    headers: {
      ...headers,
      'X-Request-ID': randomUUID(),
      ...(contentType && { 'Content-Type': contentType }),
      ...(accept && { Accept: accept }),
    },
    body: data ? JSON.stringify(data) : undefined,
  }

  // strip sensitive request data for logging
  const { headers: finalHeaders, body, ...loggableRequestData } = request
  const logRequestInfo = {
    url,
    ...loggableRequestData,
    headers: Object.fromEntries(
      Object.entries(finalHeaders as Record<string, string>).filter(([header]) =>
        sensitiveHeaders.every((sh) => header.localeCompare(sh, undefined, { sensitivity: 'base' }) !== 0)
      )
    ),
  }
  const started = Date.now()

  if (requestLogLevel !== 'none') {
    logger?.[requestLogLevel]('HTTP request', {
      started,
      ...logContext,
      request: logRequestInfo,
    })
  }

  try {
    const response = await fetch(url, request)
    if (!response.ok && ensureSuccessStatusCode) throw await HttpResponseError.create(response)
    if (successResponseLogLevel !== 'none') {
      logger?.[successResponseLogLevel]('HTTP response', {
        duration: Date.now() - started,
        statusCode: response.status,
        statusText: response.statusText,
        ...logContext,
        request: logRequestInfo,
      })
    }
    return response
  } catch (error) {
    if (errorResponseLogLevel !== 'none') {
      logger?.[errorResponseLogLevel]('HTTP request failed', {
        duration: Date.now() - started,
        ...logContext,
        request: logRequestInfo,
        error,
      })
    }
    throw error
  }
}
