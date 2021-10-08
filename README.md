# KnownUser.V3.Javascript

Before getting started please read the [documentation](https://github.com/queueit/Documentation/tree/main/serverside-connectors) to get acquainted with server-side connectors.

The connector was developed with TypeScript and verified using Nodejs v.8.12 and Express v.4.16.

You can find the latest released version [here](https://github.com/queueit/KnownUser.V3.Javascript/releases/latest). or download latest npm package from [here](https://www.npmjs.com/package/queueit-knownuser).

## Implementation

The KnownUser validation must be done on _all requests except requests for static and cached pages, resources like images, css files and ..._.
So, if you add the KnownUser validation logic to a central place, then be sure that the Triggers only fire on page requests (including ajax requests) and not on e.g. image.

The following is an example route in express/nodejs which shows how to validate that a user has been through the queue.
It assumes that your integration configuration file is located in root of the web application.

```javascript
const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
const QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME = "x-queueit-connector";
const QUEUEIT_CONNECTOR_NAME = "nodejs";

var express = require("express");
var router = express.Router();
var fs = require("fs");

var QueueITConnector = require("queueit-knownuser");

configureKnownUserHashing();

function isIgnored(req) {
  return req.method == "HEAD" || req.method == "OPTIONS";
}

/* GET home page. */
router.get("/", function (req, res, next) {
  try {
    res.header(QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME, QUEUEIT_CONNECTOR_NAME);
    if (isIgnored(req)) {
      // Render page
      res.render("index", {
        node_version: process.version,
        express_version: require("express/package").version,
      });
      return;
    }
    var integrationsConfigString = fs.readFileSync(
      "integrationconfiguration.json",
      "utf8"
    );

    var customerId = ""; // Your Queue-it customer ID
    var secretKey = ""; // Your 72 char secret key as specified in Go Queue-it self-service platform

    var httpContextProvider = initializeExpressHttpContextProvider(req, res);

    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = httpContextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = getRequestUrlWithoutToken(requestUrl);
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.validateRequestByIntegrationConfig(
      requestUrlWithoutToken,
      queueitToken,
      integrationsConfigString,
      customerId,
      secretKey,
      httpContextProvider
    );

    if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "Fri, 01 Jan 1990 00:00:00 GMT",
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
        res.set(
          validationResult.getAjaxQueueRedirectHeaderKey(),
          validationResult.getAjaxRedirectUrl()
        );

        // Render page
        res.render("index", {
          node_version: process.version,
          express_version: require("express/package").version,
        });
      } else {
        // Send the user to the queue - either because hash was missing or because is was invalid
        res.redirect(validationResult.redirectUrl);
      }
    } else {
      // Request can continue - we remove queueittoken form querystring parameter to avoid sharing of user specific token
      if (
        requestUrl !== requestUrlWithoutToken &&
        validationResult.actionType === "Queue"
      ) {
        res.redirect(requestUrlWithoutToken);
      } else {
        // Render page
        res.render("index", {
          node_version: process.version,
          express_version: require("express/package").version,
        });
      }
    }
  } catch (e) {
    // There was an error validating the request
    // Use your own logging framework to log the error
    // This was a configuration error, so we let the user continue
    console.log("ERROR:" + e);
    res.header(QUEUEIT_FAILED_HEADERNAME, "true");
  }
});

function getRequestUrlWithoutToken(requestUrl) {
  try {
    const url = new URL(requestUrl);
    const params = new URLSearchParams(url.search);

    params.delete(KnownUser.QueueITTokenKey);
    url.search = params.toString();

    return url.toString();
  } catch (e) {
    console.error("[Queue IT] Could not remove token in URL", e);
    return requestUrl;
  }
}

module.exports = router;
```

Code to initialize a httpContextProvider in Express (requires node module 'cookie-parser'):

```javascript
function initializeExpressHttpContextProvider(req, res) {
  return {
    getHttpRequest: function () {
      var httpRequest = {
        getUserAgent: function () {
          return this.getHeader("user-agent");
        },
        getHeader: function (headerName) {
          var headerValue = req.header(headerName);

          if (!headerValue) return "";

          return headerValue;
        },
        getAbsoluteUri: function () {
          return req.protocol + "://" + req.get("host") + req.originalUrl;
        },
        getUserHostAddress: function () {
          return req.ip;
        },
        getCookieValue: function (cookieKey) {
          // This requires 'cookie-parser' node module (installed/used from app.js)
          return req.cookies[cookieKey];
        },
      };
      return httpRequest;
    },
    getHttpResponse: function () {
      var httpResponse = {
        setCookie: function (
          cookieName,
          cookieValue,
          domain,
          expiration,
          httpOnly,
          isSecure
        ) {
          if (domain === "") domain = null;

          // expiration is in secs, but Date needs it in milisecs
          const expirationDate = new Date(expiration * 1000);

          // This requires 'cookie-parser' node module (installed/used from app.js)
          res.cookie(cookieName, cookieValue, {
            expires: expirationDate,
            path: "/",
            domain: domain,
            secure: isSecure,
            httpOnly: httpOnly,
          });
        },
      };
      return httpResponse;
    },
  };
}
```

Code to configure hashing in KnownUser SDK (requires node module 'crypto'):

```javascript
function configureKnownUserHashing() {
  var utils = QueueITConnector.Utils;
  utils.generateSHA256Hash = function (secretKey, stringToHash) {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(stringToHash)
      .digest("hex");
    return hash;
  };
}
```

## Implementation using inline queue configuration

Specify the configuration in code without using the Trigger/Action paradigm. In this case it is important _only to queue-up page requests_ and not requests for resources or AJAX calls. This can be done by adding custom filtering logic before caling the `knownUser.resolveQueueRequestByLocalConfig()` method.

The following is an example (using Express/Nodejs) of how to specify the configuration in code:

```javascript
const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
const QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME = "x-queueit-connector";
const QUEUEIT_CONNECTOR_NAME = "nodejs";

var express = require("express");
var router = express.Router();
var fs = require("fs");

var QueueITConnector = require("queueit-knownuser");

configureKnownUserHashing();

function isIgnored(req) {
  return req.method == "HEAD" || req.method == "OPTIONS";
}

/* GET home page. */
router.get("/", function (req, res, next) {
  try {
    res.header(QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME, QUEUEIT_CONNECTOR_NAME);
    if (isIgnored(req)) {
      // Render page
      res.render("index", {
        node_version: process.version,
        express_version: require("express/package").version,
      });
      return;
    }

    var integrationsConfigString = fs.readFileSync(
      "integrationconfiguration.json",
      "utf8"
    );

    var customerId = ""; // Your Queue-it customer ID
    var secretKey = ""; // Your 72 char secret key as specified in Go Queue-it self-service platform

    var queueConfig = new QueueITConnector.QueueEventConfig();
    queueConfig.eventId = ""; // ID of the queue to use
    queueConfig.queueDomain = "xxx.queue-it.net"; // Domain name of the queue
    // queueConfig.cookieDomain = ".my-shop.com" // Optional - Domain name where the Queue-it session cookie should be saved
    queueConfig.cookieValidityMinute = 15; // Validity of the Queue-it session cookie should be positive number.
    queueConfig.extendCookieValidity = true; //Should the Queue-it session cookie validity time be extended each time the validation runs?
    // queueConfig.culture = "da-DK" // Optional - Culture of the queue layout in the format specified here: https://msdn.microsoft.com/en-us/library/ee825488(v=cs.20).aspx. If unspecified then settings from Event will be used.
    // queueConfig.layoutName = "NameOfYourCustomLayout" // Optional - Name of the queue layout. If unspecified then settings from Event will be used.

    var httpContextProvider = initializeExpressHttpContextProvider(req, res);

    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = httpContextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = getRequestUrlWithoutToken(requestUrl);
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.resolveQueueRequestByLocalConfig(
      requestUrlWithoutToken,
      queueitToken,
      queueConfig,
      customerId,
      secretKey,
      httpContextProvider
    );

    if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "Fri, 01 Jan 1990 00:00:00 GMT",
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
        res.set(
          validationResult.getAjaxQueueRedirectHeaderKey(),
          validationResult.getAjaxRedirectUrl()
        );

        // Render page
        res.render("index", {
          node_version: process.version,
          express_version: require("express/package").version,
        });
      } else {
        // Send the user to the queue - either because hash was missing or because is was invalid
        res.redirect(validationResult.redirectUrl);
      }
    } else {
      // Request can continue - we remove queueittoken form querystring parameter to avoid sharing of user specific token
      if (
        requestUrl !== requestUrlWithoutToken &&
        validationResult.actionType === "Queue"
      ) {
        res.redirect(requestUrlWithoutToken);
      } else {
        // Render page
        res.render("index", {
          node_version: process.version,
          express_version: require("express/package").version,
        });
      }
    }
  } catch (e) {
    // There was an error validating the request
    // Use your own logging framework to log the error
    // This was a configuration error, so we let the user continue
    console.log("ERROR:" + e);
    res.header(QUEUEIT_FAILED_HEADERNAME, "true");
  }
});

function getRequestUrlWithoutToken(requestUrl) {
  try {
    const url = new URL(requestUrl);
    const params = new URLSearchParams(url.search);

    params.delete(KnownUser.QueueITTokenKey);
    url.search = params.toString();

    return url.toString();
  } catch (e) {
    console.error("[Queue IT] Could not remove token in URL", e);
    return requestUrl;
  }
}

module.exports = router;
```
