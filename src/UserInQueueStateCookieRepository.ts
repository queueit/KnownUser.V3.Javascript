import {IHttpContextProvider} from './HttpContextProvider'
import {Utils, CookieHelper} from './QueueITHelpers'

export class UserInQueueStateCookieRepository {
    private static readonly _QueueITDataKey = "QueueITAccepted-SDFrts345E-V3";
    private static readonly _HashKey = "Hash";
    private static readonly _IssueTimeKey = "IssueTime";
    private static readonly _QueueIdKey = "QueueId";
    private static readonly _EventIdKey = "EventId";
    private static readonly _RedirectTypeKey = "RedirectType";
    private static readonly _FixedCookieValidityMinutesKey = "FixedValidityMins";
    private static readonly _IsCookieHttpOnly = "IsCookieHttpOnly";
    private static readonly _IsCookieSecure = "IsCookieSecure";
    private static readonly _CookieSameSiteValue = "CookieSameSiteValue";

    constructor(private httpContextProvider: IHttpContextProvider) {
    }

    public static getCookieKey(eventId: string) {
        return `${UserInQueueStateCookieRepository._QueueITDataKey}_${eventId}`;
    }

    public store(eventId: string,
                 queueId: string,
                 fixedCookieValidityMinutes: number | null,
                 cookieDomain: string,
                 isHttpOnly: boolean,
                 isSecure: boolean,
                 sameSiteValue: string,
                 redirectType: string,
                 secretKey: string) {
        isHttpOnly = isHttpOnly == null ? false : isHttpOnly;
        isSecure = isSecure == null ? false : isSecure;
        this.createCookie(
            eventId,
            queueId,
            fixedCookieValidityMinutes ? fixedCookieValidityMinutes.toString() : "",
            redirectType,
            cookieDomain,
            isHttpOnly,
            isSecure,
            sameSiteValue,
            secretKey);
    }

    private createCookie(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        cookieDomain: string,
        isHttpOnly: boolean,
        isSecure: boolean,
        sameSiteValue: string,
        secretKey: string) {
        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);

        let issueTime = Utils.getCurrentTime().toString();

        let cookieValues = new Array<{ key: string, value: string }>();
        cookieValues.push({key: UserInQueueStateCookieRepository._EventIdKey, value: eventId});
        cookieValues.push({key: UserInQueueStateCookieRepository._QueueIdKey, value: queueId});
        if (fixedCookieValidityMinutes) {
            cookieValues.push({
                key: UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey,
                value: fixedCookieValidityMinutes
            });
        }
        cookieValues.push({key: UserInQueueStateCookieRepository._RedirectTypeKey, value: redirectType.toLowerCase()});
        cookieValues.push({key: UserInQueueStateCookieRepository._IssueTimeKey, value: issueTime});
        cookieValues.push({
            key: UserInQueueStateCookieRepository._HashKey,
            value: this.generateHash(eventId.toLowerCase(), queueId, fixedCookieValidityMinutes, redirectType.toLowerCase(), issueTime, secretKey)
        });
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const expire = Math.floor(tomorrow.getTime() / 1000);
        this.httpContextProvider.getHttpResponse().setCookie(
            cookieKey,
            CookieHelper.toValueFromKeyValueCollection(cookieValues),
            cookieDomain,
            expire,
            isHttpOnly,
            isSecure,
            sameSiteValue);
    }

    public getState(eventId: string, cookieValidityMinutes: number, secretKey: string, validateTime: boolean): StateInfo {
        try {
            var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
            var cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);
            if (!cookie)
                return new StateInfo(false, false, "", null, "");

            var cookieValues = CookieHelper.toMapFromValue(cookie);
            if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, validateTime))
                return new StateInfo(true, false, "", null, "");

            return new StateInfo(
                true,
                true,
                cookieValues[UserInQueueStateCookieRepository._QueueIdKey],
                cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey]
                    ? parseInt(cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey])
                    : null,
                cookieValues[UserInQueueStateCookieRepository._RedirectTypeKey]);
        } catch (ex) {
            return new StateInfo(true, false, "", null, "");
        }
    }

    private isCookieValid(
        secretKey: string,
        cookieValueMap,
        eventId: string,
        cookieValidityMinutes: number,
        validateTime: boolean): boolean {
        try {
            var storedHash = cookieValueMap[UserInQueueStateCookieRepository._HashKey] || "";
            var issueTimeString = cookieValueMap[UserInQueueStateCookieRepository._IssueTimeKey] || "";
            var queueId = cookieValueMap[UserInQueueStateCookieRepository._QueueIdKey] || "";
            var eventIdFromCookie = cookieValueMap[UserInQueueStateCookieRepository._EventIdKey] || "";
            var redirectType = cookieValueMap[UserInQueueStateCookieRepository._RedirectTypeKey] || "";
            let fixedCookieValidityMinutes =
                cookieValueMap[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey] || "";

            var expectedHash = this.generateHash(
                eventIdFromCookie,
                queueId,
                fixedCookieValidityMinutes,
                redirectType,
                issueTimeString,
                secretKey);

            if (expectedHash !== storedHash)
                return false;

            if (eventId.toLowerCase() !== eventIdFromCookie.toLowerCase())
                return false;

            if (validateTime) {
                let validity = fixedCookieValidityMinutes ? parseInt(fixedCookieValidityMinutes) : cookieValidityMinutes;
                let expirationTime = parseInt(issueTimeString) + validity * 60;

                if (expirationTime < Utils.getCurrentTime())
                    return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    public cancelQueueCookie(eventId: string,
                             cookieDomain: string,
                             isCookieHttpOnly: boolean,
                             isSecure: boolean,
                             sameSiteValue: string) {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        this.httpContextProvider.getHttpResponse()
            .setCookie(cookieKey, "", cookieDomain, 0, isCookieHttpOnly, isSecure, sameSiteValue);
    }

    public reissueQueueCookie(eventId: string,
                              cookieValidityMinutes: number,
                              cookieDomain: string,
                              secretKey: string) {
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);

        if (!cookie)
            return;

        const cookieValues = CookieHelper.toMapFromValue(cookie);

        if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, true))
            return;

        let fixedCookieValidityMinutes = "";
        if (cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey])
            fixedCookieValidityMinutes = cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey].toString();

        this.createCookie(
            eventId,
            cookieValues[UserInQueueStateCookieRepository._QueueIdKey],
            fixedCookieValidityMinutes,
            cookieValues[UserInQueueStateCookieRepository._RedirectTypeKey],
            cookieDomain,
            cookieValues[UserInQueueStateCookieRepository._IsCookieHttpOnly],
            cookieValues[UserInQueueStateCookieRepository._IsCookieSecure],
            cookieValues[UserInQueueStateCookieRepository._CookieSameSiteValue],
            secretKey);
    }

    private generateHash(
        eventId: string,
        queueId: string,
        fixedCookieValidityMinutes: string,
        redirectType: string,
        issueTime: string,
        secretKey: string) {
        let valueToHash = eventId + queueId + fixedCookieValidityMinutes + redirectType + issueTime;
        return Utils.generateSHA256Hash(secretKey, valueToHash);
    }
}

export class StateInfo {
    constructor(public isFound, public isValid: boolean, public queueId: string,
                public fixedCookieValidityMinutes: number | null, public redirectType: string) {
    }

    isStateExtendable() {
        return this.isValid && !this.fixedCookieValidityMinutes;
    }
}
