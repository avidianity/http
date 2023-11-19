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
        const headers = { Authorization: 'Bearer token' };
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

        const defaultHeaders = { 'X-Custom-Header': 'CustomValue' };
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
});
