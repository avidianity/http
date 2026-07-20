import { Exception } from './exception';

export function mergeObjects<T extends object[]>(...objects: T): T[0] {
    return Object.assign({}, ...objects);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
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

function isJsonString(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return false;
    }
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
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
        return {
            body,
            type: isJsonString(body) ? 'application/json' : 'text/plain',
        };
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

export function resolveUrl(
    configUrl: string,
    baseUrl?: string,
    locationHref?: string
): URL {
    // Absolute URL: use as-is.
    try {
        return new URL(configUrl);
    } catch {
        // fall through to relative resolution
    }

    if (baseUrl) {
        // Ensure the baseUrl ends with '/' and the configUrl doesn't start
        // with '/', so the base path is preserved when joining.
        const sanitizedBaseUrl = baseUrl.endsWith('/')
            ? baseUrl
            : baseUrl + '/';
        const sanitizedConfigUrl = configUrl.startsWith('/')
            ? configUrl.slice(1)
            : configUrl;

        try {
            return new URL(sanitizedBaseUrl + sanitizedConfigUrl);
        } catch {
            throw new Error(
                `Invalid URL: could not resolve '${configUrl}' against baseUrl '${baseUrl}'`
            );
        }
    }

    if (locationHref) {
        try {
            return new URL(configUrl, locationHref);
        } catch {
            // fall through to the descriptive error below
        }
    }

    throw new Error(
        `Invalid URL: '${configUrl}' is a relative URL but no baseUrl is configured`
    );
}
