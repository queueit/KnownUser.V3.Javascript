import { RequestValidationResult, QueueEventConfig, CancelEventConfig } from './Models';
import { UserInQueueStateCookieRepository } from './UserInQueueStateCookieRepository';
export declare class UserInQueueService {
    private userInQueueStateRepository;
    static readonly SDK_VERSION: string;
    constructor(userInQueueStateRepository: UserInQueueStateCookieRepository);
    private getValidTokenResult;
    private getErrorResult;
    private getQueueResult;
    private getQueryString;
    private generateRedirectUrl;
    validateQueueRequest(targetUrl: string, queueitToken: string, config: QueueEventConfig, customerId: any, secretKey: any): RequestValidationResult;
    validateCancelRequest(targetUrl: string, config: CancelEventConfig, customerId: string, secretKey: string): RequestValidationResult;
    extendQueueCookie(eventId: string, cookieValidityMinutes: number, cookieDomain: string, secretKey: string): void;
    getIgnoreResult(actionName: string): RequestValidationResult;
    private validateToken;
}
