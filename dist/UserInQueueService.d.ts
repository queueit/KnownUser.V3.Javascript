import { RequestValidationResult, QueueEventConfig, CancelEventConfig } from './Models';
import { UserInQueueStateCookieRepository } from './UserInQueueStateCookieRepository';
import { IConnectorContextProvider } from './ConnectorContextProvider';
export declare enum InvalidTokenErrorCode {
    Hash = "hash",
    WaitingRoomId = "eventid",
    Expired = "timestamp",
    IpBindingMismatch = "ip"
}
export declare class UserInQueueService {
    private contextProvider;
    private userInQueueStateRepository;
    static readonly SDK_VERSION: string;
    constructor(contextProvider: IConnectorContextProvider, userInQueueStateRepository: UserInQueueStateCookieRepository);
    private getValidTokenResult;
    private getErrorResult;
    private getQueueResult;
    private getQueryString;
    private generateRedirectUrl;
    validateQueueRequest(targetUrl: string, queueitToken: string, config: QueueEventConfig, customerId: any, secretKey: any): RequestValidationResult;
    validateCancelRequest(targetUrl: string, config: CancelEventConfig, customerId: string, secretKey: string): RequestValidationResult;
    extendQueueCookie(eventId: string, cookieValidityMinutes: number, cookieDomain: string, isCookieHttpOnly: boolean, isCookieSecure: boolean, secretKey: string): void;
    getIgnoreResult(actionName: string): RequestValidationResult;
    private validateToken;
}
