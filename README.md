>You can find the latest released version [here](https://github.com/queueit/KnownUser.V3.Javascript/releases/latest)

# KnownUser.V3.Javascript
The Queue-it Security Framework is used to ensure that end users cannot bypass the queue by adding a server-side integration to your server. It was developed with TypeScript and verified using Nodejs v.8.12 and Express v.4.16.

## Introduction
When a user is redirected back from the queue to your website, the queue engine can attache a query string parameter (`queueittoken`) containing some information about the user. 
The most important fields of the `queueittoken` are:

 - q - the users unique queue identifier
 - ts - a timestamp of how long this redirect is valid
 - h - a hash of the token


The high level logic is as follows:

![The KnownUser validation flow](https://github.com/queueit/KnownUser.V3.Javascript/blob/master/Documentation/KnownUserFlow.png)

 1. User requests a page on your server
 2. The validation method sees that the has no Queue-it session cookie and no `queueittoken` and sends him to the correct queue based on the configuration
 3. User waits in the queue
 4. User is redirected back to your website, now with a `queueittoken`
 5. The validation method validates the `queueittoken` and creates a Queue-it session cookie
 6. The user browses to a new page and the Queue-it session cookie will let him go there without queuing again

## How to validate a user
To validate that the current user is allowed to enter your website (has been through the queue) these steps are needed:

 1. Providing the queue configuration to the KnownUser validation
 2. Validate the `queueittoken` and store a session cookie


### 1. Providing the queue configuration
The recommended way is to use the Go Queue-it self-service portal to setup the configuration. 
The configuration specifies a set of Triggers and Actions. A Trigger is an expression matching one, more or all URLs on your website. 
When a user enter your website and the URL matches a Trigger-expression the corresponding Action will be triggered. 
The Action specifies which queue the users should be send to. 
In this way you can specify which queue(s) should protect which page(s) on the fly without changing the server-side integration.

This configuration can then be downloaded to your application server. 
Read more about how *[here](https://github.com/queueit/KnownUser.V3.Javascript/tree/master/Documentation)*.

### 2. Validate the `queueittoken` and store a session cookie
To validate that the user has been through the queue, use the `knownUser.validateRequestByIntegrationConfig()` method. 
This call will validate the timestamp and hash and if valid create a "QueueITAccepted-SDFrts345E-V3_[EventId]" cookie with a TTL as specified in the configuration.
If the timestamp or hash is invalid, the user is send back to the queue.


## Implementation
The KnownUser validation must be done on *all requests except requests for static and cached pages, resources like images, css files and ...*. 
So, if you add the KnownUser validation logic to a central place, then be sure that the Triggers only fire on page requests (including ajax requests) and not on e.g. image.

The following is an example route in express/nodejs which shows how to validate that a user has been through the queue.
It asumes that your integrationconfiguration file is located in root of the web application and the known user sdk file is in a folder called 'sdk'. Please note it uses the node module 'node-import' to import the SDK code.
 
```javascript
var express = require('express');
var router = express.Router();
var fs = require('fs');

var QueueITConnector = require('./src/index');

configureKnownUserHashing();

/* GET home page. */
router.get('/', function (req, res, next) {
  try {
    var integrationsConfigString = fs.readFileSync('integrationconfiguration.json', 'utf8');

    var customerId = ""; // Your Queue-it customer ID
    var secretKey = ""; // Your 72 char secret key as specified in Go Queue-it self-service platform

    var httpContextProvider = initializeExpressHttpContextProvider(req, res);

    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = httpContextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = requestUrl.replace(new RegExp("([\?&])(" + knownUser.QueueITTokenKey + "=[^&]*)", 'i'), "");
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.validateRequestByIntegrationConfig(
      requestUrlWithoutToken, queueitToken, integrationsConfigString,
      customerId, secretKey, httpContextProvider);

	if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
        res.set(validationResult.getAjaxQueueRedirectHeaderKey(), validationResult.getAjaxRedirectUrl());

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
      if (requestUrl !== requestUrlWithoutToken && validationResult.actionType) {
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
  }
});

module.exports = router;
```

Code to initialize a httpContextProvider in Express (requires node module 'cookie-parser'):
```
function initializeExpressHttpContextProvider(req, res) {
    return {
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
                setCookie: function (cookieName, cookieValue, domain, expiration) {
                    if (domain === "")
                        domain = null;

                    // expiration is in secs, but Date needs it in milisecs
                    var expirationDate = new Date(expiration * 1000);

                    // This requires 'cookie-parser' node module (installed/used from app.js)
                    res.cookie(
                        cookieName,
                        cookieValue,
                        {
                            expires: expirationDate,
                            path: "/",
                            domain: domain,
                            secure: false,
                            httpOnly: false
                        });
                }
            };
            return httpResponse;
        }
    };
}
```

Code to configure hashing in KnownUser SDK (requires node module 'crypto'):
```
function configureKnownUserHashing() {
    var utils = QueueITConnector.Utils;
    utils.generateSHA256Hash = function (secretKey, stringToHash) {
      const crypto = require('crypto');
      const hash = crypto.createHmac('sha256', secretKey)
        .update(stringToHash)
        .digest('hex');
      return hash;
    };
}
```
### Protecting ajax calls
If you need to protect AJAX calls beside page loads you need to add the below JavaScript tags to your pages:

```
<script type="text/javascript" src="//static.queue-it.net/script/queueclient.min.js"></script>
<script
 data-queueit-intercept-domain="{YOUR_CURRENT_DOMAIN}"
   data-queueit-intercept="true"
  data-queueit-c="{YOUR_CUSTOMER_ID}"
  type="text/javascript"
  src="//static.queue-it.net/script/queueconfigloader.min.js">
</script>
```
## Alternative Implementation

### Queue configuration

If your application server (maybe due to security reasons) is not allowed to do external GET requests, then you have three options:

1. Manually download the configuration file from Queue-it Go self-service portal, save it on your application server and load it from local disk
2. Use an internal gateway server to download the configuration file and save to application server
3. Specify the configuration in code without using the Trigger/Action paradigm. In this case it is important *only to queue-up page requests* and not requests for resources or AJAX calls. 
This can be done by adding custom filtering logic before caling the `knownUser.resolveQueueRequestByLocalConfig()` method. 

The following is an example (using Express/Nodejs) of how to specify the configuration in code:

```javascript
var express = require('express');
var router = express.Router();
var fs = require('fs');

var QueueITConnector = require('./src/index');

configureKnownUserHashing();

/* GET home page. */
router.get('/', function (req, res, next) {
  try {
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

    var httpContextProvider = initializeExpressHttpContextProvider(req, res);

    var knownUser = QueueITConnector.KnownUser;
    var queueitToken = req.query[knownUser.QueueITTokenKey];
    var requestUrl = httpContextProvider.getHttpRequest().getAbsoluteUri();
    var requestUrlWithoutToken = requestUrl.replace(new RegExp("([\?&])(" + knownUser.QueueITTokenKey + "=[^&]*)", 'i'), "");
    // The requestUrlWithoutToken is used to match Triggers and as the Target url (where to return the users to).
    // It is therefor important that this is exactly the url of the users browsers. So, if your webserver is
    // behind e.g. a load balancer that modifies the host name or port, reformat requestUrlWithoutToken before proceeding.

    var validationResult = knownUser.resolveQueueRequestByLocalConfig(
		requestUrlWithoutToken, queueitToken, queueConfig, 
		customerId, secretKey, httpContextProvider);
	  
    if (validationResult.doRedirect()) {
      // Adding no cache headers to prevent browsers to cache requests
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT'
      });

      if (validationResult.isAjaxResult) {
        // In case of ajax call send the user to the queue by sending a custom queue-it header and redirecting user to queue from javascript
        res.set(validationResult.getAjaxQueueRedirectHeaderKey(), validationResult.getAjaxRedirectUrl());

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
      if (requestUrl !== requestUrlWithoutToken && validationResult.actionType) {
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
  }
});

module.exports = router;
```
