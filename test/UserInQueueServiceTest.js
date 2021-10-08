const QueueITHelpers = require('./../dist/QueueITHelpers')
const Models = require('./../dist/Models')
const UserInQueueService = require('./../dist/UserInQueueService')
const UserInQueueStateCookieRepository = require('./../dist/UserInQueueStateCookieRepository')
const {assertUrlMatches, assertTimestamp} = require('./assertions');

const assert = require('assert');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = require('chai').expect;

const utils = QueueITHelpers.Utils;
const SDK_VERSION = UserInQueueService.UserInQueueService.SDK_VERSION;
utils.generateSHA256Hash = function (secretKey, stringToHash) {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secretKey)
        .update(stringToHash)
        .digest('hex');
    return hash;
};

function generateHash(eventId, queueId, timestamp, extendableCookie, cookieValidityMinutes, redirectType, ip, secretKey) {
    token = 'e_' + eventId + '~ts_' + timestamp + '~ce_' + extendableCookie + '~q_' + queueId;
    if (cookieValidityMinutes !== null)
        token = token + '~cv_' + cookieValidityMinutes;
    if (redirectType !== null)
        token = token + '~rt_' + redirectType;
    if (ip) {
        token = token + '~hip_' + utils.generateSHA256Hash(secretKey, ip);
    }
    return token + '~h_' + utils.generateSHA256Hash(secretKey, token);
}

var userInQueueStateCookieRepositoryMock = {};
userInQueueStateCookieRepositoryMock.returnThisState = {};
userInQueueStateCookieRepositoryMock.getState = function (eventId, cookieValidityMinutes, secretKey, validateTime) {
    this.getStateCall = {
        eventId: eventId,
        cookieValidityMinutes: cookieValidityMinutes,
        secretKey: secretKey,
        validateTime: validateTime
    };
    return this.returnThisState;
};
userInQueueStateCookieRepositoryMock.store = function (eventId,
                                                       queueId,
                                                       fixedCookieValidityMinutes,
                                                       cookieDomain,
                                                       isCookieHttpOnly,
                                                       isCookieSecure,
                                                       redirectType,
                                                       secretKey) {
    this.storeCall = {
        eventId,
        queueId,
        fixedCookieValidityMinutes,
        cookieDomain,
        isCookieHttpOnly,
        isCookieSecure,
        redirectType,
        secretKey
    };
};
userInQueueStateCookieRepositoryMock.cancelQueueCookie = function (eventId, cookieDomain) {
    this.cancelQueueCookieCall = {eventId: eventId, cookieDomain: cookieDomain};
};

userInQueueStateCookieRepositoryMock.reset = function () {
    this.getStateCall = {};
    this.storeCall = {};
    this.cancelQueueCookieCall = {};
};

httpResponseMockCookies = {};
var httpResponseMock = {};
var httpRequestMock = {};
var httpContextProvider = {
    getHttpRequest: function () {
        return httpRequestMock;
    },
    getHttpResponse: function () {
        return httpResponseMock;
    }
};

var userInQueueService = new UserInQueueService.UserInQueueService(httpContextProvider, userInQueueStateCookieRepositoryMock);

var UserInQueueServiceTest = {
    test_validateQueueRequest_ValidState_ExtendableCookie_NoCookieExtensionFromConfig_DoNotRedirectDoNotStoreCookieWithExtension: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, true, "queueId", null, "idle");

        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;

        var result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");
        assert(!result.doRedirect());
        assert(result.queueId === "queueId");

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(userInQueueStateCookieRepositoryMock.getStateCall.eventId === "e1");
        assert(userInQueueStateCookieRepositoryMock.getStateCall.cookieValidityMinutes === 10);
        assert(userInQueueStateCookieRepositoryMock.getStateCall.secretKey === "key");
        assert(userInQueueStateCookieRepositoryMock.getStateCall.validateTime === true);
    },
    test_validateQueueRequest_ValidState_ExtendableCookie_CookieExtensionFromConfig_DoNotRedirectDoStoreCookieWithExtension: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, true, "queueId", null, "disabled");

        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        var result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === "queueId");

        const storeCall = userInQueueStateCookieRepositoryMock.storeCall;
        assert(storeCall.eventId === "e1");
        assert(storeCall.queueId === "queueId");
        assert(storeCall.fixedCookieValidityMinutes === null);
        assert(storeCall.cookieDomain === "testDomain");
        assert(storeCall.redirectType === "disabled");
        assert(storeCall.secretKey === "key");
        expect(storeCall.isCookieHttpOnly).to.be.undefined;
        expect(storeCall.isCookieSecure).to.be.undefined;
    },
    test_validateQueueRequest_ValidState_NoExtendableCookie_DoNotRedirectDoNotStoreCookieWithExtension: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, true, "queueId", 3, "idle");

        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        var result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === "queueId");
        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);

    },
    test_validateQueueRequest_SignTargetParameter: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        const url = "http://test.test.com?b=h";
        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.actionName = 'Queue Action (._~-) &!*|\'"';

        const result = userInQueueService.validateQueueRequest(url, "", eventConfig, "testCustomer", key);

        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            ver: SDK_VERSION,
            cver: '11',
            man: 'Queue%20Action%20%28._~-%29%20%26%21%2a%7C%27%22',
            t: utils.encodeUrl(url)
        });
    },

    test_validateQueueRequest_NoCookie_TampredToken_RedirectToErrorPageWithHashError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.actionName = "Queue Action (._~-) &!*|'\"";
        var url = "http://test.test.com?b=h";

        var token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'False', null, 'idle', null, key);
        token = token.replace("False", "True");
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assertTimestamp(result.redirectUrl, timestamp => utils.getCurrentTime() - timestamp < 100)
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/hash/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: '11',
            man: 'Queue%20Action%20%28._~-%29%20%26%21%2a%7C%27%22',
            queueittoken: token,
            t: utils.encodeUrl(url)
        })
    },
    test_validateQueueRequest_NoCookie_ExpiredTimeStampInToken_RedirectToErrorPageWithTimeStampError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;
        eventConfig.version = '11';
        eventConfig.actionName = "QueueAction";
        var url = "http://test.test.com?b=h";

        var token = generateHash('e1', 'queueId', utils.getCurrentTime() - 3 * 60, 'False', null, 'queue', null, key);
        var result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assertTimestamp(result.redirectUrl, timestamp => utils.getCurrentTime() - timestamp < 100);
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/timestamp/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: eventConfig.version,
            man: eventConfig.actionName,
            queueittoken: token,
            t: utils.encodeUrl(url)
        });
    },
    test_validateQueueRequest_NoCookie_EventIdMismatch_RedirectToErrorPageWithEventIdMissMatchError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e2";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 10;
        eventConfig.actionName = "QueueAction";
        var url = "http://test.test.com?b=h";

        const token = generateHash('e1', 'queueId', utils.getCurrentTime() - 3 * 60, 'False', null, 'queue', null, key);
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length == 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e2');
        assert(result.actionType === 'Queue');
        assertTimestamp(result.redirectUrl, timestamp => utils.getCurrentTime() - timestamp < 100)
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/eventid/', {
            c: 'testCustomer',
            e: 'e2',
            ver: SDK_VERSION,
            cver: '10',
            man: 'QueueAction',
            queueittoken: token,
            t: utils.encodeUrl(url)
        });
    },
    test_validateQueueRequest_NoCookie_IPMismatch_RedirectToErrorPageWithIPMissMatchError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, null, null, null);

        var key = "954656b7-bcfa-4de5-9c82-ff3805edd953737070fd-2f5d-4a11-b5ac-5c23e1b097b1";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 10;
        eventConfig.actionName = "QueueAction";
        var url = "http://test.test.com?b=h";
        var clientIp = "82.192.173.38";

        var token = generateHash('e1', '954656b7-bcfa-4de5-9c82-ff3805edd953737070fd-2f5d-4a11-b5ac-5c23e1b097b1', utils.getCurrentTime() + 3 * 60, 'False', null, 'queue', clientIp, key);
        console.log(token);
        var expectedErrorUrl = "https://testDomain.com/error/ip/?c=testCustomer&e=e1" +
            "&ver=" + SDK_VERSION
            + "&cver=10"
            + "&man=QueueAction"
            + "&queueittoken=" + token
            + "&t=" + utils.encodeUrl(url);

        httpRequestMock.getUserHostAddress = function () {
            return "123.145.11.1";
        }

        var result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        httpRequestMock.getUserHostAddress =
            assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length == 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.actionType === 'Queue');
        const tsPart = result.redirectUrl.match("&ts=[^&]*")[0];
        const timestamp = tsPart.replace("&ts=", "");
        assert(utils.getCurrentTime() - timestamp < 100);
        const urlWithoutTimeStamp = result.redirectUrl.replace(tsPart, "");
        expect(urlWithoutTimeStamp).to.be.equal(expectedErrorUrl);
    },
    test_validateQueueRequest_NoCookie_ValidToken_ExtendableCookie_DoNotRedirect_StoreExtendableCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.isCookieHttpOnly = true;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        const url = "http://test.test.com?b=h";
        var clientIp = "82.192.173.38";
        httpRequestMock.getUserHostAddress = function () {
            return clientIp;
        }

        const token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'true', null, 'queue', null, key);
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === 'queueId');
        assert(result.redirectType === 'queue');

        assert(userInQueueStateCookieRepositoryMock.storeCall.eventId === "e1");
        assert(userInQueueStateCookieRepositoryMock.storeCall.queueId === "queueId");
        assert(!userInQueueStateCookieRepositoryMock.storeCall.fixedCookieValidityMinutes);
        assert(userInQueueStateCookieRepositoryMock.storeCall.cookieDomain === "testDomain");
        assert(userInQueueStateCookieRepositoryMock.storeCall.isCookieHttpOnly === true);
        assert(userInQueueStateCookieRepositoryMock.storeCall.redirectType === "queue");
        assert(userInQueueStateCookieRepositoryMock.storeCall.secretKey === key);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length === 0);
    },
    test_validateQueueRequest_NoCookie_ValidToken_WithMatchingIP_ExtendableCookie_DoNotRedirect_StoreExtendableCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        var url = "http://test.test.com?b=h";
        var clientIp = "82.192.173.38";
        httpRequestMock.getUserHostAddress = function () {
            return clientIp;
        }

        var token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'true', null, 'queue', clientIp, key);
        var result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === 'queueId');
        assert(result.redirectType === 'queue');


        assert(userInQueueStateCookieRepositoryMock.storeCall.eventId === "e1");
        assert(userInQueueStateCookieRepositoryMock.storeCall.queueId === "queueId");
        assert(!userInQueueStateCookieRepositoryMock.storeCall.fixedCookieValidityMinutes);
        assert(userInQueueStateCookieRepositoryMock.storeCall.cookieDomain === "testDomain");
        assert(userInQueueStateCookieRepositoryMock.storeCall.redirectType === "queue");
        assert(userInQueueStateCookieRepositoryMock.storeCall.secretKey === key);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length === 0);
    },
    test_validateQueueRequest_NoCookie_ValidToken_CookieValidityMinuteFromToken_DoNotRedirect_StoreNonExtendableCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 30;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.extendCookieValidity = true;
        var url = "http://test.test.com?b=h";

        var token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'false', 3, 'DirectLink', null, key);
        var result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === 'queueId');
        assert(result.redirectType === 'DirectLink');

        assert(userInQueueStateCookieRepositoryMock.storeCall.eventId === "e1");
        assert(userInQueueStateCookieRepositoryMock.storeCall.queueId === "queueId");
        assert(userInQueueStateCookieRepositoryMock.storeCall.fixedCookieValidityMinutes === 3);
        assert(userInQueueStateCookieRepositoryMock.storeCall.cookieDomain === "testDomain");
        assert(userInQueueStateCookieRepositoryMock.storeCall.redirectType === "DirectLink");
        assert(userInQueueStateCookieRepositoryMock.storeCall.secretKey === key);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length === 0);
    },
    test_NoCookie_NoValidToken_WithoutToken_RedirectToQueue: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: '11',
            man: 'unspecified',
            cid: 'en-US',
            l: 'testlayout',
            t: utils.encodeUrl(url)
        });
    },
    test_InValidCookie_WithoutToken_RedirectToQueue_CancelCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall);
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: '11',
            man: 'unspecified',
            cid: 'en-US',
            l: 'testlayout',
            t: utils.encodeUrl(url)
        });
    },
    test_validateRequest_NoCookie_WithoutToken_RedirectToQueue_NotargetUrl: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;
        eventConfig.version = 11;
        eventConfig.culture = null;
        eventConfig.layoutName = 'testlayout';
        var url = "http://test.test.com?b=h";
        var token = "";

        var expectedRedirectUrl = "https://testDomain.com/?c=testCustomer&e=e1" +
            "&ver=" + SDK_VERSION
            + "&cver=" + eventConfig.version
            + "&man=" + 'unspecified'
            + "&l=" + eventConfig.layoutName;

        var result = userInQueueService.validateQueueRequest(null, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(result.redirectUrl === expectedRedirectUrl);
    },
    test_validateQueueRequest_NoCookie_InValidToken: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(false, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        var url = "http://test.test.com?b=h";
        var token = "";

        var result = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(result.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1") === 0);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length == 0);
    },
    test_validateQueueRequest_InvalidCookie_InValidToken_CancelCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, false, null, null, null);

        var key = "4e1db821-a825-49da-acd0-5d376f2068db";
        var eventConfig = new Models.QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        var url = "http://test.test.com?b=h";
        var token = "";

        var result = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(result.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1") === 0);

        assert(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall);
    },
    test_validateCancelRequest: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = new UserInQueueStateCookieRepository.StateInfo(true, true, "queueid", 3, "idle");

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new Models.CancelEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testdomain";
        eventConfig.version = 10;
        eventConfig.actionName = "Cancel";

        const url = "http://test.test.com?b=h";
        const result = userInQueueService.validateCancelRequest(url, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length > 0);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === "queueid");
        assert(result.actionName === 'Cancel');
        assertUrlMatches(result.redirectUrl, "https://testDomain.com/cancel/testCustomer/e1/", {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: eventConfig.version,
            man: eventConfig.actionName,
            r: "http%3A%2F%2Ftest.test.com%3Fb%3Dh"
        });
    },
    test_getIgnoreResult: function () {
        userInQueueStateCookieRepositoryMock.reset();

        var result = userInQueueService.getIgnoreResult();

        assert(!result.doRedirect());
        assert(result.eventId === null);
        assert(result.queueId === null);
        assert(result.redirectUrl === null);
        assert(result.actionType === "Ignore");
    }
};

for (let f in UserInQueueServiceTest) {
    console.log(f);
    UserInQueueServiceTest[f]();
}