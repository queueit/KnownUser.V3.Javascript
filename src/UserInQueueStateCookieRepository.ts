import {IConnectorContextProvider} from './ConnectorContextProvider';
import {
    CookieHelper,
    ErrorCode,
    SessionValidationResult,
    Utils
} from './QueueITHelpers';

export enum CookieValidationResult {
    NotFound,
    Expired,
    WaitingRoomMismatch,
    HashMismatch,
    Error,
    Valid,
    IpBindingMismatch
}

export class QueueItAcceptedCookie {
    constructor(
        public storedHash: string,
        public issueTimeString: string,
        public queueId: string,
        public eventIdFromCookie: string,
        public redirectType: string,
        public fixedCookieValidityMinutes: string,
        public isCookieHttpOnly: boolean,
        public isCookieSecure: boolean,
        public hashedIp: string) {
    }

    public static readonly HashKey = "Hash";
    public static readonly IssueTimeKey = "IssueTime";
    public static readonly QueueIdKey = "QueueId";
    public static readonly EventIdKey = "EventId";
    public static readonly RedirectTypeKey = "RedirectType";
    public static readonly FixedCookieValidityMinutesKey = "FixedValidityMins";
    public static readonly IsCookieHttpOnly = "IsCookieHttpOnly";
    public static readonly IsCookieSecure = "IsCookieSecure";
    public static readonly HashedIpKey = "Hip";

    static fromCookieHeader(cookieHeaderValue): QueueItAcceptedCookie {
        const cookieValueMap = CookieHelper.toMapFromValue(cookieHeaderValue);
        const storedHash = cookieValueMap[QueueItAcceptedCookie.HashKey] || "";
        const issueTimeString = cookieValueMap[QueueItAcceptedCookie.IssueTimeKey] || "";
        const queueId = cookieValueMap[QueueItAcceptedCookie.QueueIdKey] || "";
        const eventIdFromCookie = cookieValueMap[QueueItAcceptedCookie.EventIdKey] || "";
        const redirectType = cookieValueMap[QueueItAcceptedCookie.RedirectTypeKey] || "";
        const fixedCookieValidityMinutes =
            cookieValueMap[QueueItAcceptedCookie.FixedCookieValidityMinutesKey] || "";
        const isCookieHttpOnly = cookieValueMap[QueueItAcceptedCookie.IsCookieHttpOnly] || false;
        const isCookieSecure = cookieValueMap[QueueItAcceptedCookie.IsCookieSecure] || false;
        const hashedIpValue = cookieValueMap[QueueItAcceptedCookie.HashedIpKey] || "";

        return new QueueItAcceptedCookie(
            storedHash,
            issueTimeString,
            queueId,
            eventIdFromCookie,
            redirectType,
            fixedCookieValidityMinutes,
            isCookieHttpOnly,
            isCookieSecure,
            hashedIpValue);
    }
}

export class UserInQueueStateCookieRepository {
    private static readonly _QueueITDataKey = "QueueITAccepted-SDFrts345E-V3";

    constructor(private contextProvider: IConnectorContextProvider) {
    }

    public static getCookieKey(eventId: string) {
        return `${UserInQueueStateCookieRepository._QueueITDataKey}_${eventId}`;
    }

    public store(eventId: string,
                 queueId: string,
                 fixedCookieValidityMinutes: number | null,
                 cookieDomain: string,
                 isCookieHttpOnly: boolean,
                 isCookieSecure: boolean,
                 redirectType: string,
                 hashedIp: string | null,
                 secretKey: string) {

        isCookieHttpOnly = isCookieHttpOnly == null ? false : isCookieHttpOnly;
        isCookieSecure = isCookieSecure == null ? false : isCookieSecure;

        this.createCookie(
            eventId,
            queueId,
            fixedCookieValidityMinutes ? fixedCookieValidityMinutes.toString() : "",
            redirectType,
            hashedIp,
            cookieDomain,
            isCookieHttpOnly,
            isCookieSecure,
            secretKey);
    }

    private createCookie(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        hashedIp: string | null,
        cookieDomain: string,
        isCookieHttpOnly: boolean,
        isCookieSecure: boolean,
        secretKey: string) {
        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);

        let issueTime = Utils.getCurrentTime().toString();

        let cookieValues = new Array<{ key: string, value: string }>();
        cookieValues.push({key: QueueItAcceptedCookie.EventIdKey, value: eventId});
        cookieValues.push({key: QueueItAcceptedCookie.QueueIdKey, value: queueId});
        if (fixedCookieValidityMinutes) {
            cookieValues.push({
                key: QueueItAcceptedCookie.FixedCookieValidityMinutesKey,
                value: fixedCookieValidityMinutes
            });
        }
        cookieValues.push({key: QueueItAcceptedCookie.RedirectTypeKey, value: redirectType.toLowerCase()});
        cookieValues.push({key: QueueItAcceptedCookie.IssueTimeKey, value: issueTime});

        if (hashedIp) {
            cookieValues.push({key: QueueItAcceptedCookie.HashedIpKey, value: hashedIp});
        }

        cookieValues.push({
            key: QueueItAcceptedCookie.HashKey,
            value: this.generateHash(eventId.toLowerCase(),
                queueId,
                fixedCookieValidityMinutes,
                redirectType.toLowerCase(),
                issueTime,
                hashedIp,
                secretKey)
        });

        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const expire = Math.floor(tomorrow.getTime() / 1000);

        this.contextProvider.getHttpResponse().setCookie(
            cookieKey,
            CookieHelper.toValueFromKeyValueCollection(cookieValues),
            cookieDomain,
            expire,
            isCookieHttpOnly,
            isCookieSecure);
    }

    public getState(eventId: string, cookieValidityMinutes: number, secretKey: string, validateTime: boolean): CookieStateInfo {
        let qitAcceptedCookie: QueueItAcceptedCookie = null;
        const clientIp = this.contextProvider.getHttpRequest().getUserHostAddress();
        try {
            const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
            const cookie = this.contextProvider.getHttpRequest().getCookieValue(cookieKey);

            if (!cookie)
                return new CookieStateInfo("", null, "", null, CookieValidationResult.NotFound, null, clientIp);

            qitAcceptedCookie = QueueItAcceptedCookie.fromCookieHeader(cookie);
            const cookieValidationResult = this.isCookieValid(secretKey, qitAcceptedCookie, eventId, cookieValidityMinutes, validateTime);
            if (cookieValidationResult != CookieValidationResult.Valid) {
                return new CookieStateInfo("", null, "", qitAcceptedCookie.hashedIp, cookieValidationResult, qitAcceptedCookie, clientIp);
            }

            return new CookieStateInfo(
                qitAcceptedCookie.queueId,
                qitAcceptedCookie.fixedCookieValidityMinutes
                    ? parseInt(qitAcceptedCookie.fixedCookieValidityMinutes)
                    : null,
                qitAcceptedCookie.redirectType,
                qitAcceptedCookie.hashedIp,
                CookieValidationResult.Valid,
                qitAcceptedCookie,
                clientIp);
        } catch (ex) {
            return new CookieStateInfo("", null, "", qitAcceptedCookie?.hashedIp, CookieValidationResult.Error, qitAcceptedCookie, clientIp);
        }
    }

    private isCookieValid(
        secretKey: string,
        cookie: QueueItAcceptedCookie,
        eventId: string,
        cookieValidityMinutes: number,
        validateTime: boolean): CookieValidationResult {
        try {
            const expectedHash = this.generateHash(
                cookie.eventIdFromCookie,
                cookie.queueId,
                cookie.fixedCookieValidityMinutes,
                cookie.redirectType,
                cookie.issueTimeString,
                cookie.hashedIp,
                secretKey);

            if (expectedHash !== cookie.storedHash)
                return CookieValidationResult.HashMismatch;

            if (eventId.toLowerCase() !== cookie.eventIdFromCookie.toLowerCase())
                return CookieValidationResult.WaitingRoomMismatch;

            if (validateTime) {
                let validity = cookie.fixedCookieValidityMinutes ? parseInt(cookie.fixedCookieValidityMinutes) : cookieValidityMinutes;
                let expirationTime = parseInt(cookie.issueTimeString) + validity * 60;

                if (expirationTime < Utils.getCurrentTime())
                    return CookieValidationResult.Expired;
            }

            const userHostAddress = this.contextProvider.getHttpRequest().getUserHostAddress();
            if (cookie.hashedIp && userHostAddress) {
                const hashedUserHostAddress = Utils.generateSHA256Hash(secretKey, userHostAddress, this.contextProvider);

                if (cookie.hashedIp !== hashedUserHostAddress) {
                    return CookieValidationResult.IpBindingMismatch;
                }
            }

            return CookieValidationResult.Valid;
        } catch {
            return CookieValidationResult.Error;
        }
    }

    public cancelQueueCookie(eventId: string,
                             cookieDomain: string,
                             isCookieHttpOnly: boolean,
                             isCookieSecure: boolean) {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        this.contextProvider.getHttpResponse()
            .setCookie(cookieKey, "", cookieDomain, 0, isCookieHttpOnly, isCookieSecure);
    }

    public reissueQueueCookie(eventId: string,
                              cookieValidityMinutes: number,
                              cookieDomain: string,
                              isCookieHttpOnly: boolean,
                              isCookieSecure: boolean,
                              secretKey: string) {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const cookie = this.contextProvider.getHttpRequest().getCookieValue(cookieKey);

        if (!cookie)
            return;

        const qitAcceptedCookie = QueueItAcceptedCookie.fromCookieHeader(cookie);

        if (!this.isCookieValid(secretKey, qitAcceptedCookie, eventId, cookieValidityMinutes, true))
            return;

        let fixedCookieValidityMinutes = "";
        if (qitAcceptedCookie.fixedCookieValidityMinutes)
            fixedCookieValidityMinutes = qitAcceptedCookie.fixedCookieValidityMinutes.toString();

        this.createCookie(
            eventId,
            qitAcceptedCookie.queueId,
            fixedCookieValidityMinutes,
            qitAcceptedCookie.redirectType,
            qitAcceptedCookie.hashedIp,
            cookieDomain,
            isCookieHttpOnly,
            isCookieSecure,
            secretKey);
    }

    private generateHash(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        issueTime: string,
        hashedIp: string,
        secretKey: string) {
        let valueToHash = eventId
            + queueId
            + (fixedCookieValidityMinutes ? fixedCookieValidityMinutes : "")
            + redirectType
            + issueTime
            + (hashedIp ? hashedIp : "");

        return Utils.generateSHA256Hash(secretKey, valueToHash, this.contextProvider);
    }
}

export class CookieStateInfo {
    constructor(public queueId: string,
                public fixedCookieValidityMinutes: number | null,
                public redirectType: string,
                public hashedIp: string | null,
                public cookieValidationResult: CookieValidationResult,
                public cookie: QueueItAcceptedCookie,
                public clientIp: string | null) {
    }

    get isValid(): boolean {
        return this.cookieValidationResult === CookieValidationResult.Valid;
    }

    get isFound(): boolean {
        return this.cookieValidationResult !== CookieValidationResult.NotFound;
    }

    get isBoundToAnotherIp(): boolean {
        return this.cookieValidationResult === CookieValidationResult.IpBindingMismatch;
    }

    isStateExtendable() {
        return this.isValid && !this.fixedCookieValidityMinutes;
    }

    get result(): SessionValidationResult {
        if (this.isValid) {
            return SessionValidationResult.newSuccessfulResult();
        }

        const result = SessionValidationResult.newFailedResult(ErrorCode.CookieSessionState);
        switch (this.cookieValidationResult) {
            case CookieValidationResult.HashMismatch:
                SessionValidationResult.setHashMismatchDetails(this.cookie.storedHash, result);
                break;
            case CookieValidationResult.Expired:
                SessionValidationResult.setExpiredResultDetails(result);
                break;
            case CookieValidationResult.Error:
                SessionValidationResult.setErrorDetails();
                break;
            case CookieValidationResult.NotFound:
                break;
            case CookieValidationResult.IpBindingMismatch:
                SessionValidationResult.setIpBindingValidationDetails(this.cookie.hashedIp, this.clientIp, result);
                break;
        }

        if (this.isFound) {
            if (this.redirectType) {
                result.details['r'] = this.redirectType;
            }
            if (this.queueId) {
                result.details['q'] = this.queueId;
            }
            result.details['st'] = Date.now().toString();
        }

        return result;
    }
}
