import { Http } from '../src/index';
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
});
