# @avidian/http

A lightweight, axios-like HTTP client built on the fetch API.
Works in browsers and Node.js.

## Features

- Promise-based API with axios-style ergonomics, fetch under the hood
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, plus a generic `request()`
- Request and response interceptors, including error interceptors with recovery
- Timeouts via `AbortController`, merged with your own `AbortSignal`
- Custom headers, query parameters, and response types
- `fetchOptions` pass-through for `credentials`, `mode`, `cache`, and any other `RequestInit` field
- Configurable `validateStatus`
- Emulate PUT/PATCH with POST for legacy backends (`FormData`-safe)
- TypeScript-first, ships ESM, CJS, and UMD builds

## Installation

```sh
npm install @avidian/http
```

## Usage

### Basic Example

```ts
import createHttp from '@avidian/http';

const http = createHttp();

const response = await http.get('https://api.example.com/data');
console.log(response.data);
```

You can also construct the class directly:

```ts
import { Http } from '@avidian/http';

const http = new Http({
    baseUrl: 'https://api.example.com',
    headers: { Authorization: 'Bearer token' },
    timeout: 10000,
});

const res = await http.post('/users', { name: 'Alice' });
```

In browsers, relative URLs without a `baseUrl` resolve against the current page, just like fetch.

### Interceptors

```ts
// Request interceptors receive the RequestInit about to be sent.
const removeAuth = http.addRequestInterceptor((request) => {
    request.headers = { ...request.headers, 'X-Trace': 'abc' };
    return request;
});

// Response interceptors chain like promise handlers (axios-style).
http.addResponseInterceptor(
    (response) => response,
    (error) => {
        // Return a Response to recover, or rethrow to propagate.
        throw error;
    }
);

removeAuth(); // every add* method returns an unsubscribe function
```

Error interceptors receive an `Exception` for HTTP status failures (`code: 'ERR_BAD_RESPONSE'`), an `Exception` with `code: 'ETIMEDOUT'` for timeouts, or the original error for network failures.

### Timeouts and Cancellation

```ts
const controller = new AbortController();

await http.get('/slow', {
    timeout: 5000, // rejects with Exception code ETIMEDOUT
    signal: controller.signal, // user aborts keep their AbortError
});
```

### Cookies / CORS

```ts
const http = new Http({
    baseUrl: 'https://api.example.com',
    fetchOptions: { credentials: 'include' },
});
```

### Emulate PUT/PATCH

```ts
const http = new Http({ emulatePutPatch: true });

// Plain objects gain a `_method` field; FormData/URLSearchParams get
// `_method` appended; opaque bodies carry `_method` in the query string.
await http.put('/resource/1', { name: 'Bob' });
```

## API

### `createHttp(options?: HttpOptions)` / `new Http(options?: HttpOptions)`

#### `HttpOptions` ([src/types.ts](src/types.ts))

- `baseUrl?: string` - base URL for requests
- `headers?: Record<string, string> | Headers` - default headers
- `params?: QueryParams` - default query parameters
- `fetch?: Fetch` - custom fetch implementation
- `timeout?: number` - default timeout in milliseconds
- `fetchOptions?: RequestInit` - extra fetch options for every request
- `validateStatus?: (status: number) => boolean` - default: `status < 400`
- `emulatePutPatch?: boolean` - emulate PUT/PATCH with POST
- `emulateMethodKey?: string` - key for emulated method (default: `_method`)
- `emulateMethod?: 'GET' | 'POST'` - HTTP method to use (default: `POST`)
- `emulateMethodValue?: string` - value for emulated method

### Methods

All methods return a `Promise<Response<T>>`.

- `get<T>(url, options?)`
- `head<T>(url, options?)`
- `post<T, D>(url, data?, options?)`
- `put<T, D>(url, data?, options?)`
- `patch<T, D>(url, data?, options?)`
- `delete<T, D>(url, options?)` - accepts `data` inside `options`
- `request<T, D>(config)` - generic dispatch with full `RequestConfig`
- `addRequestInterceptor(fn)` - returns an unsubscribe function
- `addResponseInterceptor(onFulfilled?, onRejected?)` - returns an unsubscribe function

#### `Options` ([src/types.ts](src/types.ts))

- `headers?: Record<string, string> | Headers`
- `params?: QueryParams`
- `responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'` (default: `'json'`)
- `signal?: AbortSignal`
- `timeout?: number`
- `fetchOptions?: RequestInit`
- `validateStatus?: (status: number) => boolean`

#### `Response<T>` ([src/types.ts](src/types.ts))

- `headers: Record<string, string>`
- `statusCode: number`
- `statusText: string`
- `data: T`

### Error Handling

Requests failing `validateStatus` reject with an [`Exception`](src/exception.ts).

```ts
import createHttp, { isException } from '@avidian/http';

const http = createHttp();

try {
    await http.get('/not-found');
} catch (err) {
    if (isException(err)) {
        console.error(err.code, err.response?.statusCode, err.response?.data);
    }
}
```

`Exception` fields:

- `message: string`
- `response?: Response<any>` - present for HTTP status failures
- `code?: string` - `ERR_BAD_RESPONSE`, `ETIMEDOUT`, ...

## Testing

```sh
npm test
```

## Building

```sh
npm run build
```

## Contributing

1. Fork the repo and create your branch.
2. Run `npm install`.
3. Add tests for your feature or bugfix.
4. Run `npm test` and `npm run build`.
5. Submit a pull request.

## License

MIT © John Michael Manlupig
