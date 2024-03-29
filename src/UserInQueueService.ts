import {
    Utils,
    QueueUrlParams,
    QueueParameterHelper,
    QueueSessionValidationResult, SessionValidationResult
} from './QueueITHelpers';
import {
    ActionTypes,
    RequestValidationResult,
    QueueEventConfig,
    CancelEventConfig
} from './Models';
import {UserInQueueStateCookieRepository} from './UserInQueueStateCookieRepository';
import {IConnectorContextProvider} from './ConnectorContextProvider';

export enum InvalidTokenErrorCode {
    Hash = "hash",
    WaitingRoomId = "eventid",
    Expired = "timestamp",
    IpBindingMismatch = "ip"
}

export class UserInQueueService {
    static readonly SDK_VERSION = "v3-javascript-" + "3.7.10";

    constructor(private contextProvider: IConnectorContextProvider, private userInQueueStateRepository: UserInQueueStateCookieRepository) {
    }

    private getValidTokenResult(
        config: QueueEventConfig,
        queueParams: QueueUrlParams,
        secretKey: string)
        : RequestValidationResult {

        this.userInQueueStateRepository.store(
            config.eventId,
            queueParams.queueId,
            queueParams.cookieValidityMinutes,
            config.cookieDomain,
            config.isCookieHttpOnly,
            config.isCookieSecure,
            queueParams.redirectType,
            queueParams.hashedIp,
            secretKey);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            queueParams.queueId,
            null,
            queueParams.redirectType,
            config.actionName,
        );
    }

    private getErrorResult(
        customerId: string,
        targetUrl: string,
        config: QueueEventConfig,
        qParams: QueueUrlParams,
        validationResult: QueueSessionValidationResult)
        : RequestValidationResult {

        const errorCode = validationResult.errorCode;
        const queueItTokenParam = qParams ? `&queueittoken=${qParams.queueITToken}` : '';
        let query = this.getQueryString(customerId,
                config.eventId,
                config.version,
                config.culture,
                config.layoutName,
                config.actionName,
                validationResult.getInvalidReason()
            ) +
            queueItTokenParam +
            `&ts=${Utils.getCurrentTime()}` +
            (targetUrl ? `&t=${Utils.encodeUrl(targetUrl)}` : "");

        const uriPath = `error/${errorCode}/`;
        const redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            null,
            redirectUrl,
            null,
            config.actionName
        );
    }

    private getQueueResult(
        targetUrl: string,
        config: QueueEventConfig,
        customerId: string)
        : RequestValidationResult {
        const enqueueToken = this.contextProvider.getEnqueueTokenProvider
            && this.contextProvider.getEnqueueTokenProvider()?.getEnqueueToken(config.eventId);
        let query = this.getQueryString(customerId,
                config.eventId,
                config.version,
                config.culture,
                config.layoutName,
                config.actionName,
                null,
                enqueueToken) +
            (targetUrl ? "&t=" + Utils.encodeUrl(targetUrl) : "");

        const redirectUrl = this.generateRedirectUrl(config.queueDomain, "", query);

        return new RequestValidationResult(
            ActionTypes.QueueAction,
            config.eventId,
            null,
            redirectUrl,
            null,
            config.actionName
        );
    }

    private getQueryString(
        customerId: string,
        eventId: string,
        configVersion: number,
        culture: string | null,
        layoutName: string | null,
        actionName: string | null,
        invalidCookieReason?: string,
        enqueueToken?: string)
        : string {
        const queryStringList = new Array<string>();
        queryStringList.push(`c=${Utils.encodeUrl(customerId)}`);
        queryStringList.push(`e=${Utils.encodeUrl(eventId)}`);
        queryStringList.push(`ver=${UserInQueueService.SDK_VERSION}`);
        queryStringList.push(`cver=${configVersion}`);
        queryStringList.push(`man=${Utils.encodeUrl(actionName)}`);

        if (culture) {
            queryStringList.push("cid=" + Utils.encodeUrl(culture));
        }

        if (layoutName) {
            queryStringList.push("l=" + Utils.encodeUrl(layoutName));
        }


        if (invalidCookieReason) {
            queryStringList.push("icr=" + Utils.encodeUrl(invalidCookieReason));
        }

        if (enqueueToken) {
            queryStringList.push(`enqueuetoken=${enqueueToken}`);
        }

        return queryStringList.join("&");
    }

    private generateRedirectUrl(queueDomain: string, uriPath: string, query: string) {
        if (!Utils.endsWith(queueDomain, "/"))
            queueDomain = queueDomain + "/";

        return `https://${queueDomain}${uriPath}?${query}`;
    }

    public validateQueueRequest(
        targetUrl: string,
        queueitToken: string,
        config: QueueEventConfig,
        customerId,
        secretKey) {
        const state = this.userInQueueStateRepository.getState(config.eventId,
            config.cookieValidityMinute, secretKey, true);

        if (state.isValid) {
            if (state.isStateExtendable() && config.extendCookieValidity) {
                this.userInQueueStateRepository.store(config.eventId,
                    state.queueId,
                    null,
                    config.cookieDomain,
                    config.isCookieHttpOnly,
                    config.isCookieSecure,
                    state.redirectType,
                    state.hashedIp,
                    secretKey);
            }
            return new RequestValidationResult(
                ActionTypes.QueueAction,
                config.eventId,
                state.queueId,
                null,
                state.redirectType,
                config.actionName
            );
        }
        const queueTokenParams = QueueParameterHelper.extractQueueParams(queueitToken);

        let requestValidationResult: RequestValidationResult;
        let isTokenValid = false;

        if (queueTokenParams) {
            const validationOutput = this.validateToken(config, queueTokenParams, secretKey);
            isTokenValid = validationOutput.result.isValid;

            if (isTokenValid) {
                requestValidationResult = this.getValidTokenResult(config, queueTokenParams, secretKey);
            } else {
                requestValidationResult = this.getErrorResult(customerId,
                    targetUrl,
                    config,
                    queueTokenParams,
                    validationOutput.result);
            }
        } else if (state.isBoundToAnotherIp) {
            requestValidationResult = this.getErrorResult(customerId, targetUrl, config, queueTokenParams, state.result);
        } else {
            requestValidationResult = this.getQueueResult(targetUrl, config, customerId);
        }

        if (state.isFound && !isTokenValid) {
            this.userInQueueStateRepository.cancelQueueCookie(
                config.eventId,
                config.cookieDomain,
                config.isCookieHttpOnly,
                config.isCookieSecure);
        }

        return requestValidationResult;

    }

    public validateCancelRequest(
        targetUrl: string,
        config: CancelEventConfig,
        customerId: string,
        secretKey: string): RequestValidationResult {
        //we do not care how long cookie is valid while canceling cookie
        const state = this.userInQueueStateRepository.getState(config.eventId, -1, secretKey, false);

        if (state.isValid) {
            this.userInQueueStateRepository.cancelQueueCookie(config.eventId,
                config.cookieDomain,
                config.isCookieHttpOnly,
                config.isCookieSecure);

            const query = this.getQueryString(customerId,
                    config.eventId,
                    config.version,
                    null,
                    null,
                    config.actionName) +
                (targetUrl ? "&r=" + Utils.encodeUrl(targetUrl) : "");

            let uriPath = `cancel/${customerId}/${config.eventId}`;
            if (state.queueId) {
                uriPath += `/${state.queueId}`;
            }

            const redirectUrl = this.generateRedirectUrl(config.queueDomain, uriPath, query);

            return new RequestValidationResult(
                ActionTypes.CancelAction,
                config.eventId,
                state.queueId,
                redirectUrl,
                state.redirectType,
                config.actionName);
        } else {
            return new RequestValidationResult(
                ActionTypes.CancelAction,
                config.eventId,
                null,
                null,
                null,
                config.actionName);
        }
    }

    public extendQueueCookie(
        eventId: string,
        cookieValidityMinutes: number,
        cookieDomain: string,
        isCookieHttpOnly: boolean,
        isCookieSecure: boolean,
        secretKey: string) {
        this.userInQueueStateRepository.reissueQueueCookie(eventId,
            cookieValidityMinutes,
            cookieDomain,
            isCookieHttpOnly,
            isCookieSecure,
            secretKey)
    }

    public getIgnoreResult(
        actionName: string): RequestValidationResult {
        return new RequestValidationResult(ActionTypes.IgnoreAction, null, null, null, null, actionName);
    }

    private validateToken(
        config: QueueEventConfig,
        queueParams: QueueUrlParams,
        secretKey: string): TokenValidationOutput {
        const calculatedHash = Utils.generateSHA256Hash(secretKey, queueParams.queueITTokenWithoutHash, this.contextProvider);

        if (calculatedHash !== queueParams.hashCode)
            return new TokenValidationOutput(SessionValidationResult.newFailedResult(InvalidTokenErrorCode.Hash));

        if (queueParams.eventId !== config.eventId)
            return new TokenValidationOutput(SessionValidationResult.newFailedResult(InvalidTokenErrorCode.WaitingRoomId));

        if (queueParams.timeStamp < Utils.getCurrentTime())
            return new TokenValidationOutput(SessionValidationResult.newFailedResult(InvalidTokenErrorCode.Expired));

        const clientIp = this.contextProvider.getHttpRequest().getUserHostAddress();
        if (queueParams.hashedIp && clientIp) {
            const expectedIpHash = Utils.generateSHA256Hash(secretKey, clientIp, this.contextProvider);
            if (expectedIpHash !== queueParams.hashedIp) {
                const newResult = SessionValidationResult.newFailedResult(InvalidTokenErrorCode.IpBindingMismatch);
                SessionValidationResult.setIpBindingValidationDetails(queueParams.hashedIp, clientIp, newResult)
                return new TokenValidationOutput(newResult);
            }
        }

        return new TokenValidationOutput(SessionValidationResult.newSuccessfulResult());
    }
}

class TokenValidationOutput {
    private readonly _result;

    constructor(
        result: SessionValidationResult) {
        this._result = result;
    }

    get result(): SessionValidationResult {
        return this._result;
    }
}
