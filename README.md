# KnownUser.V3.Javascript

**This is not the most recent version. In order to obtain access to the most recent version, please contact your local Queue-it representative or Queue-it Support**

Before getting started please read the [documentation](https://github.com/queueit/Documentation/tree/main/serverside-connectors) to get acquainted with server-side connectors.

The connector was developed with TypeScript and verified using Nodejs v.8.12 and Express v.4.16.

You can find the latest released version [here](https://github.com/queueit/KnownUser.V3.Javascript/releases/latest). or download latest npm package from [here](https://www.npmjs.com/package/queueit-knownuser).

## Implementation
The KnownUser validation must be done on *all requests except requests for static and cached pages, resources like images, css files and ...*. 
So, if you add the KnownUser validation logic to a central place, then be sure that the Triggers only fire on page requests (including ajax requests) and not on e.g. image.

The following is an example route in express/nodejs which shows how to validate that a user has been through the queue.
It assumes that your integration configuration file is located in root of the web application.
 
```javascript
const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
const QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME = 'x-queueit-connector';
const QUEUEIT_CONNECTOR_NAME = "nodejs"

var express = require('express');
var router = express.Router();
var fs = require('fs');

var QueueITConnector = require('queueit-knownuser');

function isIgnored(req){
  return req.method == 'HEAD' || req.method == 'OPTIONS'
}

/* GET home page. */
router.get('/', function (req, res, next) {
  try {
    res.header(QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME, QUEUEIT_CONNECTOR_NAME);
    if(isIgnored(req)){
      // Render page
      res.render('index', {
        node_version: process.version,
        express_version: require('express/package').version
      });
      return;
    }
    var integrationsConfigString = fs.readFileSync('integrationconfiguration.json', 'utf8');

    var customerId = ""; // Your Queue-it customer ID
    var secretKey = ""; // Your 72 char secret key as specified in Go Queue-it self-service platform

    var contextProvider = initializeExpressContextProvider(req, res);
    
    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = contextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = getRequestUrlWithoutToken(requestUrl);
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.validateRequestByIntegrationConfig(
      requestUrlWithoutToken, queueitToken, integrationsConfigString,
      customerId, secretKey, contextProvider);

	if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
	const headerName = validationResult.getAjaxQueueRedirectHeaderKey();
        res.set(headerName, validationResult.getAjaxRedirectUrl());
	res.set('Access-Control-Expose-Headers', headerName);
	
        // Render page
        res.render('index', {
          node_version: process.version,
          express_version: require('express/package').version
        });
      }
      else {
        // Send the user to the queue - either because hash was missing or because is was invalid
        res.redirect(validationResult.redirectUrl);
      }
    }
    else {      
	  // Request can continue - we remove queueittoken form querystring parameter to avoid sharing of user specific token
      if (requestUrl !== requestUrlWithoutToken && validationResult.actionType === "Queue") {
        res.redirect(requestUrlWithoutToken);
      }
      else {
        // Render page
        res.render('index', {
          node_version: process.version,
          express_version: require('express/package').version
        });
      }
    }
  }
  catch (e) {
    // There was an error validating the request
    // Use your own logging framework to log the error
    // This was a configuration error, so we let the user continue
    console.log("ERROR:" + e);
    res.header(QUEUEIT_FAILED_HEADERNAME, 'true');
  }
});

function getRequestUrlWithoutToken(requestUrl){
  try {
    const url = new URL(requestUrl);
    const params = new URLSearchParams(url.search);

    params.delete(KnownUser.QueueITTokenKey);
    url.search = params.toString();

    return url.toString();
  } catch (e) {
    console.error('[Queue IT] Could not remove token in URL', e);
    return requestUrl;
  }
}

module.exports = router;
```

Code to initialize a contextProvider in Express (requires node module 'cookie-parser'):

```javascript
function initializeExpressContextProvider(req, res) {
    return {
        getCryptoProvider: function() {
            // Code to configure hashing in KnownUser SDK (requires node module 'crypto'):
            return {
                getSha256Hash: function(secretKey, plaintext) {
                  const crypto = require('crypto');
                  const hash = crypto.createHmac('sha256', secretKey)
                    .update(plaintext)
                    .digest('hex');
                  return hash;
                }
            };
        },
        getEnqueueTokenProvider: function(){
            return {
                getEnqueueToken: function(waitingRoomId){
                    // If you need to use an enqueue token when enqueuing, you need to return it here.
                    return null;
                }
            };
        },
        getHttpRequest: function () {
            var httpRequest = {
                getUserAgent: function () {
                    return this.getHeader("user-agent");
                },
                getHeader: function (headerName) {
                    var headerValue = req.header(headerName);

                    if (!headerValue)
                        return "";

                    return headerValue;
                },
                getAbsoluteUri: function () {
                    return req.protocol + '://' + req.get('host') + req.originalUrl;
                },
                getUserHostAddress: function () {
                    return req.ip;
                },
                getCookieValue: function (cookieKey) {
                    // This requires 'cookie-parser' node module (installed/used from app.js)
                    return req.cookies[cookieKey];
                }
            };
            return httpRequest;
        },
        getHttpResponse: function () {
            var httpResponse = {
                setCookie: function (cookieName, cookieValue, domain, expiration, isCookieHttpOnly, isCookieSecure) {
                    if (domain === "")
                        domain = null;

                    // expiration is in secs, but Date needs it in milisecs
                    const expirationDate = new Date(expiration * 1000);

                    // This requires 'cookie-parser' node module (installed/used from app.js)
                    res.cookie(
                        cookieName,
                        cookieValue,
                        {
                            expires: expirationDate,
                            path: "/",
                            domain: domain,
                            secure: isCookieSecure,
                            httpOnly: isCookieHttpOnly
                        });
                }
            };
            return httpResponse;
        }
    };
}
```

##  Implementation using inline queue configuration
Specify the configuration in code without using the Trigger/Action paradigm. In this case it is important *only to queue-up page requests* and not requests for resources or AJAX calls. This can be done by adding custom filtering logic before caling the `knownUser.resolveQueueRequestByLocalConfig()` method. 

The following is an example (using Express/Nodejs) of how to specify the configuration in code:

```javascript
const QUEUEIT_FAILED_HEADERNAME = "x-queueit-failed";
const QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME = 'x-queueit-connector';
const QUEUEIT_CONNECTOR_NAME = "nodejs"

var express = require('express');
var router = express.Router();
var fs = require('fs');

var QueueITConnector = require('queueit-knownuser');

function isIgnored(req){
  return req.method == 'HEAD' || req.method == 'OPTIONS'
}

/* GET home page. */
router.get('/', function (req, res, next) {
  try {
    res.header(QUEUEIT_CONNECTOR_EXECUTED_HEADER_NAME, QUEUEIT_CONNECTOR_NAME);
    if(isIgnored(req)){
      // Render page
      res.render('index', {
        node_version: process.version,
        express_version: require('express/package').version
      });
      return;
    }
    
    var integrationsConfigString = fs.readFileSync('integrationconfiguration.json', 'utf8');

    var customerId = ""; // Your Queue-it customer ID
    var secretKey = ""; // Your 72 char secret key as specified in Go Queue-it self-service platform

    var queueConfig = new QueueITConnector.QueueEventConfig();
    queueConfig.eventId = "" // ID of the queue to use
    queueConfig.queueDomain = "xxx.queue-it.net" // Domain name of the queue
    // queueConfig.cookieDomain = ".my-shop.com" // Optional - Domain name where the Queue-it session cookie should be saved
    queueConfig.cookieValidityMinute = 15 // Validity of the Queue-it session cookie should be positive number.
    queueConfig.extendCookieValidity = true //Should the Queue-it session cookie validity time be extended each time the validation runs?
    // queueConfig.culture = "da-DK" // Optional - Culture of the queue layout in the format specified here: https://msdn.microsoft.com/en-us/library/ee825488(v=cs.20).aspx. If unspecified then settings from Event will be used.
    // queueConfig.layoutName = "NameOfYourCustomLayout" // Optional - Name of the queue layout. If unspecified then settings from Event will be used.

    var contextProvider = initializeExpressContextProvider(req, res);

    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = contextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = getRequestUrlWithoutToken(requestUrl);
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.resolveQueueRequestByLocalConfig(
		requestUrlWithoutToken, queueitToken, queueConfig, 
		customerId, secretKey, contextProvider);
	  
    if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
	const headerName = validationResult.getAjaxQueueRedirectHeaderKey();
        res.set(headerName, validationResult.getAjaxRedirectUrl());
	res.set('Access-Control-Expose-Headers', headerName);

        // Render page
        res.render('index', {
          node_version: process.version,
          express_version: require('express/package').version
        });
      }
      else {
        // Send the user to the queue - either because hash was missing or because is was invalid
        res.redirect(validationResult.redirectUrl);
      }      
    }
    else {      
	  // Request can continue - we remove queueittoken form querystring parameter to avoid sharing of user specific token
      if (requestUrl !== requestUrlWithoutToken && validationResult.actionType === "Queue") {
        res.redirect(requestUrlWithoutToken);
      }
      else {
        // Render page
        res.render('index', {
          node_version: process.version,
          express_version: require('express/package').version
        });
      }
    }
  }
  catch (e) {
    // There was an error validating the request
    // Use your own logging framework to log the error
    // This was a configuration error, so we let the user continue
    console.log("ERROR:" + e);
    res.header(QUEUEIT_FAILED_HEADERNAME, 'true');
  }
});

function getRequestUrlWithoutToken(requestUrl){
  try {
    const url = new URL(requestUrl);
    const params = new URLSearchParams(url.search);

    params.delete(KnownUser.QueueITTokenKey);
    url.search = params.toString();

    return url.toString();
  } catch (e) {
    console.error('[Queue IT] Could not remove token in URL', e);
    return requestUrl;
  }
}

module.exports = router;
```


## Request body trigger (advanced)

The connector supports triggering on request body content. An example could be a POST call with specific item ID where you want end-users to queue up for.
For this to work, you will need to contact Queue-it support or enable request body triggers in your integration settings in your GO Queue-it platform account.
Once enabled you will need to update your integration so request body is available for the connector.  
You may need to add the following middleware in your express app:

```javascript
const bodyParser = require('body-parser');

// ... in your app setup

app.use(bodyParser.text());
```

And then add this to the httpRequest object in your http context provider:
```javascript
getRequestBodyAsString: function () {
  if(!req.body || !req.body.toString){
    return "";
  }
  return JSON.stringify(req.body.toString());
}
```
