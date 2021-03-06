import { RequestValidationResult } from './Models';
export declare class Utils {
    static encodeUrl(url: string): string;
    static decodeUrl(url: string): string;
    static generateSHA256Hash(secretKey: string, stringToHash: string): string;
    static endsWith(str: string, search: string): boolean;
    static getCurrentTime(): number;
}
export declare class QueueUrlParams {
    timeStamp: number;
    eventId: string;
    hashCode: string;
    extendableCookie: boolean;
    cookieValidityMinutes: number | null;
    queueITToken: string;
    queueITTokenWithoutHash: string;
    queueId: string;
    redirectType: string;
}
export declare class QueueParameterHelper {
    static readonly TimeStampKey = "ts";
    static readonly ExtendableCookieKey = "ce";
    static readonly CookieValidityMinutesKey = "cv";
    static readonly HashKey = "h";
    static readonly EventIdKey = "e";
    static readonly QueueIdKey = "q";
    static readonly RedirectTypeKey = "rt";
    static readonly KeyValueSeparatorChar = "_";
    static readonly KeyValueSeparatorGroupChar = "~";
    static extractQueueParams(queueitToken: string): QueueUrlParams;
}
export declare class CookieHelper {
    static toMapFromValue(cookieValue: string): {};
    static toValueFromKeyValueCollection(cookieValues: Array<{
        key: string;
        value: string;
    }>): string;
}
export declare class ConnectorDiagnostics {
    isEnabled: boolean;
    hasError: boolean;
    validationResult: RequestValidationResult;
    private setStateWithTokenError;
    private setStateWithSetupError;
    static verify(customerId: string, secretKey: string, queueitToken: string): ConnectorDiagnostics;
}
