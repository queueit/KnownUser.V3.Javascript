var QueueITHelpers = require('./../dist/QueueITHelpers')
var UserInQueueStateCookieRepository = require('./../dist/UserInQueueStateCookieRepository')

var assert = require('assert');

var utils = QueueITHelpers.Utils;
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

var mockCookies = {};
var httpContextProvider = {
    getHttpRequest: function () {
        var httpRequest = {
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
        var httpResponse = {
            setCookie: function (name, value, domain, expire) {
                mockCookies[name] = { name: name, value: value, expire: expire, domain: domain };
            }
        };
        return httpResponse;
    }
};
var userInQueueStateCookieRepository = new UserInQueueStateCookieRepository.UserInQueueStateCookieRepository(httpContextProvider);

var UserInQueueStateCookieRepositoryTest = {
    test_store_hasValidState_ExtendableCookie_CookieIsSaved: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, "queue", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(state.redirectType === "queue");

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 1000);
        assert(mockCookies[cookieKey].domain === cookieDomain);
    },
    test_store_hasValidState_nonExtendableCookie_CookieIsSaved: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 3;

        userInQueueStateCookieRepository.store(eventId, queueId, cookieValidity, cookieDomain, "idle", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);

        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable() === false);
        assert(state.redirectType === "idle");
        assert(state.fixedCookieValidityMinutes === 3);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        assert(mockCookies[cookieKey].domain === cookieDomain);
    },
    test_store_hasValidState_tamperedCookie_stateIsNotValid_isCookieExtendable: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, "Idle", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        var oldCookieValue = mockCookies[cookieKey].value;

        mockCookies[cookieKey].value = oldCookieValue.replace("FixedValidityMins=3", "FixedValidityMins=10");
        var state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);
        assert(state.isStateExtendable() === false);
    },
    test_store_hasValidState_tamperedCookie_stateIsNotValid_eventId: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 3, cookieDomain, "Idle", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        var oldCookieValue = mockCookies[cookieKey].value;
        mockCookies[cookieKey].value = oldCookieValue.replace("EventId=event1", "EventId=event2");

        var state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);
        assert(state.isStateExtendable() === false);
    },
    test_store_hasValidState_expiredCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = -1;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, "idle", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid === false);
    },
    test_store_hasValidState_differentEventId_stateIsNotValid: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, "Queue", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        var state2 = userInQueueStateCookieRepository.getState("event2", cookieValidity, secretKey, true);
        assert(state2.isValid === false);
    },
    test_hasValidState_noCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieKey = "key";
        var cookieValidity = 10;

        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid === false);
    },
    test_hasValidState_invalidCookie_stateIsNotValid: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 10;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, "Queue", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        mockCookies[cookieKey].value = "IsCookieExtendable=ooOOO&Expires=|||&QueueId=000&Hash=23232";
        var state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);
    },
    test_cancelQueueCookie: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieValidity = 20;

        userInQueueStateCookieRepository.store(eventId, queueId, 20, cookieDomain, "Queue", secretKey);
        var state = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state.isValid);

        userInQueueStateCookieRepository.cancelQueueCookie(eventId, cookieDomain);
        var state2 = userInQueueStateCookieRepository.getState(eventId, cookieValidity, secretKey, true);
        assert(state2.isValid === false);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        assert(mockCookies[cookieKey] !== null);
        assert(mockCookies[cookieKey].expire === 0);
        assert(mockCookies[cookieKey].domain === cookieDomain);
        assert(mockCookies[cookieKey].value === "");
    },
    test_extendQueueCookie_cookieExist: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);

        userInQueueStateCookieRepository.store(eventId, queueId, null, cookieDomain, "Queue", secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        var state = userInQueueStateCookieRepository.getState(eventId, 5, secretKey, true);
        assert(state.isValid);
        assert(state.queueId === queueId);
        assert(state.isStateExtendable());
        assert(mockCookies[cookieKey].expire - QueueITHelpers.Utils.getCurrentTime() - 24 * 60 * 60 < 100);
        assert(mockCookies[cookieKey].domain === cookieDomain);
    },
    test_extendQueueCookie_cookieDoesNotExist: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";

        userInQueueStateCookieRepository.store("event2", queueId, 20, cookieDomain, "Queue", secretKey);
        userInQueueStateCookieRepository.reissueQueueCookie(eventId, 12, cookieDomain, secretKey);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey("event2");
        assert(mockCookies[cookieKey] !== null);
    },
    test_getState_validCookieFormat_extendable: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var issueTime = QueueITHelpers.Utils.getCurrentTime();
        var hash = generateHash(eventId, queueId, null, "queue", issueTime, secretKey);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
        var state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isStateExtendable());
        assert(state.isValid);
        assert(state.isFound);
        assert(state.queueId === queueId);
        assert(state.redirectType === "queue");
    },
    test_getState_oldCookie_invalid_expiredCookie_extendable: function () {
        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        var issueTime = QueueITHelpers.Utils.getCurrentTime() - 11 * 60;
        var hash = generateHash(eventId, queueId, null, "queue", issueTime, secretKey);

        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&RedirectType=queue&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + 24 * 60 * 60, cookieDomain);
        var state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isValid === false);
        assert(state.isFound);
    },
    test_getState_oldCookie_invalid_expiredCookie_nonExtendable: function () {
        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var issueTime = QueueITHelpers.Utils.getCurrentTime() - 4 * 60;
        var hash = generateHash(eventId, queueId, 3, "idle", issueTime, secretKey);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
        var state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isValid === false);
        assert(state.isFound);
    },
    test_getState_validCookieFormat_nonExtendable: function () {
        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        var cookieDomain = ".test.com";
        var queueId = "queueId";
        var issueTime = QueueITHelpers.Utils.getCurrentTime();
        var hash = generateHash(eventId, queueId, 3, "idle", issueTime, secretKey);

        var cookieKey = UserInQueueStateCookieRepository.UserInQueueStateCookieRepository.getCookieKey(eventId);
        httpContextProvider.getHttpResponse().setCookie(cookieKey, "EventId=" + eventId + "&QueueId=" + queueId + "&FixedValidityMins=3&RedirectType=idle&IssueTime=" + issueTime + "&Hash=" + hash, QueueITHelpers.Utils.getCurrentTime() + (24 * 60 * 60), cookieDomain);
        var state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(state.isStateExtendable() === false);
        assert(state.isValid);
        assert(state.isFound);
        assert(state.queueId === queueId);
        assert(state.redirectType === "idle");
    },
    test_getState_NoCookie: function () {
        mockCookies = {}; // reset

        var eventId = "event1";
        var secretKey = "4e1deweb821-a82ew5-49da-acdqq0-5d3476f2068db";
        
        var state = userInQueueStateCookieRepository.getState(eventId, 10, secretKey, true);

        assert(!state.isFound);
        assert(!state.isValid);
     }
};

for (var f in UserInQueueStateCookieRepositoryTest) {
    console.log(f);
    UserInQueueStateCookieRepositoryTest[f]();
}