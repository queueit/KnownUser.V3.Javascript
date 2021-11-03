var KnownUser = require('./../dist/KnownUser')
var QueueITHelpers = require('./../dist/QueueITHelpers')
var UserInQueueService = require('./../dist/UserInQueueService')
var Models = require('./../dist/Models')
var assert = require('assert');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = require('chai').expect;

var utils = QueueITHelpers.Utils;
const SDK_VERSION = UserInQueueService.UserInQueueService.SDK_VERSION;
utils.generateSHA256Hash = function (secretKey, stringToHash) {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secretKey)
        .update(stringToHash)
        .digest('hex');
    return hash;
};

var userInQueueServiceMock = {};
userInQueueServiceMock.validateQueueRequestResult = {};
userInQueueServiceMock.cancelRequestCalls = {};
userInQueueServiceMock.extendQueueCookieCalls = {};
userInQueueServiceMock.getIgnoreResultIsCalled = false;

userInQueueServiceMock.getIgnoreResult = function (actionName) {

    userInQueueServiceMock.getIgnoreResultIsCalled = true;

    this.RequestValidationResult =
        {
            method: "getIgnoreResult",
            eventId: "",
            queueId: "",
            redirectUrl: "",
            redirectType: "",
            actionType: "Ignore",
            actionName: actionName
        };
    return this.RequestValidationResult;
};

userInQueueServiceMock.validateQueueRequest = function (targetUrl, queueitToken, queueConfig, customerId, secretKey) {
    this.validateQueueRequestCall =
        {
            method: "validateQueueRequest",
            targetUrl: targetUrl,
            queueitToken: queueitToken,
            queueConfig: queueConfig,
            customerId: customerId,
            secretKey: secretKey
        };

    if (userInQueueServiceMock.validateQueueRequestResultRaiseException) {
        throw "exception";
    } else {
        return userInQueueServiceMock.validateQueueRequestResult;
    }
};
userInQueueServiceMock.validateCancelRequest = function (targetUrl, cancelConfig, customerId, secretKey) {
    this.validateCancelRequestCall =
        {
            method: "validateCancelRequest",
            targetUrl: targetUrl,
            cancelConfig: cancelConfig,
            customerId: customerId,
            secretKey: secretKey
        };

    if (userInQueueServiceMock.validateCancelRequestrRaiseException) {
        throw "exception";
    } else {
        return userInQueueServiceMock.cancelRequestCalls;
    }
};
userInQueueServiceMock.extendQueueCookie = function (eventId,
                                                     cookieValidityMinute,
                                                     cookieDomain,
                                                     isCookieHttpOnly,
                                                     isCookieSecure,
                                                     secretKey) {
    this.extendQueueCookieCall =
        {
            method: "extendQueueCookie",
            eventId: eventId,
            cookieValidityMinute: cookieValidityMinute,
            isCookieHttpOnly,
            isCookieSecure,
            secretKey: secretKey
        };

    return userInQueueServiceMock.extendQueueCookieCalls;
};

function resetMocks() {
    httpResponseMockCookies = {};
    userInQueueServiceMock.reset();
}

userInQueueServiceMock.reset = function () {
    this.validateQueueRequestResult = {};
    this.cancelRequestCalls = {};
    this.extendQueueCookieCalls = {};
    this.validateQueueRequestCall = {};
    this.validateCancelRequestCall = {};
    this.extendQueueCookieCall = {};
    this.validateCancelRequestrRaiseException = false;
    this.validateQueueRequestResultRaiseException = false;
};

let httpRequestMockHeaders = {};
var httpRequestMock = {
    getHeader: function (name) {
        var key = name.toLowerCase();
        return httpRequestMockHeaders[key];
    },
    getUserAgent: function () {
        return httpRequestMockHeaders["user-agent"];
    },
    getAbsoluteUri: function () {
        return "";
    }
};

let httpResponseMockCookies = {};
let httpResponseMock = {
    setCookie: function (name, value, domain, expire, httpOnly, isSecure) {
        httpResponseMockCookies[name] = {value, domain, expire, httpOnly, isSecure};
    }
};
let httpContextProvider = {
    getHttpRequest: function () {
        return httpRequestMock;
    },
    getHttpResponse: function () {
        return httpResponseMock;
    }
};

function generateDebugToken(eventId, secretKey, expiredToken = false) {
    var queueUrlParams = QueueITHelpers.QueueParameterHelper;
    var timeStamp = utils.getCurrentTime() + 3 * 60;

    if (expiredToken)
        timeStamp = timeStamp - 1000;

    var tokenWithoutHash =
        queueUrlParams.EventIdKey +
        queueUrlParams.KeyValueSeparatorChar +
        eventId +
        queueUrlParams.KeyValueSeparatorGroupChar +
        queueUrlParams.RedirectTypeKey +
        queueUrlParams.KeyValueSeparatorChar +
        "debug" +
        queueUrlParams.KeyValueSeparatorGroupChar +
        queueUrlParams.TimeStampKey +
        queueUrlParams.KeyValueSeparatorChar +
        timeStamp;

    var hashValue = utils.generateSHA256Hash(secretKey, tokenWithoutHash);

    var token = tokenWithoutHash +
        queueUrlParams.KeyValueSeparatorGroupChar +
        queueUrlParams.HashKey +
        queueUrlParams.KeyValueSeparatorChar +
        hashValue;

    return token;
}

var knownUser = KnownUser.KnownUser;

var KnownUserTest = {

    test_cancelRequestByLocalConfig: function () {
        resetMocks();

        var cancelEventConfig = new Models.CancelEventConfig();
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.queueDomain = "queueDomain";
        cancelEventConfig.version = 1;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.cancelRequestByLocalConfig("url", "queueitToken", cancelEventConfig, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateCancelRequestCall.method === "validateCancelRequest");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.targetUrl, "url");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.cancelConfig, cancelEventConfig);
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.customerId, "customerid");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.secretKey, "secretkey");
        assert(result.isAjaxResult === false);
    },

    test_cancelRequestByLocalConfig_AjaxCall: function () {
        resetMocks();

        var cancelEventConfig = new Models.CancelEventConfig();
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.queueDomain = "queueDomain";
        cancelEventConfig.version = 1;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.cancelRequestByLocalConfig("url", "queueitToken", cancelEventConfig, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateCancelRequestCall.method === "validateCancelRequest");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.targetUrl, "url");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.cancelConfig, cancelEventConfig);
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.customerId, "customerid");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.secretKey, "secretkey");
        assert(result.isAjaxResult === false);
    },

    test_cancelRequestByLocalConfig_NullQueueDomain: function () {

        //Arrange
        resetMocks();

        var exceptionWasThrown = false;

        var cancelEventConfig = new Models.CancelEventConfig();
        cancelEventConfig.eventId = "eventId";
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.version = 12;

        //Act
        try {
            knownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", cancelEventConfig, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "cancelConfig.queueDomain can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);

    },

    test_cancelRequestByLocalConfig_EventIdNull: function () {

        //Arrange
        resetMocks();

        var exceptionWasThrown = false;

        var cancelEventConfig = new Models.CancelEventConfig();
        cancelEventConfig.cookieDomain = "cookieDomain";
        cancelEventConfig.version = 12;

        //Act
        try {
            knownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", cancelEventConfig, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "cancelConfig.eventId can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_cancelRequestByLocalConfig_CancelEventConfigNull: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "cancelConfig can not be null.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_cancelRequestByLocalConfig_CustomerIdNull: function () {
        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        var eventconfig = new Models.QueueEventConfig();

        //Act
        try {
            knownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", eventconfig, null, "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "customerId can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_cancelRequestByLocalConfig_SeceretKeyNull: function () {
        //Arrange
        resetMocks();
        var exceptionWasThrown = false;
        var eventconfig = new Models.QueueEventConfig();

        //Act
        try {
            knownUser.cancelRequestByLocalConfig("targetUrl", "queueitToken", eventconfig, "customerid", null, httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "secretKey can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_cancelRequestByLocalConfig_TargetUrl: function () {
        //Arrange
        resetMocks();
        var exceptionWasThrown = false;
        var eventconfig = new Models.QueueEventConfig();

        //Act
        try {
            knownUser.cancelRequestByLocalConfig(null, "queueitToken", eventconfig, "customerid", "secretkey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "targetUrl can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateCancelRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_extendQueueCookie_NullEventId: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.extendQueueCookie(null, 0, null, false, false, null, httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "eventId can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.extendQueueCookieCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_extendQueueCookie_InvalidCookieValidityMinutes: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.extendQueueCookie("eventId", -1, "cookiedomain", false, false, "secretkey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "cookieValidityMinute should be integer greater than 0.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.extendQueueCookieCall).length === 0);
        expect(exceptionWasThrown).to.be.true;
    },

    test_extendQueueCookie_NullSecretKey: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.extendQueueCookie("eventId", 20, "cookiedomain", false, false, null, httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "secretKey can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.extendQueueCookieCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_extendQueueCookie: function () {

        //Arrange
        resetMocks();

        //Act
        knownUser.extendQueueCookie("eventId", 20, "cookiedomain", true, true, "secretKey");

        //Assert
        assert(userInQueueServiceMock.extendQueueCookieCall.method === "extendQueueCookie");
        assert(userInQueueServiceMock.extendQueueCookieCall.eventId, "eventId");
        assert(userInQueueServiceMock.extendQueueCookieCall.cookieValidityMinute, "20");
        assert(userInQueueServiceMock.extendQueueCookieCall.isCookieHttpOnly, true);
        assert(userInQueueServiceMock.extendQueueCookieCall.isCookieSecure, true);
        assert(userInQueueServiceMock.extendQueueCookieCall.secretKey, "secretKey");
    },

    test_resolveRequestByLocalEventConfig: function () {
        resetMocks();

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.targetUrl, "targeturl");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.queueitToken, "queueIttoken");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.queueConfig, eventconfig);
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.customerId, "customerid");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.secretKey, "secretkey");
        assert(result.isAjaxResult === false);
    },

    test_resolveRequestByLocalEventConfig_AjaxCall: function () {
        resetMocks();

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.targetUrl, "targeturl");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.queueitToken, "queueIttoken");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.queueConfig, eventconfig);
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.customerId, "customerid");
        assert.equal(userInQueueServiceMock.validateQueueRequestCall.secretKey, "secretkey");
        assert(result.isAjaxResult === false);
    },

    test_resolveRequestByLocalEventConfig_NullCustomerId: function () {

        //Arrange
        resetMocks();

        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, null, "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "customerId can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_resolveRequestByLocalEventConfig_NullSecretKey: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", null, httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "secretKey can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_resolveRequestByLocalEventConfig_NullEventConfig: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targetUrl", "queueitToken", null, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "queueConfig can not be null.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_resolveRequestByLocalEventConfig_NullEventId: function () {

        //Arrange
        resetMocks();

        var exceptionWasThrown = false;

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "queueConfig.eventId can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_resolveRequestByLocalEventConfig_NullQueueDomain: function () {

        //Arrange
        resetMocks();

        var exceptionWasThrown = false;

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = null;
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "queueConfig.queueDomain can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_resolveRequestByLocalEventConfig_InvalidCookieValidityMinute: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 0;
        eventconfig.version = 12;

        //Act
        try {
            knownUser.UserInQueueService = userInQueueServiceMock;
            knownUser.resolveQueueRequestByLocalConfig("targeturl", "queueIttoken", eventconfig, "customerid", "secretkey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "queueConfig.cookieValidityMinute should be integer greater than 0.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_validateRequestByIntegrationConfig: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpRequestMockHeaders = {
            "user-agent": "googlebot"
        };

        var integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "http://test.com?event1=true");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueitToken === "queueIttoken");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["queueDomain"] === "knownusertest.queue-it.net");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["eventId"] === "event1");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["culture"] === "");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["layoutName"] === "Christmas Layout by Queue-it");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["extendCookieValidity"]);
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["cookieValidityMinute"] === 20);
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["cookieDomain"] === ".test.com");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["version"] === 3);
        assert(userInQueueServiceMock.validateQueueRequestCall.customerId === "customerid");
        assert(userInQueueServiceMock.validateQueueRequestCall.secretKey === "secretkey");
        assert(result.isAjaxResult === false);
    },

    test_validateRequestByIntegrationConfig_AjaxCall: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpRequestMockHeaders = {
            "x-queueit-ajaxpageurl": "http%3a%2f%2ftest.com%3fevent1%3dtrue",
            "user-agent": "googlebot",
            "a": "b",
            "e": "f"
        };

        var integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "http://test.com?event1=true");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueitToken === "queueIttoken");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["queueDomain"] === "knownusertest.queue-it.net");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["eventId"] === "event1");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["culture"] === "");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["layoutName"] === "Christmas Layout by Queue-it");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["extendCookieValidity"]);
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["cookieValidityMinute"] === 20);
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["cookieDomain"] === ".test.com");
        assert(userInQueueServiceMock.validateQueueRequestCall.queueConfig["version"] === 3);
        assert(userInQueueServiceMock.validateQueueRequestCall.customerId === "customerid");
        assert(userInQueueServiceMock.validateQueueRequestCall.secretKey === "secretkey");
        assert(result.isAjaxResult === true);
        assert(result.getAjaxRedirectUrl().toLowerCase() === "http%3a%2f%2fq.qeuue-it.com");
    },

    test_validateRequestByIntegrationConfig_NotMatch: function () {

        resetMocks();

        var integrationConfigString = `{
            "Description": "test",
            "Integrations": [
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(result.doRedirect() === false);
    },

    test_validateRequestByIntegrationConfig_EmptyCurrentUrl: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;


        var integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        //Act
        try {
            result = knownUser.validateRequestByIntegrationConfig(null, "queueIttoken", integrationConfigString, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "currentUrlWithoutQueueITToken can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_validateRequestByIntegrationConfig_EmptyIntegrationsConfig: function () {

        //Arrange
        resetMocks();
        var exceptionWasThrown = false;

        //Act
        try {
            knownUser.validateRequestByIntegrationConfig("currentUrl", "queueitToken", null, "customerId", "secretKey", httpContextProvider);
        } catch (err) {
            exceptionWasThrown = err.message === "integrationsConfigString can not be null or empty.";
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequestCall).length === 0);
        assert(exceptionWasThrown);
    },

    test_validateRequestByIntegrationConfig_ForcedTargeturl: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        var integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "ForcedTargetUrl",
                  "ForcedTargetUrl": "http://test.com"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "http://test.com");
    },

    test_validateRequestByIntegrationConfig_ForcedTargeturl_AjaxCall: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpRequestMockHeaders = {
            "x-queueit-ajaxpageurl": "http%3a%2f%2ftest.com%3fevent1%3dtrue",
            "a": "b",
            "e": "f"
        };

        var integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "ForcedTargetUrl",
                  "ForcedTargetUrl": "http://test.com"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "http://test.com");
        assert(result.isAjaxResult === true);
    },

    test_validateRequestByIntegrationConfig_EventTargetUrl: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        var integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "EventTargetUrl"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "");
    },

    test_validateRequestByIntegrationConfig_EventTargetUrl_AjaxCall: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Queue", "eventid", "", "http://q.qeuue-it.com", "");

        httpRequestMockHeaders = {
            "a": "b",
            "x-queueit-ajaxpageurl": "http%3a%2f%2ftest.com%3fevent1%3dtrue",
            "e": "f"
        };

        var integrationConfigString = `{
              "Description": "test",
              "Integrations": [
                {
                  "Name": "event1action",
                  "ActionType": "Queue",
                  "EventId": "event1",
                  "CookieDomain": ".test.com",
                  "LayoutName": "Christmas Layout by Queue-it",
                  "Culture": "",
                  "ExtendCookieValidity": true,
                  "CookieValidityMinute": 20,
                  "Triggers": [
                    {
                      "TriggerParts": [
                        {
                          "Operator": "Contains",
                          "ValueToCompare": "event1",
                          "UrlPart": "PageUrl",
                          "ValidatorType": "UrlValidator",
                          "IsNegative": false,
                          "IsIgnoreCase": true
                        }
                      ],
                      "LogicalOperator": "And"
                    }
                  ],
                  "QueueDomain": "knownusertest.queue-it.net",
                  "RedirectLogic": "EventTargetUrl"
                }
              ],
              "CustomerId": "knownusertest",
              "AccountId": "knownusertest",
              "Version": 3,
              "PublishDate": "2017-05-15T21:39:12.0076806Z",
              "ConfigDataVersion": "1.0.0.1"
            }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateQueueRequestCall.method === "validateQueueRequest");
        assert(userInQueueServiceMock.validateQueueRequestCall.targetUrl === "");
        assert(result.isAjaxResult === true);
    },
    test_validateRequestByIntegrationConfig_Exception_NoDebugToken: function () {
        resetMocks();
        userInQueueServiceMock.validateQueueRequestResultRaiseException = true;

        httpRequestMockHeaders = {
            "user-agent": "googlebot"
        };

        var integrationConfigString = `{
            "Description": "test",
            "Integrations": [
                {
                    "Name": "event1action",
                    "ActionType": "Queue",
                    "EventId": "event1",
                    "CookieDomain": ".test.com",
                    "LayoutName": "Christmas Layout by Queue-it",
                    "Culture": "",
                    "ExtendCookieValidity": true,
                    "CookieValidityMinute": 20,
                    "Triggers": [
                        {
                            "TriggerParts": [
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "event1",
                                    "UrlPart": "PageUrl",
                                    "ValidatorType": "UrlValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": true
                                },
                                {
                                    "Operator": "Contains",
                                    "ValueToCompare": "googlebot",
                                    "ValidatorType": "UserAgentValidator",
                                    "IsNegative": false,
                                    "IsIgnoreCase": false
                                }
                            ],
                            "LogicalOperator": "And"
                        }
                    ],
                    "QueueDomain": "knownusertest.queue-it.net",
                    "RedirectLogic": "AllowTParameter",
                    "ForcedTargetUrl": ""
                }
            ],
            "CustomerId": "knownusertest",
            "AccountId": "knownusertest",
            "Version": 3,
            "PublishDate": "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion": "1.0.0.1"
        }`;

        try {
            var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);
        } catch {

        }

        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },
    test_validateRequestByIntegrationConfig_CancelAction: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Cancel", "eventid", "queueid", "redirectUrl", "");

        httpRequestMockHeaders = {
            "user-agent": "googlebot"
        };

        var integrationConfigString = `{
            "Integrations":[
                {
                    "Name":"event1action",
                    "EventId":"eventid",
                    "CookieDomain":"cookiedomain",
                    "LayoutName":null,
                    "Culture":null,
                    "ExtendCookieValidity":null,
                    "CookieValidityMinute":null,
                    "QueueDomain":"queuedomain",
                    "RedirectLogic":null,
                    "ForcedTargetUrl":null,
                    "ActionType":"Cancel",
                    "Triggers":[
                    {
                        "TriggerParts":[
                            {
                                "ValidatorType":"UrlValidator",
                                "Operator":"Contains",
                                "ValueToCompare":"event1",
                                "ValuesToCompare":null,
                                "IsNegative":false,
                                "IsIgnoreCase":true,
                                "UrlPart":"PageUrl",
                                "CookieName":null,
                                "HttpHeaderName":null
                            }
                        ],
                        "LogicalOperator":"And"
                    }
                    ]
                }
            ],
            "Version":3
        }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateCancelRequestCall.method === "validateCancelRequest");
        assert(userInQueueServiceMock.validateCancelRequestCall.targetUrl === "http://test.com?event1=true");
        assert(userInQueueServiceMock.validateCancelRequestCall.customerId === "customerid");
        assert(userInQueueServiceMock.validateCancelRequestCall.secretKey === "secretkey");

        assert(userInQueueServiceMock.validateQueueRequestResult.eventId === "eventid");
        assert(userInQueueServiceMock.validateQueueRequestResult.queueId === "queueid");
        assert(userInQueueServiceMock.validateQueueRequestResult.redirectUrl === "redirectUrl");

        assert(result.isAjaxResult === false);
    },

    test_validateRequestByIntegrationConfig_CancelAction_AjaxCall: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Cancel", "eventid", "", "http://q.qeuue-it.com", null);

        httpRequestMockHeaders = {
            "a": "b",
            "x-queueit-ajaxpageurl": "http%3a%2f%2furl",
            "e": "f"
        };

        var integrationConfigString = `{
           "Integrations":[
              {
                 "Name":"event1action",
                 "EventId":"eventid",
                 "CookieDomain":"cookiedomain",
                 "LayoutName":null,
                 "Culture":null,
                 "ExtendCookieValidity":null,
                 "CookieValidityMinute":null,
                 "QueueDomain":"queuedomain",
                 "RedirectLogic":null,
                 "ForcedTargetUrl":null,
                 "ActionType":"Cancel",
                 "Triggers":[
                    {
                       "TriggerParts":[
                          {
                             "ValidatorType":"UrlValidator",
                             "Operator":"Contains",
                             "ValueToCompare":"event1",
                             "ValuesToCompare":null,
                             "IsNegative":false,
                             "IsIgnoreCase":true,
                             "UrlPart":"PageUrl",
                             "CookieName":null,
                             "HttpHeaderName":null
                          }
                       ],
                       "LogicalOperator":"And"
                    }
                 ]
              }
           ],
           "Version":3
        }`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(userInQueueServiceMock.validateCancelRequestCall.method === "validateCancelRequest");
        assert(userInQueueServiceMock.validateCancelRequestCall.targetUrl === "http://url");
        assert(userInQueueServiceMock.validateCancelRequestCall.customerId === "customerid");
        assert(userInQueueServiceMock.validateCancelRequestCall.secretKey === "secretkey");

        assert(userInQueueServiceMock.validateCancelRequestCall.cancelConfig.eventId === "eventid");
        assert(userInQueueServiceMock.validateCancelRequestCall.cancelConfig.queueDomain === "queuedomain");
        assert(userInQueueServiceMock.validateCancelRequestCall.cancelConfig.cookieDomain === "cookiedomain");
        assert(userInQueueServiceMock.validateCancelRequestCall.cancelConfig.version === 3);

        assert(result.isAjaxResult === true);
    },

    test_validateRequestByIntegrationConfig_IgnoreAction: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Ignore", "eventid", "queueid", "redirectUrl", "", "event1action");

        httpRequestMockHeaders = {
            "user-agent": "googlebot"
        };

        var integrationConfigString = `{  
                   "Integrations":[  
                      {  
                         "Name":"event1action",
                         "EventId":"eventid",
                         "CookieDomain":"cookiedomain",
                         "LayoutName":null,
                         "Culture":null,
                         "ExtendCookieValidity":null,
                         "CookieValidityMinute":null,
                         "QueueDomain":"queuedomain",
                         "RedirectLogic":null,
                         "ForcedTargetUrl":null,
                         "ActionType":"Ignore",
                         "Triggers":[  
                            {  
                               "TriggerParts":[  
                                  {  
                                     "ValidatorType":"UrlValidator",
                                     "Operator":"Contains",
                                     "ValueToCompare":"event1",
                                     "ValuesToCompare":null,
                                     "IsNegative":false,
                                     "IsIgnoreCase":true,
                                     "UrlPart":"PageUrl",
                                     "CookieName":null,
                                     "HttpHeaderName":null
                                  }
                               ],
                               "LogicalOperator":"And"
                            }
                         ]
                      }
                   ],
                   "Version":3
                }`;

        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(result.actionType === "Ignore");
        assert(result.method === "getIgnoreResult");
        assert(result.isAjaxResult === false);
        assert(result.actionName === "event1action");
    },

    test_validateRequestByIntegrationConfig_IgnoreAction_AjaxCall: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Cancel", "eventid", "", "http://q.qeuue-it.com", null);

        httpRequestMockHeaders = {
            "a": "b",
            "c": "d",
            "x-queueit-ajaxpageurl": "http%3a%2f%2furl",
            "e": "f"
        };

        var integrationConfigString = `			{
				"Description": "test",
				"Integrations": [
				{
					"Name": "event1action",
					"EventId": "event1",
					"CookieDomain": ".test.com",
					"ActionType":"Ignore",
					"Triggers": [
					{
						"TriggerParts": [
						{
							"Operator": "Contains",
							"ValueToCompare": "event1",
							"UrlPart": "PageUrl",
							"ValidatorType": "UrlValidator",
							"IsNegative": false,
							"IsIgnoreCase": true
						}
						],
						"LogicalOperator": "And"
					}
					],
					"QueueDomain": "knownusertest.queue-it.net"
				}
				],
				"CustomerId": "knownusertest",
				"AccountId": "knownusertest",
				"Version": 3,
				"PublishDate": "2017-05-15T21:39:12.0076806Z",
				"ConfigDataVersion": "1.0.0.1"
			}`;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", "queueIttoken", integrationConfigString, "customerid", "secretkey", httpContextProvider);

        assert(result.actionType === "Ignore");
        assert(result.method === "getIgnoreResult");
        assert(result.isAjaxResult === true);
    },

    test_validateRequestByIntegrationConfig_Debug: function () {

        resetMocks();

        var integrationConfigString = `{
            "Description":
                "test",
            "Integrations": [{
                "Name":
                    "event1action",
                "ActionType": "Queue",
                "IsCookieHttpOnly": false,
                "IsCookieSecure": false,
                "EventId":
                    "event1",
                "CookieDomain":
                    ".test.com",
                "LayoutName":
                    "Christmas Layout by Queue-it",
                "Culture":
                    "da-DK",
                "ExtendCookieValidity":
                    true,
                "CookieValidityMinute":
                    20,
                "Triggers": [{
                    "TriggerParts": [{
                        "Operator": "Contains",
                        "ValueToCompare": "event1",
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "IsNegative": false,
                        "IsIgnoreCase": true
                    }, {
                        "Operator": "Contains",
                        "ValueToCompare": "googlebot",
                        "ValidatorType": "UserAgentValidator",
                        "IsNegative": false,
                        "IsIgnoreCase": false
                    }],
                    "LogicalOperator":
                        "And"
                }],
                "QueueDomain":
                    "knownusertest.queue-it.net",
                "RedirectLogic":
                    "AllowTParameter"
            }],
            "CustomerId":
                "knownusertest",
            "AccountId":
                "knownusertest",
            "Version":
                3,
            "PublishDate":
                "2017-05-15T21:39:12.0076806Z",
            "ConfigDataVersion":
                "1.0.0.1"
        }`;

        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;
        knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextProvider);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];
        assert(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime + "|") !== -1);
        assert(actualCookieValue.indexOf("ConfigVersion=3|") !== -1);
        assert(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true|") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|") !== -1);
        assert(actualCookieValue.indexOf("RequestIP=userIP|") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Via=v|") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=f|") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=xff|") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=xfh|") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=xfp|") !== -1);
        assert(actualCookieValue.indexOf("MatchedConfig=event1action|") !== -1);
        assert(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true|") !== -1);
        expect(actualCookieValue).to.contain("|QueueConfig=EventId:event1&Version:3&ActionName:event1action&QueueDomain:knownusertest.queue-it.net")
        expect(actualCookieValue).to.contain(
            "&CookieDomain:.test.com" +
            "&IsCookieHttpOnly:false" +
            "&IsCookieSecure:false" +
            "&ExtendCookieValidity:true" +
            "&CookieValidityMinute:20");
        expect(actualCookieValue).to.contain('LayoutName:Christmas Layout by Queue-it&Culture:da-DK')
        expect(actualCookieValue).to.contain("SdkVersion=" + SDK_VERSION + "|");
    },

    test_validateRequestByIntegrationConfig_Debug_WithoutMatch: function () {

        resetMocks();

        var requestIP = "80.35.35.34";
        var viaHeader = "1.1 example.com";
        var forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        var xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        var xForwardedHostHeader = "en.wikipedia.org:8080";
        var xForwardedProtoHeader = "https";

        var integrationConfigString = `{
			"Description": "test",
			"Integrations": [
			{
				"Name": "event1action",
				"EventId": "event1",
				"CookieDomain": ".test.com",
				"ActionType":"Cancel",
				"Triggers": [
				{
					"TriggerParts": [
					{
						"Operator": "Contains",
						"ValueToCompare": "notmatch",
						"UrlPart": "PageUrl",
						"ValidatorType": "UrlValidator",
						"IsNegative": false,
						"IsIgnoreCase": true
					}
					],  
					"LogicalOperator": "And"
				}
				],
				"QueueDomain": "knownusertest.queue-it.net"
			}
			],
			"CustomerId": "knownusertest",
			"AccountId": "knownusertest",
			"Version": 10,
			"PublishDate": "2017-05-15T21:39:12.0076806Z",
			"ConfigDataVersion": "1.0.0.1"
		}`;

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };

        httpRequestMockHeaders = {
            "via": viaHeader,
            "forwarded": forwardedHeader,
            "x-forwarded-for": xForwardedForHeader,
            "x-forwarded-host": xForwardedHostHeader,
            "x-forwarded-proto": xForwardedProtoHeader
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";

        knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextProvider);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];

        assert(actualCookieValue.indexOf("ConfigVersion=10") !== -1);
        assert(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true") !== -1);
        assert(actualCookieValue.indexOf(queueitToken) !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue") !== -1);
        assert(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime) !== -1);
        assert(actualCookieValue.indexOf("MatchedConfig=NULL") !== -1);
        assert(actualCookieValue.indexOf("RequestIP=80.35.35.34") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Via=1.1 example.com") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=for=192.0.2.60;proto=http;by=203.0.113.43") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=129.78.138.66, 129.78.64.103") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=en.wikipedia.org:8080") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=https") !== -1);
        assert(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|") !== -1);
    },

    test_validateRequestByIntegrationConfig_Notvalidhash_Debug: function () {

        resetMocks();
        userInQueueServiceMock.validateQueueRequestResult = new Models.RequestValidationResult("Debug", "eventid", "queueid", "http://q.qeuue-it.com", null);

        var requestIP = "80.35.35.34";

        var integrationConfigString = `{
				"Description": "test",
				"Integrations": [
				{
					"Name": "event1action",
					"EventId": "event1",
					"CookieDomain": ".test.com",
					"ActionType":"Cancel",
					"Triggers": [
					{
						"TriggerParts": [
						{
							"Operator": "Contains",
							"ValueToCompare": "event1",
							"UrlPart": "PageUrl",
							"ValidatorType": "UrlValidator",
							"IsNegative": false,
							"IsIgnoreCase": true
						}
						],  
						"LogicalOperator": "And"
					}
					],
					"QueueDomain": "knownusertest.queue-it.net"
				}
				],
				"CustomerId": "knownusertest",
				"AccountId": "knownusertest",
				"Version": 3,
				"PublishDate": "2017-05-15T21:39:12.0076806Z",
				"ConfigDataVersion": "1.0.0.1"
			}`;

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };


        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";

        knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true=", queueitToken, integrationConfigString, "customerId", secretKey, httpContextProvider);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];

        assert(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true") !== -1);
        assert(actualCookieValue.indexOf("ConfigVersion=3") !== -1);
        assert(actualCookieValue.indexOf("MatchedConfig=event1action") !== -1);
        assert(actualCookieValue.indexOf(queueitToken) !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue") !== -1);
        assert(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true") !== -1);
        assert(actualCookieValue.indexOf("CancelConfig=EventId:event1&Version:3&QueueDomain:knownusertest.queue-it.net&CookieDomain:.test.com") !== -1);
    },

    test_validateRequestByIntegrationConfig_Debug_NullConfig: function () {

        resetMocks();

        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        try {
            knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, "{}", "customerId", secretKey, httpContextProvider);
        } catch (err) {
            assert(err.message === "integrationsConfigString can not be null or empty.");
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequest).length === 0);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];
        assert(actualCookieValue.indexOf("ConfigVersion=NULL|") !== -1);
        assert(actualCookieValue.indexOf("PureUrl=http://test.com?event1=true|") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|") !== -1);
        assert(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|") !== -1);
        assert(actualCookieValue.indexOf("Exception=integrationsConfigString can not be null or empty.") !== -1);
    },

    test_validateRequestByIntegrationConfig_Debug_Missing_CustomerId: function () {

        resetMocks();
        var integrationConfigString = `{}`;
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, null, secretKey, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_validateRequestByIntegrationConfig_Debug_Missing_Secretkey: function () {

        resetMocks();
        var integrationConfigString = `{}`;
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", null, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_validateRequestByIntegrationConfig_Debug_ExpiredToken: function () {

        resetMocks();
        var integrationConfigString = `{}`;
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey, true);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_validateRequestByIntegrationConfig_Debug_ModifiedToken: function () {

        resetMocks();
        var integrationConfigString = `{}`;
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.validateRequestByIntegrationConfig("http://test.com?event1=true", queueitToken, integrationConfigString, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_resolveQueueRequestByLocalConfig_Debug: function () {

        resetMocks();

        var requestIP = "80.35.35.34";
        var viaHeader = "v";
        var forwardedHeader = "f";
        var xForwardedForHeader = "xff";
        var xForwardedHostHeader = "xfh";
        var xForwardedProtoHeader = "xfp";

        httpRequestMockHeaders = {
            "via": viaHeader,
            "forwarded": forwardedHeader,
            "x-forwarded-for": xForwardedForHeader,
            "x-forwarded-host": xForwardedHostHeader,
            "x-forwarded-proto": xForwardedProtoHeader
        };

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.isCookieHttpOnly = false;
        eventconfig.isCookieSecure = false;
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        eventconfig.actionName = "event1action";

        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", secretKey, httpContextProvider);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];

        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken) !== -1);
        assert(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken) !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue") !== -1);
        assert(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime) !== -1);
        assert(actualCookieValue.indexOf("RequestIP=80.35.35.34") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Via=v") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=f") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=xff") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=xfh") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=xfp") !== -1);
        expect(actualCookieValue).to.contain("QueueConfig=EventId:eventId" +
            "&Version:12&ActionName:event1action" +
            "&QueueDomain:queueDomain" +
            "&CookieDomain:cookieDomain" +
            "&IsCookieHttpOnly:false" +
            "&IsCookieSecure:false" +
            "&ExtendCookieValidity:true" +
            "&CookieValidityMinute:10" +
            "&LayoutName:layoutName" +
            "&Culture:culture");
    },

    test_resolveQueueRequestByLocalConfig_Debug_NullConfig: function () {

        resetMocks();

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com?event1=true";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        try {
            knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, null, "customerId", secretKey, httpContextProvider);
        } catch (err) {
            assert(err.message === "queueConfig can not be null.");
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequest).length === 0);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];
        assert(actualCookieValue.indexOf("QueueConfig=NULL|") !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com?event1=true|") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|") !== -1);
        assert(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|") !== -1);
        assert(actualCookieValue.indexOf("Exception=queueConfig can not be null.") !== -1);
    },

    test_resolveQueueRequestByLocalConfig_Debug_Missing_CustomerId: function () {

        resetMocks();
        var eventconfig = new Models.QueueEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, null, secretKey, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_resolveQueueRequestByLocalConfig_Debug_Missing_Secretkey: function () {

        resetMocks();
        var eventconfig = new Models.QueueEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", null, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_resolveQueueRequestByLocalConfig_Debug_ExpiredToken: function () {

        resetMocks();
        var eventconfig = new Models.QueueEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey, true);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_resolveQueueRequestByLocalConfig_Debug_ModifiedToken: function () {

        resetMocks();
        var eventconfig = new Models.QueueEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", queueitToken, eventconfig, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },
    test_resolveQueueRequestByLocalConfig_Exception_NoDebugToken: function () {

        resetMocks();

        var requestIP = "80.35.35.34";
        var viaHeader = "v";
        var forwardedHeader = "f";
        var xForwardedForHeader = "xff";
        var xForwardedHostHeader = "xfh";
        var xForwardedProtoHeader = "xfp";

        httpRequestMockHeaders = {
            "via": viaHeader,
            "forwarded": forwardedHeader,
            "x-forwarded-for": xForwardedForHeader,
            "x-forwarded-host": xForwardedHostHeader,
            "x-forwarded-proto": xForwardedProtoHeader
        };

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";

        var eventconfig = new Models.QueueEventConfig();
        eventconfig.cookieDomain = "cookieDomain";
        eventconfig.layoutName = "layoutName";
        eventconfig.culture = "culture";
        eventconfig.eventId = "eventId";
        eventconfig.queueDomain = "queueDomain";
        eventconfig.extendCookieValidity = true;
        eventconfig.cookieValidityMinute = 10;
        eventconfig.version = 12;
        eventconfig.actionName = "event1action";

        userInQueueServiceMock.validateQueueRequestResultRaiseException = true;
        knownUser.UserInQueueService = userInQueueServiceMock;

        //Assert
        try {
            var result = knownUser.resolveQueueRequestByLocalConfig("http://test.com?event1=true", "queueitToken", eventconfig, "customerId", secretKey, httpContextProvider);
        } catch {

        }
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');

    },
    test_cancelRequestByLocalConfig_Debug: function () {

        resetMocks();

        var requestIP = "80.35.35.34";
        var viaHeader = "1.1 example.com";
        var forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        var xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        var xForwardedHostHeader = "en.wikipedia.org:8080";
        var xForwardedProtoHeader = "https";

        httpRequestMockHeaders = {
            "via": viaHeader,
            "forwarded": forwardedHeader,
            "x-forwarded-for": xForwardedForHeader,
            "x-forwarded-host": xForwardedHostHeader,
            "x-forwarded-proto": xForwardedProtoHeader
        };

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";

        var cancelEventconfig = new Models.CancelEventConfig();
        cancelEventconfig.cookieDomain = "cookieDomain";
        cancelEventconfig.eventId = "eventId";
        cancelEventconfig.queueDomain = "queueDomain";
        cancelEventconfig.version = 1;

        knownUser.UserInQueueService = userInQueueServiceMock;
        var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelEventconfig, "customerid", "secretKey", httpContextProvider);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];

        assert(userInQueueServiceMock.validateCancelRequestCall.method === "validateCancelRequest");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.targetUrl, "http://test.com?event1=true");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.cancelConfig, cancelEventconfig);
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.customerId, "customerid");
        assert.equal(userInQueueServiceMock.validateCancelRequestCall.secretKey, "secretKey");
        assert(result.isAjaxResult === false);

        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken) !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com/?event1=true&queueittoken=queueittokenvalue") !== -1);
        assert(actualCookieValue.indexOf("TargetUrl=http://test.com?event1=true") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken) !== -1);
        assert(actualCookieValue.indexOf("ServerUtcTime=" + expectedServerTime) !== -1);
        assert(actualCookieValue.indexOf("RequestIP=80.35.35.34") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Via=1.1 example.com") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_Forwarded=for=192.0.2.60;proto=http;by=203.0.113.43") !== -1);//--
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedFor=129.78.138.66, 129.78.64.103") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedHost=en.wikipedia.org:8080") !== -1);
        assert(actualCookieValue.indexOf("RequestHttpHeader_XForwardedProto=https") !== -1);
        assert(actualCookieValue.indexOf("EventId:eventId&Version:1&QueueDomain:queueDomain&CookieDomain:cookieDomain") !== -1);
    },

    test_cancelRequestByLocalConfig_Debug_NullConfig: function () {

        resetMocks();

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com?event1=true";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        try {
            knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, null, "customerId", secretKey, httpContextProvider);
        } catch (err) {
            assert(err.message === "cancelConfig can not be null.");
        }

        //Assert
        assert(Object.keys(userInQueueServiceMock.validateQueueRequest).length === 0);

        var actualCookieValue = httpResponseMockCookies[knownUser.QueueITDebugKey]["value"];
        assert(actualCookieValue.indexOf("CancelConfig=NULL|") !== -1);
        assert(actualCookieValue.indexOf("OriginalUrl=http://test.com?event1=true|") !== -1);
        assert(actualCookieValue.indexOf("QueueitToken=" + queueitToken + "|") !== -1);
        assert(actualCookieValue.indexOf("SdkVersion=" + SDK_VERSION + "|") !== -1);
        assert(actualCookieValue.indexOf("Exception=cancelConfig can not be null.") !== -1);
    },

    test_cancelRequestByLocalConfig_Debug_Missing_CustomerId: function () {

        resetMocks();
        var cancelConfig = new Models.CancelEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, null, secretKey, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_cancelRequestByLocalConfig_Debug_Missing_Secretkey: function () {

        resetMocks();
        var cancelConfig = new Models.CancelEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", null, httpContextProvider);
        //Assert
        assert("https://api2.queue-it.net/diagnostics/connector/error/?code=setup" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_cancelRequestByLocalConfig_Debug_ExpiredToken: function () {

        resetMocks();
        var cancelConfig = new Models.CancelEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey, true);
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=timestamp" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_cancelRequestByLocalConfig_Debug_ModifiedToken: function () {

        resetMocks();
        var cancelConfig = new Models.CancelEventConfig();
        httpRequestMock.getAbsoluteUri = function () {
            return "http://localhost/original_url";
        };
        httpRequestMock.getUserHostAddress = function () {
            return "userIP";
        };
        httpRequestMockHeaders = {
            "user-agent": "googlebot",
            "via": "v",
            "forwarded": "f",
            "x-forwarded-for": "xff",
            "x-forwarded-host": "xfh",
            "x-forwarded-proto": "xfp"
        };

        var secretKey = "secretKey";
        var queueitToken = generateDebugToken("eventId", secretKey) + "invalid-hash";
        // var expectedServerTime = (new Date()).toISOString().split('.')[0] + "Z";
        knownUser.UserInQueueService = userInQueueServiceMock;

        var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true", queueitToken, cancelConfig, "customerId", secretKey, httpContextProvider);
        //Assert
        assert("https://customerId.api2.queue-it.net/customerId/diagnostics/connector/error/?code=hash" === result.redirectUrl);
        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');
    },

    test_cancelRequestByLocalConfig_Exception_NoDebugToken: function () {

        resetMocks();

        var requestIP = "80.35.35.34";
        var viaHeader = "1.1 example.com";
        var forwardedHeader = "for=192.0.2.60;proto=http;by=203.0.113.43";
        var xForwardedForHeader = "129.78.138.66, 129.78.64.103";
        var xForwardedHostHeader = "en.wikipedia.org:8080";
        var xForwardedProtoHeader = "https";

        httpRequestMockHeaders = {
            "via": viaHeader,
            "forwarded": forwardedHeader,
            "x-forwarded-for": xForwardedForHeader,
            "x-forwarded-host": xForwardedHostHeader,
            "x-forwarded-proto": xForwardedProtoHeader
        };

        httpRequestMock.getAbsoluteUri = function () {
            return "http://test.com/?event1=true&queueittoken=queueittokenvalue";
        };

        httpRequestMock.getUserHostAddress = function () {
            return requestIP;
        };

        var secretKey = "secretKey";

        var cancelEventconfig = new Models.CancelEventConfig();
        cancelEventconfig.cookieDomain = "cookieDomain";
        cancelEventconfig.eventId = "eventId";
        cancelEventconfig.queueDomain = "queueDomain";
        cancelEventconfig.version = 1;
        userInQueueServiceMock.validateCancelRequestrRaiseException = true;
        knownUser.UserInQueueService = userInQueueServiceMock;
        try {
            var result = knownUser.cancelRequestByLocalConfig("http://test.com?event1=true",
                "queueitToken", cancelEventconfig, "customerid", "secretKey", httpContextProvider);
        } catch {

        }

        assert(typeof httpResponseMockCookies[knownUser.QueueITDebugKey] === 'undefined');

    }
};

for (var f in KnownUserTest) {
    console.log(f);
    KnownUserTest[f]();
}
