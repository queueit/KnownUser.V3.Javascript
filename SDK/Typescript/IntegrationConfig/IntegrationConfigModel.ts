namespace QueueIT.KnownUserV3.SDK.IntegrationConfig {
    export class IntegrationConfigModel {
        Name: string;
        EventId: string;
        CookieDomain: string;
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

    export class CustomerIntegration {
        constructor() {
            this.Integrations = new Array<IntegrationConfigModel>();
            this.Version = -1;
        }
        //sorted list of integrations
        Integrations: Array<IntegrationConfigModel>;
        Version: number;
    }

    export class TriggerPart {
        ValidatorType: string;
        Operator: string;
        ValueToCompare: string;
        ValuesToCompare: Array<string>;
        IsNegative: boolean;
        IsIgnoreCase: boolean;
        //UrlValidator
        UrlPart: string;
        //CookieValidator
        CookieName: string;
        //HttpHeaderValidator
        HttpHeaderName: string;
    }

    export class TriggerModel {
        constructor() {
            this.TriggerParts = new Array<TriggerPart>();
        }
        TriggerParts: Array<TriggerPart>;
        LogicalOperator: string;
    }

    export class ValidatorType {
        public static readonly UrlValidator = "UrlValidator";
        public static readonly CookieValidator = "CookieValidator";
        public static readonly UserAgentValidator = "UserAgentValidator";
        public static readonly HttpHeaderValidator = "HttpHeaderValidator";
    }

    export class UrlPartType {
        static readonly HostName = "HostName";
        static readonly PagePath = "PagePath";
        static readonly PageUrl = "PageUrl";
    }

    export class ComparisonOperatorType {
        static readonly EqualS = "Equals";
        static readonly Contains = "Contains";
        static readonly EqualsAny = "EqualsAny";
        static readonly ContainsAny = "ContainsAny";
        static readonly StartsWith = "StartsWith";
        static readonly EndsWith = "EndsWith";
        static readonly MatchesWith = "MatchesWith";
    }

    export class LogicalOperatorType {
        public static readonly Or = "Or";
        public static readonly And = "And";
    }

    export class ActionType {
        public static readonly IgnoreAction = "Ignore";
        public static readonly CancelAction = "Cancel";
        public static readonly QueueAction = "Queue";
    }
}