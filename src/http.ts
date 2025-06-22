import { Exception } from './exception';
import { makeBody, mergeObjects, normalizeHeaders, parseUrl } from './helpers';
import {
    HttpOptions,
    Options,
    RequestConfig,
    Response,
    Interceptor,
} from './types';

export class Http {
    private requestInterceptors: Interceptor<RequestInit>[] = [];
    private responseInterceptors: Interceptor<Response<any>>[] = [];

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

    public addResponseInterceptor<T = any>(fn: Interceptor<Response<T>>) {
        this.responseInterceptors.push(fn);
        return () => {
            const i = this.responseInterceptors.indexOf(fn);
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
        const baseUrl = parseUrl(config.url, this.options.baseUrl);
        if (!baseUrl) throw new Error('Missing url');

        const url = new URL(baseUrl);

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
                const extra = { [key]: val };
                config.data = (
                    config.data ? { ...config.data, ...extra } : extra
                ) as any;
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

        let response: Response<T> = {
            headers: responseHeaders,
            statusCode: rawResponse.status,
            data,
        };

        for (const interceptor of this.responseInterceptors) {
            response = await interceptor(response);
        }

        if (response.statusCode >= 400) {
            throw new Exception(response);
        }

        return response;
    }
}
