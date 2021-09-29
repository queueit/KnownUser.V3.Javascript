import { IHttpContextProvider } from './HttpContextProvider';
export declare class UserInQueueStateCookieRepository {
    private httpContextProvider;
    private static readonly _QueueITDataKey;
    private static readonly _HashKey;
    private static readonly _IssueTimeKey;
    private static readonly _QueueIdKey;
    private static readonly _EventIdKey;
    private static readonly _RedirectTypeKey;
    private static readonly _FixedCookieValidityMinutesKey;
    private static readonly _IsCookieHttpOnly;
    private static readonly _IsCookieSecure;
    private static readonly _CookieSameSiteValue;
    constructor(httpContextProvider: IHttpContextProvider);
    static getCookieKey(eventId: string): string;
    store(eventId: string, queueId: string, fixedCookieValidityMinutes: number | null, cookieDomain: string, isHttpOnly: boolean, isSecure: boolean, sameSiteValue: string, redirectType: string, secretKey: string): void;
    private createCookie;
    getState(eventId: string, cookieValidityMinutes: number, secretKey: string, validateTime: boolean): StateInfo;
    private isCookieValid;
    cancelQueueCookie(eventId: string, cookieDomain: string, isCookieHttpOnly: boolean, isSecure: boolean, sameSiteValue: string): void;
    reissueQueueCookie(eventId: string, cookieValidityMinutes: number, cookieDomain: string, secretKey: string): void;
    private generateHash;
}
export declare class StateInfo {
    isFound: any;
    isValid: boolean;
    queueId: string;
    fixedCookieValidityMinutes: number | null;
    redirectType: string;
    constructor(isFound: any, isValid: boolean, queueId: string, fixedCookieValidityMinutes: number | null, redirectType: string);
    isStateExtendable(): boolean;
}
