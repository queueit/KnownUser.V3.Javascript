import * as IntegrationModels from './IntegrationConfigModel';
import { IHttpRequest } from '../ConnectorContextProvider';
export interface IIntegrationEvaluator {
    getMatchedIntegrationConfig(customerIntegration: IntegrationModels.CustomerIntegration, currentPageUrl: string, request: IHttpRequest): IntegrationModels.IntegrationConfigModel;
}
export declare class IntegrationEvaluator implements IIntegrationEvaluator {
    getMatchedIntegrationConfig(customerIntegration: IntegrationModels.CustomerIntegration, currentPageUrl: string, request: IHttpRequest): IntegrationModels.IntegrationConfigModel;
    private evaluateTrigger;
    private evaluateTriggerPart;
}
export declare class UrlValidatorHelper {
    static evaluate(triggerPart: IntegrationModels.TriggerPart, url: string): boolean;
    private static getUrlPart;
    static getHostNameFromUrl(url: string): string;
    static getPathFromUrl(url: string): string;
}
export declare class CookieValidatorHelper {
    static evaluate(triggerPart: IntegrationModels.TriggerPart, request: IHttpRequest): boolean;
    private static getCookie;
}
export declare class UserAgentValidatorHelper {
    static evaluate(triggerPart: IntegrationModels.TriggerPart, userAgent: string): boolean;
}
export declare class RequestBodyValidatorHelper {
    static evaluate(triggerPart: IntegrationModels.TriggerPart, bodyString: string): boolean;
}
export declare class HttpHeaderValidatorHelper {
    static evaluate(triggerPart: IntegrationModels.TriggerPart, headerValue: string): boolean;
}
export declare class ComparisonOperatorHelper {
    static evaluate(opt: string, isNegative: boolean, isIgnoreCase: boolean, value: string, valueToCompare: string, valuesToCompare: Array<string>): boolean;
    private static contains;
    private static equalS;
    private static equalsAny;
    private static containsAny;
}
