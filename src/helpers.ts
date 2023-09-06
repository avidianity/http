import { Exception } from './exception';

export function mergeObjects<T extends object[]>(...objects: T): T[0] {
    return Object.assign({}, ...objects);
}

export function isException<T>(error: unknown): error is Exception {
    return error instanceof Exception;
}

export function makeBody(body: unknown) {
    if (
        body instanceof Blob ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof ReadableStream
    ) {
        return body;
    }

    if (typeof body === 'string') {
        return body;
    }

    return JSON.stringify(body);
}

export function parseUrl(configUrl: string, baseUrl?: string): string {
    try {
        // Check if configUrl is a valid absolute URL
        new URL(configUrl);
        return configUrl;
    } catch (_) {
        // If baseUrl is not provided or if it's invalid, return configUrl as it is
        if (!baseUrl) return configUrl;

        // Ensure the baseUrl ends with '/' and the configUrl doesn't start with '/'
        const sanitizedBaseUrl = baseUrl.endsWith('/')
            ? baseUrl
            : baseUrl + '/';
        const sanitizedConfigUrl = configUrl.startsWith('/')
            ? configUrl.slice(1)
            : configUrl;

        return sanitizedBaseUrl + sanitizedConfigUrl;
    }
}
