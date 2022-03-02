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
exports.ComparisonOperatorHelper = exports.HttpHeaderValidatorHelper = exports.RequestBodyValidatorHelper = exports.UserAgentValidatorHelper = exports.CookieValidatorHelper = exports.UrlValidatorHelper = exports.IntegrationEvaluator = void 0;
var IntegrationModels = __importStar(require("./IntegrationConfigModel"));
var Models_1 = require("../Models");
var IntegrationEvaluator = /** @class */ (function () {
    function IntegrationEvaluator() {
    }
    IntegrationEvaluator.prototype.getMatchedIntegrationConfig = function (customerIntegration, currentPageUrl, request) {
        if (!request)
            throw new Models_1.KnownUserException("request is null");
        if (!customerIntegration)
            throw new Models_1.KnownUserException("customerIntegration is null");
        for (var _i = 0, _a = customerIntegration.Integrations || []; _i < _a.length; _i++) {
            var integration = _a[_i];
            for (var _b = 0, _c = integration.Triggers; _b < _c.length; _b++) {
                var trigger = _c[_b];
                if (this.evaluateTrigger(trigger, currentPageUrl, request)) {
                    return integration;
                }
            }
        }
        return null;
    };
    IntegrationEvaluator.prototype.evaluateTrigger = function (trigger, currentPageUrl, request) {
        var part;
        if (trigger.LogicalOperator === IntegrationModels.LogicalOperatorType.Or) {
            for (var _i = 0, _a = trigger.TriggerParts; _i < _a.length; _i++) {
                part = _a[_i];
                if (this.evaluateTriggerPart(part, currentPageUrl, request))
                    return true;
            }
            return false;
        }
        else {
            for (var _b = 0, _c = trigger.TriggerParts; _b < _c.length; _b++) {
                part = _c[_b];
                if (!this.evaluateTriggerPart(part, currentPageUrl, request))
                    return false;
            }
            return true;
        }
    };
    IntegrationEvaluator.prototype.evaluateTriggerPart = function (triggerPart, currentPageUrl, request) {
        switch (triggerPart.ValidatorType) {
            case IntegrationModels.ValidatorType.UrlValidator:
                return UrlValidatorHelper.evaluate(triggerPart, currentPageUrl);
            case IntegrationModels.ValidatorType.CookieValidator:
                return CookieValidatorHelper.evaluate(triggerPart, request);
            case IntegrationModels.ValidatorType.UserAgentValidator:
                return UserAgentValidatorHelper.evaluate(triggerPart, request.getUserAgent());
            case IntegrationModels.ValidatorType.HttpHeaderValidator:
                return HttpHeaderValidatorHelper.evaluate(triggerPart, request.getHeader(triggerPart.HttpHeaderName));
            case IntegrationModels.ValidatorType.RequestBodyValidator:
                return RequestBodyValidatorHelper.evaluate(triggerPart, request.getRequestBodyAsString());
            default:
                return false;
        }
    };
    return IntegrationEvaluator;
}());
exports.IntegrationEvaluator = IntegrationEvaluator;
var UrlValidatorHelper = /** @class */ (function () {
    function UrlValidatorHelper() {
    }
    UrlValidatorHelper.evaluate = function (triggerPart, url) {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator, triggerPart.IsNegative, triggerPart.IsIgnoreCase, this.getUrlPart(triggerPart, url), triggerPart.ValueToCompare, triggerPart.ValuesToCompare);
    };
    UrlValidatorHelper.getUrlPart = function (triggerPart, url) {
        switch (triggerPart.UrlPart) {
            case IntegrationModels.UrlPartType.PagePath:
                return this.getPathFromUrl(url);
            case IntegrationModels.UrlPartType.PageUrl:
                return url;
            case IntegrationModels.UrlPartType.HostName:
                return this.getHostNameFromUrl(url);
            default:
                return "";
        }
    };
    UrlValidatorHelper.getHostNameFromUrl = function (url) {
        var urlMatcher = /^(([^:/\?#]+):)?(\/\/([^/\?#]*))?([^\?#]*)(\?([^#]*))?(#(.*))?/;
        var match = urlMatcher.exec(url);
        if (match && match[4])
            return match[4];
        return "";
    };
    UrlValidatorHelper.getPathFromUrl = function (url) {
        var urlMatcher = /^(([^:/\?#]+):)?(\/\/([^/\?#]*))?([^\?#]*)(\?([^#]*))?(#(.*))?/;
        var match = urlMatcher.exec(url);
        if (match && match[5])
            return match[5];
        return "";
    };
    return UrlValidatorHelper;
}());
exports.UrlValidatorHelper = UrlValidatorHelper;
var CookieValidatorHelper = /** @class */ (function () {
    function CookieValidatorHelper() {
    }
    CookieValidatorHelper.evaluate = function (triggerPart, request) {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator, triggerPart.IsNegative, triggerPart.IsIgnoreCase, this.getCookie(triggerPart.CookieName, request), triggerPart.ValueToCompare, triggerPart.ValuesToCompare);
    };
    CookieValidatorHelper.getCookie = function (cookieName, request) {
        var cookie = request.getCookieValue(cookieName);
        if (!cookie)
            return "";
        return cookie;
    };
    return CookieValidatorHelper;
}());
exports.CookieValidatorHelper = CookieValidatorHelper;
var UserAgentValidatorHelper = /** @class */ (function () {
    function UserAgentValidatorHelper() {
    }
    UserAgentValidatorHelper.evaluate = function (triggerPart, userAgent) {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator, triggerPart.IsNegative, triggerPart.IsIgnoreCase, userAgent, triggerPart.ValueToCompare, triggerPart.ValuesToCompare);
    };
    return UserAgentValidatorHelper;
}());
exports.UserAgentValidatorHelper = UserAgentValidatorHelper;
var RequestBodyValidatorHelper = /** @class */ (function () {
    function RequestBodyValidatorHelper() {
    }
    RequestBodyValidatorHelper.evaluate = function (triggerPart, bodyString) {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator, triggerPart.IsNegative, triggerPart.IsIgnoreCase, bodyString, triggerPart.ValueToCompare, triggerPart.ValuesToCompare);
    };
    return RequestBodyValidatorHelper;
}());
exports.RequestBodyValidatorHelper = RequestBodyValidatorHelper;
var HttpHeaderValidatorHelper = /** @class */ (function () {
    function HttpHeaderValidatorHelper() {
    }
    HttpHeaderValidatorHelper.evaluate = function (triggerPart, headerValue) {
        return ComparisonOperatorHelper.evaluate(triggerPart.Operator, triggerPart.IsNegative, triggerPart.IsIgnoreCase, headerValue, triggerPart.ValueToCompare, triggerPart.ValuesToCompare);
    };
    return HttpHeaderValidatorHelper;
}());
exports.HttpHeaderValidatorHelper = HttpHeaderValidatorHelper;
var ComparisonOperatorHelper = /** @class */ (function () {
    function ComparisonOperatorHelper() {
    }
    ComparisonOperatorHelper.evaluate = function (opt, isNegative, isIgnoreCase, value, valueToCompare, valuesToCompare) {
        value = value || "";
        valueToCompare = valueToCompare || "";
        valuesToCompare = valuesToCompare || [];
        switch (opt) {
            case IntegrationModels.ComparisonOperatorType.EqualS:
                return ComparisonOperatorHelper.equalS(value, valueToCompare, isNegative, isIgnoreCase);
            case IntegrationModels.ComparisonOperatorType.Contains:
                return ComparisonOperatorHelper.contains(value, valueToCompare, isNegative, isIgnoreCase);
            case IntegrationModels.ComparisonOperatorType.EqualsAny:
                return ComparisonOperatorHelper.equalsAny(value, valuesToCompare, isNegative, isIgnoreCase);
            case IntegrationModels.ComparisonOperatorType.ContainsAny:
                return ComparisonOperatorHelper.containsAny(value, valuesToCompare, isNegative, isIgnoreCase);
            default:
                return false;
        }
    };
    ComparisonOperatorHelper.contains = function (value, valueToCompare, isNegative, ignoreCase) {
        if (valueToCompare === "*" && value)
            return true;
        var evaluation = false;
        if (ignoreCase)
            evaluation = value.toUpperCase().indexOf(valueToCompare.toUpperCase()) !== -1;
        else
            evaluation = value.indexOf(valueToCompare) !== -1;
        if (isNegative)
            return !evaluation;
        else
            return evaluation;
    };
    ComparisonOperatorHelper.equalS = function (value, valueToCompare, isNegative, ignoreCase) {
        var evaluation = false;
        if (ignoreCase)
            evaluation = value.toUpperCase() === valueToCompare.toUpperCase();
        else
            evaluation = value === valueToCompare;
        if (isNegative)
            return !evaluation;
        else
            return evaluation;
    };
    ComparisonOperatorHelper.equalsAny = function (value, valuesToCompare, isNegative, isIgnoreCase) {
        for (var _i = 0, valuesToCompare_1 = valuesToCompare; _i < valuesToCompare_1.length; _i++) {
            var valueToCompare = valuesToCompare_1[_i];
            if (ComparisonOperatorHelper.equalS(value, valueToCompare, false, isIgnoreCase))
                return !isNegative;
        }
        return isNegative;
    };
    ComparisonOperatorHelper.containsAny = function (value, valuesToCompare, isNegative, isIgnoreCase) {
        for (var _i = 0, valuesToCompare_2 = valuesToCompare; _i < valuesToCompare_2.length; _i++) {
            var valueToCompare = valuesToCompare_2[_i];
            if (ComparisonOperatorHelper.contains(value, valueToCompare, false, isIgnoreCase))
                return !isNegative;
        }
        return isNegative;
    };
    return ComparisonOperatorHelper;
}());
exports.ComparisonOperatorHelper = ComparisonOperatorHelper;
//# sourceMappingURL=IntegrationConfigHelpers.js.map