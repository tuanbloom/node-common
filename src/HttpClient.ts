import { randomUUID } from 'crypto'
import omit from 'lodash.omit'
import fetch, { RequestInit, Response } from 'node-fetch'
import { join } from 'path'
import { HttpAuthFactory } from './authorization'
import { Logger } from './logger'

export class HttpResponseError extends Error {
  constructor(response: Response) {
    super(`HTTP Error: ${response.status} ${response.statusText}`)
    this.response = response
  }
  public response: Response
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

  private async request<T>(url: string, { data, init }: { data?: unknown; init?: RequestInit }): Promise<T> {
    const { baseUrl, authFactory, requestContext, correlationId, headers: baseHeaders, logger, service } = this.options

    // compose URL
    const combinedUrl = typeof baseUrl == 'string' ? join(baseUrl, url) : url

    // compose headers
    const authHeaders = authFactory ? await authFactory(requestContext as TContext) : {}
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
      if (!response.ok) throw new HttpResponseError(response)
      const json = (await response.json()) as T
      logger?.verbose('HTTP request', {
        duration: Date.now() - started,
        serviceName: service,
        request: logRequestInfo,
      })
      return json
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
