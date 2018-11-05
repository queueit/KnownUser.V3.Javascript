namespace QueueIT.KnownUserV3.SDK {
    export class KnownUser {
        public static readonly QueueITTokenKey = "queueittoken";
        public static readonly QueueITDebugKey = "queueitdebug";
        public static readonly QueueITAjaxHeaderKey = "x-queueit-ajaxpageurl";

        static UserInQueueService: UserInQueueService = null;

        private static getUserInQueueService(
            httpContextProvider: IHttpContextProvider): UserInQueueService {
            if (!this.UserInQueueService) {
                return new UserInQueueService(new UserInQueueStateCookieRepository(httpContextProvider));
            }
            return this.UserInQueueService;
        }

        private static isQueueAjaxCall(
            httpContextProvider: IHttpContextProvider): boolean {
            return !!httpContextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey);
        }

        private static generateTargetUrl(
            originalTargetUrl: string,
            httpContextProvider: IHttpContextProvider) {
            return !this.isQueueAjaxCall(httpContextProvider) ?
                originalTargetUrl :
                Utils.decodeUrl(httpContextProvider.getHttpRequest().getHeader(this.QueueITAjaxHeaderKey));
        }

        private static logExtraRequestDetails(
            debugEntries,
            httpContextProvider: IHttpContextProvider) {
            debugEntries["ServerUtcTime"] = (new Date()).toISOString().split('.')[0] + "Z";
            debugEntries["RequestIP"] = httpContextProvider.getHttpRequest().getUserHostAddress();
            debugEntries["RequestHttpHeader_Via"] = httpContextProvider.getHttpRequest().getHeader("Via");
            debugEntries["RequestHttpHeader_Forwarded"] = httpContextProvider.getHttpRequest().getHeader("Forwarded");
            debugEntries["RequestHttpHeader_XForwardedFor"] = httpContextProvider.getHttpRequest().getHeader("X-Forwarded-For");
            debugEntries["RequestHttpHeader_XForwardedHost"] = httpContextProvider.getHttpRequest().getHeader("X-Forwarded-Host");
            debugEntries["RequestHttpHeader_XForwardedProto"] = httpContextProvider.getHttpRequest().getHeader("X-Forwarded-Proto");
        }

        private static getIsDebug(
            queueitToken: string,
            secretKey: string): boolean {
            var qParams = QueueParameterHelper.extractQueueParams(queueitToken);

            if (qParams && qParams.redirectType && qParams.redirectType.toLowerCase() === "debug")
                return Utils.generateSHA256Hash(secretKey, qParams.queueITTokenWithoutHash) === qParams.hashCode;

            return false;
        }

        private static setDebugCookie(
            debugEntries,
            httpContextProvider: IHttpContextProvider) {
            let cookieValue = "";
            for (var key in debugEntries) {
                cookieValue += key + "=" + debugEntries[key] + "|";
            }

            if (cookieValue.lastIndexOf("|") === cookieValue.length - 1) {
                cookieValue = cookieValue.substring(0, cookieValue.length - 1);
            }

            if (!cookieValue)
                return;

            httpContextProvider.getHttpResponse().setCookie(
                this.QueueITDebugKey,
                cookieValue,
                null,
                Utils.getCurrentTime() + 20 * 60); // now + 20 mins
        }

        private static _resolveQueueRequestByLocalConfig(
            targetUrl: string,
            queueitToken: string,
            queueConfig: QueueEventConfig,
            customerId: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider,
            debugEntries): RequestValidationResult {
            var isDebug = this.getIsDebug(queueitToken, secretKey);
            if (isDebug) {
                debugEntries["TargetUrl"] = targetUrl;
                debugEntries["QueueitToken"] = queueitToken;
                debugEntries["OriginalUrl"] = httpContextProvider.getHttpRequest().getAbsoluteUri();
                debugEntries["QueueConfig"] = queueConfig !== null ? queueConfig.getString() : "NULL";

                this.logExtraRequestDetails(debugEntries, httpContextProvider);
            }

            if (!customerId)
                throw new KnownUserException("customerId can not be null or empty.");
            if (!secretKey)
                throw new KnownUserException("secretKey can not be null or empty.");
            if (!queueConfig)
                throw new KnownUserException("queueConfig can not be null.");
            if (!queueConfig.eventId)
                throw new KnownUserException("queueConfig.eventId can not be null or empty.");
            if (!queueConfig.queueDomain)
                throw new KnownUserException("queueConfig.queueDomain can not be null or empty.");
            if (queueConfig.cookieValidityMinute <= 0)
                throw new KnownUserException("queueConfig.cookieValidityMinute should be integer greater than 0.");

            var userInQueueService = this.getUserInQueueService(httpContextProvider);
            var result = userInQueueService.validateQueueRequest(targetUrl, queueitToken, queueConfig, customerId, secretKey);
            result.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);

            return result;
        }

        private static _cancelRequestByLocalConfig(
            targetUrl: string,
            queueitToken: string,
            cancelConfig: CancelEventConfig,
            customerId: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider,
            debugEntries): RequestValidationResult {

            targetUrl = this.generateTargetUrl(targetUrl, httpContextProvider);
            var isDebug = this.getIsDebug(queueitToken, secretKey);
            if (isDebug) {
                debugEntries["TargetUrl"] = targetUrl;
                debugEntries["QueueitToken"] = queueitToken;
                debugEntries["CancelConfig"] = cancelConfig !== null ? cancelConfig.getString() : "NULL";
                debugEntries["OriginalUrl"] = httpContextProvider.getHttpRequest().getAbsoluteUri();

                this.logExtraRequestDetails(debugEntries, httpContextProvider);
            }

            if (!targetUrl)
                throw new KnownUserException("targetUrl can not be null or empty.");
            if (!customerId)
                throw new KnownUserException("customerId can not be null or empty.");
            if (!secretKey)
                throw new KnownUserException("secretKey can not be null or empty.");
            if (!cancelConfig)
                throw new KnownUserException("cancelConfig can not be null.");
            if (!cancelConfig.eventId)
                throw new KnownUserException("cancelConfig.eventId can not be null or empty.");
            if (!cancelConfig.queueDomain)
                throw new KnownUserException("cancelConfig.queueDomain can not be null or empty.");

            var userInQueueService = this.getUserInQueueService(httpContextProvider);
            var result = userInQueueService.validateCancelRequest(targetUrl, cancelConfig, customerId, secretKey);
            result.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);

            return result;
        }

        private static handleQueueAction(
            currentUrlWithoutQueueITToken: string, queueitToken: string,
            customerIntegrationInfo: IntegrationConfig.CustomerIntegration, customerId: string,
            secretKey: string,
            matchedConfig: IntegrationConfig.IntegrationConfigModel,
            httpContextProvider: IHttpContextProvider,
            debugEntries): RequestValidationResult {
            var targetUrl = "";
            switch (matchedConfig.RedirectLogic) {
                case "ForcedTargetUrl":
                    targetUrl = matchedConfig.ForcedTargetUrl;
                    break;
                case "EventTargetUrl":
                    targetUrl = "";
                    break;
                default:
                    targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, httpContextProvider);
                    break;
            }

            var queueEventConfig = new QueueEventConfig(matchedConfig.EventId,
                matchedConfig.LayoutName, matchedConfig.Culture, matchedConfig.QueueDomain,
                matchedConfig.ExtendCookieValidity,
                matchedConfig.CookieValidityMinute, matchedConfig.CookieDomain, customerIntegrationInfo.Version);

            return this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueEventConfig, customerId, secretKey, httpContextProvider, debugEntries);
        }

        private static handleCancelAction(
            currentUrlWithoutQueueITToken: string, queueitToken: string,
            customerIntegrationInfo: IntegrationConfig.CustomerIntegration, customerId: string,
            secretKey: string,
            matchedConfig: IntegrationConfig.IntegrationConfigModel,
            httpContextProvider: IHttpContextProvider,
            debugEntries): RequestValidationResult {

            var cancelEventConfig = new CancelEventConfig(matchedConfig.EventId,
                matchedConfig.QueueDomain, matchedConfig.CookieDomain, customerIntegrationInfo.Version);

            var targetUrl = this.generateTargetUrl(currentUrlWithoutQueueITToken, httpContextProvider);
            return this._cancelRequestByLocalConfig(targetUrl, queueitToken, cancelEventConfig, customerId, secretKey, httpContextProvider, debugEntries);
        }

        public static extendQueueCookie(
            eventId: string,
            cookieValidityMinute: number,
            cookieDomain: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider) {
            if (!eventId)
                throw new KnownUserException("eventId can not be null or empty.");
            if (!secretKey)
                throw new KnownUserException("secretKey can not be null or empty.");
            if (cookieValidityMinute <= 0)
                throw new KnownUserException("cookieValidityMinute should be integer greater than 0.");

            var userInQueueService = this.getUserInQueueService(httpContextProvider);
            userInQueueService.extendQueueCookie(eventId, cookieValidityMinute, cookieDomain, secretKey);
        }

        public static resolveQueueRequestByLocalConfig(
            targetUrl: string,
            queueitToken: string,
            queueConfig: QueueEventConfig,
            customerId: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider): RequestValidationResult {
            var debugEntries = {};

            try {
                targetUrl = this.generateTargetUrl(targetUrl, httpContextProvider);
                return this._resolveQueueRequestByLocalConfig(targetUrl, queueitToken, queueConfig, customerId, secretKey, httpContextProvider, debugEntries);
            }
            finally {
                this.setDebugCookie(debugEntries, httpContextProvider);
            }
        }

        public static validateRequestByIntegrationConfig(
            currentUrlWithoutQueueITToken: string,
            queueitToken: string,
            integrationsConfigString: string,
            customerId: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider): RequestValidationResult {
            if (!currentUrlWithoutQueueITToken)
                throw new KnownUserException("currentUrlWithoutQueueITToken can not be null or empty.");
            if (!integrationsConfigString)
                throw new KnownUserException("integrationsConfigString can not be null or empty.");

            var debugEntries = {};

            try {
                var customerIntegrationInfo: QueueIT.KnownUserV3.SDK.IntegrationConfig.CustomerIntegration =
                    JSON.parse(integrationsConfigString);

                var isDebug = this.getIsDebug(queueitToken, secretKey);
                if (isDebug) {
                    debugEntries["ConfigVersion"] = customerIntegrationInfo.Version.toString();
                    debugEntries["PureUrl"] = currentUrlWithoutQueueITToken;
                    debugEntries["QueueitToken"] = queueitToken;
                    debugEntries["OriginalUrl"] = httpContextProvider.getHttpRequest().getAbsoluteUri();

                    this.logExtraRequestDetails(debugEntries, httpContextProvider);
                }

                var configEvaluater = new IntegrationConfig.IntegrationEvaluator();

                var matchedConfig = configEvaluater.getMatchedIntegrationConfig(
                    customerIntegrationInfo,
                    currentUrlWithoutQueueITToken,
                    httpContextProvider.getHttpRequest());

                if (isDebug) {
                    debugEntries["MatchedConfig"] = matchedConfig ? matchedConfig.Name : "NULL";
                }
                if (!matchedConfig)
                    return new RequestValidationResult(null, null, null, null, null);

                switch (matchedConfig.ActionType) {
                    case ActionTypes.QueueAction: {
                        return this.handleQueueAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, httpContextProvider, debugEntries);
                    }
                    case ActionTypes.CancelAction: {
                        return this.handleCancelAction(currentUrlWithoutQueueITToken, queueitToken, customerIntegrationInfo, customerId, secretKey, matchedConfig, httpContextProvider, debugEntries);
                    }
                    default: {
                        var userInQueueService = this.getUserInQueueService(httpContextProvider);
                        var result = userInQueueService.getIgnoreActionResult();
                        result.isAjaxResult = this.isQueueAjaxCall(httpContextProvider);
                        return result;
                    }
                }
            }
            finally {
                this.setDebugCookie(debugEntries, httpContextProvider);
            }
        }

        public static cancelRequestByLocalConfig(
            targetUrl: string,
            queueitToken: string,
            cancelConfig: CancelEventConfig,
            customerId: string,
            secretKey: string,
            httpContextProvider: IHttpContextProvider): RequestValidationResult {
            var debugEntries = {};
            try {
                return this._cancelRequestByLocalConfig(
                    targetUrl, queueitToken, cancelConfig, customerId, secretKey, httpContextProvider, debugEntries)
            }
            finally {
                this.setDebugCookie(debugEntries, httpContextProvider);
            }
        }
    }
}