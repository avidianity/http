import { Exception } from './exception';
import { makeBody, mergeObjects, parseUrl } from './helpers';
import { HttpOptions, Options, RequestConfig, Response } from './types';

export class Http {
    constructor(public readonly options: HttpOptions = {}) {}

    public get<T = any>(url: string, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'GET',
            ...options,
        });
    }

    public post<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'POST',
            data,
            ...options,
        });
    }

    public put<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'PUT',
            data,
            ...options,
        });
    }

    public patch<T = any>(url: string, data?: any, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'PATCH',
            data,
            ...options,
        });
    }

    public delete<T = any>(url: string, options?: Options) {
        return this.makeRequest<T>({
            url,
            method: 'DELETE',
            ...options,
        });
    }

    protected async makeRequest<T = any>(
        config: RequestConfig<any>
    ): Promise<Response<T>> {
        const baseUrl = parseUrl(config.url, this.options.baseUrl);

        if (!baseUrl) {
            throw new Error('Missing url');
        }

        const url = new URL(baseUrl);

        // Merge params: global first, then request-specific (request overrides global)
        const params = mergeObjects(
            this.options.params ?? {},
            config.params ?? {}
        );

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(
                key,
                typeof value === 'string' ? value : value.toString()
            );
        }

        // Merge headers: global first, then request-specific (request overrides global)
        const headers = mergeObjects(
            this.options.headers ?? {},
            config.headers ?? {}
        );

        try {
            let method = config.method;

            // Emulate PUT/PATCH if needed
            if (
                ['PUT', 'PATCH'].includes(method) &&
                this.options.emulatePutPatch
            ) {
                const methodKey = this.options.emulateMethodKey ?? '_method';
                const methodValue = this.options.emulateMethodValue ?? method;
                const emulateMethod = this.options.emulateMethod ?? 'POST';

                if (emulateMethod === 'POST') {
                    const extra = { [methodKey]: methodValue };
                    config.data = config.data
                        ? { ...config.data, ...extra }
                        : (extra as typeof config.data);
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

            const fetchOptions: RequestInit = {
                method,
                headers,
                body:
                    config.data !== undefined
                        ? makeBody(config.data)
                        : undefined,
                signal: config.signal,
            };

            const response = await fetchFunction(url.toString(), fetchOptions);

            const responseHeaders: Record<string, string> = {};
            response.headers.forEach(
                (value, key) => (responseHeaders[key] = value)
            );

            const responseType = config.responseType ?? 'json';

            let data: any = null;

            if (responseType === 'json') {
                const json = await response.text();
                try {
                    data = json ? JSON.parse(json) : null;
                } catch (_) {
                    data = json;
                }
            } else if (
                responseType in response &&
                typeof (response as any)[responseType] === 'function'
            ) {
                data = await (response as any)[responseType]();
            } else {
                data = await response.text();
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
        } catch (error: any) {
            if (error instanceof Exception) {
                throw error;
            }

            const err = new Error(error?.message || 'Network error');
            if (error?.stack) err.stack = error.stack;
            (err as any).cause = error;
            throw err;
        }
    }
}
