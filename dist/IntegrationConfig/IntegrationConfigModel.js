"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.LogicalOperatorType = exports.ComparisonOperatorType = exports.UrlPartType = exports.ValidatorType = exports.TriggerModel = exports.TriggerPart = exports.CustomerIntegration = exports.IntegrationConfigModel = void 0;
var IntegrationConfigModel = /** @class */ (function () {
    function IntegrationConfigModel() {
    }
    return IntegrationConfigModel;
}());
exports.IntegrationConfigModel = IntegrationConfigModel;
var CustomerIntegration = /** @class */ (function () {
    function CustomerIntegration() {
        this.Integrations = new Array();
        this.Version = -1;
    }
    return CustomerIntegration;
}());
exports.CustomerIntegration = CustomerIntegration;
var TriggerPart = /** @class */ (function () {
    function TriggerPart() {
    }
    return TriggerPart;
}());
exports.TriggerPart = TriggerPart;
var TriggerModel = /** @class */ (function () {
    function TriggerModel() {
        this.TriggerParts = new Array();
    }
    return TriggerModel;
}());
exports.TriggerModel = TriggerModel;
var ValidatorType = /** @class */ (function () {
    function ValidatorType() {
    }
    ValidatorType.UrlValidator = "UrlValidator";
    ValidatorType.CookieValidator = "CookieValidator";
    ValidatorType.UserAgentValidator = "UserAgentValidator";
    ValidatorType.HttpHeaderValidator = "HttpHeaderValidator";
    ValidatorType.RequestBodyValidator = "RequestBodyValidator";
    return ValidatorType;
}());
exports.ValidatorType = ValidatorType;
var UrlPartType = /** @class */ (function () {
    function UrlPartType() {
    }
    UrlPartType.HostName = "HostName";
    UrlPartType.PagePath = "PagePath";
    UrlPartType.PageUrl = "PageUrl";
    return UrlPartType;
}());
exports.UrlPartType = UrlPartType;
var ComparisonOperatorType = /** @class */ (function () {
    function ComparisonOperatorType() {
    }
    ComparisonOperatorType.EqualS = "Equals";
    ComparisonOperatorType.Contains = "Contains";
    ComparisonOperatorType.EqualsAny = "EqualsAny";
    ComparisonOperatorType.ContainsAny = "ContainsAny";
    return ComparisonOperatorType;
}());
exports.ComparisonOperatorType = ComparisonOperatorType;
var LogicalOperatorType = /** @class */ (function () {
    function LogicalOperatorType() {
    }
    LogicalOperatorType.Or = "Or";
    LogicalOperatorType.And = "And";
    return LogicalOperatorType;
}());
exports.LogicalOperatorType = LogicalOperatorType;
var ActionType = /** @class */ (function () {
    function ActionType() {
    }
    ActionType.IgnoreAction = "Ignore";
    ActionType.CancelAction = "Cancel";
    ActionType.QueueAction = "Queue";
    return ActionType;
}());
exports.ActionType = ActionType;
