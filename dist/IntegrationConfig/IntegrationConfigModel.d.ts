export declare class IntegrationConfigModel {
    Name: string;
    EventId: string;
    CookieDomain: string;
    IsCookieHttpOnly: boolean;
    IsCookieSecure: boolean;
    LayoutName: string;
    Culture: string;
    ExtendCookieValidity: boolean | null;
    CookieValidityMinute: number | null;
    QueueDomain: string;
    RedirectLogic: string;
    ForcedTargetUrl: string;
    ActionType: string;
    Triggers: Array<TriggerModel>;
}
export declare class CustomerIntegration {
    constructor();
    Integrations: Array<IntegrationConfigModel>;
    Version: number;
}
export declare class TriggerPart {
    ValidatorType: string;
    Operator: string;
    ValueToCompare: string;
    ValuesToCompare: Array<string>;
    IsNegative: boolean;
    IsIgnoreCase: boolean;
    UrlPart: string;
    CookieName: string;
    HttpHeaderName: string;
}
export declare class TriggerModel {
    constructor();
    TriggerParts: Array<TriggerPart>;
    LogicalOperator: string;
}
export declare class ValidatorType {
    static readonly UrlValidator = "UrlValidator";
    static readonly CookieValidator = "CookieValidator";
    static readonly UserAgentValidator = "UserAgentValidator";
    static readonly HttpHeaderValidator = "HttpHeaderValidator";
    static readonly RequestBodyValidator = "RequestBodyValidator";
}
export declare class UrlPartType {
    static readonly HostName = "HostName";
    static readonly PagePath = "PagePath";
    static readonly PageUrl = "PageUrl";
}
export declare class ComparisonOperatorType {
    static readonly EqualS = "Equals";
    static readonly Contains = "Contains";
    static readonly EqualsAny = "EqualsAny";
    static readonly ContainsAny = "ContainsAny";
}
export declare class LogicalOperatorType {
    static readonly Or = "Or";
    static readonly And = "And";
}
export declare class ActionType {
    static readonly IgnoreAction = "Ignore";
    static readonly CancelAction = "Cancel";
    static readonly QueueAction = "Queue";
}
