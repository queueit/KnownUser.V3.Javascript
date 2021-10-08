"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionTypes = exports.KnownUserException = exports.RequestValidationResult = exports.CancelEventConfig = exports.QueueEventConfig = void 0;
var QueueITHelpers_1 = require("./QueueITHelpers");
var QueueEventConfig = /** @class */ (function () {
    function QueueEventConfig(eventId, layoutName, culture, queueDomain, extendCookieValidity, cookieValidityMinute, cookieDomain, isCookieHttpOnly, isCookieSecure, version, actionName) {
        if (actionName === void 0) { actionName = 'unspecified'; }
        this.eventId = eventId;
        this.layoutName = layoutName;
        this.culture = culture;
        this.queueDomain = queueDomain;
        this.extendCookieValidity = extendCookieValidity;
        this.cookieValidityMinute = cookieValidityMinute;
        this.cookieDomain = cookieDomain;
        this.isCookieHttpOnly = isCookieHttpOnly;
        this.isCookieSecure = isCookieSecure;
        this.version = version;
        this.actionName = actionName;
    }
    QueueEventConfig.prototype.getString = function () {
        return "EventId:" + this.eventId + "&Version:" + this.version + "&ActionName:" + this.actionName + "&QueueDomain:" + this.queueDomain +
            ("&CookieDomain:" + this.cookieDomain + "&IsCookieHttpOnly:" + this.isCookieHttpOnly + "&IsCookieSecure:" + this.isCookieSecure) +
            ("&ExtendCookieValidity:" + this.extendCookieValidity) +
            ("&CookieValidityMinute:" + this.cookieValidityMinute + "&LayoutName:" + this.layoutName + "&Culture:" + this.culture);
    };
    return QueueEventConfig;
}());
exports.QueueEventConfig = QueueEventConfig;
var CancelEventConfig = /** @class */ (function () {
    function CancelEventConfig(eventId, queueDomain, cookieDomain, isCookieHttpOnly, isCookieSecure, version, actionName) {
        if (actionName === void 0) { actionName = 'unspecified'; }
        this.eventId = eventId;
        this.queueDomain = queueDomain;
        this.cookieDomain = cookieDomain;
        this.isCookieHttpOnly = isCookieHttpOnly;
        this.isCookieSecure = isCookieSecure;
        this.version = version;
        this.actionName = actionName;
    }
    CancelEventConfig.prototype.getString = function () {
        return "EventId:" + this.eventId + "&Version:" + this.version +
            ("&QueueDomain:" + this.queueDomain) +
            ("&CookieDomain:" + this.cookieDomain + "&IsCookieHttpOnly:" + this.isCookieHttpOnly + "&IsCookieSecure:" + this.isCookieSecure) +
            ("&ActionName:" + this.actionName);
    };
    return CancelEventConfig;
}());
exports.CancelEventConfig = CancelEventConfig;
var RequestValidationResult = /** @class */ (function () {
    function RequestValidationResult(actionType, eventId, queueId, redirectUrl, redirectType, actionName) {
        this.actionType = actionType;
        this.eventId = eventId;
        this.queueId = queueId;
        this.redirectUrl = redirectUrl;
        this.redirectType = redirectType;
        this.actionName = actionName;
    }
    RequestValidationResult.prototype.doRedirect = function () {
        return !!this.redirectUrl;
    };
    RequestValidationResult.prototype.getAjaxQueueRedirectHeaderKey = function () {
        return "x-queueit-redirect";
    };
    RequestValidationResult.prototype.getAjaxRedirectUrl = function () {
        if (this.redirectUrl) {
            return QueueITHelpers_1.Utils.encodeUrl(this.redirectUrl);
        }
        return "";
    };
    return RequestValidationResult;
}());
exports.RequestValidationResult = RequestValidationResult;
var KnownUserException = /** @class */ (function () {
    function KnownUserException(message) {
        this.message = message;
    }
    return KnownUserException;
}());
exports.KnownUserException = KnownUserException;
var ActionTypes = /** @class */ (function () {
    function ActionTypes() {
    }
    ActionTypes.QueueAction = "Queue";
    ActionTypes.CancelAction = "Cancel";
    ActionTypes.IgnoreAction = "Ignore";
    return ActionTypes;
}());
exports.ActionTypes = ActionTypes;
//# sourceMappingURL=Models.js.map