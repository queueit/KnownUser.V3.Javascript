import {KnownUserException,RequestValidationResult} from './Models'
    export class Utils {
        static encodeUrl(url: string) {
            if (!url)
                return "";

            return encodeURIComponent(url).replace(/[!'()*]/g, function (c) {
                // More stringent in adhering to RFC 3986 (which reserves!, ', (, ), and *)
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
                return '%' + c.charCodeAt(0).toString(16);
            });
        }

        static decodeUrl(url: string) {
            return decodeURIComponent(url);
        }

        static generateSHA256Hash(secretKey: string, stringToHash: string): string {
            throw new KnownUserException("Missing implementation for generateSHA256Hash");
        }

        static endsWith(str: string, search: string): boolean {
            if (str === search)
                return true;
            if (!str || !search)
                return false;
            return str.substring(str.length - search.length, str.length) === search;
        }

        static getCurrentTime(): number {
            return Math.floor(new Date().getTime() / 1000);
        }
    }

    export class QueueUrlParams {
        public timeStamp: number = 0;
        public eventId: string;
        public hashCode: string;
        public extendableCookie: boolean = false;
        public cookieValidityMinutes: number | null;
        public queueITToken: string;
        public queueITTokenWithoutHash: string;
        public queueId: string;
        public redirectType: string;
    }

    export class QueueParameterHelper {
        public static readonly TimeStampKey = "ts";
        public static readonly ExtendableCookieKey = "ce";
        public static readonly CookieValidityMinutesKey = "cv";
        public static readonly HashKey = "h";
        public static readonly EventIdKey = "e";
        public static readonly QueueIdKey = "q";
        public static readonly RedirectTypeKey = "rt";
        public static readonly KeyValueSeparatorChar = '_';
        public static readonly KeyValueSeparatorGroupChar = '~';

        public static extractQueueParams(queueitToken: string): QueueUrlParams {
            if (!queueitToken) {
                return null;
            }

            const result = new QueueUrlParams();
            result.queueITToken = queueitToken;

            var paramList = result.queueITToken.split(QueueParameterHelper.KeyValueSeparatorGroupChar);
            for (let paramKeyValue of paramList) {
                var keyValueArr = paramKeyValue.split(QueueParameterHelper.KeyValueSeparatorChar);

                if (keyValueArr.length !== 2) {
                    continue;
                }

                switch (keyValueArr[0]) {
                    case QueueParameterHelper.HashKey:
                        result.hashCode = keyValueArr[1] || "";
                        break;
                    case QueueParameterHelper.TimeStampKey: {
                        result.timeStamp = parseInt(keyValueArr[1]);
                        if (!result.timeStamp) {
                            result.timeStamp = 0;
                        }
                        break;
                    }
                    case QueueParameterHelper.CookieValidityMinutesKey: {
                        result.cookieValidityMinutes = parseInt(keyValueArr[1]);
                        if (!result.cookieValidityMinutes) {
                            result.cookieValidityMinutes = null;
                        }
                        break;
                    }
                    case QueueParameterHelper.EventIdKey:
                        result.eventId = keyValueArr[1] || "";
                        break;
                    case QueueParameterHelper.ExtendableCookieKey: {
                        let extendCookie = (keyValueArr[1] || "false").toLowerCase();
                        result.extendableCookie = extendCookie === "true";
                        break;
                    }
                    case QueueParameterHelper.QueueIdKey:
                        result.queueId = keyValueArr[1] || "";
                        break;
                    case QueueParameterHelper.RedirectTypeKey:
                        result.redirectType = keyValueArr[1] || "";
                        break;
                }
            }

            var hashWithPrefix = `${QueueParameterHelper.KeyValueSeparatorGroupChar}${QueueParameterHelper.HashKey}${QueueParameterHelper.KeyValueSeparatorChar}${result.hashCode}`;
            result.queueITTokenWithoutHash = result.queueITToken.replace(hashWithPrefix, "");
            return result;
        }
    }

    export class CookieHelper {
        public static toMapFromValue(cookieValue: string): object {
            try {
                let result = {};
                const decoded = cookieValue;
                const items = decoded.split('&');
                for (let item of items) {
                    let keyValue = item.split('=');
                    result[keyValue[0]] = keyValue[1];
                }
                return result;
            }
            catch
            {
                return {};
            }
        }

        public static toValueFromKeyValueCollection(cookieValues: Array<{ key: string, value: string }>) {
            let values = new Array<string>();

            for (let keyVal of cookieValues){
                values.push(`${keyVal.key}=${keyVal.value}`);
            }

            return values.join("&");
        }
    }

    export class ConnectorDiagnostics {
        public isEnabled: boolean = false;
        public hasError: boolean = false;
        public validationResult: RequestValidationResult

        private setStateWithTokenError(customerId: string, errorCode: string) {
            this.hasError = true;
            var redirectUrl = `https://${customerId}.api2.queue-it.net/${customerId}/diagnostics/connector/error/?code=${errorCode}`;
            this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", null, null, redirectUrl, null, null)
        } 

        private setStateWithSetupError() {
            this.hasError = true;
            this.validationResult = new RequestValidationResult("ConnectorDiagnosticsRedirect", null, null,
                "https://api2.queue-it.net/diagnostics/connector/error/?code=setup", null, null)
        }

        public static verify(customerId: string, secretKey: string, queueitToken: string): ConnectorDiagnostics {
            var diagnostics = new ConnectorDiagnostics();

            var qParams = QueueParameterHelper.extractQueueParams(queueitToken);

            if (qParams == null)
                return diagnostics;

            if (qParams.redirectType == null)
                return diagnostics;

            if (qParams.redirectType !== "debug")
                return diagnostics;

            if (!(customerId && secretKey)) {
                diagnostics.setStateWithSetupError();
                return diagnostics;
            }

            if (Utils.generateSHA256Hash(secretKey, qParams.queueITTokenWithoutHash) != qParams.hashCode) {
                diagnostics.setStateWithTokenError(customerId, "hash");
                return diagnostics;
            }

            if (qParams.timeStamp < Utils.getCurrentTime()) {
                diagnostics.setStateWithTokenError(customerId, "timestamp");
                return diagnostics;
            }

            diagnostics.isEnabled = true;

            return diagnostics;
        }
    }
