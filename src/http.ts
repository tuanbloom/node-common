import { randomUUID } from 'crypto'
import omit from 'lodash.omit'
import fetch, { RequestInit, Response } from 'node-fetch'
import { AuthHeaders, HttpAuthFactory } from './authorization'
import { Logger } from './logger'

export class HttpResponseError extends Error {
  constructor(responseInfo: LoggableHttpResponseInfo, message?: string) {
    super(`${message ?? 'HTTP Error'}: ${responseInfo.status} ${responseInfo.statusText}`)
  }
  public responseInfo?: LoggableHttpResponseInfo

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
      'X-Request-ID': randomUUID(),
      ...baseHeaders,
      ...authHeaders,
    }
    if (correlationId) headers['X-Correlation-ID'] = correlationId
    if (!(data instanceof URLSearchParams)) headers['Content-Type'] = 'application/json'

    // compose request
    const request: RequestInit = {
      ...init,
      headers: { ...init?.headers, ...headers },
      body: data ? JSON.stringify(data) : undefined,
    }

    // strip sensitive request data for logging
    const { headers: finalHeaders, body, ...loggableRequestData } = request
    const logRequestInfo = {
      baseUrl,
      url,
      ...loggableRequestData,
      headers: omit(finalHeaders, 'authorization', 'x-api-key', 'X-API-Key'),
    }

    const started = Date.now()
    try {
      const response = await fetch(combinedUrl, request)
      if (!response.ok) throw await HttpResponseError.create(response)
      return response
    } catch (error) {
      logger?.error('HTTP request failed', {
        duration: Date.now() - started,
        service,
        request: logRequestInfo,
        error,
      })
      throw error
    }
  }
}
