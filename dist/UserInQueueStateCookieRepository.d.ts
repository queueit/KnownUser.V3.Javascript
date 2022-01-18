import { IConnectorContextProvider } from './ConnectorContextProvider';
export declare enum CookieValidationResult {
    NotFound = 0,
    Expired = 1,
    WaitingRoomMismatch = 2,
    HashMismatch = 3,
    Error = 4,
    Valid = 5,
    IpBindingMismatch = 6
}
export declare class QueueItAcceptedCookie {
    storedHash: string;
    issueTimeString: string;
    queueId: string;
    eventIdFromCookie: string;
    redirectType: string;
    fixedCookieValidityMinutes: string;
    isCookieHttpOnly: boolean;
    isCookieSecure: boolean;
    hashedIp: string;
    constructor(storedHash: string, issueTimeString: string, queueId: string, eventIdFromCookie: string, redirectType: string, fixedCookieValidityMinutes: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, hashedIp: string);
    static readonly HashKey = "Hash";
    static readonly IssueTimeKey = "IssueTime";
    static readonly QueueIdKey = "QueueId";
    static readonly EventIdKey = "EventId";
    static readonly RedirectTypeKey = "RedirectType";
    static readonly FixedCookieValidityMinutesKey = "FixedValidityMins";
    static readonly IsCookieHttpOnly = "IsCookieHttpOnly";
    static readonly IsCookieSecure = "IsCookieSecure";
    static readonly HashedIpKey = "Hip";
    static fromCookieHeader(cookieHeaderValue: any): QueueItAcceptedCookie;
}
export declare class UserInQueueStateCookieRepository {
    private contextProvider;
    private static readonly _QueueITDataKey;
    constructor(contextProvider: IConnectorContextProvider);
    static getCookieKey(eventId: string): string;
    store(eventId: string, queueId: string, fixedCookieValidityMinutes: number | null, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, redirectType: string, hashedIp: string | null, secretKey: string): void;
    private createCookie;
    getState(eventId: string, cookieValidityMinutes: number, secretKey: string, validateTime: boolean): StateInfo;
    private isCookieValid;
    cancelQueueCookie(eventId: string, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean): void;
    reissueQueueCookie(eventId: string, cookieValidityMinutes: number, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, secretKey: string): void;
    private generateHash;
}
export declare class StateInfo {
    queueId: string;
    fixedCookieValidityMinutes: number | null;
    redirectType: string;
    hashedIp: string | null;
    cookieValidationResult: CookieValidationResult;
    cookie: QueueItAcceptedCookie;
    clientIp: string | null;
    constructor(queueId: string, fixedCookieValidityMinutes: number | null, redirectType: string, hashedIp: string | null, cookieValidationResult: CookieValidationResult, cookie: QueueItAcceptedCookie, clientIp: string | null);
    get isValid(): boolean;
    get isFound(): boolean;
    get isBoundToAnotherIp(): boolean;
    isStateExtendable(): boolean;
    getInvalidCookieReason(): string;
}
