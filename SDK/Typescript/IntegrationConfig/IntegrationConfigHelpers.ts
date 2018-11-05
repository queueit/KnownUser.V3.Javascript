namespace QueueIT.KnownUserV3.SDK.IntegrationConfig {
    export interface IIntegrationEvaluator {
        getMatchedIntegrationConfig(
            customerIntegration: CustomerIntegration, currentPageUrl: string, request: IHttpRequest): IntegrationConfigModel;
    }

    export class IntegrationEvaluator implements IIntegrationEvaluator {
        public getMatchedIntegrationConfig(customerIntegration: CustomerIntegration, currentPageUrl: string, request: IHttpRequest): IntegrationConfigModel {

            if (!request)
                throw new KnownUserException("request is null");

            if (!customerIntegration)
                throw new KnownUserException("customerIntegration is null");

            for (var integration of customerIntegration.Integrations || []) {
                for (var trigger of integration.Triggers) {
                    if (this.evaluateTrigger(trigger, currentPageUrl, request)) {
                        return integration;
                    }
                }
            }
            return null;
        }

        private evaluateTrigger(trigger: TriggerModel, currentPageUrl: string, request: IHttpRequest) {
            let part;
            if (trigger.LogicalOperator === LogicalOperatorType.Or) {
                for (part of trigger.TriggerParts) {
                    if (this.evaluateTriggerPart(part, currentPageUrl, request))
                        return true;
                }
                return false;
            }
            else {
                for (part of trigger.TriggerParts) {
                    if (!this.evaluateTriggerPart(part, currentPageUrl, request))
                        return false;
                }
                return true;
            }
        }

        private evaluateTriggerPart(triggerPart: TriggerPart, currentPageUrl: string, request: IHttpRequest): boolean {
            switch (triggerPart.ValidatorType) {
                case ValidatorType.UrlValidator:
                    return UrlValidatorHelper.evaluate(triggerPart, currentPageUrl);
                case ValidatorType.CookieValidator:
                    return CookieValidatorHelper.evaluate(triggerPart, request);
                case ValidatorType.UserAgentValidator:
                    return UserAgentValidatorHelper.evaluate(triggerPart, request.getUserAgent());
                case ValidatorType.HttpHeaderValidator:
                    return HttpHeaderValidatorHelper.evaluate(triggerPart, request.getHeader(triggerPart.HttpHeaderName));
                default:
                    return false;
            }
        }
    }

    class UrlValidatorHelper {
        public static evaluate(triggerPart: TriggerPart, url: string): boolean {
            return ComparisonOperatorHelper.evaluate(
                triggerPart.Operator,
                triggerPart.IsNegative,
                triggerPart.IsIgnoreCase,
                this.getUrlPart(triggerPart, url),
                triggerPart.ValueToCompare,
                triggerPart.ValuesToCompare);
        }

        private static getUrlPart(triggerPart: TriggerPart, url: string): string {
            switch (triggerPart.UrlPart) {
                case UrlPartType.PagePath:
                    return this.getPathFromUrl(url);
                case UrlPartType.PageUrl:
                    return url;
                case UrlPartType.HostName:
                    return this.getHostNameFromUrl(url);
                default:
                    return "";
            }
        }

        public static getHostNameFromUrl(url: string): string {

            let urlMatcher = /^(([^:/\?#]+):)?(\/\/([^/\?#]*))?([^\?#]*)(\?([^#]*))?(#(.*))?/;
            let match = urlMatcher.exec(url);
            if (match && match[4])
                return match[4];
            return "";
        }

        public static getPathFromUrl(url: string): string {
            let urlMatcher = /^(([^:/\?#]+):)?(\/\/([^/\?#]*))?([^\?#]*)(\?([^#]*))?(#(.*))?/;
            let match = urlMatcher.exec(url);
            if (match && match[5])
                return match[5];
            return "";
        }
    }

    class CookieValidatorHelper {
        public static evaluate(triggerPart: TriggerPart, request: IHttpRequest): boolean {
            return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
                triggerPart.IsNegative,
                triggerPart.IsIgnoreCase,
                this.getCookie(triggerPart.CookieName, request),
                triggerPart.ValueToCompare,
                triggerPart.ValuesToCompare);
        }

        private static getCookie(cookieName: string, request: IHttpRequest): string {
            var cookie = request.getCookieValue(cookieName);

            if (!cookie)
                return "";

            return cookie;
        }
    }

    class UserAgentValidatorHelper {
        public static evaluate(triggerPart: TriggerPart, userAgent: string): boolean {

            return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
                triggerPart.IsNegative,
                triggerPart.IsIgnoreCase,
                userAgent,
                triggerPart.ValueToCompare,
                triggerPart.ValuesToCompare);
        }
    }

    export class HttpHeaderValidatorHelper {
        public static evaluate(triggerPart: TriggerPart, headerValue: string): boolean {
            return ComparisonOperatorHelper.evaluate(triggerPart.Operator,
                triggerPart.IsNegative,
                triggerPart.IsIgnoreCase,
                headerValue,
                triggerPart.ValueToCompare,
                triggerPart.ValuesToCompare);
        }
    }

    class ComparisonOperatorHelper {
        public static evaluate(opt: string, isNegative: boolean, isIgnoreCase: boolean, value: string,
            valueToCompare: string, valuesToCompare: Array<string>): boolean {

            value = value || "";
            valueToCompare = valueToCompare || "";
            valuesToCompare = valuesToCompare || [];

            switch (opt) {
                case ComparisonOperatorType.EqualS:
                    return ComparisonOperatorHelper.equalS(value, valueToCompare, isNegative, isIgnoreCase);
                case ComparisonOperatorType.Contains:
                    return ComparisonOperatorHelper.contains(value, valueToCompare, isNegative, isIgnoreCase);
                case ComparisonOperatorType.EqualsAny:
                    return ComparisonOperatorHelper.equalsAny(value, valuesToCompare, isNegative, isIgnoreCase);
                case ComparisonOperatorType.ContainsAny:
                    return ComparisonOperatorHelper.containsAny(value, valuesToCompare, isNegative, isIgnoreCase);
                default:
                    return false;
            }
        }

        private static contains(value: string, valueToCompare: string, isNegative: boolean, ignoreCase: boolean): boolean {
            if (valueToCompare === "*")
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
        }

        private static equalS(value: string, valueToCompare: string, isNegative: boolean, ignoreCase: boolean): boolean {
            var evaluation = false;

            if (ignoreCase)
                evaluation = value.toUpperCase() === valueToCompare.toUpperCase();
            else
                evaluation = value === valueToCompare;

            if (isNegative)
                return !evaluation;
            else
                return evaluation;
        }

        private static equalsAny(value: string, valuesToCompare: Array<string>, isNegative: boolean, isIgnoreCase: boolean): boolean {
            for (let valueToCompare of valuesToCompare) {
                if (ComparisonOperatorHelper.equalS(value, valueToCompare, false, isIgnoreCase))
                    return !isNegative;
            }

            return isNegative;
        }

        private static containsAny(value: string, valuesToCompare: Array<string>, isNegative: boolean, isIgnoreCase: boolean): boolean {
            for (let valueToCompare of valuesToCompare) {
                if (ComparisonOperatorHelper.contains(value, valueToCompare, false, isIgnoreCase))
                    return !isNegative;
            }

            return isNegative;
        }
    }
}