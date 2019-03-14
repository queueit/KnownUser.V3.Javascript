namespace QueueIT.KnownUserV3.SDK {
    export interface IHttpRequest {
        getUserAgent(): string;
        getHeader(name: string): string;
        getAbsoluteUri(): string;
        getUserHostAddress(): string;
        getCookieValue(cookieKey: string): string;
        getRequestBodyAsString(): string;
    }

    export interface IHttpResponse {
        setCookie(cookieName: string, cookieValue: string, domain: string, expiration);
    }

    export interface IHttpContextProvider {
        getHttpRequest(): IHttpRequest;
        getHttpResponse(): IHttpResponse;
    }
}