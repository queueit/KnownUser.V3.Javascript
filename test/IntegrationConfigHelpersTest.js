var IntegrationConfig = require('../dist/IntegrationConfig/IntegrationConfigModel')
var IntegrationConfigHelpers = require('../dist/IntegrationConfig/IntegrationConfigHelpers')
const expect = require('chai').expect;

var assert = require('assert');

var requestMockCookies = {};
var requestMockHeaders = {};
var requestBody = "";
var httpRequestMock = {
    getUserAgent: function () {
        return requestMockHeaders['user-agent'];
    },
    getHeader: function (headerName) {
        const key = headerName.toLowerCase();
        return requestMockHeaders[key];
    },
    getAbsoluteUri: function () {
        throw new Error("Not implemented");
    },
    getUserHostAddress: function () {
        throw new Error("Not implemented");
    },
    getCookieValue: function (cookieKey) {
        return requestMockCookies[cookieKey];
    },
    getRequestBodyAsString: function () {
        return requestBody;
    }
};

var ComparisonOperatorHelperTest = {

    test_evaluate_equals: function () {
        var testObject = IntegrationConfigHelpers.ComparisonOperatorHelper;
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, false, false, "test1", "test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, false, false, "test1", "Test1", null));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, false, true, "test1", "Test1", null));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, true, false, "test1", "Test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, true, false, "test1", "test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualS, true, true, "test1", "Test1", null));
    },

    test_evaluate_contains: function () {
        var testObject = IntegrationConfigHelpers.ComparisonOperatorHelper;
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, false, false, "test_test1_test", "test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, false, false, "test_test1_test", "Test1", null));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, false, true, "test_test1_test", "Test1", null));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, true, false, "test_test1_test", "Test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, true, true, "test_test1", "Test1", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, true, false, "test_test1", "test1", null));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, false, false, "test_dsdsdsdtest1", "*", null));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.Contains, false, false, "", "*", null));
    },

    test_evaluate_equals_any: function () {
        var testObject = IntegrationConfigHelpers.ComparisonOperatorHelper;
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, false, false, "test1", null, ["test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, false, false, "test1", null, ["Test1"]));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, false, true, "test1", null, ["Test1"]));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, true, false, "test1", null, ["Test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, true, false, "test1", null, ["test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.EqualsAny, true, true, "test1", null, ["Test1"]));
    },

    test_evaluate_contains_any: function () {
        var testObject = IntegrationConfigHelpers.ComparisonOperatorHelper;
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, false, false, "test_test1_test", null, ["test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, false, false, "test_test1_test", null, ["Test1"]));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, false, true, "test_test1_test", null, ["Test1"]));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, true, false, "test_test1_test", null, ["Test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, true, true, "test_test1", null, ["Test1"]));
        assert(!testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, true, false, "test_test1", null, ["test1"]));
        assert(testObject.evaluate(IntegrationConfig.ComparisonOperatorType.ContainsAny, false, false, "test_dsdsdsdtest1", null, ["*"]));
    }
};

var ValidatorHelpersTest = {

    test_cookie_evaluate: function () {
        var testObject = IntegrationConfigHelpers.CookieValidatorHelper;

        var triggerPart = new IntegrationConfig.TriggerPart();
        triggerPart.CookieName = "c1";
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "1";

        requestMockCookies = {};
        assert(!testObject.evaluate(triggerPart, httpRequestMock));

        requestMockCookies = {
            "c5": "5",
            "c1": "1",
            "c2": "test"
        };
        assert(testObject.evaluate(triggerPart, httpRequestMock));

        triggerPart.ValueToCompare = "5";
        assert(!testObject.evaluate(triggerPart, httpRequestMock));

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.CookieName = "c2";
        assert(testObject.evaluate(triggerPart, httpRequestMock));

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        triggerPart.CookieName = "c2";
        assert(!testObject.evaluate(triggerPart, httpRequestMock));
    },

    test_url_evaluate: function () {
        var testObject = IntegrationConfigHelpers.UrlValidatorHelper;

        var triggerPart = new IntegrationConfig.TriggerPart();
        triggerPart.UrlPart = IntegrationConfig.UrlPartType.PageUrl;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "http://test.tesdomain.com:8080/test?q=1";

        assert(!testObject.evaluate(triggerPart, "http://test.tesdomain.com:8080/test?q=2"));

        triggerPart.ValueToCompare = "/Test/t1";
        triggerPart.UrlPart = IntegrationConfig.UrlPartType.PagePath;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.EqualS;
        triggerPart.IsIgnoreCase = true;
        assert(testObject.evaluate(triggerPart, "http://test.tesdomain.com:8080/test/t1?q=2&y02"));

        triggerPart.UrlPart = IntegrationConfig.UrlPartType.HostName;
        triggerPart.ValueToCompare = "test.tesdomain.com";
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        assert(testObject.evaluate(triggerPart, "http://m.test.tesdomain.com:8080/test?q=2"));

        triggerPart.UrlPart = IntegrationConfig.UrlPartType.HostName;
        triggerPart.ValueToCompare = "test.tesdomain.com";
        triggerPart.IsNegative = true;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        assert(!testObject.evaluate(triggerPart, "http://m.test.tesdomain.com:8080/test?q=2"));
    },

    test_userAgent_evaluate: function () {
        var testObject = IntegrationConfigHelpers.UserAgentValidatorHelper;

        var triggerPart = new IntegrationConfig.TriggerPart();
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "googlebot";

        assert(!testObject.evaluate(triggerPart, "Googlebot sample useraagent"));

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.EqualS;
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        assert(testObject.evaluate(triggerPart, "oglebot sample useraagent"));

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        triggerPart.IsIgnoreCase = false;
        triggerPart.IsNegative = true;
        assert(!testObject.evaluate(triggerPart, "googlebot"));

        triggerPart.ValueToCompare = "googlebot";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = false;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        assert(testObject.evaluate(triggerPart, "Googlebot"));

        triggerPart.ValueToCompare = null;
        triggerPart.ValuesToCompare = ["googlebot"];
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = false;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.ContainsAny;
        assert(testObject.evaluate(triggerPart, "Googlebot"));

        triggerPart.ValuesToCompare = ["googlebot"];
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.EqualsAny;
        assert(testObject.evaluate(triggerPart, "oglebot sample useraagent"));
    },

    test_httpHeader_evaluate: function () {
        var testObject = IntegrationConfigHelpers.HttpHeaderValidatorHelper;

        var triggerPart = new IntegrationConfig.TriggerPart();
        triggerPart.Operator = IntegrationConfig.ComparisonOperatorType.Contains;
        triggerPart.ValueToCompare = "1";

        assert(!testObject.evaluate(triggerPart, ""));

        assert(testObject.evaluate(triggerPart, "1"));

        triggerPart.ValueToCompare = "5";
        assert(!testObject.evaluate(triggerPart, "1"));

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        assert(testObject.evaluate(triggerPart, "test"));

        triggerPart.ValueToCompare = "Test";
        triggerPart.IsIgnoreCase = true;
        triggerPart.IsNegative = true;
        assert(!testObject.evaluate(triggerPart, "test"));
    }
};

var IntegrationConfigHelpersTest = {

    test_getMatchedIntegrationConfig_OneTrigger_And_NotMatched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        var integrationsConfigString = `{
            "Integrations": [{
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "ValidatorType": "UserAgentValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock) === null);
    },

    test_getMatchedIntegrationConfig_OneTrigger_And_Matched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c1": "Value1" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "IsIgnoreCase" : true,
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock).Name === "integration1");
    },

    test_getMatchedIntegrationConfig_OneTrigger_And_NotMatched_UserAgent: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c1": "Value1" };

        httpRequestMock.getUserAgent = function () { return "bot.html google.com googlebot test"; };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "IsIgnoreCase" : true,
                        "IsNegative": false,
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "IsIgnoreCase": false,
                        "IsNegative": false,
                        "Operator": "Contains"
                    },{
                        "ValidatorType": "UserAgentValidator",
                        "ValueToCompare": "Googlebot",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": true
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock) === null);
    },

    test_getMatchedIntegrationConfig_OneTrigger_And_NotMatched_HttpHeader: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c2": "ddd", "c1": "Value1" };
        requestMockHeaders = { "c1": "t1", "headertest": "abcd efg test gklm" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains",
                        "IsIgnoreCase": false,
                        "IsNegative": false
                    },{
                        "ValidatorType": "HttpHeaderValidator",
                        "ValueToCompare": "test",
                        "HttpHeaderName": "HeaderTest",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": true
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://www.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock) === null);
    },

    test_getMatchedIntegrationConfig_OneTrigger_And_Matched_RequestBody: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c2": "ddd", "c1": "Value1" };
        requestMockHeaders = { "c1": "t1", "headertest": "abcd efg test gklm" };
        requestBody = "test body test request";

        var integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains",
                        "IsIgnoreCase": false,
                        "IsNegative": false
                    },{
                        "ValidatorType": "RequestBodyValidator",
                        "ValueToCompare": "test body",
                        "Operator": "Contains",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://www.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock).Name === "integration1");
    },

    test_getMatchedIntegrationConfig_OneTrigger_Or_NotMatched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c2": "Value1" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": true,
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock) === null);
    },

    test_getMatchedIntegrationConfig_OneTrigger_Or_Matched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c1": "Value1" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "Or",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "test",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock).Name === "integration1");
    },

    test_getMatchedIntegrationConfig_TwoTriggers_Matched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c1": "Value1" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator",
                        "IsIgnoreCase": true,
                        "IsNegative": false
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "*",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock).Name === "integration1");
    },

    test_getMatchedIntegrationConfig_TwoTriggers_NotMatched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        var integrationsConfigString = `{
            "Integrations": [{
                "Name":
                "integration1",
                "Triggers": [{
                    "LogicalOperator":
                    "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    },{
                        "UrlPart": "PageUrl",
                        "ValidatorType": "UrlValidator",
                        "ValueToCompare": "tesT",
                        "Operator": "Contains"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock) === null);
    },

    test_getMatchedIntegrationConfig_ThreeIntegrationsInOrder_SecondMatched: function () {
        var testObject = new IntegrationConfigHelpers.IntegrationEvaluator();

        requestMockCookies = { "c1": "Value1" };

        var integrationsConfigString = `{
            "Integrations": [{
                "Name": "integration0",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    }]
                }]
            }],
            "Integrations": [{
                "Name": "integration1",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "CookieName": "c1",
                        "Operator": "Equals",
                        "ValueToCompare": "value1",
                        "ValidatorType": "CookieValidator"
                    }]
                }]
            }],            
            "Integrations": [{
                "Name": "integration2",
                "Triggers": [{
                    "LogicalOperator": "And",
                    "TriggerParts": [{
                        "UrlPart": "PageUrl",
                        "Operator": "Contains",
                        "ValueToCompare": "test",
                        "ValidatorType": "UrlValidator"
                    }]
                }]
            }]
        }`;

        var integrationConfig = JSON.parse(integrationsConfigString);
        var url = "http://test.tesdomain.com:8080/test?q=2";

        assert(testObject.getMatchedIntegrationConfig(integrationConfig, url, httpRequestMock).Name === "integration2");
    }
};

for (var coht in ComparisonOperatorHelperTest) {
    console.log("ComparisonOperatorHelperTest: " + coht);
    ComparisonOperatorHelperTest[coht]();
}
for (var vht in ValidatorHelpersTest) {
    console.log("ValidatorHelpersTest: " + vht);
    ValidatorHelpersTest[vht]();
}
for (var icht in IntegrationConfigHelpersTest) {
    console.log("IntegrationConfigHelpersTest: " + icht);
    IntegrationConfigHelpersTest[icht]();
}