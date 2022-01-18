export declare class QueueEventConfig {
    eventId: string;
    layoutName: string;
    culture: string;
    queueDomain: string;
    extendCookieValidity: boolean;
    cookieValidityMinute: number;
    cookieDomain: string;
    isCookieHttpOnly: boolean;
    isCookieSecure: boolean;
    version: number;
    actionName: string;
    constructor(eventId: string, layoutName: string, culture: string, queueDomain: string, extendCookieValidity: boolean, cookieValidityMinute: number, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, version: number, actionName?: string);
    getString(): string;
}
export declare class CancelEventConfig {
    eventId: string;
    queueDomain: string;
    cookieDomain: string;
    isCookieHttpOnly: boolean;
    isCookieSecure: boolean;
    version: number;
    actionName: string;
    constructor(eventId: string, queueDomain: string, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, version: number, actionName?: string);
    getString(): string;
}
export declare class RequestValidationResult {
    actionType: string;
    eventId: string;
    queueId: string;
    redirectUrl: string;
    redirectType: string;
    actionName: string;
    constructor(actionType: string, eventId: string, queueId: string, redirectUrl: string, redirectType: string, actionName: string);
    isAjaxResult: boolean;
    doRedirect(): boolean;
    getAjaxQueueRedirectHeaderKey(): string;
    getAjaxRedirectUrl(): string;
}
export declare class KnownUserException {
    message: any;
    constructor(message: any);
}
export declare const MissingSha256ImplementationException: KnownUserException;
export declare class ActionTypes {
    static readonly QueueAction = "Queue";
    static readonly CancelAction = "Cancel";
    static readonly IgnoreAction = "Ignore";
}
