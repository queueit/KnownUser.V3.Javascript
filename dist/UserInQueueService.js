"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInQueueService = void 0;
var QueueITHelpers_1 = require("./QueueITHelpers");
var Models_1 = require("./Models");
var UserInQueueService = /** @class */ (function () {
    function UserInQueueService(userInQueueStateRepository) {
        this.userInQueueStateRepository = userInQueueStateRepository;
    }
    UserInQueueService.prototype.getValidTokenResult = function (config, queueParams, secretKey) {
        this.userInQueueStateRepository.store(config.eventId, queueParams.queueId, queueParams.cookieValidityMinutes, config.cookieDomain, queueParams.redirectType, secretKey);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, queueParams.queueId, null, queueParams.redirectType, config.actionName);
    };
    UserInQueueService.prototype.getErrorResult = function (customerId, targetUrl, config, qParams, errorCode) {
        var query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName) +
            ("&queueittoken=" + qParams.queueITToken) +
            ("&ts=" + QueueITHelpers_1.Utils.getCurrentTime()) +
            (targetUrl ? "&t=" + QueueITHelpers_1.Utils.encodeUrl(targetUrl) : "");
        var uriPath = "error/" + errorCode + "/";
        var redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, null, redirectUrl, null, config.actionName);
    };
    UserInQueueService.prototype.getQueueResult = function (targetUrl, config, customerId) {
        var query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName, config.actionName) +
            (targetUrl ? "&t=" + QueueITHelpers_1.Utils.encodeUrl(targetUrl) : "");
        var redirectUrl = this.generateRedirectUrl(config.queueDomain, "", query);
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, null, redirectUrl, null, config.actionName);
    };
    UserInQueueService.prototype.getQueryString = function (customerId, eventId, configVersion, culture, layoutName, actionName) {
        var queryStringList = new Array();
        queryStringList.push("c=" + QueueITHelpers_1.Utils.encodeUrl(customerId));
        queryStringList.push("e=" + QueueITHelpers_1.Utils.encodeUrl(eventId));
        queryStringList.push("ver=" + UserInQueueService.SDK_VERSION);
        queryStringList.push("cver=" + configVersion);
        queryStringList.push("man=" + QueueITHelpers_1.Utils.encodeUrl(actionName));
        if (culture)
            queryStringList.push("cid=" + QueueITHelpers_1.Utils.encodeUrl(culture));
        if (layoutName)
            queryStringList.push("l=" + QueueITHelpers_1.Utils.encodeUrl(layoutName));
        return queryStringList.join("&");
    };
    UserInQueueService.prototype.generateRedirectUrl = function (queueDomain, uriPath, query) {
        if (!QueueITHelpers_1.Utils.endsWith(queueDomain, "/"))
            queueDomain = queueDomain + "/";
        var redirectUrl = "https://" + queueDomain + uriPath + "?" + query;
        return redirectUrl;
    };
    UserInQueueService.prototype.validateQueueRequest = function (targetUrl, queueitToken, config, customerId, secretKey) {
        var state = this.userInQueueStateRepository.getState(config.eventId, config.cookieValidityMinute, secretKey, true);
        if (state.isValid) {
            if (state.isStateExtendable() && config.extendCookieValidity) {
                this.userInQueueStateRepository.store(config.eventId, state.queueId, null, config.cookieDomain, state.redirectType, secretKey);
            }
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.QueueAction, config.eventId, state.queueId, null, state.redirectType, config.actionName);
        }
        var queueParams = QueueITHelpers_1.QueueParameterHelper.extractQueueParams(queueitToken);
        var requestValidationResult = null;
        var isTokenValid = false;
        if (queueParams != null) {
            var tokenValidationResult = this.validateToken(config, queueParams, secretKey);
            isTokenValid = tokenValidationResult.isValid;
            if (isTokenValid) {
                requestValidationResult = this.getValidTokenResult(config, queueParams, secretKey);
            }
            else {
                requestValidationResult = this.getErrorResult(customerId, targetUrl, config, queueParams, tokenValidationResult.errorCode);
            }
        }
        else {
            requestValidationResult = this.getQueueResult(targetUrl, config, customerId);
        }
        if (state.isFound && !isTokenValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain);
        }
        return requestValidationResult;
    };
    UserInQueueService.prototype.validateCancelRequest = function (targetUrl, config, customerId, secretKey) {
        //we do not care how long cookie is valid while canceling cookie
        var state = this.userInQueueStateRepository.getState(config.eventId, -1, secretKey, false);
        if (state.isValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain);
            var query = this.getQueryString(customerId, config.eventId, config.version, null, null, config.actionName) +
                (targetUrl ? "&r=" + QueueITHelpers_1.Utils.encodeUrl(targetUrl) : "");
            var uriPath = "cancel/" + customerId + "/" + config.eventId + "/";
            var redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.CancelAction, config.eventId, state.queueId, redirectUrl, state.redirectType, config.actionName);
        }
        else {
            return new Models_1.RequestValidationResult(Models_1.ActionTypes.CancelAction, config.eventId, null, null, null, config.actionName);
        }
    };
    UserInQueueService.prototype.extendQueueCookie = function (eventId, cookieValidityMinutes, cookieDomain, secretKey) {
        this.userInQueueStateRepository.reissueQueueCookie(eventId, cookieValidityMinutes, cookieDomain, secretKey);
    };
    UserInQueueService.prototype.getIgnoreResult = function (actionName) {
        return new Models_1.RequestValidationResult(Models_1.ActionTypes.IgnoreAction, null, null, null, null, actionName);
    };
    UserInQueueService.prototype.validateToken = function (config, queueParams, secretKey) {
        var calculatedHash = QueueITHelpers_1.Utils.generateSHA256Hash(secretKey, queueParams.queueITTokenWithoutHash);
        if (calculatedHash !== queueParams.hashCode)
            return new TokenValidationResult(false, "hash");
        if (queueParams.eventId !== config.eventId)
            return new TokenValidationResult(false, "eventid");
        if (queueParams.timeStamp < QueueITHelpers_1.Utils.getCurrentTime())
            return new TokenValidationResult(false, "timestamp");
        return new TokenValidationResult(true, null);
    };
    UserInQueueService.SDK_VERSION = "v3-javascript-" + "3.6.2";
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
