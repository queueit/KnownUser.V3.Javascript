const {
    QueueItAcceptedCookie,
    CookieStateInfo,
    CookieValidationResult
} = require("../dist/UserInQueueStateCookieRepository");
const {CancelEventConfig, QueueEventConfig} = require('../dist/Models')
const QueueITHelpers = require('./../dist/QueueITHelpers')
const UserInQueueService = require('./../dist/UserInQueueService')
const {assertUrlMatches, assertTimestamp} = require('./assertions');
const assert = require('assert');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = require('chai').expect;

const MockedClientIP = "127.0.0.2";
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
    let token = 'e_' + eventId + '~ts_' + timestamp + '~ce_' + extendableCookie + '~q_' + queueId;
    if (cookieValidityMinutes !== null)
        token = token + '~cv_' + cookieValidityMinutes;
    if (redirectType !== null)
        token = token + '~rt_' + redirectType;
    if (ip) {
        token = token + '~hip_' + utils.generateSHA256Hash(secretKey, ip);
    }
    return token + '~h_' + utils.generateSHA256Hash(secretKey, token);
}

const userInQueueStateCookieRepositoryMock = {};
userInQueueStateCookieRepositoryMock.returnThisState = {};
userInQueueStateCookieRepositoryMock.getState = function (
    eventId,
    cookieValidityMinutes,
    secretKey,
    validateTime) {
    this.getStateCall = {
        eventId,
        cookieValidityMinutes,
        secretKey,
        validateTime
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
                                                       hashedIp,
                                                       secretKey) {
    this.storeCall = {
        eventId,
        queueId,
        fixedCookieValidityMinutes,
        cookieDomain,
        isCookieHttpOnly,
        isCookieSecure,
        redirectType,
        hashedIp,
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
const httpResponseMock = {};
const httpRequestMock = {};
let cryptoProviderMock = {
    getSha256Hash: (secretKey, plaintext) => require('crypto').createHmac('sha256', secretKey)
        .update(plaintext)
        .digest('hex')
};

let enqueueTokenProviderMock = {
    getEnqueueToken: () => undefined
};

const connectorContextProvider = {
    getHttpRequest: () => httpRequestMock,
    getHttpResponse: () => httpResponseMock,
    getCryptoProvider: () => cryptoProviderMock,
    getEnqueueTokenProvider: () => enqueueTokenProviderMock
};

const userInQueueService = new UserInQueueService.UserInQueueService(connectorContextProvider, userInQueueStateCookieRepositoryMock);

function getDefaultEventConfig() {
    const eventConfig = new QueueEventConfig();
    eventConfig.eventId = "e1";
    eventConfig.queueDomain = "testDomain.com";
    eventConfig.version = 11;
    eventConfig.culture = 'en-US';
    eventConfig.layoutName = 'testlayout';
    return eventConfig;
}

function newIdleCookieState({fixedCookieValidityMinutes = null} = {}) {
    return new CookieStateInfo("queueId", fixedCookieValidityMinutes, "idle", null, CookieValidationResult.Valid,null);
}

function newDisabledCookieState({fixedCookieValidityMinutes = null} = {}) {
    return new CookieStateInfo("queueId", fixedCookieValidityMinutes, "disabled", null, CookieValidationResult.Valid, null);
}

function newNotFoundCookieState() {
    return new CookieStateInfo(null, 0, null, null, CookieValidationResult.NotFound, null);
}

function newHashMismatchedCookieState({queueId = "queueId", cookie = null} = {}) {
    return new CookieStateInfo(queueId, 0, null, null, CookieValidationResult.HashMismatch, cookie);
}

function newExpiredCookieState({queueId = "queueId", cookie = null} = {}) {
    return new CookieStateInfo(queueId, null, null, null, CookieValidationResult.Expired, cookie);
}

function newIpMismatchedCookieState({queueId = "queueId", cookie = null} = {}) {
    return new CookieStateInfo(queueId, 0, null, null, CookieValidationResult.IpBindingMismatch, cookie, MockedClientIP);
}

function resetMocks() {
    userInQueueStateCookieRepositoryMock.reset();
    enqueueTokenProviderMock = {
        getEnqueueToken: () => undefined
    };
}

const UserInQueueServiceTest = {
    test_validateQueueRequest_Given_NoToken_CookieBoundToOtherIp_Then_RedirectToStateErrorPage_DoNotStore: function () {
        const cookie = new QueueItAcceptedCookie();
        cookie.hashedIp = "hashForOtherIp"
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newIpMismatchedCookieState({cookie: cookie});

        const eventConfig = new QueueEventConfig();
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.eventId = "e1";
        const queueItToken = undefined;
        const issueTime = Date.now();

        const result = userInQueueService.validateQueueRequest("url", queueItToken, eventConfig, "customerid", "key");

        assert(result.doRedirect());
        expect(result.queueId).to.be.null;
        expect(result.eventId).to.be.equal(eventConfig.eventId);
        expect(userInQueueStateCookieRepositoryMock.storeCall).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/connector/sessionstate/', {
            c: 'customerid',
            e: eventConfig.eventId,
            ver: SDK_VERSION,
            man: 'unspecified',
            t: 'url',
            icr: utils.encodeUrl(`ip,hip:${cookie.hashedIp},cip:${utils.bin2hex(MockedClientIP)},q:queueId,st:${issueTime}`)
        });
    },
    test_validateQueueRequest_Given_InvalidTokenBoundToAnotherIp_And_CookieBoundToOtherIp_Then_RedirectToStateErrorPage_DoNotStore: function () {
        const cookie = new QueueItAcceptedCookie();
        cookie.hashedIp = "hashForOtherIp"
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newIpMismatchedCookieState({cookie: cookie});

        const eventConfig = new QueueEventConfig();
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.eventId = "e1";
        const ipInToken = "127.0.0.1"
        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const queueItToken = generateHash(eventConfig.eventId, 'queueId', utils.getCurrentTime() + 3 * 60, 'true', null, 'queue', ipInToken, key);
        httpRequestMock.getUserHostAddress = () => MockedClientIP;

        const result = userInQueueService.validateQueueRequest("url", queueItToken, eventConfig, "customerid", key);

        assert(result.doRedirect());
        expect(result.queueId).to.be.null;
        expect(result.eventId).to.be.equal(eventConfig.eventId);
        expect(userInQueueStateCookieRepositoryMock.storeCall).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/ip/', {
            c: 'customerid',
            e: eventConfig.eventId,
            ver: SDK_VERSION,
            man: 'unspecified',
            t: 'url',
            icr: utils.encodeUrl(`ip,cip:${utils.bin2hex(MockedClientIP)},hip:${utils.generateSHA256Hash(key, ipInToken)}`)
        });
    },

    test_validateQueueRequest_Given_NoToken_CookieBoundToOtherIp_Then_RedirectToStateErrorPage_DoNotStore: function () {
        const cookie = new QueueItAcceptedCookie();
        cookie.hashedIp = "hashForOtherIp"
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newIpMismatchedCookieState({cookie: cookie});

        const eventConfig = new QueueEventConfig();
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.eventId = "e1";
        const queueItToken = "";
        const issueTime = Date.now();

        const result = userInQueueService.validateQueueRequest("url", queueItToken, eventConfig, "customerid", "key");

        assert(result.doRedirect());
        expect(result.queueId).to.be.null;
        expect(result.eventId).to.be.equal(eventConfig.eventId);
        expect(userInQueueStateCookieRepositoryMock.storeCall).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/connector/sessionstate/', {
            c: 'customerid',
            e: eventConfig.eventId,
            ver: SDK_VERSION,
            man: 'unspecified',
            t: 'url',
            icr: utils.encodeUrl(`ip,cip:${utils.bin2hex(MockedClientIP)},hip:${cookie.hashedIp},q:queueId,st:${issueTime}`)
        });
    },

    test_validateQueueRequest_Given_ValidToken_CookieBoundToOtherIp_Then_DoNotRedirect_StoreExtendableCookie: function () {
        const cookie = new QueueItAcceptedCookie();
        cookie.hashedIp = "hashForOtherIp"
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newIpMismatchedCookieState({cookie: cookie});

        const eventConfig = new QueueEventConfig();
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = 'testDomain';
        eventConfig.eventId = "e1";
        const ip = "127.0.0.1"
        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const queueItToken = generateHash(eventConfig.eventId, 'queueId', utils.getCurrentTime() + 3 * 60, 'true', null, 'queue', ip, key);
        httpRequestMock.getUserHostAddress = () => ip;

        const result = userInQueueService.validateQueueRequest("url", queueItToken, eventConfig, "customerid", key);

        expect(result.doRedirect()).to.be.false;
        expect(result.queueId).to.be.equal('queueId');
        expect(result.eventId).to.be.equal(eventConfig.eventId);
        expect(result.redirectType).to.be.equal('queue');
        expect(userInQueueStateCookieRepositoryMock.storeCall).to.not.be.empty;
        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).to.be.empty;

        assert(userInQueueStateCookieRepositoryMock.storeCall.eventId === eventConfig.eventId);
        assert(userInQueueStateCookieRepositoryMock.storeCall.queueId === "queueId");
        expect(userInQueueStateCookieRepositoryMock.storeCall.fixedCookieValidityMinutes, "Cookie should be extendable").to.be.undefined;
        assert(userInQueueStateCookieRepositoryMock.storeCall.cookieDomain === eventConfig.cookieDomain);
        assert(userInQueueStateCookieRepositoryMock.storeCall.redirectType === "queue");
        assert(userInQueueStateCookieRepositoryMock.storeCall.secretKey === key);
    },

    test_validateQueueRequest_ValidState_ExtendableCookie_NoCookieExtensionFromConfig_DoNotRedirectDoNotStoreCookieWithExtension: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newIdleCookieState();

        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");
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
        userInQueueStateCookieRepositoryMock.returnThisState = newDisabledCookieState()

        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testDomain";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

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
        userInQueueStateCookieRepositoryMock.returnThisState = newIdleCookieState({fixedCookieValidityMinutes: 3});

        const eventConfig = getDefaultEventConfig();
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;

        const result = userInQueueService.validateQueueRequest("url", "token", eventConfig, "customerid", "key");

        assert(!result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === "queueId");
        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
    },
    test_validateQueueRequest_InvalidState_CookieNotFound_WithoutToken_DoRedirectDoNotStoreCookie: function () {
        const targetUrl = "https://target.com"
        const queueItToken = undefined;
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();
        const eventConfig = getDefaultEventConfig();

        const result = userInQueueService.validateQueueRequest(targetUrl, queueItToken, eventConfig, "testCustomer", "key");

        expect(result.doRedirect()).to.be.true;
        expect(Object.keys(userInQueueStateCookieRepositoryMock.storeCall)).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            icr: undefined,
        });
    },
    test_validateQueueRequest_Given_EnqueueToken_When_Redirecting_Then_RedirectURL_Should_ContainEnqueueToken: function () {
        [undefined, "", "enqueueToken"].forEach((enqueueToken) => {
            resetMocks();
            const targetUrl = "https://target.com"
            const queueItToken = undefined;
            userInQueueStateCookieRepositoryMock.reset();
            userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();
            const eventConfig = getDefaultEventConfig();
            const expectedEnqueueToken = enqueueToken ? enqueueToken : undefined;
            enqueueTokenProviderMock = {getEnqueueToken: () => enqueueToken};

            const result = userInQueueService.validateQueueRequest(targetUrl, queueItToken, eventConfig, "testCustomer", "key");

            expect(result.doRedirect()).to.be.true;
            expect(Object.keys(userInQueueStateCookieRepositoryMock.storeCall)).to.be.empty;
            assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
                icr: undefined,
                enqueuetoken: expectedEnqueueToken
            });
        })
    },
    test_validateQueueRequest_InvalidState_CookieNotFound_InvalidToken_DoRedirectDoNotStoreCookie: function () {
        const targetUrl = "https://target.com"
        const queueItToken = 'someInvalidToken';
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState()
        const eventConfig = getDefaultEventConfig();

        const result = userInQueueService.validateQueueRequest(targetUrl, queueItToken, eventConfig, "testCustomer", "key");

        expect(result.doRedirect()).to.be.true;
        expect(Object.keys(userInQueueStateCookieRepositoryMock.storeCall)).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/hash/', {
            icr: undefined
        });
    },
    test_validateQueueRequest_InvalidState_CookieWithBadHash_DoRedirectDoNotStoreCookie: function () {
        const issueTime = Date.now();
        const targetUrl = "https://target.com"
        const queueItToken = undefined;
        const badHashedCookie = new QueueItAcceptedCookie();
        badHashedCookie.storedHash = "badHash";
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newHashMismatchedCookieState({cookie: badHashedCookie});
        const eventConfig = getDefaultEventConfig();

        const result = userInQueueService.validateQueueRequest(targetUrl, queueItToken, eventConfig, "testCustomer", "key");

        expect(result.doRedirect()).to.be.true;
        expect(result.eventId).to.be.equal(eventConfig.eventId);
        expect(result.queueId).to.be.null;
        expect(Object.keys(userInQueueStateCookieRepositoryMock.storeCall)).to.be.empty;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            man: 'unspecified',
            cid: 'en-US',
            l: 'testlayout',
            t: utils.encodeUrl(targetUrl),
            icr: undefined
        });
    },
    test_validateQueueRequest_SignTargetParameter: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState()

        const url = "http://test.test.com?b=h";
        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
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
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState()

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.actionName = "Queue Action (._~-) &!*|'\"";
        const url = "http://test.test.com?b=h";

        let token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'False', null, 'idle', null, key);
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
            t: utils.encodeUrl(url),
            icr: undefined
        })
    },
    test_validateQueueRequest_NoCookie_ExpiredTimeStampInToken_RedirectToErrorPageWithTimeStampError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;
        eventConfig.version = '11';
        eventConfig.actionName = "QueueAction";
        const url = "http://test.test.com?b=h";

        const token = generateHash('e1', 'queueId', utils.getCurrentTime() - 3 * 60, 'False', null, 'queue', null, key);
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

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
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState()

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e2";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 10;
        eventConfig.actionName = "QueueAction";
        const url = "http://test.test.com?b=h";

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
    test_validateQueueRequest_NoCookie_TokenIPMismatch_RedirectToErrorPageWithIPMismatchError_DoNotStoreCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "954656b7-bcfa-4de5-9c82-ff3805edd953737070fd-2f5d-4a11-b5ac-5c23e1b097b1";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 10;
        eventConfig.actionName = "QueueAction";
        const url = "http://test.test.com?b=h";
        const ipInToken = "82.192.173.38";
        const token = generateHash('e1', '954656b7-bcfa-4de5-9c82-ff3805edd953737070fd-2f5d-4a11-b5ac-5c23e1b097b1', utils.getCurrentTime() + 3 * 60, 'False', null, 'queue', ipInToken, key);
        httpRequestMock.getUserHostAddress = () => MockedClientIP;

        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        httpRequestMock.getUserHostAddress =
            assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length == 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.actionType === 'Queue');

        assertTimestamp(result.redirectUrl, timestamp => utils.getCurrentTime() - timestamp < 100);
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/error/ip/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: '10',
            man: 'QueueAction',
            queueittoken: token,
            t: utils.encodeUrl(url),
            icr: utils.encodeUrl(`ip,cip:${utils.bin2hex(MockedClientIP)},hip:${utils.generateSHA256Hash(key, ipInToken)}`)
        });
    },
    test_validateQueueRequest_NoCookie_ValidToken_ExtendableCookie_DoNotRedirect_StoreExtendableCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.isCookieHttpOnly = true;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        const url = "http://test.test.com?b=h";
        const clientIp = "82.192.173.38";
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
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.isCookieHttpOnly = true;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        const url = "http://test.test.com?b=h";
        const clientIp = "82.192.173.38";
        httpRequestMock.getUserHostAddress = function () {
            return clientIp;
        }

        const token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'true', null, 'queue', clientIp, key);
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
    test_validateQueueRequest_NoCookie_ValidToken_CookieValidityMinuteFromToken_DoNotRedirect_StoreNonExtendableCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 30;
        eventConfig.cookieDomain = "testDomain";
        eventConfig.extendCookieValidity = true;
        const url = "http://test.test.com?b=h";

        const token = generateHash('e1', 'queueId', utils.getCurrentTime() + 3 * 60, 'false', 3, 'DirectLink', null, key);
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

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
    test_validateQueueRequest_NoCookie_NoValidToken_WithoutToken_RedirectToQueue: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
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
        userInQueueStateCookieRepositoryMock.returnThisState = newExpiredCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";
        const issueTime = Date.now();
        const result = userInQueueService.validateQueueRequest(url, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        expect(result.doRedirect()).to.be.true;
        expect(result.eventId).to.equal('e1');
        expect(result.queueId).to.be.null;
        expect(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).to.be.ok;
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: '11',
            man: 'unspecified',
            cid: 'en-US',
            l: 'testlayout',
            t: utils.encodeUrl(url),
            icr: undefined
        });
    },
    test_validateRequest_NoCookie_WithoutToken_RedirectToQueue_NotargetUrl: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = false;
        eventConfig.version = 11;
        eventConfig.culture = null;
        eventConfig.layoutName = 'testlayout';
        const token = "";

        const result = userInQueueService.validateQueueRequest(null, token, eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assertUrlMatches(result.redirectUrl, 'https://testDomain.com/', {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: eventConfig.version,
            man: 'unspecified',
            l: eventConfig.layoutName
        });
    },
    test_validateQueueRequest_NoCookie_InValidToken: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newNotFoundCookieState();

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";

        const result = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(result.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1") === 0);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length == 0);
    },
    test_validateQueueRequest_InvalidCookie_InValidToken_CancelCookie: function () {
        userInQueueStateCookieRepositoryMock.reset();
        userInQueueStateCookieRepositoryMock.returnThisState = newExpiredCookieState()

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new QueueEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieValidityMinute = 10;
        eventConfig.extendCookieValidity = true;
        eventConfig.version = 11;
        eventConfig.culture = 'en-US';
        eventConfig.layoutName = 'testlayout';

        const url = "http://test.test.com?b=h";
        const token = "";

        const result = userInQueueService.validateQueueRequest(url, "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895", eventConfig, "testCustomer", key);

        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === null);
        assert(result.redirectUrl.indexOf("https://testDomain.com/error/hash/?c=testCustomer&e=e1") === 0);

        assert(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall);
    },
    test_validateCancelRequest: function () {
        resetMocks();
        userInQueueStateCookieRepositoryMock.returnThisState = newIdleCookieState({fixedCookieValidityMinutes: 3});

        const key = "4e1db821-a825-49da-acd0-5d376f2068db";
        const eventConfig = new CancelEventConfig();
        eventConfig.eventId = "e1";
        eventConfig.queueDomain = "testDomain.com";
        eventConfig.cookieDomain = "testdomain";
        eventConfig.version = 10;
        eventConfig.actionName = "Cancel";

        const url = "http://test.test.com?b=h";
        const result = userInQueueService.validateCancelRequest(url, eventConfig, "testCustomer", key);
        enqueueTokenProviderMock = {getEnqueueToken: () => "enqueueToken"};
        assert(Object.keys(userInQueueStateCookieRepositoryMock.cancelQueueCookieCall).length > 0);
        assert(Object.keys(userInQueueStateCookieRepositoryMock.storeCall).length === 0);
        assert(result.doRedirect());
        assert(result.eventId === 'e1');
        assert(result.queueId === "queueId");
        assert(result.actionName === 'Cancel');
        assertUrlMatches(result.redirectUrl, "https://testDomain.com/cancel/testCustomer/e1/queueId", {
            c: 'testCustomer',
            e: 'e1',
            ver: SDK_VERSION,
            cver: eventConfig.version,
            man: eventConfig.actionName,
            r: "http%3A%2F%2Ftest.test.com%3Fb%3Dh",
            enqueuetoken: undefined
        });
    },
    test_getIgnoreResult: function () {
        resetMocks()

        const result = userInQueueService.getIgnoreResult();

        assert(!result.doRedirect());
        assert(result.eventId === null);
        assert(result.queueId === null);
        assert(result.redirectUrl === null);
        assert(result.actionType === "Ignore");
    }
};

for (let f in UserInQueueServiceTest) {
    console.log(f);
    const origDateFunction = Date.now;
    const dateNow = Date.now();
    Date.now = () => dateNow;

    UserInQueueServiceTest[f]();

    Date.now = origDateFunction;
}