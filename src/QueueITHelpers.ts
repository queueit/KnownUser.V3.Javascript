import {MissingSha256ImplementationException, RequestValidationResult} from './Models';
import {IConnectorContextProvider, ICryptoProvider} from "./ConnectorContextProvider";

export enum ErrorCode {
    Hash = "hash",
    Timestamp = "timestamp",
    CookieSessionState = "connector/sessionstate"
}

export class Utils {
    static encodeUrl(url: string) {
        if (!url)
            return "";

        return encodeURIComponent(url).replace(/[!'()*]/g, function (c) {
            // More stringent in adhering to RFC 3986 (which reserves!, ', (, ), and *)
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
            return '%' + c.charCodeAt(0).toString(16);
        });
    }

    static decodeUrl(url: string) {
        return decodeURIComponent(url);
    }

    static generateSHA256Hash(secretKey: string, stringToHash: string, context?: IConnectorContextProvider): string {
        let cryptoProvider: ICryptoProvider;
        if (context && context.getCryptoProvider && (cryptoProvider = context.getCryptoProvider())) {
            return cryptoProvider.getSha256Hash(secretKey, stringToHash);
        }
        throw MissingSha256ImplementationException;
    }

    static endsWith(str: string, search: string): boolean {
        if (str === search)
            return true;
        if (!str || !search)
            return false;
        return str.substring(str.length - search.length, str.length) === search;
    }

    static getCurrentTime(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    static bin2hex(s: string): string {

        var i: number;
        var l: number;
        var o: string = '';
        var n: string;

        s += '';

        for (i = 0, l = s.length; i < l; i++) {
            n = s.charCodeAt(i)
                .toString(16)
            o += n.length < 2 ? '0' + n : n
        }

        return o;
    }
}

export class QueueUrlParams {
    public timeStamp: number = 0;
    public eventId: string;
    public hashCode: string;
    public extendableCookie: boolean = false;
    public cookieValidityMinutes: number | null;
    public queueITToken: string;
    public queueITTokenWithoutHash: string;
    public queueId: string;
    public redirectType: string;
    public hashedIp: string;
}

export class QueueParameterHelper {
    public static readonly TimeStampKey = "ts";
    public static readonly ExtendableCookieKey = "ce";
    public static readonly CookieValidityMinutesKey = "cv";
    public static readonly HashKey = "h";
    public static readonly EventIdKey = "e";
    public static readonly QueueIdKey = "q";
    public static readonly RedirectTypeKey = "rt";
    public static readonly HashedIPKey = 'hip';
    public static readonly KeyValueSeparatorChar = '_';
    public static readonly KeyValueSeparatorGroupChar = '~';

    public static extractQueueParams(queueitToken: string): QueueUrlParams {
        if (!queueitToken) {
            return null;
        }

        const result = new QueueUrlParams();
        result.queueITToken = queueitToken;

        const paramList = result.queueITToken.split(QueueParameterHelper.KeyValueSeparatorGroupChar);
        for (let paramKeyValue of paramList) {
            let keyValueArr = paramKeyValue.split(QueueParameterHelper.KeyValueSeparatorChar);

            if (keyValueArr.length !== 2) {
                continue;
            }

            switch (keyValueArr[0]) {
                case QueueParameterHelper.HashKey:
                    result.hashCode = keyValueArr[1] || "";
                    break;
                case QueueParameterHelper.TimeStampKey: {
                    result.timeStamp = parseInt(keyValueArr[1]);
                    if (!result.timeStamp) {
                        result.timeStamp = 0;
                    }
                    break;
                }
                case QueueParameterHelper.CookieValidityMinutesKey: {
                    result.cookieValidityMinutes = parseInt(keyValueArr[1]);
                    if (!result.cookieValidityMinutes) {
                        result.cookieValidityMinutes = null;
                    }
                    break;
                }
                case QueueParameterHelper.EventIdKey:
                    result.eventId = keyValueArr[1] || "";
                    break;
                case QueueParameterHelper.ExtendableCookieKey: {
                    let extendCookie = (keyValueArr[1] || "false").toLowerCase();
                    result.extendableCookie = extendCookie === "true";
                    break;
                }
                case QueueParameterHelper.QueueIdKey:
                    result.queueId = keyValueArr[1] || "";
                    break;
                case QueueParameterHelper.RedirectTypeKey:
                    result.redirectType = keyValueArr[1] || "";
                    break;
                case QueueParameterHelper.HashedIPKey:
                    result.hashedIp = keyValueArr[1] || "";
                    break;
            }
        }

        const hashWithPrefix = `${QueueParameterHelper.KeyValueSeparatorGroupChar}${QueueParameterHelper.HashKey}${QueueParameterHelper.KeyValueSeparatorChar}${result.hashCode}`;
        result.queueITTokenWithoutHash = result.queueITToken.replace(hashWithPrefix, "");
        return result;
    }
}

export class CookieHelper {
    public static toMapFromValue(cookieValue: string): object {
        try {
            let result = {};
            const items = cookieValue.split('&');
            for (let item of items) {
                let keyValue = item.split('=');
                result[keyValue[0]] = keyValue[1];
            }
            return result;
        } catch {
            return {};
        }
    }

    public static toValueFromKeyValueCollection(cookieValues: Array<{ key: string, value: string }>) {
        let values = new Array<string>();

        for (let keyVal of cookieValues) {
            values.push(`${keyVal.key}=${keyVal.value}`);
        }

        return values.join("&");
    }
}

export class ConnectorDiagnostics {
    public isEnabled: boolean = false;
    public hasError: boolean = false;
    public validationResult: RequestValidationResult

    private setStateWithTokenError(customerId: string, errorCode: string) {
        this.hasError = true;
        var redirectUrl = `https://${customerId}.api2.queue-it.net/${customerId}/diagnostics/connector/error/?code=${errorCode}`;
        this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", null, null, redirectUrl, null, null)
    }

    private setStateWithSetupError() {
        this.hasError = true;
        this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", null, null,
            "https://api2.queue-it.net/diagnostics/connector/error/?code=setup", null, null)
    }

    public static verify(customerId: string, secretKey: string, queueitToken: string, context: IConnectorContextProvider): ConnectorDiagnostics {
        const diagnostics = new ConnectorDiagnostics();
        const qParams = QueueParameterHelper.extractQueueParams(queueitToken);

        if (qParams == null)
            return diagnostics;

        if (qParams.redirectType == null)
            return diagnostics;

        if (qParams.redirectType !== "debug")
            return diagnostics;

        if (!(customerId && secretKey)) {
            diagnostics.setStateWithSetupError();
            return diagnostics;
        }

        if (Utils.generateSHA256Hash(secretKey, qParams.queueITTokenWithoutHash, context) != qParams.hashCode) {
            diagnostics.setStateWithTokenError(customerId, ErrorCode.Hash);
            return diagnostics;
        }

        if (qParams.timeStamp < Utils.getCurrentTime()) {
            diagnostics.setStateWithTokenError(customerId, ErrorCode.Timestamp);
            return diagnostics;
        }

        diagnostics.isEnabled = true;

        return diagnostics;
    }
}

export class InvalidSessionStringBuilder {
    private details: string[];

    constructor() {
        this.details = new Array<string>();
    }

    add(key: string, value: string = null) {
        if (value) {
            this.details.push(`${key}:${value}`);
        } else {
            this.details.push(key);
        }
    }

    toString() {
        return this.details.join(",");
    }
}

export interface QueueSessionValidationResult {
    errorCode: string;

    getInvalidReason(): string;
}

export class SessionValidationResult implements QueueSessionValidationResult {
    constructor(public isValid: boolean,
                public details: { [name: string]: string } = null,
                public errorCode: string = null) {
        this.details = details || {};
    }

    getInvalidReason(): string {
        if (this.isValid) {
            return "";
        }

        const builder = new InvalidSessionStringBuilder();
        for (const resultKey of Object.keys(this.details)) {
            builder.add(resultKey, this.details[resultKey]);
        }
        return builder.toString();
    }

    static newSuccessfulResult(): SessionValidationResult {
        return new SessionValidationResult(true);
    }

    static newFailedResult(errorCode: string): SessionValidationResult {
        return new SessionValidationResult(false, null, errorCode);
    }

    static setIpBindingValidationDetails(hashedIp: string, clientIp: string, resultToModify: SessionValidationResult = null): SessionValidationResult {
        resultToModify = resultToModify ?? new SessionValidationResult(false);
        resultToModify.details["ip"] = "";
        resultToModify.details['cip'] = Utils.bin2hex(clientIp);
        resultToModify.details['hip'] = hashedIp;
        return resultToModify;
    }

    static setHashMismatchDetails(storedHash: string, resultToModify: SessionValidationResult = null): SessionValidationResult {
        resultToModify = resultToModify ?? new SessionValidationResult(false);
        resultToModify.details['hash'] = '';
        resultToModify.details['h'] = storedHash;
        return resultToModify;
    }

    static setExpiredResultDetails(resultToModify: SessionValidationResult = null): SessionValidationResult {
        resultToModify = resultToModify ?? new SessionValidationResult(false);
        resultToModify.details['expired'] = '';
        return resultToModify;
    }

    static setErrorDetails(resultToModify: SessionValidationResult = null): SessionValidationResult {
        resultToModify = resultToModify ?? new SessionValidationResult(false);
        resultToModify.details['error'] = '';
        return resultToModify;
    }
}