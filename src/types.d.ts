export type Parameters = Record<string, string | number>;

export type Headers = Record<string, string>;

export type ResponseType = 'text' | 'json' | 'blob' | 'arrayBuffer';

export type Options = {
    headers?: Headers;
    params?: Parameters;
    /**
     * @default 'json'
     */
    responseType?: ResponseType;
};

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'DELETE';

export type RequestConfig<T> = {
    method: Method;
    url: string;
    data?: T;
} & Options;

export type Response<T> = {
    headers: Headers;
    statusCode: number;
    data: T;
};

export type Fetch = (
    input: RequestInfo | URL,
    init?: RequestInit
) => Promise<globalThis.Response>;

export type HttpOptions = {
    baseUrl?: string;
    headers?: Headers;
    params?: Parameters;
    fetch?: Fetch;
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
