// combined js files, for version 0.1.3
/*
  
  Authenticate the user with their crosscloud account (their "pod")

  Hopefully someday this library will be obsolete, because the
  browsers will include this functionality.  So think of it as an
  anticipatory, experimental polyfill.  As such, it's something of a
  hack, and has certain vulnerabilities.  And it's not actually
  decentralized.  For more about this technique of using an iframe to
  simulate the browser having a login panel, see the history of xauth,
  eg
  http://hueniverse.com/2010/06/05/xauth-a-terrible-horrible-no-good-very-bad-idea/

  TODO: maybe shift to this being attached to an element, not just
  document.body, in part to allow for multiple connections.  At the
  same time, maybe switch onLogin and onLogout to being dom events
  using addEventListener, etc.

*/

/*jslint browser:true*/
/*jslint devel:false*/

(function(exports){
    "use strict";

    exports.version = '0.1.3';

    var userId;
    var onLoginCallbacks = [];
    var onLogoutCallbacks = [];
    var suggestedProviders = [];

    exports.getUserId = function () {
        return userId;
    };

    exports.requireLogin = function () {
        send({op:'requireLogin'});
        // (disable this window until we get it?)
    };

    exports.suggestProvider = function (providerID) {
        suggestedProviders.push(providerID);
    };

    exports.onLogin = function (callback) {
        onLoginCallbacks.push(callback);
        if (userId) {
            callback(userId);
        }
    };

    exports.removeOnLogin = function (callback) {
        for (var i = onLoginCallbacks.length-1; i>=0; i--) {
            if (onLoginCallbacks[i] === callback) {
                onLoginCallbacks.splice(i, 1);
            }
        }
    };

    exports.onLogout = function (callback) {
        onLogoutCallbacks.push(callback);
        if (!userId) {
            callback();
        }
    };

    var gotLogin = function (id) {
        if (userId) {
            gotLogout();
        }
        userId = id;
        onLoginCallbacks.forEach(function(cb) {
            cb(userId);
        });
    };

    var gotLogout = function () {
        userId = undefined;
        onLogoutCallbacks.forEach(function(cb) {
            cb();
        });
    };

    /////
 
    var focusPage;
    var onFocusCallbacks = [];

    exports.getFocusPage = function () {
        return focusPage;
    };

    exports.onFocusPage = function (callback) {
        onFocusCallbacks.push(callback);
       //console.log('gfp 4');
        if (focusPage) {
           //console.log('gfp 5', focusPage);
            callback(focusPage);
           //console.log('gfp 6');
        }
    };

    var gotFocusPage = function (page) {
       //console.log('gfp 1', page);
        focusPage = page;
        onFocusCallbacks.forEach(function(cb) {
           //console.log('gfp 2');
            cb(page);
           //console.log('gfp 3');
        });
    };

    var beginChildMode = function () {
        
        // a much simpler world, when we're running in an iframe
        // and the parent handles the user interaction

        window.addEventListener("message", function(event) {
                    
            // if (event.origin !== safeOrigin) return;
                
           //console.log("child<< ", event.origin, event.data);

            // Parent MUST sent focus BEFORE login, since
            // apps expect podlogin.focusPage to be set
            // when they get the login event.

            if (event.data.op === "login") {
                gotLogin(event.data.data.podID);
            } else if (event.data.op === "logout") {
                gotLogout();
            } else if (event.data.op === "focus") {
                gotFocusPage(event.data.data);
            } else {
                throw "podlogin iframe protocol error";
            }
        });
        parent.postMessage({"op":"awake"}, "*");

    };

    //////

    exports.simulateLogin = function (id) {
        gotLogin(id);
    };

    exports.simulateLogout = function () {
        gotLogout();
    };

    // this is probably only for testing.  Assume this wont
    // work in production code.
    exports.forceLogout = function () {
        send({op:'forceLogout'});
    };


    //
    //
    // Internals / iframe stuff
    //
    //

    var safeOrigin = "http://podlogin.org";
    // safeOrigin = "http://localhost"
    var iframeSource = safeOrigin+"/"+exports.version+"/podlogin-iframe.html";

    var iframe;
    var iframediv;
    var iframeIsAwake = false;
    var buffer = [];

    var send = function (msg) {
        if (iframeIsAwake) {
            iframe.contentWindow.postMessage(msg, safeOrigin);
        } else {
            buffer.push(msg);
        }
    };

    var buildiframe = function() {
        iframe = document.createElement("iframe");
        iframe.setAttribute("src", iframeSource);
        iframe.setAttribute("allowtransparency", false);  // doesn't work
        iframediv = document.createElement("div");
        iframediv.appendChild(iframe);
        iframeSetInitialStyle();
        //console.log('iframe built, waiting for "awake" message', iframe);
        addListeners();
        document.body.appendChild(iframediv);
    };

    var iframeSetProperties = function(settings) {
        //console.log('setting iframe properties', settings);
        ["top", "left", "right", "position", "width", "height"].forEach(function(prop) {
            if (prop in settings) {
                //console.log('setting on div',prop,settings[prop], iframediv);
                iframediv.style[prop] = settings[prop];
            }
        });
        ["borderRadius", "boxShadow", "width", "height", "overflow"].forEach(function(prop) {
            if (prop in settings) {
                //console.log('setting on iframe',prop,settings[prop], this.iframe);
                iframe.style[prop] = settings[prop];
            }
        });
    };
        

    // The code inside the iframe can modify some of these with
    // iframeSetProperties, but let's pick the others and set some
    // defaults.
    var iframeSetInitialStyle = function() {
        var ds = iframediv.style;
        var s = iframe.style;

        ds.position = "absolute";
        ds.right = "4px";
        ds.top = "4px";

        s.scrolling = "no";
        s.overflow = "hidden";
        iframe.scrolling = "no";
        iframe.overflow = "hidden";

        // s.transform = "rotate(5deg)";    :-)

        s.boxShadow = "2px 2px 6px #000";
        s.borderRadius = "2px";
        s.padding = "0";
        s.margin = "0";
        s.border = "none";
        s.width = 2+"px";
        s.height = 2+"px";
    };

    var addListeners = function () {

        /*
        iframe.addEventListener('load', function (event) {
           //console.log('iframe was loaded!', event, iframe, iframe.contentDocument);
            // can we look at iframe.contentDocument or something useful?
        });
        */


        window.addEventListener("message", function(event) {
            //console.log("podlogin got message, checking origin", event);
            
            if (event.origin !== safeOrigin) return;
            
            //console.log("app<< ", event.data);
            
            if (event.data.op === "controlIFrame") {
                iframeSetProperties(event.data.properties);
            } else if (event.data.op === "sendOptions") {
                send({op:"options", data:{
                    suggestedProviders: suggestedProviders
                }});
            } else if (event.data.op === "awake") {
                //console.log('podlogin: iframe is awake');
                iframeIsAwake = true;
                var message;
                while (true) {
                    message = buffer.shift();
                    if (!message) break;
                    send(message);
                }
            } else if (event.data.op === "login") {
                gotLogin(event.data.data.podID);
            } else if (event.data.op === "logout") {
                gotLogout();
            } else {
                throw "podlogin iframe protocol error";
            }
        });
    };

    if (location.hash === "#podlogin-use-parent") {
        beginChildMode();
    } else {
        // build the iframe as soon as the DOM is ready
        if (document.readyState === 'complete' ||
            document.readyState === 'interactive')   {
            buildiframe();
        } else {
            document.addEventListener("DOMContentLoaded", function() {
                buildiframe();
            });
        }
    }

/*global exports */   // um, this code will never actually run in Node....
})(typeof exports === 'undefined'? this.podlogin={}: exports);
/*
  (should probably be renamed rpcev (for rpc+events) or something, and
  look more like jsonrpc2.0.)

  A WebCircuit is like a WebSocket, except that wc.send() offers some
  hooks for callbacks, so the response(s) to this particular send()
  can easily end up in the same place in the code.  There are final
  success and failure callbacks using Promises, and also an
  intermediate message callback.

  What's sent is always (op, args) and what's received back has the
  same form, except op is "ok" or "err" for final responses, and the
  'args' might actually be app data.  op is a string and args is
  json-able javascript objects.

      wc = new WebCircuit(addr)
      wc.send(op, args[, handler1]).then(handler2).catch(handler3)

      handler1 is called (op, args) with intermediate messages
      handler2 is called (args) with final message
      handler3 is called (args) with an error, if there is one
          - args.message is the text of the error message
          - don't try to parse or compare it
          - if you need to check for messages, look for properties

          (In some forms of Promises, I think we could use a
          .progress(...) for handler1, but ES6 Promises don't seem to
          support that.)

      If you leave out addr, you can use wc.connect(addr) later.  It's
      fine to call send() before you call wc.connect(), and before the
      connection is actually set up -- everything will just be queued
      up until the connection is available.

  */

/*jslint browser:false*/
/*jslint devel:true*/

/*global WebSocket*/
if (typeof WebSocket === 'undefined') {  
    var WebSocket = require('ws');
}

/*global Promise*/
if (typeof Promise === 'undefined') {
    var Promise = require('promise');
}

var WebCircuit = function (addr) {
    "use strict";

    if (!(this instanceof WebCircuit)) throw "Use 'new' Please";

    var wc = this;
    wc.ws = null;

    wc.globalSeq=1;
    wc.open=false;
    wc.wsq=[];
    wc.onerror=null;

    wc.finalHandler={};
    wc.pushHandler={};

    wc.dump = function () {
        //return " "+Object.keys(wc.finalHandler).length+" "+Object.keys(wc.pushHandler).length;
        //console.log('wc.finalHandler', wc.finalHandler);
    };

    wc.close = function () {
        if (wc.ws) {
            wc.ws.close();
        }
    };

    wc.send = function (op, args, onPush) {
        if ( typeof op !== typeof "" ) throw "Bad Parameter";
        if ( typeof args !== typeof {} ) throw "Bad Parameter";
        var mySeq = wc.globalSeq++;
        var msg = { seq:mySeq, op:op, data:args };
        var msgText = JSON.stringify(msg);
        if (wc.open) {
            //console.log('>> ', msg);
            wc.ws.send(msgText);
        } else {
            //console.log('>> (queuing)', msg);
            wc.wsq.push(msgText);
        }
        if (onPush) wc.pushHandler[mySeq] = onPush;
        var p = new Promise(function(resolve, reject) {
            wc.finalHandler[mySeq] = function(op, args) {
                if (op === "ok") {
                    resolve(args);
                } else {
                    reject(args);
                }
            };
        });
        p.seq = mySeq;
        return p;
    };

    var tellAll = function (msg) {
        for (var seq in wc.finalHandler) {
            if (wc.finalHandler.hasOwnProperty(seq)) {
                wc.finalHandler[seq](msg);
            }
        }
        wc.finalHandler = {};
    };

    wc.connect = function (addr) {
        if (wc.ws !== null) {
            // HACK FOR NOW
            location.reload();
            // throw "already connected";
        }

        if (typeof window === "undefined") {
            wc.ws = new WebSocket(addr, {origin:"file:"});
        } else {
            wc.ws = new WebSocket(addr);
        }
        var s = wc.ws;

        s.onerror = function(e) { 
            tellAll('err',{});
            // FIXME: how to get this back to someone who will notice/care???
            if (wc.onerror) {
                wc.onerror(e);
                return;
            }
            if (e.code === 'ECONNREFUSED') {
                // node.js server not answering
                // throw e;
            }
            console.log('websocket error', e);
            throw new Error('websocket error', e);
        }; 
        s.onclose = function() { 
            //console.log('closed', e, ""+e) 
            tellAll('err',{});
        }; 
        s.onmessage = function(e) {
            //console.log('got', e.data);
            var msg = JSON.parse(e.data);
            var seq = msg.inReplyTo;
            if (msg.final) {
                //console.log('calling .then/.catch', seq, msg.op, msg.data);
                wc.finalHandler[seq](msg.op, msg.data);
                delete wc.finalHandler[seq];
                delete wc.pushHandler[seq];
            } else {
                var onPush = wc.pushHandler[seq];
                if (onPush) {
                    onPush(msg.op, msg.data);
                } else {
                    // should we raise an error that there was no handler?
                }
            }
        }; 
        s.onopen = function() {
            //console.log('open', wc.wsq);
            wc.open = true;
            while (true) {
                var m = wc.wsq.shift();
                if (!m) break;
                //console.log('>> (queued) ', m);
                wc.ws.send(m);
            }
        };
    };

    if (addr) wc.connect(addr);

};

if (typeof exports !== 'undefined') {
    exports.WebCircuit = WebCircuit;
}

(function(exports){

    exports.displayInApp = function (data, elem) {

        if (elem === undefined) {
            elem = document.body;
        }

        // until we figure this out...
        // maybe it's data.suggestedApp ?
		var iframe;
        var iframeSource = "http://www.crosscloud.org/0.1.3-alpha-sandro/example/profile/#podlogin-use-parent";
        var safeOrigin = "http://www.crosscloud.org";

        var listenForAwake = function(event) {

			if (event.source !== iframe.contentWindow) return;

			/*
            console.log("**1 got message, checking origin", event, iframe);
            console.log("**1a");
			if (iframe) {
				console.log("**2 source:", event.source, iframe.contentWindow);
				console.log("**3 match:", event.source === iframe.contentWindow);
			} else {
				console.log("NO IFRAME YET");
			}
            console.log("**1b");
                
            if (event.origin !== safeOrigin) {
                console.log('bad origin', event.origin, location);
                return
            }
			*/
            
            if (event.data.op === "awake") {
                //console.log('displayInApp iframe is awake');
                iframeIsAwake = true;
                msg = { op:"focus", data: data }
                iframe.contentWindow.postMessage(msg, safeOrigin)
                //console.log('displayInApp sent msg', msg);
            } else {
                throw "displayInApp iframe protocol error";
            }
        };
        
        // console.log('e?', elem === document.body, elem, document.body);
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
        var panel = document.createElement("div");
        panel.style.position = "absolute";
        panel.style.left = "0px";
        panel.style.top = "0px";
        panel.style.width = "100%";
        panel.style.height = "100%";

        var upper = document.createElement("div");
        upper.style.height = "1.5em";
        upper.style.background = "#B8B8C8";
        upper.style.padding = "3px";
        // upper.style.border = "6px solid light-gray";
        var msg = document.createTextNode("For testing, this page is being displayed by the Contacts app.");
        upper.appendChild(msg);

        iframe = document.createElement("iframe");
        iframe.setAttribute("src", iframeSource);
        iframe.style.left = "0px";
        iframe.style.top = "0px";
        iframe.style.width = "100%";
        iframe.style.height = "100%";

        
        panel.appendChild(upper);
        panel.appendChild(iframe);
        window.addEventListener("message", listenForAwake);
        elem.appendChild(panel);
        
        // really, on click of an x, I think
        //setTimeout(function () {
        //  panel.removeChild(upper);
        //}, 2000);
    };

    exports.UNUSEDonFocusPage = function onFocusPage(cb) {
        console.log("2500");
        if (!parent) { return };
        console.log("2600");
        window.addEventListener("message", function mev(event) {
            console.log("27x1", event.data);
            console.log("27x2", event.data);
            console.log("27x3", event.data);
            console.log("27x4", event.data);
            console.log("27x5", event.data);
            console.log("27x6", event);
            console.log("27x7", event.data);
            console.log("27x8", event.data);
            console.log("27x9", event);
            console.log("2710", event);
            console.log("2720", event);
            // if (event.source != parent) return;
            console.log("2800");
            var message = event.data;
            if (message.op === "focus") { 
                console.log("2900");
                cb(message.data);
                console.log("3100");
            }
        });
        parent.postMessage({"op":"awake"}, "*");
        console.log("2550");
    }

})(typeof exports === 'undefined'? this.crosscloud_displayInApp={}: exports);


/*
  
  Functions for accessing a world of linked data through the user's
  personal online database (pod).  Apps can store whatever data they
  want in the user's pod, and query for data from other apps in both
  this user's pod and in other pods which are directly or indirectly
  linked.

  See http://crosscloud.org/latest/
  or  http://crosscloud.org/0.1.3/

*/
"use strict";

/*global exports*/
/*global require*/
/*global console*/

if (typeof require !== 'undefined') {  
    var WebCircuit = require('./webcircuit').WebCircuit;
    var podlogin = require('podlogin');
}

/*global Promise*/
if (typeof Promise === 'undefined') {
	var Promise = require('promise');
}

if (typeof crosscloud_displayInApp === 'undefined') {
	// although this will never happen in node.js, so why bother?
	var crosscloud_displayInApp = require('./displayInApp');
}


(function(exports){

    exports.version = '0.1.3';

    // really we only allow one call to this, at present...

    exports.globalPod = null;

	exports.suggestProvider = function (url) {
		// ignore for now
	};

	exports.displayInApp = crosscloud_displayInApp.displayInApp;

	exports.onFocusPage = podlogin.onFocusPage;
	exports.getFocusPage = podlogin.getFocusPage;

    exports.connect = function (options) {
		var pod;
		if (options && options.podURL) {
			pod = new exports.PodClient();
			console.log("connecting to ", options.podURL);
			pod.connect(options.podURL);
			return pod;
		}
        if (exports.globalPod) {
            return exports.globalPod;
        }
        pod = new exports.PodClient();
        podlogin.onLogin(function (userId) {
            pod.connect(userId);
        });
        podlogin.onLogout(function () {
            // Maybe we need logout to reload the page?   This is
            // really hard to do cleanly -- restart all the queries
            // when they log in again, etc...???
            //
            // really, we should just freeze on logout, then 
            // if we login again to something different, we reload the
            // page...
            // .... pod.disconnect();
        });
        exports.globalPod = pod; 
        return pod;
    };

    exports.PodClient = function PodClient(){
        if ( !(this instanceof PodClient) ) {
            throw new Error("Constructor called as a function. Must use 'new'");
        }

        var pod = this;
        pod.wc = new WebCircuit();
        pod.wc.onerror = function (err) {
            if (pod.onerror) {
                pod.onerror(err);
            } else {
                // most common error is running this script from a file: URL
                // --- that doesn't work in firefox, at least ---
                // how to detect that properly?

                console.log("uncaught network/protocol error", err);
                throw err;
                // maybe do a dom popup to show this?
                // or use a div if they gave us one?
                // in node.js maybe halt
            }
        };
        pod.buffer = [];
    };

    var pod = exports.PodClient.prototype;

    pod.getUserId = function () {
        return podlogin.getUserId();
    };
    pod.onLogin = function (f) {
        return podlogin.onLogin(f);
    };
    /*
    pod.onLogin = function (f) {
        pod.onLogin = f;
        if (this.podURL) f(this.podURL);
    }
    */

    pod.requireLogin = function () {
        podlogin.requireLogin();
    };

    // we don't know how to handle in this code version, waiting for
	// PodBuffer
    pod.onLogout = function() {};

    pod.connect = function (addr) {
        this.podURL = addr;
        this.wc.connect(hubAddr(addr));
        // this is a stop-gap, because we don't actually
        // have users creating their own pods yet
        this.wc.send("login", {userId:addr});
    };

    // lousy partial implementation of promise
    pod.catch = function (f) {
        this.onerror = f;
        return pod;
    };
	// this isn't a real promise...   ugh!
	// (this will go away when we swtich to PodBuffer)
    pod.then = function (f) {
        var pod = this;
        podlogin.requireLogin();
        podlogin.onLogin(function() { f(pod); });
        return pod;
    };

    // http://foo.bar       =>  ws://foo.bar/.well-known/podsocket/v1
    // http://foo.bar/      =>  ws://foo.bar/.well-known/podsocket/v1
    // http://foo.bar/foo   =>  ws://foo.bar/.well-known/podsocket/v1
    // https://foo.bar/     =>  wss://foo.bar/.well-known/podsocket/v1
    // http://foo.bar:8080  =>  ws://foo.bar:8080/.well-known/podsocket/v1
    var hubAddrRE = new RegExp("^http(s?)://([^/]*).*$");
    var hubAddr = function (addr) {
        if (hubAddrRE.test(addr)) {
            return addr.replace(hubAddrRE, 
                                "ws$1://$2/.well-known/podsocket/v1");  
        } else {
            throw new Error("bad pod URL syntax");
        }
    };

    /* We don't seem to be using this any more...

    var userNameRE1 = new RegExp("^http(s?)://localhost(:[^/]*)?/pod/([^/]*).*$");
    var userNameRE2 = new RegExp("^http(s?)://([^.]*).*$");
    var userName = function (addr) {
        var x
        if (userNameRE1.test(addr)) {
            x = addr.replace(userNameRE1, "$3");  
            return x;
        } else if (userNameRE2.test(addr)) {
            x = addr.replace(userNameRE2, "$2");  
            return x;
        } else {
            throw new Error("bad pod URL syntax", addr);
        }
    };
    */



    var Query = function (onPod) { 
        this.pod = onPod;
        this.msg = { maxCallsPerSecond: 20, 
                     events: {},
                     inContainer: onPod.podURL };
        this.eventCallbacks = [];
		this.stopped = false;
    };
    Query.prototype.filter = function (p) {
        this.msg.filter = p;
        return this;
    };
    Query.prototype.limit = function (n) {
        this.msg.limit = n;
        return this;
    };
    // legacy
    Query.prototype.onAllResults = function (c) {
        return this.on('AllResults', c);
    };
    Query.prototype.on = function (event, c) {
        this.eventCallbacks.push({event:event, callback:c});
        this.msg.events[event]  = true;
        return this;
    };
    Query.prototype.start = function () {
        var query = this;
        var eventHandler = function (event, arg) {

			// respond to stop() immediately, even if the server doesn't
			if (query.stopped) return; 

            var handled = false;
			//console.log('got event', event, arg);
            query.eventCallbacks.forEach(function (record) {
                if (record.event === event) {
                    handled = true;
                    
                    // legacy : AllResults callbacks expect to be given
                    // the array, not the args
                    if (event === "AllResults") {
                        record.callback(arg.results);
                    } else {
                        record.callback(arg);
                    }
                }
            });
            if (event==="QueryCreated") {
                // unlikely the app cares.   A query.then would probably
                // be more like a one-time thing
                handled = true;
            }
            if (event==="NetworkCheck") {
                // not useful, but we get them anyway
                // (maybe the server should use a websocket ping instead?)
                handled = true;
            }
            if (!handled) {
                console.log('got unrequested event', event, arg);
            }
        };
        this.promise=this.pod.wc.send("startQuery", this.msg, eventHandler);
        this.seq=this.promise.seq;
        return this;
    };
    Query.prototype.stop = function () {
		// FIXME actually, stop is supposed to give the _id that start
		// gave us.   Huh.
        this.pod.wc.send("stopQuery", {originalSeq:this.seq});
		this.stopped = true;
        return this;
    };
                        
    pod.query = function(config) {
        var result = new Query(this);
        if (config) throw new Error("config is no longer supported");
        return result;
    };

    var applyOverlay = function(main, overlay) {
        for (var k in overlay) {
            if (overlay.hasOwnProperty(k)) {
                var value = overlay[k];
                if (value === null) {
                    delete main[k];
                } else if (typeof value === "object" &&
                           typeof main[k] === "object" &&
                           !value.isArray() &&
                           !main[k].isArray()) {
                    applyOverlay(main[k], value);
                } else {
                    main[k]=overlay[k];
                }
            }
        }
    };


    /*
    pod.push = function(page, appCallback) {
        if (page._id) {
            this.wc.send("update", page)
                .then(function(data) {
                    applyOverlay(page, data)
                    if (appCallback) appCallback(overlay, err);
                })
                .catch(function(err) {
                    throw err
                });
        } else {
            wc.send("create", {inContainer:this.podURL,
                               initialData:page})
                .then(function(data) {
                    page._id = data._id;   // or is it _location...?
                });
                .catch(function(err) {
                    throw err
                });
        }
    }
        
    pod.pull = function(page, appCallback) {
        wc.send("read", {_id:"http://localhost/sandro/a1"})
            .then(function(data) {
                console.log('read', data)

            });

        
        var callback = function(overlay,err) {
            applyOverlay(page, overlay);
            if (appCallback) appCallback(overlay, err);
        }
        this._sendToPod({op:"pull", 
                         pageId: page._id,
                         callback:this._newCallback(callback)
                        });
    }
    */

    pod.push = function (data, cb) {
		var pod = this;
		return new Promise(function (resolve, reject) {
			if (data.hasOwnProperty('_id')) {
				pod.wc.send("update", data)
					.then(function (a) {
						data._etag = a._etag;
						if (cb) cb(data);
						resolve(data);
					});
				// catch -> reject?
			} else {
				var p;
				try {
					p = pod.wc.send("create", {inContainer:pod.podURL,
													initialData:data});
				} catch(err) {
					reject(err);
					return
				}
				p.then(function (a) {
						data._etag = a._etag;
						data._id = a._id;
						if (cb) cb(data);
						resolve(data);
					});
				// catch -> reject?
			}
		});
	}

    pod.pull = function (data, cb) {
		var pod = this;
		return new Promise(function (resolve, reject) {
			pod.wc.send("read", data)
				.then(function (overlay) {
					// clear own properties first, so unnamed ones go away
					// but we keep the same object
					for (var prop in data) {
						if (data.hasOwnProperty(prop)) delete data[prop];
					}
					applyOverlay(data, overlay);
					if (cb) cb(data);
					resolve(data);
				});
		});
	};        

	pod.delete = function (data, cb) {
		var pod = this;
		return new Promise(function (resolve, reject) {
			pod.wc.send("delete", data)
				.then(function (a) {
					// mark data as deleted somehow?  remove _id or _etag?
					data._deleted = true;
					if (cb) cb(data);
					resolve(a);
				});
		});
	}

})(typeof exports === 'undefined'? this.crosscloud={}: exports);
