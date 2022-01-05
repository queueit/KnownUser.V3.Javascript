"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateInfo = exports.UserInQueueStateCookieRepository = exports.QueueItAcceptedCookie = exports.CookieValidationResult = void 0;
var QueueITHelpers_1 = require("./QueueITHelpers");
var CookieValidationResult;
(function (CookieValidationResult) {
    CookieValidationResult[CookieValidationResult["NotFound"] = 0] = "NotFound";
    CookieValidationResult[CookieValidationResult["Expired"] = 1] = "Expired";
    CookieValidationResult[CookieValidationResult["WaitingRoomMismatch"] = 2] = "WaitingRoomMismatch";
    CookieValidationResult[CookieValidationResult["HashMismatch"] = 3] = "HashMismatch";
    CookieValidationResult[CookieValidationResult["Error"] = 4] = "Error";
    CookieValidationResult[CookieValidationResult["Valid"] = 5] = "Valid";
    CookieValidationResult[CookieValidationResult["IpBindingMismatch"] = 6] = "IpBindingMismatch";
})(CookieValidationResult = exports.CookieValidationResult || (exports.CookieValidationResult = {}));
var QueueItAcceptedCookie = /** @class */ (function () {
    function QueueItAcceptedCookie(storedHash, issueTimeString, queueId, eventIdFromCookie, redirectType, fixedCookieValidityMinutes, isCookieHttpOnly, isCookieSecure, hashedIp) {
        this.storedHash = storedHash;
        this.issueTimeString = issueTimeString;
        this.queueId = queueId;
        this.eventIdFromCookie = eventIdFromCookie;
        this.redirectType = redirectType;
        this.fixedCookieValidityMinutes = fixedCookieValidityMinutes;
        this.isCookieHttpOnly = isCookieHttpOnly;
        this.isCookieSecure = isCookieSecure;
        this.hashedIp = hashedIp;
    }
    QueueItAcceptedCookie.fromCookieHeader = function (cookieHeaderValue) {
        var cookieValueMap = QueueITHelpers_1.CookieHelper.toMapFromValue(cookieHeaderValue);
        var storedHash = cookieValueMap[QueueItAcceptedCookie.HashKey] || "";
        var issueTimeString = cookieValueMap[QueueItAcceptedCookie.IssueTimeKey] || "";
        var queueId = cookieValueMap[QueueItAcceptedCookie.QueueIdKey] || "";
        var eventIdFromCookie = cookieValueMap[QueueItAcceptedCookie.EventIdKey] || "";
        var redirectType = cookieValueMap[QueueItAcceptedCookie.RedirectTypeKey] || "";
        var fixedCookieValidityMinutes = cookieValueMap[QueueItAcceptedCookie.FixedCookieValidityMinutesKey] || "";
        var isCookieHttpOnly = cookieValueMap[QueueItAcceptedCookie.IsCookieHttpOnly] || false;
        var isCookieSecure = cookieValueMap[QueueItAcceptedCookie.IsCookieSecure] || false;
        var hashedIpValue = cookieValueMap[QueueItAcceptedCookie.HashedIpKey] || "";
        return new QueueItAcceptedCookie(storedHash, issueTimeString, queueId, eventIdFromCookie, redirectType, fixedCookieValidityMinutes, isCookieHttpOnly, isCookieSecure, hashedIpValue);
    };
    QueueItAcceptedCookie.HashKey = "Hash";
    QueueItAcceptedCookie.IssueTimeKey = "IssueTime";
    QueueItAcceptedCookie.QueueIdKey = "QueueId";
    QueueItAcceptedCookie.EventIdKey = "EventId";
    QueueItAcceptedCookie.RedirectTypeKey = "RedirectType";
    QueueItAcceptedCookie.FixedCookieValidityMinutesKey = "FixedValidityMins";
    QueueItAcceptedCookie.IsCookieHttpOnly = "IsCookieHttpOnly";
    QueueItAcceptedCookie.IsCookieSecure = "IsCookieSecure";
    QueueItAcceptedCookie.HashedIpKey = "Hip";
    return QueueItAcceptedCookie;
}());
exports.QueueItAcceptedCookie = QueueItAcceptedCookie;
var UserInQueueStateCookieRepository = /** @class */ (function () {
    function UserInQueueStateCookieRepository(httpContextProvider) {
        this.httpContextProvider = httpContextProvider;
    }
    UserInQueueStateCookieRepository.getCookieKey = function (eventId) {
        return "".concat(UserInQueueStateCookieRepository._QueueITDataKey, "_").concat(eventId);
    };
    UserInQueueStateCookieRepository.prototype.store = function (eventId, queueId, fixedCookieValidityMinutes, cookieDomain, isCookieHttpOnly, isCookieSecure, redirectType, hashedIp, secretKey) {
        isCookieHttpOnly = isCookieHttpOnly == null ? false : isCookieHttpOnly;
        isCookieSecure = isCookieSecure == null ? false : isCookieSecure;
        this.createCookie(eventId, queueId, fixedCookieValidityMinutes ? fixedCookieValidityMinutes.toString() : "", redirectType, hashedIp, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);
    };
    UserInQueueStateCookieRepository.prototype.createCookie = function (eventId, queueId, fixedCookieValidityMinutes, redirectType, hashedIp, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        var issueTime = QueueITHelpers_1.Utils.getCurrentTime().toString();
        var cookieValues = new Array();
        cookieValues.push({ key: QueueItAcceptedCookie.EventIdKey, value: eventId });
        cookieValues.push({ key: QueueItAcceptedCookie.QueueIdKey, value: queueId });
        if (fixedCookieValidityMinutes) {
            cookieValues.push({
                key: QueueItAcceptedCookie.FixedCookieValidityMinutesKey,
                value: fixedCookieValidityMinutes
            });
        }
        cookieValues.push({ key: QueueItAcceptedCookie.RedirectTypeKey, value: redirectType.toLowerCase() });
        cookieValues.push({ key: QueueItAcceptedCookie.IssueTimeKey, value: issueTime });
        if (hashedIp) {
            cookieValues.push({ key: QueueItAcceptedCookie.HashedIpKey, value: hashedIp });
        }
        cookieValues.push({
            key: QueueItAcceptedCookie.HashKey,
            value: this.generateHash(eventId.toLowerCase(), queueId, fixedCookieValidityMinutes, redirectType.toLowerCase(), issueTime, hashedIp, secretKey)
        });
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var expire = Math.floor(tomorrow.getTime() / 1000);
        this.httpContextProvider.getHttpResponse().setCookie(cookieKey, QueueITHelpers_1.CookieHelper.toValueFromKeyValueCollection(cookieValues), cookieDomain, expire, isCookieHttpOnly, isCookieSecure);
    };
    UserInQueueStateCookieRepository.prototype.getState = function (eventId, cookieValidityMinutes, secretKey, validateTime) {
        var qitAcceptedCookie = null;
        var clientIp = this.httpContextProvider.getHttpRequest().getUserHostAddress();
        try {
            var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
            var cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);
            if (!cookie)
                return new StateInfo("", null, "", null, CookieValidationResult.NotFound, null, clientIp);
            qitAcceptedCookie = QueueItAcceptedCookie.fromCookieHeader(cookie);
            var cookieValidationResult = this.isCookieValid(secretKey, qitAcceptedCookie, eventId, cookieValidityMinutes, validateTime);
            if (cookieValidationResult != CookieValidationResult.Valid) {
                return new StateInfo("", null, "", qitAcceptedCookie.hashedIp, cookieValidationResult, qitAcceptedCookie, clientIp);
            }
            return new StateInfo(qitAcceptedCookie.queueId, qitAcceptedCookie.fixedCookieValidityMinutes
                ? parseInt(qitAcceptedCookie.fixedCookieValidityMinutes)
                : null, qitAcceptedCookie.redirectType, qitAcceptedCookie.hashedIp, CookieValidationResult.Valid, qitAcceptedCookie, clientIp);
        }
        catch (ex) {
            return new StateInfo("", null, "", qitAcceptedCookie === null || qitAcceptedCookie === void 0 ? void 0 : qitAcceptedCookie.hashedIp, CookieValidationResult.Error, qitAcceptedCookie, clientIp);
        }
    };
    UserInQueueStateCookieRepository.prototype.isCookieValid = function (secretKey, cookie, eventId, cookieValidityMinutes, validateTime) {
        try {
            var expectedHash = this.generateHash(cookie.eventIdFromCookie, cookie.queueId, cookie.fixedCookieValidityMinutes, cookie.redirectType, cookie.issueTimeString, cookie.hashedIp, secretKey);
            if (expectedHash !== cookie.storedHash)
                return CookieValidationResult.HashMismatch;
            if (eventId.toLowerCase() !== cookie.eventIdFromCookie.toLowerCase())
                return CookieValidationResult.WaitingRoomMismatch;
            if (validateTime) {
                var validity = cookie.fixedCookieValidityMinutes ? parseInt(cookie.fixedCookieValidityMinutes) : cookieValidityMinutes;
                var expirationTime = parseInt(cookie.issueTimeString) + validity * 60;
                if (expirationTime < QueueITHelpers_1.Utils.getCurrentTime())
                    return CookieValidationResult.Expired;
            }
            var userHostAddress = this.httpContextProvider.getHttpRequest().getUserHostAddress();
            if (cookie.hashedIp && userHostAddress) {
                var hashedUserHostAddress = QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, userHostAddress);
                if (cookie.hashedIp !== hashedUserHostAddress) {
                    return CookieValidationResult.IpBindingMismatch;
                }
            }
            return CookieValidationResult.Valid;
        }
        catch (_a) {
            return CookieValidationResult.Error;
        }
    };
    UserInQueueStateCookieRepository.prototype.cancelQueueCookie = function (eventId, cookieDomain, isCookieHttpOnly, isCookieSecure) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        this.httpContextProvider.getHttpResponse()
            .setCookie(cookieKey, "", cookieDomain, 0, isCookieHttpOnly, isCookieSecure);
    };
    UserInQueueStateCookieRepository.prototype.reissueQueueCookie = function (eventId, cookieValidityMinutes, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey) {
        var cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        var cookie = this.httpContextProvider.getHttpRequest().getCookieValue(cookieKey);
        if (!cookie)
            return;
        var qitAcceptedCookie = QueueItAcceptedCookie.fromCookieHeader(cookie);
        if (!this.isCookieValid(secretKey, qitAcceptedCookie, eventId, cookieValidityMinutes, true))
            return;
        var fixedCookieValidityMinutes = "";
        if (qitAcceptedCookie.fixedCookieValidityMinutes)
            fixedCookieValidityMinutes = qitAcceptedCookie.fixedCookieValidityMinutes.toString();
        this.createCookie(eventId, qitAcceptedCookie.queueId, fixedCookieValidityMinutes, qitAcceptedCookie.redirectType, qitAcceptedCookie.hashedIp, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);
    };
    UserInQueueStateCookieRepository.prototype.generateHash = function (eventId, queueId, fixedCookieValidityMinutes, redirectType, issueTime, hashedIp, secretKey) {
        var valueToHash = eventId
            + queueId
            + (fixedCookieValidityMinutes ? fixedCookieValidityMinutes : "")
            + redirectType
            + issueTime
            + (hashedIp ? hashedIp : "");
        return QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, valueToHash);
    };
    UserInQueueStateCookieRepository._QueueITDataKey = "QueueITAccepted-SDFrts345E-V3";
    return UserInQueueStateCookieRepository;
}());
exports.UserInQueueStateCookieRepository = UserInQueueStateCookieRepository;
var StateInfo = /** @class */ (function () {
    function StateInfo(queueId, fixedCookieValidityMinutes, redirectType, hashedIp, cookieValidationResult, cookie, clientIp) {
        this.queueId = queueId;
        this.fixedCookieValidityMinutes = fixedCookieValidityMinutes;
        this.redirectType = redirectType;
        this.hashedIp = hashedIp;
        this.cookieValidationResult = cookieValidationResult;
        this.cookie = cookie;
        this.clientIp = clientIp;
    }
    Object.defineProperty(StateInfo.prototype, "isValid", {
        get: function () {
            return this.cookieValidationResult === CookieValidationResult.Valid;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateInfo.prototype, "isFound", {
        get: function () {
            return this.cookieValidationResult !== CookieValidationResult.NotFound;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StateInfo.prototype, "isBoundToAnotherIp", {
        get: function () {
            return this.cookieValidationResult === CookieValidationResult.IpBindingMismatch;
        },
        enumerable: false,
        configurable: true
    });
    StateInfo.prototype.isStateExtendable = function () {
        return this.isValid && !this.fixedCookieValidityMinutes;
    };
    StateInfo.prototype.getInvalidCookieReason = function () {
        if (this.isValid) {
            return "";
        }
        var details = new Array();
        switch (this.cookieValidationResult) {
            case CookieValidationResult.HashMismatch:
                details.push("hash");
                details.push("h:".concat(this.cookie.storedHash));
                break;
            case CookieValidationResult.Expired:
                details.push("expired");
                break;
            case CookieValidationResult.Error:
                details.push("error");
                break;
            case CookieValidationResult.NotFound:
                break;
            case CookieValidationResult.IpBindingMismatch:
                details.push("ip");
                details.push("hip:".concat(this.cookie.hashedIp));
                details.push("cip:".concat(QueueITHelpers_1.Utils.bin2hex(this.clientIp)));
                break;
        }
        if (this.isFound) {
            if (this.redirectType) {
                details.push("r:".concat(this.redirectType));
            }
            if (this.queueId) {
                details.push("q:".concat(this.queueId));
            }
            details.push("st:".concat(Date.now()));
        }
        return details.join(",");
    };
    return StateInfo;
}());
exports.StateInfo = StateInfo;
//# sourceMappingURL=UserInQueueStateCookieRepository.js.map