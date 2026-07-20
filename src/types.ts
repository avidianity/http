export type QueryParams = Record<string, string | number>;

/**
 * @deprecated Use `QueryParams` instead; this name shadows TypeScript's
 * built-in `Parameters<T>` utility type.
 */
export type Parameters = QueryParams;

export type Headers = Record<string, string> | globalThis.Headers;

export type ResponseType = 'text' | 'json' | 'blob' | 'arrayBuffer';

export type FetchOptions = Omit<
    RequestInit,
    'method' | 'headers' | 'body' | 'signal'
>;

export type Options = {
    headers?: Headers;
    params?: QueryParams;
    /**
     * @default 'json'
     */
    responseType?: ResponseType;
    signal?: AbortSignal;
    /**
     * Milliseconds before the request is aborted and rejected with an
     * `Exception` whose code is `ETIMEDOUT`. Overrides the instance default.
     */
    timeout?: number;
    /**
     * Extra `RequestInit` fields passed straight to fetch (credentials,
     * mode, cache, redirect, ...). Merged over the instance defaults.
     */
    fetchOptions?: FetchOptions;
    /**
     * Decide whether a status code resolves or rejects the request.
     * @default (status) => status < 400
     */
    validateStatus?: (status: number) => boolean;
};

export type Method =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'DELETE';

export type RequestConfig<T> = {
    method: Method;
    url: string;
    data?: T;
} & Options;

export type Response<T> = {
    headers: Record<string, string>;
    statusCode: number;
    statusText: string;
    data: T;
};

export type Fetch = (
    input: RequestInfo | URL,
    init?: RequestInit
) => Promise<globalThis.Response>;

export type HttpOptions = {
    baseUrl?: string;
    headers?: Headers;
    params?: QueryParams;
    fetch?: Fetch;
    /**
     * Default timeout in milliseconds for every request.
     */
    timeout?: number;
    /**
     * Extra `RequestInit` fields passed straight to fetch for every request.
     */
    fetchOptions?: FetchOptions;
    /**
     * Decide whether a status code resolves or rejects the request.
     * @default (status) => status < 400
     */
    validateStatus?: (status: number) => boolean;
    emulatePutPatch?: boolean;
    /**
     * @default '_method'
     */
    emulateMethodKey?: string;
    /**
     * @default 'POST'
     */
    emulateMethod?: 'GET' | 'POST';
    /**
     * Defaults to uppercase versions of the method being emulated
     */
    emulateMethodValue?: string;
};

export interface Interceptor<T> {
    (input: T): T | Promise<T>;
}

export interface ErrorInterceptor {
    /**
     * Receives the error (an `Exception` for HTTP status failures, or the
     * original error for network failures). Return a `Response` to recover,
     * or rethrow to propagate.
     */
    (error: unknown): Response<any> | Promise<Response<any>>;
}
