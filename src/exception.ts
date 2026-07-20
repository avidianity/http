import { Response } from './types.js';

export type ExceptionCode = 'ERR_BAD_RESPONSE' | 'ETIMEDOUT' | (string & {});

export class Exception extends Error {
    public override readonly name: string = 'Exception';

    constructor(
        message: string,
        public readonly response?: Response<any>,
        public readonly code?: ExceptionCode
    ) {
        super(message);
    }
}
