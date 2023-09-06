import { Exception } from './exception';
import { makeBody, mergeObjects, parseUrl } from './helpers';
import { HttpOptions, Method, Options, RequestConfig, Response } from './types';

export class Http {
    constructor(public readonly options: HttpOptions = {}) {
        //
    }

    public get<T = any>(url: string, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'GET',
            headers: options?.headers,
            params: options?.params,
            responseType: options?.responseType,
        });
    }

    public post<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'POST',
            data,
            headers: options?.headers,
            params: options?.params,
            responseType: options?.responseType,
        });
    }

    public put<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'PUT',
            data,
            headers: options?.headers,
            params: options?.params,
            responseType: options?.responseType,
        });
    }

    public patch<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'PATCH',
            data,
            headers: options?.headers,
            params: options?.params,
            responseType: options?.responseType,
        });
    }

    public delete<T = any>(url: string, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'DELETE',
            headers: options?.headers,
            params: options?.params,
            responseType: options?.responseType,
        });
    }

    protected async makeRequest<T = any>(config: RequestConfig<T>) {
        const baseUrl = parseUrl(config.url, this.options.baseUrl);

        if (!baseUrl) {
            throw new Error('Missing url');
        }

        const url = new URL(baseUrl);

        const params = mergeObjects(
            config.params ?? {},
            this.options.params ?? {}
        );

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(
                key,
                typeof value === 'string' ? value : value.toString()
            );
        }

        const defaultHeaders = this.options.headers ?? {};
        const headers = {
            ...defaultHeaders,
            ...config.headers,
        };

        try {
            let method: Method = config.method;

            if (
                ['PUT', 'PATCH'].includes(method) &&
                this.options.emulatePutPatch
            ) {
                const methodKey = this.options.emulateMethodKey ?? '_method';
                const methodValue = this.options.emulateMethodValue ?? method;
                const emulateMethod = this.options.emulateMethod ?? 'POST';

                if (emulateMethod === 'POST') {
                    const extra = {
                        [methodKey]: methodValue,
                    };

                    if (config.data) {
                        config.data = {
                            ...config.data,
                            ...extra,
                        };
                    } else {
                        config.data = extra as T;
                    }
                } else {
                    url.searchParams.set(methodKey, methodValue);

                    if (config.data) {
                        for (const [key, value] of Object.entries(
                            config.data
                        )) {
                            url.searchParams.set(key, `${value}`);
                        }

                        delete config.data;
                    }
                }

                method = emulateMethod;
            }

            const fetchFunction = this.options.fetch ?? fetch;

            const response = await fetchFunction(url.toString(), {
                method,
                headers,
                body: (config.data
                    ? makeBody(config.data)
                    : config.data) as any,
            });

            const responseHeaders: Record<string, string> = {};
            response.headers.forEach(
                (value, key) => (responseHeaders[key] = value)
            );

            const responseType = config.responseType ?? 'json';

            let data: any = null;

            if (responseType === 'json') {
                const json = await response.text();
                try {
                    data = JSON.parse(json);
                } catch (_) {
                    data = json;
                }
            } else {
                data = await response[responseType]();
            }

            const payload: Response<T> = {
                headers: responseHeaders,
                statusCode: response.status,
                data,
            };

            if (response.status >= 400) {
                throw new Exception(payload);
            }

            return payload;
        } catch (error) {
            if (error instanceof Exception) {
                throw error;
            }

            throw new Error('Network error', {
                cause: error,
            });
        }
    }
}
