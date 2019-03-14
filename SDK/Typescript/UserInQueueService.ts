namespace QueueIT.KnownUserV3.SDK {
    export class UserInQueueService {
        readonly SDK_VERSION = "3.5.2";

        constructor(private userInQueueStateRepository: UserInQueueStateCookieRepository) {
        }

        private getQueueITTokenValidationResult(
            targetUrl: string,
            eventId: string,
            config: QueueEventConfig,
            queueParams: QueueUrlParams,
            customerId: string,
            secretKey: string): RequestValidationResult {

            const calculatedHash = Utils.generateSHA256Hash(secretKey, queueParams.queueITTokenWithoutHash);
            if (calculatedHash !== queueParams.hashCode)
                return this.getVaidationErrorResult(customerId, targetUrl, config, queueParams, "hash");

            if (queueParams.eventId !== eventId)
                return this.getVaidationErrorResult(customerId, targetUrl, config, queueParams, "eventid");

            if (queueParams.timeStamp < Utils.getCurrentTime())
                return this.getVaidationErrorResult(customerId, targetUrl, config, queueParams, "timestamp");

            this.userInQueueStateRepository.store(
                config.eventId,
                queueParams.queueId,
                queueParams.cookieValidityMinutes,
                config.cookieDomain,
                queueParams.redirectType,
                secretKey);

            return new RequestValidationResult(
                ActionTypes.QueueAction,
                config.eventId,
                queueParams.queueId,
                null,
                queueParams.redirectType);
        }

        private getVaidationErrorResult(
            customerId: string,
            targetUrl: string,
            config: QueueEventConfig,
            qParams: QueueUrlParams,
            errorCode: string): RequestValidationResult {

            let query = this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName) +
                `&queueittoken=${qParams.queueITToken}&ts=${Utils.getCurrentTime()}` +
                (targetUrl ? `&t=${Utils.encodeUrl(targetUrl)}` : "");

            var domainAlias = config.queueDomain;
            if (!Utils.endsWith(domainAlias, "/"))
                domainAlias = domainAlias + "/";

            var redirectUrl = `https://${domainAlias}error/${errorCode}/?${query}`;

            return new RequestValidationResult(
                ActionTypes.QueueAction,
                config.eventId,
                null,
                redirectUrl,
                null);
        }

        private getInQueueRedirectResult(
            targetUrl: string,
            config: QueueEventConfig,
            customerId: string): RequestValidationResult {

            var redirectUrl = "https://" + config.queueDomain + "/?" +
                this.getQueryString(customerId, config.eventId, config.version, config.culture, config.layoutName) +
                (targetUrl ? "&t=" + Utils.encodeUrl(targetUrl) : "");

            return new RequestValidationResult(
                ActionTypes.QueueAction,
                config.eventId,
                null,
                redirectUrl,
                null);
        }

        private getQueryString(
            customerId: string,
            eventId: string,
            configVersion: number,
            culture: string | null,
            layoutName: string | null): string {

            const queryStringList = new Array<string>();
            queryStringList.push(`c=${Utils.encodeUrl(customerId)}`);
            queryStringList.push(`e=${Utils.encodeUrl(eventId)}`);
            queryStringList.push(`ver=v3-javascript-${this.SDK_VERSION}`);
            queryStringList.push(`cver=${configVersion}`);

            if (culture)
                queryStringList.push("cid=" + Utils.encodeUrl(culture));

            if (layoutName)
                queryStringList.push("l=" + Utils.encodeUrl(layoutName));

            return queryStringList.join("&");
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
                        state.redirectType,
                        secretKey);
                }
                return new RequestValidationResult(ActionTypes.QueueAction,
                    config.eventId,
                    state.queueId,
                    null,
                    state.redirectType
                );
            }

            const queueParmas = QueueParameterHelper.extractQueueParams(queueitToken);

            if (queueParmas !== null) {
                return this.getQueueITTokenValidationResult(targetUrl, config.eventId,
                    config, queueParmas, customerId, secretKey);
            }
            else {
                return this.getInQueueRedirectResult(targetUrl, config, customerId);
            }
        }

        public validateCancelRequest(
            targetUrl: string,
            config: CancelEventConfig,
            customerId: string,
            secretKey: string): RequestValidationResult {

            //we do not care how long cookie is valid while canceling cookie
            var state = this.userInQueueStateRepository.getState(config.eventId, -1, secretKey, false);

            if (state.isValid) {
                this.userInQueueStateRepository.cancelQueueCookie(config.eventId, config.cookieDomain);

                var query = this.getQueryString(customerId, config.eventId, config.version, null, null) +
                    (targetUrl ? "&r=" + Utils.encodeUrl(targetUrl) : "");

                var domainAlias = config.queueDomain;
                if (!Utils.endsWith(domainAlias, "/"))
                    domainAlias = domainAlias + "/";

                var redirectUrl = "https://" + domainAlias + "cancel/" + customerId + "/" + config.eventId + "/?" + query;

                return new RequestValidationResult(
                    ActionTypes.CancelAction,
                    config.eventId,
                    state.queueId,
                    redirectUrl,
                    state.redirectType);
            }
            else {
                return new RequestValidationResult(
                    ActionTypes.CancelAction,
                    config.eventId,
                    null,
                    null,
                    null);
            }
        }

        public extendQueueCookie(
            eventId: string,
            cookieValidityMinutes: number,
            cookieDomain: string,
            secretKey: string) : void {
            this.userInQueueStateRepository.reissueQueueCookie(eventId, cookieValidityMinutes, cookieDomain, secretKey)
        }

        public getIgnoreActionResult(): RequestValidationResult {
            return new RequestValidationResult(ActionTypes.IgnoreAction, null, null, null, null);
        }
    }
}