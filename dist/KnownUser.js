"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownUser = void 0;
var UserInQueueService_1 = require("./UserInQueueService");
var UserInQueueStateCookieRepository_1 = require("./UserInQueueStateCookieRepository");
var Models_1 = require("./Models");
var QueueITHelpers_1 = require("./QueueITHelpers");
var IntegrationConfigHelpers = __importStar(require("./IntegrationConfig/IntegrationConfigHelpers"));
var KnownUser = /** @class */ (function () {
    function KnownUser() {
    }
    KnownUser.getUserInQueueService = function (contextProvider) {
        if (!this.UserInQueueService) {
            return new UserInQueueService_1.UserInQueueService(contextProvider, new UserInQueueStateCookieRepository_1.UserInQueueStateCookieRepository(contextProvider));
        }
        return this.UserInQueueService;
    };
    KnownUser.isQueueAjaxCall = function (contextProvider) {
        return !!contextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey);
    };
    KnownUser.generateTargetUrl = function (originalTargetUrl, contextProvider) {
        return !this.isQueueAjaxCall(contextProvider) ?
            originalTargetUrl :
            QueueITHelpers_1.Utils.decodeUrl(contextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey));
    };
    KnownUser.logExtraRequestDetails = function (debugEntries, contextProvider) {
        debugEntries["ServerUtcTime"] = (new Date()).toISOString().split('.')[0] + "Z";
        debugEntries["RequestIP"] = contextProvider.getHttpRequest().getUserHostAddress();
        debugEntries["RequestHttpHeader_Via"] = contextProvider.getHttpRequest().getHeader("Via");
        debugEntries["RequestHttpHeader_Forwarded"] = contextProvider.getHttpRequest().getHeader("Forwarded");
        debugEntries["RequestHttpHeader_XForwardedFor"] = contextProvider.getHttpRequest().getHeader("X-Forwarded-For");
        debugEntries["RequestHttpHeader_XForwardedHost"] = contextProvider.getHttpRequest().getHeader("X-Forwarded-Host");
        debugEntries["RequestHttpHeader_XForwardedProto"] = contextProvider.getHttpRequest().getHeader("X-Forwarded-Proto");
    };
    KnownUser.setDebugCookie = function (debugEntries, contextProvider) {
        var cookieValue = "";
        for (var key in debugEntries) {
            cookieValue += key + "=" + debugEntries[key] + "|";
        }
        if (cookieValue.lastIndexOf("|") === cookieValue.length - 1) {
            cookieValue = cookieValue.substring(0, cookieValue.length - 1);
        }
        if (!cookieValue)
            return;
        contextProvider.getHttpResponse().setCookie(this.QueueITDebugKey, cookieValue, null, QueueITHelpers_1.Utils.getCurrentTime() + 20 * 60, // now + 20 mins
        false, false);
    };
    KnownUser._resolveQueueRequestByLocalConfig = function (targetUrl, queueitToken, queueConfig, customerId, secretKey, contextProvider, debugEntries, isDebug) {
        if (isDebug) {
            debugEntries["SdkVersion"] = UserInQueueService_1.UserInQueueService.SDK_VERSION;
            debugEntries["TargetUrl"] = targetUrl;
            debugEntries["QueueitToken"] = queueitToken;
            debugEntries["OriginalUrl"] = contextProvider.getHttpRequest().getAbsoluteUri();
            debugEntries["QueueConfig"] = queueConfig !== null ? queueConfig.getString() : "NULL";
            this.logExtraRequestDetails(debugEntries, contextProvider);
        }
        if (!customerId)
            throw new Models_1.KnownUserException("customerId can not be null or empty.");
        if (!secretKey)
            throw new Models_1.KnownUserException("secretKey can not be null or empty.");
        if (!queueConfig)
            throw new Models_1.KnownUserException("queueConfig can not be null.");
        if (!queueConfig.eventId)
            throw new Models_1.KnownUserException("queueConfig.eventId can not be null or empty.");
        if (!queueConfig.queueDomain)
            throw new Models_1.KnownUserException("queueConfig.queueDomain can not be null or empty.");
        if (queueConfig.cookieValidityMinute <= 0)
            throw new Models_1.KnownUserException("queueConfig.cookieValidityMinute should be integer greater than 0.");
        var userInQueueService = this.getUserInQueueService(contextProvider);
        var result = userInQueueService.validateQueueRequest(targetUrl, queueitToken, queueConfig, customerId, secretKey);
        result.isAjaxResult = this.isQueueAjaxCall(contextProvider);
        return result;
    };
    KnownUser._cancelRequestByLocalConfig = function (targetUrl, queueitToken, cancelConfig, customerId, secretKey, contextProvider, debugEntries, isDebug) {
        targetUrl = this.generateTargetUrl(targetUrl, contextProvider);
        if (isDebug) {
            debugEntries["SdkVersion"] = UserInQueueService_1.UserInQueueService.SDK_VERSION;
            debugEntries["TargetUrl"] = targetUrl;
            debugEntries["QueueitToken"] = queueitToken;
            debugEntries["CancelConfig"] = cancelConfig !== null ? cancelConfig.getString() : "NULL";
            debugEntries["OriginalUrl"] = contextProvider.getHttpRequest().getAbsoluteUri();
            this.logExtraRequestDetails(debugEntries, contextProvider);
        }
        if (!targetUrl)
            throw new Models_1.KnownUserException("targetUrl can not be null or empty.");
        if (!customerId)
            throw new Models_1.KnownUserException("customerId can not be null or empty.");
        if (!secretKey)
            throw new Models_1.KnownUserException("secretKey can not be null or empty.");
        if (!cancelConfig)
            throw new Models_1.KnownUserException("cancelConfig can not be null.");
        if (!cancelConfig.eventId)
            throw new Models_1.KnownUserException("cancelConfig.eventId can not be null or empty.");
        if (!cancelConfig.queueDomain)
            throw new Models_1.KnownUserException("cancelConfig.queueDomain can not be null or empty.");
        var userInQueueService = this.getUserInQueueService(contextProvider);
        var result = userInQueueService.validateCancelRequest(targetUrl, cancelConfig, customerId, secretKey);
        result.isAjaxResult = this.isQueueAjaxCall(contextProvider);
        return result;
    };
    KnownUser.handleQueueAction = function (currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, contextProvider, debugEntries, isDebug) {
        var targetUrl;
        switch (matchedConfig.RedirectLogic) {
            case "ForcedTargetUrl":
                targetUrl = matchedConfig.ForcedTargetUrl;
                break;
            case "EventTargetUrl":
                targetUrl = "";
                break;
            default:
                targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, contextProvider);
                break;
        }
        var queueEventConfig = new Models_1.QueueEventConfig(matchedConfig.EventId, matchedConfig.LayoutName, matchedConfig.Culture, matchedConfig.QueueDomain, matchedConfig.ExtendCookieValidity, matchedConfig.CookieValidityMinute, matchedConfig.CookieDomain, matchedConfig.IsCookieHttpOnly || false, matchedConfig.IsCookieSecure || false, customerIntegrationInfo.Version, matchedConfig.Name);
        return this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueEventConfig, customerId, secretKey, contextProvider, debugEntries, isDebug);
    };
    KnownUser.handleCancelAction = function (currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, contextProvider, debugEntries, isDebug) {
        var cancelEventConfig = new Models_1.CancelEventConfig(matchedConfig.EventId, matchedConfig.QueueDomain, matchedConfig.CookieDomain, matchedConfig.IsCookieHttpOnly || false, matchedConfig.IsCookieSecure || false, customerIntegrationInfo.Version, matchedConfig.Name);
        var targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, contextProvider);
        return this._cancelRequestByLocalConfig(targetUrl, queueitToken, cancelEventConfig, customerId, secretKey, contextProvider, debugEntries, isDebug);
    };
    KnownUser.handleIgnoreAction = function (contextProvider, actionName) {
        var userInQueueService = this.getUserInQueueService(contextProvider);
        var result = userInQueueService.getIgnoreResult(actionName);
        result.isAjaxResult = this.isQueueAjaxCall(contextProvider);
        return result;
    };
    KnownUser.extendQueueCookie = function (eventId, cookieValidityMinute, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey, contextProvider) {
        if (!eventId)
            throw new Models_1.KnownUserException("eventId can not be null or empty.");
        if (!secretKey)
            throw new Models_1.KnownUserException("secretKey can not be null or empty.");
        if (cookieValidityMinute <= 0)
            throw new Models_1.KnownUserException("cookieValidityMinute should be integer greater than 0.");
        var userInQueueService = this.getUserInQueueService(contextProvider);
        userInQueueService.extendQueueCookie(eventId, cookieValidityMinute, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);
    };
    KnownUser.resolveQueueRequestByLocalConfig = function (targetUrl, queueitToken, queueConfig, customerId, secretKey, contextProvider) {
        var debugEntries = {};
        var connectorDiagnostics = QueueITHelpers_1.ConnectorDiagnostics.verify(customerId, secretKey, queueitToken, contextProvider);
        if (connectorDiagnostics.hasError)
            return connectorDiagnostics.validationResult;
        try {
            targetUrl = this.generateTargetUrl(targetUrl, contextProvider);
            return this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueConfig, customerId, secretKey, contextProvider, debugEntries, connectorDiagnostics.isEnabled);
        }
        catch (e) {
            if (connectorDiagnostics.isEnabled)
                debugEntries["Exception"] = e.message;
            throw e;
        }
        finally {
            this.setDebugCookie(debugEntries, contextProvider);
        }
    };
    KnownUser.validateRequestByIntegrationConfig = function (currentUrlWithoutQueueITToken, queueitToken, integrationsConfigString, customerId, secretKey, contextProvider) {
        var debugEntries = {};
        var customerIntegrationInfo;
        var connectorDiagnostics = QueueITHelpers_1.ConnectorDiagnostics.verify(customerId, secretKey, queueitToken, contextProvider);
        if (connectorDiagnostics.hasError)
            return connectorDiagnostics.validationResult;
        try {
            if (connectorDiagnostics.isEnabled) {
                debugEntries["SdkVersion"] = UserInQueueService_1.UserInQueueService.SDK_VERSION;
                debugEntries["PureUrl"] = currentUrlWithoutQueueITToken;
                debugEntries["QueueitToken"] = queueitToken;
                debugEntries["OriginalUrl"] = contextProvider.getHttpRequest().getAbsoluteUri();
                this.logExtraRequestDetails(debugEntries, contextProvider);
            }
            customerIntegrationInfo = JSON.parse(integrationsConfigString);
            if (connectorDiagnostics.isEnabled) {
                debugEntries["ConfigVersion"] = customerIntegrationInfo && customerIntegrationInfo.Version ? customerIntegrationInfo.Version.toString() : "NULL";
            }
            if (!currentUrlWithoutQueueITToken)
                throw new Models_1.KnownUserException("currentUrlWithoutQueueITToken can not be null or empty.");
            if (!customerIntegrationInfo || !customerIntegrationInfo.Version)
                throw new Models_1.KnownUserException("integrationsConfigString can not be null or empty.");
            var configEvaluator = new IntegrationConfigHelpers.IntegrationEvaluator();
            var matchedConfig = configEvaluator.getMatchedIntegrationConfig(customerIntegrationInfo, currentUrlWithoutQueueITToken, contextProvider.getHttpRequest());
            if (connectorDiagnostics.isEnabled) {
                debugEntries["MatchedConfig"] = matchedConfig ? matchedConfig.Name : "NULL";
            }
            if (!matchedConfig)
                return new Models_1.RequestValidationResult(null, null, null, null, null, null);
            switch (matchedConfig.ActionType) {
                case Models_1.ActionTypes.QueueAction: {
                    return this.handleQueueAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, contextProvider, debugEntries, connectorDiagnostics.isEnabled);
                }
                case Models_1.ActionTypes.CancelAction: {
                    return this.handleCancelAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, contextProvider, debugEntries, connectorDiagnostics.isEnabled);
                }
                default: {
                    return this.handleIgnoreAction(contextProvider, matchedConfig.Name);
                }
            }
        }
        catch (e) {
            if (connectorDiagnostics.isEnabled)
                debugEntries["Exception"] = e.message;
            throw e;
        }
        finally {
            this.setDebugCookie(debugEntries, contextProvider);
        }
    };
    KnownUser.cancelRequestByLocalConfig = function (targetUrl, queueitToken, cancelConfig, customerId, secretKey, contextProvider) {
        var debugEntries = {};
        var connectorDiagnostics = QueueITHelpers_1.ConnectorDiagnostics.verify(customerId, secretKey, queueitToken, contextProvider);
        if (connectorDiagnostics.hasError)
            return connectorDiagnostics.validationResult;
        try {
            return this._cancelRequestByLocalConfig(targetUrl, queueitToken, cancelConfig, customerId, secretKey, contextProvider, debugEntries, connectorDiagnostics.isEnabled);
        }
        catch (e) {
            if (connectorDiagnostics.isEnabled)
                debugEntries["Exception"] = e.message;
            throw e;
        }
        finally {
            this.setDebugCookie(debugEntries, contextProvider);
        }
    };
    KnownUser.QueueITTokenKey = "queueittoken";
    KnownUser.QueueITDebugKey = "queueitdebug";
    KnownUser.QueueITAjaxHeaderKey = "x-queueit-ajaxpageurl";
    KnownUser.UserInQueueService = null;
    return KnownUser;
}());
exports.KnownUser = KnownUser;
//# sourceMappingURL=KnownUser.js.map