# @avidian/http

A lightweight, flexible HTTP client for browsers and Node.js.

## Features

- Promise-based API
- Supports GET, POST, PUT, PATCH, DELETE
- Custom headers, query parameters, and response types
- Emulate PUT/PATCH with POST for legacy backends
- Works in Node.js and browsers
- TypeScript support

## Installation

```sh
npm install @avidian/http
```

## Usage

### Basic Example

```ts
import Http from '@avidian/http';

const http = Http();

async function fetchData() {
    const response = await http.get('https://api.example.com/data');
    console.log(response.data);
}
```

### With Custom Options

```ts
import Http from '@avidian/http';

const http = Http({
    baseUrl: 'https://api.example.com',
    headers: { Authorization: 'Bearer token' },
});

http.post('/users', { name: 'Alice' }).then(res => {
    console.log(res.data);
});
```

### Emulate PUT/PATCH

```ts
const http = Http({ emulatePutPatch: true });
http.put('/resource/1', { name: 'Bob' });
```

## API

### `Http(options?: HttpOptions)`

Creates a new HTTP client instance.

#### `options` ([`HttpOptions`](src/types.d.ts))

- `baseUrl?: string` – Base URL for requests
- `headers?: Record<string, string>` – Default headers
- `params?: Record<string, string | number>` – Default query parameters
- `fetch?: Fetch` – Custom fetch implementation
- `emulatePutPatch?: boolean` – Emulate PUT/PATCH with POST
- `emulateMethodKey?: string` – Key for emulated method (default: `_method`)
- `emulateMethod?: 'GET' | 'POST'` – HTTP method to use (default: `POST`)
- `emulateMethodValue?: string` – Value for emulated method

### Methods

All methods return a `Promise<Response<T>>`.

- `get<T>(url: string, options?: Options)`
- `post<T>(url: string, data?: any, options?: Options)`
- `put<T>(url: string, data?: any, options?: Options)`
- `patch<T>(url: string, data?: any, options?: Options)`
- `delete<T>(url: string, options?: Options)`

#### `Options` ([`Options`](src/types.d.ts))

- `headers?: Record<string, string>`
- `params?: Record<string, string | number>`
- `responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'` (default: `'json'`)
- `signal?: AbortSignal`

#### `Response<T>` ([`Response`](src/types.d.ts))

- `headers: Record<string, string>`
- `statusCode: number`
- `data: T`

### Error Handling

Errors with status code >= 400 throw an [`Exception`](src/exception.ts) containing the response.

```ts
import Http, { isException } from '@avidian/http';

const http = Http();

try {
    await http.get('/not-found');
} catch (err) {
    if (isException(err)) {
        console.error(err.response.statusCode, err.response.data);
    }
}
```

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
