let QueueITHelpers = require('./../dist/QueueITHelpers')
let UserInQueueStateCookieRepository = require('./../dist/UserInQueueStateCookieRepository')
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

function generateHash(eventId, queueId, fixedCookieValidityMinutes, redirectType, issueTime, secretKey) {
    return utils.generateSHA256Hash(secretKey, eventId + queueId + (fixedCookieValidityMinutes ? fixedCookieValidityMinutes : "") + redirectType + issueTime);
}

let mockCookies = {};
let httpContextProvider = {
    getHttpRequest: function () {
        let httpRequest = {
            getCookieValue: function (name) {
                if (mockCookies[name]) {
                    return mockCookies[name].value;
                }
                return null;
            }
        };
        return httpRequest;
    },
    getHttpResponse: function () {
        let httpResponse = {
            setCookie: function (name, value, domain, expire, httpOnly, isSecure, sameSiteValue) {
                mockCookies[name] = {
                    name,
                    value,
                    expire,
                    domain,
                    httpOnly,
                    isSecure,
                    sameSiteValue
                };
            }
        };
        return httpResponse;
    }
};
let userInQueueStateCookieRepository = new UserInQueueStateCookieRepository.UserInQueueStateCookieRepository(httpContextProvider);

let UserInQueueStateCookieRepositoryTest = {
    test_store_givenCookieFlags_Then_CookieIsSavedWithTheFlagsSet: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const cookieValidity = 10;
        const cookieIsHttpOnly = true;
        const cookieIsSecure = true;
        const cookieSameSiteValue = 'Strict';

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            cookieIsHttpOnly,
            cookieIsSecure,
            cookieSameSiteValue,
            "queue",
            secretKey);
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        expect(actualCookie).to.not.be.null;
        assert(actualCookie.expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(actualCookie.domain === cookieDomain);
        expect(actualCookie.httpOnly).to.be.true;
        expect(actualCookie.isSecure).to.be.true;
        expect(actualCookie.sameSiteValue).to.be.equal('Strict');
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(
            eventId,
            queueId,
            null,
            cookieDomain,
            isCookieHttpOnly,
            isCookieSecure,
            cookieSameSiteValue,
            "queue",
            secretKey);
        const state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        let actualCookie = mockCookies[cookieKey];
        assert(actualCookie !== null);
        assert(actualCookie.expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(actualCookie.domain === cookieDomain);
        expect(actualCookie.httpOnly).to.be.false;
        expect(actualCookie.isSecure).to.be.false;
        expect(actualCookie.sameSiteValue).to.be.undefined;
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
        const isCookieSameSiteValue = false;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, isCookieSameSiteValue, "queue", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
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
        const cookieSameSiteValue = 'Lax';
        userInQueueStateCookieRepository.store(eventId, queueId, cookieValidity, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "idle", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable() === false);
        assert(state.redirectType === "idle");
        assert(state.fixedCookieValidityMinutes === 3);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        assert(mockCookies[cookieKey].domain === cookieDomain);
        expect(mockCookies[cookieKey].isSecure).to.be.false;
        expect(mockCookies[cookieKey].sameSiteValue).to.be.equal('Lax');
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Idle", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Idle", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "idle", secretKey);
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Queue", secretKey);
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Queue", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
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
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Queue", secretKey);
        let state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        userInQueueStateCookieRepository.cancelQueueCookie(eventId, cookieDomain);
        let state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
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
        const cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Queue", secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        let state = userInQueueStateCookieRepository.getState(eventId, 5, secretKey, true);
        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        assert(mockCookies[cookieKey].domain === cookieDomain);
    },
    test_extendQueueCookie_cookieDoesNotExist: function () {
        mockCookies = {}; // reset

        const eventId = "event1";
        const secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        const cookieDomain = ".test.com";
        const queueId = "queueId";
        const isCookieHttpOnly = false;
        const isCookieSecure = false
        const cookieSameSiteValue = undefined;

        userInQueueStateCookieRepository.store("event2", queueId, 20, cookieDomain, isCookieHttpOnly, isCookieSecure, cookieSameSiteValue, "Queue", secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey("event2");
        assert(mockCookies[cookieKey] !== null);
    },
    test_getState_validCookieFormat_extendable: function () {
        mockCookies = {}; // reset

        let eventId = "event1";
        let secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        let cookieDomain = ".test.com";
        let queueId = "queueId";
        let issueTime = QueueITHelpers.Utils.getCurrentTime();
        let hash = generateHash(eventId, queueId, null, "queue", issueTime, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
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
        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        let issueTime = QueueITHelpers.Utils.getCurrentTime() - 11 * 60;
        let hash = generateHash(eventId, queueId, null, "queue", issueTime, secretKey);

        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
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
        let hash = generateHash(eventId, queueId, 3, "idle", issueTime, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
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
        let hash = generateHash(eventId, queueId, 3, "idle", issueTime, secretKey);

        let cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
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