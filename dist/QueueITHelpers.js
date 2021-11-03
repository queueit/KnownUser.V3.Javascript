"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorDiagnostics = exports.CookieHelper = exports.QueueParameterHelper = exports.QueueUrlParams = exports.Utils = exports.ErrorCode = void 0;
var Models_1 = require("./Models");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["Hash"] = "hash";
    ErrorCode["Timestamp"] = "timestamp";
    ErrorCode["CookieSessionState"] = "connector/sessionstate";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
var Utils = /** @class */ (function () {
    function Utils() {
    }
    Utils.encodeUrl = function (url) {
        if (!url)
            return "";
        return encodeURIComponent(url).replace(/[!'()*]/g, function (c) {
            // More stringent in adhering to RFC 3986 (which reserves!, ', (, ), and *)
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
            return '%' + c.charCodeAt(0).toString(16);
        });
    };
    Utils.decodeUrl = function (url) {
        return decodeURIComponent(url);
    };
    Utils.generateSHA256Hash = function (secretKey, stringToHash) {
        throw new Models_1.KnownUserException("Missing implementation for generateSHA256Hash");
    };
    Utils.endsWith = function (str, search) {
        if (str === search)
            return true;
        if (!str || !search)
            return false;
        return str.substring(str.length - search.length, str.length) === search;
    };
    Utils.getCurrentTime = function () {
        return Math.floor(new Date().getTime() / 1000);
    };
    return Utils;
}());
exports.Utils = Utils;
var QueueUrlParams = /** @class */ (function () {
    function QueueUrlParams() {
        this.timeStamp = 0;
        this.extendableCookie = false;
    }
    return QueueUrlParams;
}());
exports.QueueUrlParams = QueueUrlParams;
var QueueParameterHelper = /** @class */ (function () {
    function QueueParameterHelper() {
    }
    QueueParameterHelper.extractQueueParams = function (queueitToken) {
        if (!queueitToken) {
            return null;
        }
        var result = new QueueUrlParams();
        result.queueITToken = queueitToken;
        var paramList = result.queueITToken.split(QueueParameterHelper.KeyValueSeparatorGroupChar);
        for (var _i = 0, paramList_1 = paramList; _i < paramList_1.length; _i++) {
            var paramKeyValue = paramList_1[_i];
            var keyValueArr = paramKeyValue.split(QueueParameterHelper.KeyValueSeparatorChar);
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
                    var extendCookie = (keyValueArr[1] || "false").toLowerCase();
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
        var hashWithPrefix = "" + QueueParameterHelper.KeyValueSeparatorGroupChar + QueueParameterHelper.HashKey + QueueParameterHelper.KeyValueSeparatorChar + result.hashCode;
        result.queueITTokenWithoutHash = result.queueITToken.replace(hashWithPrefix, "");
        return result;
    };
    QueueParameterHelper.TimeStampKey = "ts";
    QueueParameterHelper.ExtendableCookieKey = "ce";
    QueueParameterHelper.CookieValidityMinutesKey = "cv";
    QueueParameterHelper.HashKey = "h";
    QueueParameterHelper.EventIdKey = "e";
    QueueParameterHelper.QueueIdKey = "q";
    QueueParameterHelper.RedirectTypeKey = "rt";
    QueueParameterHelper.HashedIPKey = 'hip';
    QueueParameterHelper.KeyValueSeparatorChar = '_';
    QueueParameterHelper.KeyValueSeparatorGroupChar = '~';
    return QueueParameterHelper;
}());
exports.QueueParameterHelper = QueueParameterHelper;
var CookieHelper = /** @class */ (function () {
    function CookieHelper() {
    }
    CookieHelper.toMapFromValue = function (cookieValue) {
        try {
            var result = {};
            var items = cookieValue.split('&');
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var item = items_1[_i];
                var keyValue = item.split('=');
                result[keyValue[0]] = keyValue[1];
            }
            return result;
        }
        catch (_a) {
            return {};
        }
    };
    CookieHelper.toValueFromKeyValueCollection = function (cookieValues) {
        var values = new Array();
        for (var _i = 0, cookieValues_1 = cookieValues; _i < cookieValues_1.length; _i++) {
            var keyVal = cookieValues_1[_i];
            values.push(keyVal.key + "=" + keyVal.value);
        }
        return values.join("&");
    };
    return CookieHelper;
}());
exports.CookieHelper = CookieHelper;
var ConnectorDiagnostics = /** @class */ (function () {
    function ConnectorDiagnostics() {
        this.isEnabled = false;
        this.hasError = false;
    }
    ConnectorDiagnostics.prototype.setStateWithTokenError = function (customerId, errorCode) {
        this.hasError = true;
        var redirectUrl = "https://" + customerId + ".api2.queue-it.net/" + customerId + "/diagnostics/connector/error/?code=" + errorCode;
        this.validationResult = new Models_1.RequestValidationResult("ConnectorDiagnosticsRedirect", null, null, redirectUrl, null, null);
    };
    ConnectorDiagnostics.prototype.setStateWithSetupError = function () {
        this.hasError = true;
        this.validationResult = new Models_1.RequestValidationResult("ConnectorDiagnosticsRedirect", null, null, "https://api2.queue-it.net/diagnostics/connector/error/?code=setup", null, null);
    };
    ConnectorDiagnostics.verify = function (customerId, secretKey, queueitToken) {
        var diagnostics = new ConnectorDiagnostics();
        var qParams = QueueParameterHelper.extractQueueParams(queueitToken);
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
        if (Utils.generateSHA256Hash(secretKey, qParams.queueITTokenWithoutHash) != qParams.hashCode) {
            diagnostics.setStateWithTokenError(customerId, ErrorCode.Hash);
            return diagnostics;
        }
        if (qParams.timeStamp < Utils.getCurrentTime()) {
            diagnostics.setStateWithTokenError(customerId, ErrorCode.Timestamp);
            return diagnostics;
        }
        diagnostics.isEnabled = true;
        return diagnostics;
    };
    return ConnectorDiagnostics;
}());
exports.ConnectorDiagnostics = ConnectorDiagnostics;
//# sourceMappingURL=QueueITHelpers.js.map