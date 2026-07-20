import { Exception } from './exception';
import { makeBody, mergeObjects, normalizeHeaders, resolveUrl, isPlainObject } from './helpers';
import {
    HttpOptions,
    Options,
    RequestConfig,
    Response,
    Interceptor,
    ErrorInterceptor,
} from './types';

type ResponseInterceptorPair = {
    onFulfilled?: Interceptor<Response<any>> | null;
    onRejected?: ErrorInterceptor | null;
};

export class Http {
    private requestInterceptors: Interceptor<RequestInit>[] = [];
    private responseInterceptors: ResponseInterceptorPair[] = [];

    constructor(public readonly options: HttpOptions = {}) {}

    public addRequestInterceptor(fn: Interceptor<RequestInit>) {
        this.requestInterceptors.push(fn);
        return () => {
            const i = this.requestInterceptors.indexOf(fn);
            if (i !== -1) {
                this.requestInterceptors.splice(i, 1);
            }
        };
    }

    public addResponseInterceptor<T = any>(
        onFulfilled?: Interceptor<Response<T>> | null,
        onRejected?: ErrorInterceptor | null
    ) {
        const pair: ResponseInterceptorPair = { onFulfilled, onRejected };
        this.responseInterceptors.push(pair);
        return () => {
            const i = this.responseInterceptors.indexOf(pair);
            if (i !== -1) {
                this.responseInterceptors.splice(i, 1);
            }
        };
    }

    public get<T = any>(url: string, options?: Options) {
        return this.makeRequest<T>({ url, method: 'GET', ...options });
    }

    public post<T = any, D = any>(url: string, data?: D, options?: Options) {
        return this.makeRequest<T, D>({
            url,
            method: 'POST',
            data,
            ...options,
        });
    }

    public put<T = any, D = any>(url: string, data?: D, options?: Options) {
        return this.makeRequest<T, D>({ url, method: 'PUT', data, ...options });
    }

    public patch<T = any, D = any>(url: string, data?: D, options?: Options) {
        return this.makeRequest<T, D>({
            url,
            method: 'PATCH',
            data,
            ...options,
        });
    }

    public delete<T = any, D = any>(url: string, options?: Options) {
        return this.makeRequest<T, D>({ url, method: 'DELETE', ...options });
    }

    protected async makeRequest<T = any, D = any>(
        config: RequestConfig<D>
    ): Promise<Response<T>> {
        const url = resolveUrl(
            config.url,
            this.options.baseUrl,
            typeof location !== 'undefined' ? location.href : undefined
        );

        const params = mergeObjects(
            this.options.params ?? {},
            config.params ?? {}
        );
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value.toString());
        }

        const globalHeaders = normalizeHeaders(this.options.headers);
        const localHeaders = normalizeHeaders(config.headers);
        const headers = mergeObjects(globalHeaders, localHeaders);

        let method = config.method;

        if (['PUT', 'PATCH'].includes(method) && this.options.emulatePutPatch) {
            const key = this.options.emulateMethodKey ?? '_method';
            const val = this.options.emulateMethodValue ?? method;
            const emulateMethod = this.options.emulateMethod ?? 'POST';

            if (emulateMethod === 'POST') {
                const data = config.data;
                if (data instanceof FormData || data instanceof URLSearchParams) {
                    data.append(key, val);
                } else if (
                    data === undefined ||
                    data === null ||
                    isPlainObject(data)
                ) {
                    config.data = { ...(data ?? {}), [key]: val } as any;
                } else {
                    // Blob, ReadableStream, string, etc. cannot be merged
                    // into, so carry the emulated method in the query string.
                    url.searchParams.set(key, val);
                }
            } else {
                url.searchParams.set(key, val);
                if (config.data) {
                    for (const [k, v] of Object.entries(config.data)) {
                        url.searchParams.set(k, `${v}`);
                    }
                    delete config.data;
                }
            }

            method = emulateMethod;
        }

        const bodyDef =
            config.data !== undefined ? makeBody(config.data) : undefined;

        if (bodyDef?.type && headers && typeof headers === 'object') {
            headers['content-type'] ??= bodyDef.type;
        }

        let requestInit: RequestInit = {
            method,
            headers,
            body: bodyDef?.body,
            signal: config.signal,
        };

        for (const interceptor of this.requestInterceptors) {
            requestInit = await interceptor(requestInit);
        }

        const promise = this.performFetch<T>(url, requestInit, config);

        return this.responseInterceptors.reduce(
            (chain, { onFulfilled, onRejected }) =>
                chain.then(
                    onFulfilled ?? undefined,
                    onRejected ?? undefined
                ) as Promise<Response<T>>,
            promise
        );
    }

    private async performFetch<T>(
        url: URL,
        requestInit: RequestInit,
        config: RequestConfig<any>
    ): Promise<Response<T>> {
        const fetchFunction = this.options.fetch ?? fetch;
        const rawResponse = await fetchFunction(url.toString(), requestInit);

        const responseHeaders: Record<string, string> = {};
        rawResponse.headers.forEach((v, k) => (responseHeaders[k] = v));

        const responseType = config.responseType ?? 'json';
        let data: any;

        if (responseType === 'json') {
            const text = await rawResponse.text();
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = text;
            }
        } else if (
            responseType in rawResponse &&
            typeof (rawResponse as any)[responseType] === 'function'
        ) {
            data = await (rawResponse as any)[responseType]();
        } else {
            data = await rawResponse.text();
        }

        const response: Response<T> = {
            headers: responseHeaders,
            statusCode: rawResponse.status,
            statusText: rawResponse.statusText,
            data,
        };

        const validateStatus =
            config.validateStatus ??
            this.options.validateStatus ??
            ((status: number) => status < 400);

        if (!validateStatus(response.statusCode)) {
            throw new Exception(
                `Request failed with status code: ${response.statusCode}`,
                response,
                'ERR_BAD_RESPONSE'
            );
        }

        return response;
    }
}
