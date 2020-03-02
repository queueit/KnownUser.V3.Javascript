namespace QueueIT.KnownUserV3.SDK {
    export class QueueEventConfig {
        constructor(
            public eventId: string,
            public layoutName: string,
            public culture: string,
            public queueDomain: string,
            public extendCookieValidity: boolean,
            public cookieValidityMinute: number,
            public cookieDomain: string,
            public version: number,
            public actionName: string = 'unspecified') { }

        getString() {
            return `EventId:${this.eventId}&Version:${this.version}&ActionName:${this.actionName}&QueueDomain:${this.queueDomain}` +
                `&CookieDomain:${this.cookieDomain}&ExtendCookieValidity:${this.extendCookieValidity}` +
                `&CookieValidityMinute:${this.cookieValidityMinute}&LayoutName:${this.layoutName}&Culture:${this.culture}`;
        }
    }

    export class CancelEventConfig {
        constructor(public eventId: string,
            public queueDomain: string,
            public cookieDomain: string,
            public version: number,
            public actionName: string = 'unspecified') { }

        getString() {
            return `EventId:${this.eventId}&Version:${this.version}` +
                `&QueueDomain:${this.queueDomain}&CookieDomain:${this.cookieDomain}&ActionName:${this.actionName}`;
        }
    }

    export class RequestValidationResult {
        constructor(
            public actionType: string,
            public eventId: string,
            public queueId: string,
            public redirectUrl: string,
            public redirectType: string,
            public actionName: string
        ) {
        }

        public isAjaxResult: boolean;

        public doRedirect(): boolean {
            return !!this.redirectUrl;
        }

        public getAjaxQueueRedirectHeaderKey(): string {
            return "x-queueit-redirect";
        }

        public getAjaxRedirectUrl() {
            if (this.redirectUrl) {
                return Utils.encodeUrl(this.redirectUrl);
            }
            return "";
        }
    }

    export class KnownUserException {
        constructor(public message) {
        }
    }

    export class ActionTypes {
        public static readonly QueueAction = "Queue";
        public static readonly CancelAction = "Cancel";
        public static readonly IgnoreAction = "Ignore";
    }
}