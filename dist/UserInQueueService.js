"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInQueueService = void 0;
var QueueITHelpers_1 = require("./QueueITHelpers");
var Models_1 = require("./Models");
var UserInQueueService = /** @class */ (function () {
    function UserInQueueService(contextProvider, userInQueueStateRepository) {
        this.contextProvider = contextProvider;
        this.userInQueueStateRepository = userInQueueStateRepository;
    }
    UserInQueueService.prototype.getValidTokenResult = function (config, queueParams, secretKey) {
        this.userInQueueStateRepository.store(config.eventId, queueParams.queueId, queueParams.cookieValidityMinutes, config.cookieDomain, config.isCookieHttpOnly, config.isCookieSecure, queueParams.redirectType, queueParams.hashedIp, secretKey);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, queueParams.queueId, null, queueParams.redirectType, config.actionName);
    };
    UserInQueueService.prototype.getErrorResult = function (customerId, targetUrl, config, qParams, errorCode, state) {
        var queueItTokenParam = qParams ? "&queueittoken=".concat(qParams.queueITToken) : '';
        var query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName, state.getInvalidCookieReason()) +
            queueItTokenParam +
            "&ts=".concat(QueueITHelpers_1.Utils.getCurrentTime()) +
            (targetUrl ? "&t=".concat(QueueITHelpers_1.Utils.encodeUrl(targetUrl)) : "");
        var uriPath = "error/".concat(errorCode, "/");
        var redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, null, redirectUrl, null, config.actionName);
    };
    UserInQueueService.prototype.getQueueResult = function (targetUrl, config, customerId) {
        var enqueueToken = this.contextProvider.getEnqueueTokenProvider
            && this.contextProvider.getEnqueueTokenProvider().getEnqueueToken(config.eventId);
        var query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName, null, enqueueToken) +
            (targetUrl ? "&t=" + QueueITHelpers_1.Utils.encodeUrl(targetUrl) : "");
        var redirectUrl = this.generateRedirectUrl(config.queueDomain, "", query);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, null, redirectUrl, null, config.actionName);
    };
    UserInQueueService.prototype.getQueryString = function (customerId, eventId, configVersion, culture, layoutName, actionName, invalidCookieReason, enqueueToken) {
        var queryStringList = new Array();
        queryStringList.push("c=".concat(QueueITHelpers_1.Utils.encodeUrl(customerId)));
        queryStringList.push("e=".concat(QueueITHelpers_1.Utils.encodeUrl(eventId)));
        queryStringList.push("ver=".concat(UserInQueueService.SDK_VERSION));
        queryStringList.push("cver=".concat(configVersion));
        queryStringList.push("man=".concat(QueueITHelpers_1.Utils.encodeUrl(actionName)));
        if (culture) {
            queryStringList.push("cid=" + QueueITHelpers_1.Utils.encodeUrl(culture));
        }
        if (layoutName) {
            queryStringList.push("l=" + QueueITHelpers_1.Utils.encodeUrl(layoutName));
        }
        if (invalidCookieReason) {
            queryStringList.push("icr=" + QueueITHelpers_1.Utils.encodeUrl(invalidCookieReason));
        }
        if (enqueueToken) {
            queryStringList.push("enqueuetoken=".concat(enqueueToken));
        }
        return queryStringList.join("&");
    };
    UserInQueueService.prototype.generateRedirectUrl = function (queueDomain, uriPath, query) {
        if (!QueueITHelpers_1.Utils.endsWith(queueDomain, "/"))
            queueDomain = queueDomain + "/";
        return "https://".concat(queueDomain).concat(uriPath, "?").concat(query);
    };
    UserInQueueService.prototype.validateQueueRequest = function (targetUrl, queueitToken, config, customerId, secretKey) {
        var state = this.userInQueueStateRepository.getState(config.eventId, config.cookieValidityMinute, secretKey, true);
        if (state.isValid) {
            if (state.isStateExtendable() && config.extendCookieValidity) {
                this.userInQueueStateRepository.store(config.eventId, state.queueId, null, config.cookieDomain, config.isCookieHttpOnly, config.isCookieSecure, state.redirectType, state.hashedIp, secretKey);
            }
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, state.queueId, null, state.redirectType, config.actionName);
        }
        var queueTokenParams = QueueITHelpers_1.QueueParameterHelper.extractQueueParams(queueitToken);
        var requestValidationResult;
        var isTokenValid = false;
        if (queueTokenParams) {
            var tokenValidationResult = this.validateToken(config, queueTokenParams, secretKey);
            isTokenValid = tokenValidationResult.isValid;
            if (isTokenValid) {
                requestValidationResult = this.getValidTokenResult(config, queueTokenParams, secretKey);
            }
            else {
                requestValidationResult = this.getErrorResult(customerId, targetUrl, config, queueTokenParams, tokenValidationResult.errorCode, state);
            }
        }
        else if (state.isBoundToAnotherIp) {
            requestValidationResult = this.getErrorResult(customerId, targetUrl, config, queueTokenParams, QueueITHelpers_1.ErrorCode.CookieSessionState, state);
        }
        else {
            requestValidationResult = this.getQueueResult(targetUrl, config, customerId);
        }
        if (state.isFound && !isTokenValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain, config.isCookieHttpOnly, config.isCookieSecure);
        }
        return requestValidationResult;
    };
    UserInQueueService.prototype.validateCancelRequest = function (targetUrl, config, customerId, secretKey) {
        //we do not care how long cookie is valid while canceling cookie
        var state = this.userInQueueStateRepository.getState(config.eventId, -1, secretKey, false);
        if (state.isValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain, config.isCookieHttpOnly, config.isCookieSecure);
            var query = this.getQueryString(customerId, config.eventId, config.version, null, null, config.actionName) +
                (targetUrl ? "&r=" + QueueITHelpers_1.Utils.encodeUrl(targetUrl) : "");
            var uriPath = "cancel/".concat(customerId, "/").concat(config.eventId);
            if (state.queueId) {
                uriPath += "/".concat(state.queueId);
            }
            var redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.CancelAction, config.eventId, state.queueId, redirectUrl, state.redirectType, config.actionName);
        }
        else {
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.CancelAction, config.eventId, null, null, null, config.actionName);
        }
    };
    UserInQueueService.prototype.extendQueueCookie = function (eventId, cookieValidityMinutes, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey) {
        this.userInQueueStateRepository.reissueQueueCookie(eventId, cookieValidityMinutes, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);
    };
    UserInQueueService.prototype.getIgnoreResult = function (actionName) {
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.IgnoreAction, null, null, null, null, actionName);
    };
    UserInQueueService.prototype.validateToken = function (config, queueParams, secretKey) {
        var calculatedHash = QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, queueParams.queueITTokenWithoutHash, this.contextProvider);
        if (calculatedHash !== queueParams.hashCode)
            return new TokenValidationResult(false, "hash");
        if (queueParams.eventId !== config.eventId)
            return new TokenValidationResult(false, "eventid");
        if (queueParams.timeStamp < QueueITHelpers_1.Utils.getCurrentTime())
            return new TokenValidationResult(false, "timestamp");
        var clientIp = this.contextProvider.getHttpRequest().getUserHostAddress();
        if (queueParams.hashedIp && clientIp) {
            var hashedIp = QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, clientIp, this.contextProvider);
            if (hashedIp !== queueParams.hashedIp) {
                return new TokenValidationResult(false, "ip");
            }
        }
        return new TokenValidationResult(true, null);
    };
    UserInQueueService.SDK_VERSION = "v3-javascript-" + "3.7.8";
    return UserInQueueService;
}());
exports.UserInQueueService = UserInQueueService;
var TokenValidationResult = /** @class */ (function () {
    function TokenValidationResult(isValid, errorCode) {
        this.isValid = isValid;
        this.errorCode = errorCode;
    }
    return TokenValidationResult;
}());
//# sourceMappingURL=UserInQueueService.js.map