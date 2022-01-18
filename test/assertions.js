const chai = require('chai');
chai.use(require('chai-string'));
const expect = require('chai').expect;
const assert = require('assert');

function assertTimestamp(redirectUrl, predicate) {
    const tsMatches = redirectUrl.match("&ts=[^&]*");
    expect(tsMatches).to.not.be.null;
    expect(tsMatches).to.not.be.empty;
    const tsPart = tsMatches[0];
    const timestamp = tsPart.replace("&ts=", "");
    const isValid = predicate(timestamp)
    assert(isValid);
}

function assertUrlMatches(actualUrl, expectedUrlWithoutQueryString, parameters) {
    const parameterNames = Object.keys(parameters);
    const actualURLObj = new URL(actualUrl);
    const urlLeftPart = actualUrl.split('?')[0]
    expect(urlLeftPart).to.equal(expectedUrlWithoutQueryString);
    const actualQueryParameters = {};
    actualURLObj.search.substring(1).split("&")
        .map(pair => pair.split("="))
        .map(pair => actualQueryParameters[pair[0]] = pair[1])
    for (let i = 0; i < parameterNames.length; i++) {
        const param = parameterNames[i];
        let expectedParamValue = parameters[param];
        let actualParamValue = actualQueryParameters[param];
        let expectedUndefined = typeof expectedParamValue == 'undefined';
        let actualIsUndefined = typeof actualParamValue == 'undefined';

        if (expectedUndefined) {
            expect(actualParamValue).to.be.undefined;
        } else {
            expectedParamValue = expectedParamValue.toString();
            if (actualIsUndefined) {
                expect(actualParamValue).to.be.equal(expectedParamValue, `Parameter ${param}`)
            } else {
                actualParamValue = actualParamValue.toString();
                expect(actualParamValue).to.be.equal(expectedParamValue, `Parameter ${param}`)
            }
        }
    }
}

exports.assertTimestamp = assertTimestamp;
exports.assertUrlMatches = assertUrlMatches;