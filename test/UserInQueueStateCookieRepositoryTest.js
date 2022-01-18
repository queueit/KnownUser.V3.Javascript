let QueueITHelpers = require('./../dist/QueueITHelpers');
let {UserInQueueStateCookieRepository, CookieValidationResult} = require('./../dist/UserInQueueStateCookieRepository');
let assert = require('assert');
let utils = QueueITHelpers.Utils;
const expect = require('chai').expect;

utils.generateSHA256Hash = function (secretKey, stringToHash) {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secretKey)
        .update(stringToHash)
        .digest('hex');
    return hash;
};

function generateHash(eventId, queueId, fixedCookieValidityMinutes, redirectType, issueTime, hashedIp, secretKey) {

    const valueToHash = eventId
        + queueId
        + (fixedCookieValidityMinutes ? fixedCookieValidityMinutes : "")
        + redirectType
        + issueTime
        + (hashedIp ? hashedIp : "");

    return utils.generateSHA256Hash(secretKey, valueToHash);
}

let mockCookies = {};
let httpRequestMock = {
    getCookieValue: function (name) {
        if (mockCookies[name]) {
            return mockCookies[name].value;
        }
        return null;
    },
    getUserHostAddress: () => null
};
let httpResponseMock = {
    setCookie: function (name, value, domain, expire, isHttpOnly, isSecure) {
        mockCookies[name] = {
            name,
            value,
            expire,
            domain,
            isHttpOnly,
            isSecure
        };
    }
};
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

let userInQueueStateCookieRepository = new UserInQueueStateCookieRepository(connectorContextProvider);

let UserInQueueStateCookieRepositoryTest = {
    test_store_givenHashedIp_Then_ValidCookieIsSavedWithHashedIpSet: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const cookieIsHttpOnly = true;
        const cookieIsSecure = true;
        const hashedIp = utils.generateSHA256Hash(secretKey, "127.0.0.1");

        httpRequestMock.getUserHostAddress = () => "127.0.0.1";

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            cookieIsHttpOnly,
            cookieIsSecure,
            "queue",
            hashedIp,
            secretKey);

        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        expect(actualCookie).to.not.be.null;
        expect(actualCookie.value).to.include("Hip=" + hashedIp);
    },

    test_store_givenHashedIpAndOtherRequestIp_Then_CookisIsInvalid: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const cookieIsHttpOnly = true;
        const cookieIsSecure = true;
        const hashedIp = utils.generateSHA256Hash(secretKey, "127.0.0.1");

        httpRequestMock.getUserHostAddress = function () {
            return "1.1.1.1";
        }

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            cookieIsHttpOnly,
            cookieIsSecure,
            "queue",
            hashedIp,
            secretKey);

        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        expect(state.isValid).to.be.false;
        expect(state.cookieValidationResult).to.be.equal(CookieValidationResult.IpBindingMismatch);
        expect(state.cookie.hashedIp).to.be.equal(hashedIp)
    },

    test_store_givenNoHashedIp_Then_ValidCookieDoesNotContainHashedIp: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const cookieIsHttpOnly = true;
        const cookieIsSecure = true;
        const hashedIp = undefined;

        httpRequestMock.getUserHostAddress = () => "1.1.1.1";

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            cookieIsHttpOnly,
            cookieIsSecure,
            "queue",
            hashedIp,
            secretKey);

        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        expect(actualCookie).to.not.be.null;
        expect(actualCookie.value).to.not.include("Hip=");
    },

    test_store_givenCookieFlags_Then_CookieIsSavedWithTheFlagsSet: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const cookieIsHttpOnly = true;
        const cookieIsSecure = true;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            cookieIsHttpOnly,
            cookieIsSecure,
            "queue",
            hashedIp,
            secretKey);

        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        expect(actualCookie).to.not.be.null;
        assert(actualCookie.expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(actualCookie.domain === cookieDomain);
        expect(actualCookie.isHttpOnly).to.be.true;
        expect(actualCookie.isSecure).to.be.true;
    },

    test_store_isCookieHttpOnlyNotSet_Then_HttpOnly_Should_NotBeSet: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const isCookieHttpOnly = undefined;
        const isCookieSecure = undefined;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            isCookieHttpOnly,
            isCookieSecure,
            "queue",
            hashedIp,
            secretKey);
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        assert(actualCookie !== null);
        assert(actualCookie.expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(actualCookie.domain === cookieDomain);
        expect(actualCookie.isHttpOnly).to.be.false;
        expect(actualCookie.isSecure).to.be.false;
    },
    test_store_hasValidState_ExtendableCookie_CookieIsSaved: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let cookieValidity = 10;
        const isCookieHttpOnly = false;
        const isCookieSecure = false;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, "queue", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(mockCookies[cookieKey].domain === cookieDomain);
    },
    test_store_hasValidState_nonExtendableCookie_CookieIsSaved: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let cookieValidity = 3;
        const isCookieHttpOnly = false;
        const isCookieSecure = false;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, cookieValidity, cookieDomain, isCookieHttpOnly, isCookieSecure, "idle", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable() === false);
        assert(state.redirectType === "idle");
        assert(state.fixedCookieValidityMinutes === 3);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        assert(mockCookies[cookieKey].domain === cookieDomain);
        expect(mockCookies[cookieKey].isSecure).to.be.false;
    },
    test_store_hasValidState_tamperedCookie_stateIsNotValid_isCookieExtendable: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let cookieValidity = 10;
        const isCookieHttpOnly = false;
        const isCookieSecure = false;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, isCookieHttpOnly, isCookieSecure, "Idle", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let oldCookieValue = mockCookies[cookieKey].value;

        mockCookies[cookieKey].value = oldCookieValue.replace("FixedValidityMins=3", "FixedValidityMins=10");
        let state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        expect(state2.isValid).to.be.false;
        expect(state.isStateExtendable()).to.be.false;
    },
    test_store_hasValidState_tamperedCookie_stateIsNotValid_eventId: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, isCookieHttpOnly, isCookieSecure, "Idle", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let oldCookieValue = mockCookies[cookieKey].value;
        mockCookies[cookieKey].value = oldCookieValue.replace("EventId=event1", "EventId=event2");

        let state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);
        assert(state.isStateExtendable() === false);
    },
    test_store_hasValidState_expiredCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = -1;
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, "idle", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid === false);
    },
    test_store_hasValidState_differentEventId_stateIsNotValid: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, "Queue", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let state2 = userInQueueStateCookieRepository.getState("event2", cookieValidity, secretKey, true);
        assert(state2.isValid === false);
    },
    test_hasValidState_noCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let cookieKey = "key";
        let cookieValidity = 10;

        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid === false);
    },
    test_hasValidState_invalidCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, "Queue", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        mockCookies[cookieKey].value = "IsCookieExtendable=ooOOO&Expires=|||&QueueId=000&Hash=23232";
        let state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);
    },
    test_cancelQueueCookie: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 20;
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, "Queue", hashedIp, secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        userInQueueStateCookieRepository.cancelQueueCookie(eventId, cookieDomain);
        let state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire === 0);
        assert(mockCookies[cookieKey].domain === cookieDomain);
        assert(mockCookies[cookieKey].value === "");
    },
    test_extendQueueCookie_cookieExist: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        const isCookieHttpOnly = true;
        const isCookieSecure = true;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, "Queue", hashedIp, secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);

        let state = userInQueueStateCookieRepository.getState(eventId, 5, secretKey, true);
        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        expect(mockCookies[cookieKey].domain).to.be.equal(cookieDomain);
        expect(mockCookies[cookieKey].isHttpOnly).to.be.true;
        expect(mockCookies[cookieKey].isSecure).to.be.true;
    },
    test_extendQueueCookie_cookieDoesNotExist: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const isCookieHttpOnly = false;
        const isCookieSecure = false;
        const hashedIp = undefined;

        userInQueueStateCookieRepository.store("event2", queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, "Queue", hashedIp, secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, isCookieHttpOnly, isCookieSecure, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey("event2");
        assert(mockCookies[cookieKey] !== null);
    },
    test_getState_validCookieFormat_extendable: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let issueTime = QueueITHelpers.Utils.getCurrentTime();
        let hashedIp = null;
        let hash = generateHash(eventId, queueId, null, "queue", issueTime, hashedIp, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpResponseMock.setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
        let state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isStateExtendable());
        assert(state.isValid);
        assert(state.isFound);
        assert(state.queueId === queueId);
        assert(state.redirectType === "queue");
    },
    test_getState_oldCookie_invalid_expiredCookie_extendable: function () {
        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        let issueTime = QueueITHelpers.Utils.getCurrentTime() - 11 * 60;
        let hashedIp = null;
        let hash = generateHash(eventId, queueId, null, "queue", issueTime, hashedIp, secretKey);

        httpResponseMock.setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
        let state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isValid === false);
        assert(state.isFound);
    },
    test_getState_oldCookie_invalid_expiredCookie_nonExtendable: function () {
        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let issueTime = QueueITHelpers.Utils.getCurrentTime() - 4 * 60;
        let hashedIp = null;
        let hash = generateHash(eventId, queueId, 3, "idle", issueTime, hashedIp, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpResponseMock.setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
        let state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isValid === false);
        assert(state.isFound);
    },
    test_getState_validCookieFormat_nonExtendable: function () {
        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let issueTime = QueueITHelpers.Utils.getCurrentTime();
        let hashedIp = null;
        let hash = generateHash(eventId, queueId, 3, "idle", issueTime, hashedIp, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpResponseMock.setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
        let state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isStateExtendable() === false);
        assert(state.isValid);
        assert(state.isFound);
        assert(state.queueId === queueId);
        assert(state.redirectType === "idle");
    },
    test_getState_NoCookie: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";

        let state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(!state.isFound);
        assert(!state.isValid);
    }
};

for (var f in UserInQueueStateCookieRepositoryTest) {
    console.log(f);
    UserInQueueStateCookieRepositoryTest[f]();
}