namespace QueueIT.KnownUserV3.SDK {
    export class Utils {
        static encodeUrl(url: string) {
            if (!url)
                return "";

            url = url.replace(/ /g, "+"); // Replace whitespace with +
            return encodeURIComponent(url);
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
            try {
                if (!queueitToken) {
                    return null;
                }

                const result = new QueueUrlParams();
                result.queueITToken = queueitToken;

                var paramList = result.queueITToken.split(QueueParameterHelper.KeyValueSeparatorGroupChar);
                for (let paramKeyValue of paramList) {
                    var keyValueArr = paramKeyValue.split(QueueParameterHelper.KeyValueSeparatorChar);

                    switch (keyValueArr[0]) {
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
                        case QueueParameterHelper.HashKey:
                            result.hashCode = keyValueArr[1] || "";
                            break;
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
            catch
            {
                return null;
            }
        }
    }

    export class CookieHelper {
        public static toMapFromValue(cookieValue: string) {
            try {
                let result = {};
                var decoded = cookieValue;
                var items = decoded.split('&');
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

            for (var keyVal of cookieValues)
                values.push(`${keyVal.key}=${keyVal.value}`);

            var result = values.join("&");
            return result;
        }
    }
}