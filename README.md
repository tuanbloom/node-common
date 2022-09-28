# Node Common

A set of MakerX core NodeJS types and utilities.

## Environment

This module standardises minimal environment definitions based on the NODE_ENV environment variable.

| NODE_ENV   | Description                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| localdev   | Indicates a local development setup, code can expect to have `devDependencies` installed, logging is expected to be more verbose etc |
| dev        | Indicates a deployed environment with non-production data and behaviour                                                              |
| production | Indicates the live production environment with real data and optimised behaviour                                                     |

- `environment` returns process.env.NODE_ENV
- `isLocalDev` indicates whether the environment is `localdev`
- `isDev` indicates whether the environment is `dev`
- `isProduction` indicates whether the environment is `production`

## Logger

This type can be used to optionally emit logging from packages without taking a dependency on any specific logging framework.

```ts
export type Logger = {
  error(message: string, ...optionalParams: unknown[]): void
  warn(message: string, ...optionalParams: unknown[]): void
  info(message: string, ...optionalParams: unknown[]): void
  verbose(message: string, ...optionalParams: unknown[]): void
  debug(message: string, ...optionalParams: unknown[]): void
}
```

Example usage:

```ts
logger?.verbose('About to do something')
const result = doSomething()
logger?.info('Did something', { result })
```

The `Logger` representation is compatible with [Winston](https://github.com/winstonjs/winston).

Or, if you want console output, you could use:

```ts
const logger: Logger = {
  error: (message: string, ...params: unknown[]) => console.error
  warn: (message: string, ...params: unknown[]) => console.warn
  info: (message: string, ...params: unknown[]) => console.info
  verbose: (message: string, ...params: unknown[]) => console.trace
  debug: (message: string, ...params: unknown[]) => console.debug
}
```

## HTTP

### HttpClient

`HttpClient` is a class wrapping `node-fetch` to make calling Web API endpoints slightly easier:

- supports setting a base URL so relative paths can be used
- supports providing an function to set an authorization header on every request
- provides individual GET POST PUT PATCH DELETE methods
- provides default behaviour of reading the response body as JSON
- supports a form-urlencoded body POST via `postForm` method
- extracts some response info into an thrown error for non-200 responses to make error responses visible in logs

Example:

```ts
export class ThingClient extends HttpClient<BaseContext> {
  constructor(options: HttpClientOptions<BaseContext>) {
    super(options)
  }

  public things(): Promise<Thing[]> {
    return this.get<Thing[]>(`things`)
  }

  public thing(id: string): Promise<Thing> {
    return this.get<Thing>(`things/${id}`)
  }

  public async createThing(thingInput: { name: string; date: Date }): Promise<Thing> {
    const thing = await this.post<Thing>(`things`, { data: thingInput })
    this.options.logger.info('Created a thing', { thingInput, thing })
  }
}

const onBehalfOfAuthFactory: HttpAuthFactory<BaseContext> = async ({ user }) => {
  const { access_token, expires_in } = await getOnBehalfOfToken({ ...oboConfig, assertionToken })
  return { authorization: `Bearer ${access_token}` }
}

export const createServices = (context: BaseContext): Services => {
  const httpClientOptions = {
    requestContext: context,
    logger: context.logger,
    correlationId: context.requestInfo.correlationId,
  }
  return {
    thingClient: new ThingClient({
      ...httpClientOptions,
      baseUrl,
      authFactory: onBehalfOfAuthFactory,
    }),
  }
}
```

### HttpResponseError

A custom Error class which includes a `responseInfo` field to make investigating HTTP errors (via logs etc) a little easier.

A static `create` async factory will attempt to read the response body (as json, then text) and add it to the error.

```ts
const response = await fetch('https://broken.io/error', {
  method: 'POST',
  body,
})

if (!response.ok) throw await HttpResponseError.create(response, 'POST failed')
```

## Authorisation

A number of authorisation functions and `HttpAuthFactory` wrappers are exported:

### Client-Credentials flow

- `getClientCredentialsToken`: posts a client-credentials auth request to a token endpoint and returns an `AccessToken` response.
- `createClientCredentialsAuthFactory`: calls `getClientCredentialsToken` and returns an authorization header, caching the `AccessToken` response until it expires, when it will fetch a new token.

### On-Behalf-Of flow

- `getOnBehalfOfToken`: posts an on-behalf-of auth request to a token endpoint and returns an `AccessToken` response
- `createClientCredentialsAuthFactory`: calls `createOnBehalfOfAuthFactory` using an `assertionToken` and returns an authorization header.

### Basic auth

- `getBasicAuthHeader`: returns a `Basic {value}` auth header string based on the supplied username and password.
- `createBasicAuthFactory`: calls `getBasicAuthHeader` and returns an authorization header.
