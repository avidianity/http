import { Exception } from './exception';

export function mergeObjects<T extends object[]>(...objects: T): T[0] {
    return Object.assign({}, ...objects);
}

export function normalizeHeaders(input?: HeadersInit): Record<string, string> {
    const normalized: Record<string, string> = {};
    if (input instanceof Headers) {
        input.forEach((value, key) => {
            normalized[key.toLowerCase()] = value;
        });
    } else if (Array.isArray(input)) {
        for (const [key, value] of input) {
            normalized[key.toLowerCase()] = value;
        }
    } else if (input && typeof input === 'object') {
        for (const key of Object.keys(input)) {
            normalized[key.toLowerCase()] = (input as any)[key];
        }
    }
    return normalized;
}

export function isException(error: unknown): error is Exception {
    return error instanceof Exception;
}

export function makeBody(body: unknown) {
    if (
        body instanceof Blob ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof ReadableStream
    ) {
        return {
            body,
        };
    }

    if (typeof body === 'string') {
        try {
            JSON.parse(body);
            return {
                body,
                type: 'application/json',
            };
        } catch {
            return {
                body,
                type: 'text/plain',
            };
        }
    }

    if (typeof body === 'object' && body !== null) {
        return {
            body: JSON.stringify(body),
            type: 'application/json',
        };
    }

    return {
        body: String(body),
        type: 'text/plain',
    };
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
