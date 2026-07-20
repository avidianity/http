import { Http, isException, Exception } from '../src/index';
import { resolveUrl, makeBody } from '../src/helpers';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Fetch } from '../src/types';

enableFetchMocks();

describe('Http', () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    it('should make a GET request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: '12345' }));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });
        const response = await http.get('https://example.com/api/test');

        expect(response.data).toEqual({ data: '12345' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/test',
            expect.objectContaining({
                method: 'GET',
            })
        );
    });

    it('should throw exception for 4xx/5xx responses', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
        });

        const http = new Http({
            fetch: fetchMock as Fetch,
        });

        await expect(
            http.get('https://example.com/api/test')
        ).rejects.toMatchObject({
            response: { statusCode: 404 },
        });
    });

    it('should make a POST request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'created' }));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });
        const dataToSend = { key: 'value' };
        const response = await http.post(
            'https://example.com/api/create',
            dataToSend
        );

        expect(response.data).toEqual({ data: 'created' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/create',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(dataToSend),
            })
        );
    });

    it('should make a PUT request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'updated' }));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });
        const dataToUpdate = { key: 'new-value' };
        const response = await http.put(
            'https://example.com/api/update',
            dataToUpdate
        );

        expect(response.data).toEqual({ data: 'updated' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/update',
            expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(dataToUpdate),
            })
        );
    });

    it('should emulate PUT with POST', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'updated' }));

        const http = new Http({
            emulatePutPatch: true,
            fetch: fetchMock as Fetch,
        });
        const dataToUpdate = { key: 'new-value' };
        const response = await http.put(
            'https://example.com/api/update',
            dataToUpdate
        );

        expect(response.data).toEqual({ data: 'updated' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/update',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    ...dataToUpdate,
                    _method: 'PUT',
                }),
            })
        );
    });

    it('should preserve FormData entries when emulating PUT', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'updated' }));

        const http = new Http({
            emulatePutPatch: true,
            fetch: fetchMock as Fetch,
        });

        const formData = new FormData();
        formData.append('name', 'Bob');

        await http.put('https://example.com/api/update', formData);

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);

        const sent = init?.body as FormData;
        expect(sent.get('name')).toBe('Bob');
        expect(sent.get('_method')).toBe('PUT');
    });

    it('should preserve URLSearchParams entries when emulating PATCH', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'updated' }));

        const http = new Http({
            emulatePutPatch: true,
            fetch: fetchMock as Fetch,
        });

        const params = new URLSearchParams();
        params.append('name', 'Bob');

        await http.patch('https://example.com/api/update', params);

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(URLSearchParams);

        const sent = init?.body as URLSearchParams;
        expect(sent.get('name')).toBe('Bob');
        expect(sent.get('_method')).toBe('PATCH');
    });

    it('should put emulated method in query for non-mergeable bodies', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'updated' }));

        const http = new Http({
            emulatePutPatch: true,
            fetch: fetchMock as Fetch,
        });

        const blob = new Blob(['raw'], { type: 'application/octet-stream' });

        await http.put('https://example.com/api/update', blob);

        const [url, init] = fetchMock.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBe(blob);
        expect(String(url)).toContain('_method=PUT');
    });

    it('should make a DELETE request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'deleted' }));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });
        const response = await http.delete('https://example.com/api/delete');

        expect(response.data).toEqual({ data: 'deleted' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/delete',
            expect.objectContaining({
                method: 'DELETE',
            })
        );
    });

    it('should send headers', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'with headers' }));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });
        const headers = { authorization: 'Bearer token' };
        const response = await http.get('https://example.com/api/headers', {
            headers,
        });

        expect(response.data).toEqual({ data: 'with headers' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/headers',
            expect.objectContaining({
                method: 'GET',
                headers: headers,
            })
        );
    });

    it('should handle 201 status code', async () => {
        fetchMock.mockResponseOnce('', { status: 201 });

        const http = new Http({
            fetch: fetchMock as Fetch,
        });

        const response = await http.get('https://example.com/api/create');

        expect(response.statusCode).toBe(201);
    });

    it('should send default headers', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: 'default headers' }));

        const defaultHeaders = { 'x-custom-header': 'CustomValue' };
        const customHttp = new Http({
            fetch: fetchMock as Fetch,
            headers: defaultHeaders,
        });

        await customHttp.get('https://example.com/api/defaultHeaders');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/defaultHeaders',
            expect.objectContaining({
                method: 'GET',
                headers: defaultHeaders,
            })
        );
    });

    it('should handle fetch failures', async () => {
        fetchMock.mockRejectOnce(new Error('Network error'));

        const http = new Http({
            fetch: fetchMock as Fetch,
        });

        await expect(http.get('https://example.com/api/fail')).rejects.toThrow(
            'Network error'
        );
    });

    it('should abort the request when signal is aborted', async () => {
        fetchMock.mockImplementation((_input, init) => {
            return new Promise((_resolve, reject) => {
                if (init && init.signal) {
                    init.signal.addEventListener('abort', () => {
                        const abortError = new Error('Aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }
            });
        });

        const http = new Http({
            fetch: fetchMock as Fetch,
        });

        const controller = new AbortController();

        const promise = http.get('https://example.com/api/abort', {
            signal: controller.signal,
        });

        controller.abort();

        await expect(promise).rejects.toThrow(/aborted|AbortError/i);
    });

    it('should set the headers correctly', async () => {
        fetchMock.mockResponse(async (request) => {
            const headersArray = Array.from(request.headers.entries());
            return {
                body: JSON.stringify(headersArray),
                headers: {
                    'content-type': 'application/json',
                },
            };
        });

        const headers = {
            'X-Test-Header': 'TestValue',
            Authorization: 'Bearer token',
        };

        const http = new Http({
            fetch: fetchMock as Fetch,
            headers,
        });

        const response = await http.get('https://example.com/api/headers');

        // Convert headers back to object for easier comparison
        const receivedHeaders: [string, string][] = response.data;
        const headersObject = Object.fromEntries(receivedHeaders);

        expect(headersObject['x-test-header']).toBe('TestValue');
        expect(headersObject['authorization']).toBe('Bearer token');
    });

    it('should set the headers correctly using Headers class', async () => {
        fetchMock.mockResponse(async (request) => {
            const headersArray = Array.from(request.headers.entries());
            return {
                body: JSON.stringify(headersArray),
                headers: {
                    'content-type': 'application/json',
                },
            };
        });

        const headers = new Headers();
        headers.append('X-Test-Header', 'TestValue');
        headers.append('Authorization', 'Bearer token');

        const http = new Http({
            fetch: fetchMock as Fetch,
        });

        const response = await http.get('https://example.com/api/headers', {
            headers,
        });

        // Convert headers back to object for easier comparison
        const receivedHeaders: [string, string][] = response.data;
        const headersObject = Object.fromEntries(receivedHeaders);

        expect(headersObject['x-test-header']).toBe('TestValue');
        expect(headersObject['authorization']).toBe('Bearer token');
    });

    it('should apply request interceptor to modify headers', async () => {
        fetchMock.mockResponse(async (req) => {
            const headers = Array.from(req.headers.entries());
            return {
                body: JSON.stringify(headers),
                headers: { 'content-type': 'application/json' },
            };
        });

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addRequestInterceptor(async (req) => {
            if (req.headers instanceof Headers) {
                req.headers.set('X-Intercepted', 'true');
            } else {
                req.headers = {
                    ...(req.headers || {}),
                    'X-Intercepted': 'true',
                };
            }
            return req;
        });

        const res = await http.get('https://example.com/api/intercept');

        const headers = Object.fromEntries(res.data);
        expect(headers['x-intercepted']).toBe('true');
    });

    it('should apply response interceptor to transform response data', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ message: 'original' }));

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addResponseInterceptor((res) => {
            res.data.message = 'intercepted';
            return res;
        });

        const res = await http.get('https://example.com/api/intercept');

        expect(res.data.message).toBe('intercepted');
    });

    it('should apply multiple interceptors in order', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ val: 1 }));

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addResponseInterceptor((res) => {
            res.data.val += 1;
            return res;
        });

        http.addResponseInterceptor((res) => {
            res.data.val *= 10;
            return res;
        });

        const res = await http.get('https://example.com/api/intercept');

        // (1 + 1) * 10 = 20
        expect(res.data.val).toBe(20);
    });

    it('should support async request interceptor', async () => {
        fetchMock.mockResponse(async (req) => {
            const headers = Array.from(req.headers.entries());
            return {
                body: JSON.stringify(headers),
                headers: { 'content-type': 'application/json' },
            };
        });

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addRequestInterceptor(async (req) => {
            await new Promise((r) => setTimeout(r, 50));
            req.headers = {
                ...(req.headers || {}),
                'X-Async': 'yes',
            };
            return req;
        });

        const res = await http.get('https://example.com/api/intercept');

        const headers = Object.fromEntries(res.data);
        expect(headers['x-async']).toBe('yes');
    });

    it('should propagate errors from request interceptors', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addRequestInterceptor(() => {
            throw new Error('Interceptor failure');
        });

        await expect(
            http.get('https://example.com/api/intercept')
        ).rejects.toThrow('Interceptor failure');
    });

    it('should not run fulfilled interceptors for error responses', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ error: 'oops' }), {
            status: 500,
        });

        const http = new Http({ fetch: fetchMock as Fetch });

        const onFulfilled = jest.fn((res) => res);
        http.addResponseInterceptor(onFulfilled);

        await expect(http.get('https://example.com/api/x')).rejects.toThrow();
        expect(onFulfilled).not.toHaveBeenCalled();
    });

    it('should run error interceptors for error responses', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ error: 'oops' }), {
            status: 500,
        });

        const http = new Http({ fetch: fetchMock as Fetch });

        const seen: unknown[] = [];
        http.addResponseInterceptor(null, (error) => {
            seen.push(error);
            throw error;
        });

        await expect(http.get('https://example.com/api/x')).rejects.toThrow(
            'Request failed with status code: 500'
        );

        expect(seen).toHaveLength(1);
        expect(isException(seen[0])).toBe(true);
        expect((seen[0] as Exception).code).toBe('ERR_BAD_RESPONSE');
        expect((seen[0] as Exception).name).toBe('Exception');
    });

    it('should allow error interceptors to recover', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ error: 'oops' }), {
            status: 404,
        });

        const http = new Http({ fetch: fetchMock as Fetch });

        http.addResponseInterceptor(null, () => ({
            headers: {},
            statusCode: 200,
            statusText: 'OK',
            data: { fallback: true },
        }));

        // an interceptor added after a recovery sees the recovered response
        const after = jest.fn((res) => res);
        http.addResponseInterceptor(after);

        const res = await http.get('https://example.com/api/x');

        expect(res.data).toEqual({ fallback: true });
        expect(after).toHaveBeenCalledTimes(1);
    });

    it('should route network errors through error interceptors', async () => {
        fetchMock.mockRejectOnce(new Error('Network error'));

        const http = new Http({ fetch: fetchMock as Fetch });

        const onRejected = jest.fn((error) => {
            throw error;
        });
        http.addResponseInterceptor(null, onRejected);

        await expect(http.get('https://example.com/api/x')).rejects.toThrow(
            'Network error'
        );
        expect(onRejected).toHaveBeenCalledTimes(1);
    });

    it('should respect a custom validateStatus', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ missing: true }), {
            status: 404,
        });

        const http = new Http({
            fetch: fetchMock as Fetch,
            validateStatus: (status) => status < 500,
        });

        const res = await http.get('https://example.com/api/x');

        expect(res.statusCode).toBe(404);
        expect(res.data).toEqual({ missing: true });
    });

    it('should resolve relative urls against a baseUrl', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        const http = new Http({
            baseUrl: 'https://example.com/api',
            fetch: fetchMock as Fetch,
        });

        await http.get('/users');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/users',
            expect.anything()
        );
    });

    it('should resolve relative urls against location when no baseUrl', async () => {
        // jsdom serves tests from http://localhost/
        fetchMock.mockResponseOnce(JSON.stringify({}));

        const http = new Http({ fetch: fetchMock as Fetch });

        await http.get('/api/users');

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost/api/users',
            expect.anything()
        );
    });

    it('should throw a descriptive error for unresolvable urls', () => {
        expect(() => resolveUrl('/api/users')).toThrow(
            /relative url.*baseUrl/i
        );
    });

    describe('timeout', () => {
        const hangingFetch = () =>
            fetchMock.mockImplementation((_input, init) => {
                return new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        const abortError = new Error('Aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                });
            });

        it('should reject with ETIMEDOUT when timeout elapses', async () => {
            hangingFetch();

            const http = new Http({ fetch: fetchMock as Fetch });

            const promise = http.get('https://example.com/api/slow', {
                timeout: 30,
            });

            await expect(promise).rejects.toMatchObject({
                name: 'Exception',
                code: 'ETIMEDOUT',
            });
        });

        it('should support timeout as an instance default', async () => {
            hangingFetch();

            const http = new Http({ fetch: fetchMock as Fetch, timeout: 30 });

            await expect(
                http.get('https://example.com/api/slow')
            ).rejects.toMatchObject({ code: 'ETIMEDOUT' });
        });

        it('should keep user aborts distinct from timeouts', async () => {
            hangingFetch();

            const http = new Http({ fetch: fetchMock as Fetch });
            const controller = new AbortController();

            const promise = http.get('https://example.com/api/slow', {
                timeout: 5000,
                signal: controller.signal,
            });

            controller.abort();

            await expect(promise).rejects.toThrow(/aborted/i);
            await expect(promise).rejects.not.toMatchObject({
                code: 'ETIMEDOUT',
            });
        });

        it('should not time out fast requests', async () => {
            fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));

            const http = new Http({ fetch: fetchMock as Fetch, timeout: 5000 });

            const res = await http.get('https://example.com/api/fast');

            expect(res.data).toEqual({ ok: true });
        });
    });

    describe('body content-type detection', () => {
        it('labels JSON object/array strings as application/json', () => {
            expect(makeBody('{"a":1}').type).toBe('application/json');
            expect(makeBody('[1,2]').type).toBe('application/json');
        });

        it('labels scalar-looking strings as text/plain', () => {
            expect(makeBody('123').type).toBe('text/plain');
            expect(makeBody('true').type).toBe('text/plain');
            expect(makeBody('null').type).toBe('text/plain');
            expect(makeBody('hello').type).toBe('text/plain');
        });
    });

    it('should pass fetchOptions through to fetch', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        const http = new Http({
            fetch: fetchMock as Fetch,
            fetchOptions: { credentials: 'include', mode: 'cors' },
        });

        await http.get('https://example.com/api/x', {
            fetchOptions: { mode: 'same-origin' },
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/x',
            expect.objectContaining({
                credentials: 'include',
                // per-request fetchOptions win over instance defaults
                mode: 'same-origin',
                method: 'GET',
            })
        );
    });

    it('should expose a generic request method', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));

        const http = new Http({ fetch: fetchMock as Fetch });

        const res = await http.request({
            url: 'https://example.com/api/x',
            method: 'POST',
            data: { a: 1 },
        });

        expect(res.data).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/x',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ a: 1 }),
            })
        );
    });

    it('should make a HEAD request', async () => {
        fetchMock.mockResponseOnce('');

        const http = new Http({ fetch: fetchMock as Fetch });

        await http.head('https://example.com/api/x');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/x',
            expect.objectContaining({ method: 'HEAD' })
        );
    });

    it('should send a body with DELETE when data is provided', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        const http = new Http({ fetch: fetchMock as Fetch });

        await http.delete('https://example.com/api/x', {
            data: { reason: 'cleanup' },
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.com/api/x',
            expect.objectContaining({
                method: 'DELETE',
                body: JSON.stringify({ reason: 'cleanup' }),
            })
        );
    });
});
