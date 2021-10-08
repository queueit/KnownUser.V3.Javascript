export interface IHttpRequest {
    getUserAgent(): string;
    getHeader(name: string): string;
    getAbsoluteUri(): string;
    getUserHostAddress(): string;
    getCookieValue(cookieKey: string): string;
    getRequestBodyAsString(): string;
}
export interface IHttpResponse {
    setCookie(cookieName: string, cookieValue: string, domain: string, expiration: number, httpOnly: boolean, isSecure: boolean): any;
}
export interface IHttpContextProvider {
    getHttpRequest(): IHttpRequest;
    getHttpResponse(): IHttpResponse;
}
