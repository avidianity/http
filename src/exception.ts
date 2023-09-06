import { Response } from './types';

export class Exception extends Error {
    constructor(public readonly response: Response<any>) {
        super(`Request failed with status code: ${response.statusCode}`);
    }
}
