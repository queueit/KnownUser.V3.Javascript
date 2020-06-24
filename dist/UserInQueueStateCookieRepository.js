"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateInfo = exports.UserInQueueStateCookieRepository = void 0;
var QueueITHelpers_1 = require("./QueueITHelpers");
var UserInQueueStateCookieRepository = /** @class */ (function () {
    function UserInQueueStateCookieRepository(httpContextProvider) {
        this.httpContextProvider = httpContextProvider;
    }
    UserInQueueStateCookieRepository.getCookieKey = function (eventId) {
        return UserInQueueStateCookieRepository._QueueITDataKey + "_" + eventId;
    };
    UserInQueueStateCookieRepository.prototype.store = function (eventId, queueId, fixedCookieValidityMinutes, cookieDomain, redirectType, secretKey) {
        this.createCookie(eventId, queueId, fixedCookieValidityMinutes ? fixedCookieValidityMinutes.toString() : "", redirectType, cookieDomain, secretKey);
    };
    UserInQueueStateCookieRepository.prototype.createCookie = function (eventId, queueId, fixedCookieValidityMinutes, redirectType, cookieDomain, secretKey) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        var issueTime = QueueITHelpers_1.Utils.getCurrentTime().toString();
        var cookieValues = new Array();
        cookieValues.push({ key: UserInQueueStateCookieRepository._EventIdKey, value: eventId });
        cookieValues.push({ key: UserInQueueStateCookieRepository._QueueIdKey, value: queueId });
        if (fixedCookieValidityMinutes) {
            cookieValues.push({ key: UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey, value: fixedCookieValidityMinutes });
        }
        cookieValues.push({ key: UserInQueueStateCookieRepository._RedirectTypeKey, value: redirectType.toLowerCase() });
        cookieValues.push({ key: UserInQueueStateCookieRepository._IssueTimeKey, value: issueTime });
        cookieValues.push({
            key: UserInQueueStateCookieRepository._HashKey,
            value: this.generateHash(eventId.toLowerCase(), queueId, fixedCookieValidityMinutes, redirectType.toLowerCase(), issueTime, secretKey)
        });
        var tommorrow = new Date();
        tommorrow.setDate(tommorrow.getDate() + 1);
        var expire = Math.floor(tommorrow.getTime() / 1000);
        this.httpContextProvider.getHttpResponse().setCookie(cookieKey, QueueITHelpers_1.CookieHelper.toValueFromKeyValueCollection(cookieValues), cookieDomain, expire);
    };
    UserInQueueStateCookieRepository.prototype.getState = function (eventId, cookieValidityMinutes, secretKey, validateTime) {
        try {
            var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
            var cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);
            if (!cookie)
                return new StateInfo(false, false, "", null, "");
            var cookieValues = QueueITHelpers_1.CookieHelper.toMapFromValue(cookie);
            if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, validateTime))
                return new StateInfo(true, false, "", null, "");
            return new StateInfo(true, true, cookieValues[UserInQueueStateCookieRepository._QueueIdKey], cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey]
                ? parseInt(cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey])
                : null, cookieValues[UserInQueueStateCookieRepository._RedirectTypeKey]);
        }
        catch (ex) {
            return new StateInfo(true, false, "", null, "");
        }
    };
    UserInQueueStateCookieRepository.prototype.isCookieValid = function (secretKey, cookieValueMap, eventId, cookieValidityMinutes, validateTime) {
        try {
            var storedHash = cookieValueMap[UserInQueueStateCookieRepository._HashKey] || "";
            var issueTimeString = cookieValueMap[UserInQueueStateCookieRepository._IssueTimeKey] || "";
            var queueId = cookieValueMap[UserInQueueStateCookieRepository._QueueIdKey] || "";
            var eventIdFromCookie = cookieValueMap[UserInQueueStateCookieRepository._EventIdKey] || "";
            var redirectType = cookieValueMap[UserInQueueStateCookieRepository._RedirectTypeKey] || "";
            var fixedCookieValidityMinutes = cookieValueMap[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey] || "";
            var expectedHash = this.generateHash(eventIdFromCookie, queueId, fixedCookieValidityMinutes, redirectType, issueTimeString, secretKey);
            if (expectedHash !== storedHash)
                return false;
            if (eventId.toLowerCase() !== eventIdFromCookie.toLowerCase())
                return false;
            if (validateTime) {
                var validity = fixedCookieValidityMinutes ? parseInt(fixedCookieValidityMinutes) : cookieValidityMinutes;
                var expirationTime = parseInt(issueTimeString) + validity * 60;
                if (expirationTime < QueueITHelpers_1.Utils.getCurrentTime())
                    return false;
            }
            return true;
        }
        catch (_a) {
            return false;
        }
    };
    UserInQueueStateCookieRepository.prototype.cancelQueueCookie = function (eventId, cookieDomain) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        this.httpContextProvider.getHttpResponse().setCookie(cookieKey, "", cookieDomain, 0);
    };
    UserInQueueStateCookieRepository.prototype.reissueQueueCookie = function (eventId, cookieValidityMinutes, cookieDomain, secretKey) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        var cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);
        if (!cookie)
            return;
        var cookieValues = QueueITHelpers_1.CookieHelper.toMapFromValue(cookie);
        if (!this.isCookieValid(secretKey, cookieValues, eventId, cookieValidityMinutes, true))
            return;
        var fixedCookieValidityMinutes = "";
        if (cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey])
            fixedCookieValidityMinutes = cookieValues[UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey].toString();
        this.createCookie(eventId, cookieValues[UserInQueueStateCookieRepository._QueueIdKey], fixedCookieValidityMinutes, cookieValues[UserInQueueStateCookieRepository._RedirectTypeKey], cookieDomain, secretKey);
    };
    UserInQueueStateCookieRepository.prototype.generateHash = function (eventId, queueId, fixedCookieValidityMinutes, redirectType, issueTime, secretKey) {
        var valueToHash = eventId + queueId + fixedCookieValidityMinutes + redirectType + issueTime;
        return QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, valueToHash);
    };
    UserInQueueStateCookieRepository._QueueITDataKey = "QueueITAccepted-SDFrts345E-V3";
    UserInQueueStateCookieRepository._HashKey = "Hash";
    UserInQueueStateCookieRepository._IssueTimeKey = "IssueTime";
    UserInQueueStateCookieRepository._QueueIdKey = "QueueId";
    UserInQueueStateCookieRepository._EventIdKey = "EventId";
    UserInQueueStateCookieRepository._RedirectTypeKey = "RedirectType";
    UserInQueueStateCookieRepository._FixedCookieValidityMinutesKey = "FixedValidityMins";
    return UserInQueueStateCookieRepository;
}());
exports.UserInQueueStateCookieRepository = UserInQueueStateCookieRepository;
var StateInfo = /** @class */ (function () {
    function StateInfo(isFound, isValid, queueId, fixedCookieValidityMinutes, redirectType) {
        this.isFound = isFound;
        this.isValid = isValid;
        this.queueId = queueId;
        this.fixedCookieValidityMinutes = fixedCookieValidityMinutes;
        this.redirectType = redirectType;
    }
    StateInfo.prototype.isStateExtendable = function () {
        return this.isValid && !this.fixedCookieValidityMinutes;
    };
    return StateInfo;
}());
exports.StateInfo = StateInfo;
