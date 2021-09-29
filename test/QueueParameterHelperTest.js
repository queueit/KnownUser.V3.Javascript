var QueueITHelpers = require('./../dist/QueueITHelpers')

var assert = require('assert');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = require('chai').expect;

var QueueParameterHelperTest = {
    test_tryExtractQueueParams: function () {
        var queueitToken = "ts_1480593661~cv_10~ce_false~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~c_customerid~e_eventid~rt_disabled~h_218b734e-d5be-4b60-ad66-9b1b326266e2";
        var result = QueueITHelpers.QueueParameterHelper.extractQueueParams(queueitToken);

        assert.equal(result.timeStamp, 1480593661);
        assert.equal(result.eventId, "eventid");
        assert.equal(result.cookieValidityMinutes, 10);
        assert.equal(result.extendableCookie, false);
        assert.equal(result.hashCode, "218b734e-d5be-4b60-ad66-9b1b326266e2");
        assert.equal(result.queueITToken, queueitToken);
        assert.equal(result.queueITTokenWithoutHash, "ts_1480593661~cv_10~ce_false~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~c_customerid~e_eventid~rt_disabled");
    },
    test_tryExtractQueueParams_NotValidFormat_Test: function () {
        var queueITToken = "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~h_218b734e-d5be-4b60-ad66-9b1b326266e2";
        var queueitTokenWithoutHash = "ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895";
        var result = QueueITHelpers.QueueParameterHelper.extractQueueParams(queueITToken);

        assert.equal(result.timeStamp, 0);
        assert.equal(result.eventId, null);
        assert.equal(result.cookieValidityMinutes, null);
        assert.equal(result.extendableCookie, false);
        assert.equal(result.hashCode, "218b734e-d5be-4b60-ad66-9b1b326266e2");
        assert.equal(result.queueITToken, queueITToken);
        assert.equal(result.queueITTokenWithoutHash, queueitTokenWithoutHash);
    },
    test_tryExtractQueueParams_Using_QueueitToken_With_No_Values: function () {
        var queueITToken = "e~q~ts~ce~rt~h";
        var result = QueueITHelpers.QueueParameterHelper.extractQueueParams(queueITToken);

        assert.equal(result.timeStamp, 0);
        assert.equal(result.eventId, null);
        assert.equal(result.cookieValidityMinutes, null);
        assert.equal(result.extendableCookie, false);
        assert.equal(result.hashCode, null);
        assert.equal(result.queueITToken, queueITToken);
        assert.equal(result.queueITTokenWithoutHash, queueITToken);
    },
    test_tryExtractQueueParams_Using_No_QueueitToken_Expect_Null: function () {
        var queueITToken = "";
        var result = QueueITHelpers.QueueParameterHelper.extractQueueParams(queueITToken);

        assert.equal(result, null);
    }
};

for (var f in QueueParameterHelperTest) {
    console.log(f);
    QueueParameterHelperTest[f]();
}