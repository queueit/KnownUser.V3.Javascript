export interface IHttpRequest {
    getUserAgent(): string;

    getHeader(name: string): string;

    getAbsoluteUri(): string;

    getUserHostAddress(): string;

    getCookieValue(cookieKey: string): string;

    getRequestBodyAsString(): string;
}

export interface IHttpResponse {
    setCookie(
        cookieName: string,
        cookieValue: string,
        domain: string,
        expiration: number,
        isHttpOnly: boolean,
        isSecure: boolean);
}

export interface IConnectorContextProvider {
    getHttpRequest(): IHttpRequest;

    getHttpResponse(): IHttpResponse;

    getCryptoProvider(): ICryptoProvider;

    getEnqueueTokenProvider(): IEnqueueTokenProvider | null;
}

export interface ICryptoProvider {
    getSha256Hash(secretKey: string, plaintext: string);
}

export interface IEnqueueTokenProvider {
    getEnqueueToken(waitingRoomId: string);
}