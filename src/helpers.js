// fragmentsjs.github.io, Copyright 2015 Jonas Colmsjö, ISC license 

// workaround since NodeList do not inherit Array (not for IE6/7/8)
NodeList.prototype.forEach = Array.prototype.forEach;
NamedNodeMap.prototype.forEach = Array.prototype.forEach;

var Helpers = {};

// [ {a:}, {b:}, ...] => {a:, b:, ...}
Helpers.mergeArray = function (arr) {
  return arr.reduce(function (prev, curr, idx, arr) {
    return merge(prev, curr);
  }, {});
}

// {a:, b:) & {c:, d} => {a:, b:, c:, d:}
Helpers.merge = function (source, target) {
  if (!source)
    throw new Error('source must be specified');
  if (!target)
    target = {};
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
};

// {a: {b: }, c:) & {d:, e:} => {a: {b:}, c:, d:, e:}
Helpers.deepMerge = function (source, target) {
  if (!source)
    throw new Error('source must be specified');
  if (!target)
    target = {};
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object') {
      	target[key] = deepMerge(source[key], target[key]);
      }
      else {
        target[key] = source[key];
      }
    }
  }
  return target;
};


// <tag attrName='a=b,c=d'/> => {a: b, c: d}
Helpers.parseNodeAttr = function (node, attrName) {
  var props = null;
  if (node.attributes) {
    node.attributes.forEach(function (attr) {
      if (attr.name && attr.name === attrName) {
        props = mergeArray(attr.value.split(',')
          .map(function (el) {
            var p = el.split('=');
            var r = {};
            r[p[0]] = p[1];
            return r;
          }));
      }
    });
  }
  return props;
}


// Logging class that is compatible with console
// =============================================
//
// Each instance has its own options for logging level
//
// options: {
//   debug: boolean,
//   info: boolean,
//   noLogging: boolean,
//   filename: string to prefix logging with
// };

Helpers.log = function (options) {
  var self = this;
  self._debug = false;
  self._info = true;
  self._noLogging = false;
  self._filename = null;
  if (options !== undefined) {
    self.logLevel(options);
  }
};

Helpers.log.prototype.debug = function () {
  var self = this;
  if (self._debug && !self._noLogging) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('DEBUG');
    self.log.apply(this, args);
  }
};

Helpers.log.prototype.info = function () {
  var self = this;
  if (self._info && !self._noLogging) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('INFO');
    self.log.apply(this, args);
  }
};

Helpers.log.prototype.log = function () {
  var self = this;
  var args = Array.prototype.slice.call(arguments);

  if (self._filename !== undefined && self._filename !== null) {
    args.unshift(self._filename);
  }

  if (!self._noLogging) {
    //console.log.apply(this, args);
    console.log(args.join(':'));
  }
};

Helpers.log.prototype.logLevel = function (options) {
  var self = this;
  if (options.debug !== undefined) {
    self._debug = options.debug;
  }

  if (options.info !== undefined) {
    self._info = options.info;
  }

  if (options.noLogging !== undefined) {
    self._noLogging = options.noLogging;
  }

  if (options.filename !== undefined) {
    self._filename = options.filename;
  }
};

// log expressions in array
Helpers.log.prototype.dump = function (exprs, labels) {
  var self = this;
  if (self._debug && !self._noLogging) {
    var msg = '';

    if (exprs instanceof Array) {
      for (var i = 0; i < exprs.length; i++) {
        msg += (labels && labels[i]) ? labels[i] + '=' : '';
        msg += JSON.stringify(exprs[i]) + ';';
      }
    } else if (typeof exprs === 'object') {
      // not imlemented, should iterate over keys
    } else {
      msg += (labels) ? labels + '=' : '';
      msg += exprs + ';';
    }

    self.log('DEBUG dump: ' + msg);
  }
};

//
// Manage event listeners
// ======================
//
// Using a global vairable and 'Static' functions instead of class
// Use like this: Helpers.registerEvent(...)

// Keep a reference to all event listeners registered (there is no other
// way to access the listeners)
window.listeners = {};

Helpers.registerEvent = function (elId, event, listener) {

  if (window.listeners[elId] === undefined) {
    window.listeners[elId] = {};
  }

  window.listeners[elId][event] = listener;

  document.getElementById(elId).addEventListener(event, listener);
};

Helpers.unregisterEvent = function (elId, event) {
  res = null;

  if (window.listeners[elId] !== undefined &&
    window.listeners[elId][event] !== undefined) {
    res = window.listeners[elId][event];
    window.listeners[elId][event] = null;
    window.listeners[elId].removeEventListener(listener);
  }
  return res;
};

Helpers.dispatchEvent = function (frameId, eventName, message) {

  var event = new CustomEvent(
    eventName, {
      detail: { // detail is a custom object
        message: message,
        time: new Date(),
      },
      bubbles: true,
      cancelable: true
    }
  );

  var el = document.getElementById(frameId).contentDocument;

  el.dispatchEvent(event);
};

// send an event to the top window which will send to the specified targets
Helpers.sendEvent = function (frameIds, eventName, message) {

  var event = new CustomEvent(
    eventName, {
      detail: { // detail is a custom object
        targets: frameIds,
        message: message,
        time: new Date(),
      },
      bubbles: true,
      cancelable: true
    }
  );

  document.dispatchEvent(event);
};

//
// Super simple HTML parser
// ========================
//

Helpers.removeHTMLComments = function (str) {
  if (!str || str.length === 0) return '';

  var start = str.indexOf('<!--');
  var end = str.indexOf('-->');

  if (start === -1 || end === -1) return str;

  var res = str.substring(0, start);
  str = str.substring(end + 3, str.length);

  var res2 = Helpers.removeHTMLComments(str);
  return res.concat(res2);
};

// Outer or inner allowing (but not returning) attributes in tag
Helpers.parseHTMLTag = function (tag, str, outer) {
  if (!str || str.length === 0) return [];

  // find start of beginning and end tags
  var startStartTag = str.indexOf('<' + tag);
  var startEndTag = str.indexOf('</' + tag + '>');
  if (startStartTag === -1 || startEndTag === -1) return [];

  // check that the tag has an end
  var endStartTag = str.substring(startStartTag + tag.length, str.length).indexOf('>');
  if (endStartTag === -1) return [];
  endStartTag += startStartTag + tag.length;

  var startTagLength = endStartTag - startStartTag;
  var endTagLength = ('</' + tag + '>').length;

  var res;
  res = (outer) ? str.substring(startStartTag, startEndTag + endTagLength) :
    str.substring(startStartTag + startTagLength + 1, startEndTag);

  str = str.substring(startEndTag + endTagLength, str.length);

  var res2 = Helpers.parseHTMLTag(tag, str, outer);
  return [res].concat(res2);

};

// Outer and inner with attributes in tag including the attributes
// [{outer:..., inner:..., attr:...}]
// TODO: should refactor and combine this with parseHTMLTag
Helpers.parseHTMLTag2 = function (tag, str) {
  if (!str || str.length === 0) return [];

  // find start of beginning and end tags
  var startStartTag = str.indexOf('<' + tag);
  var startEndTag = str.indexOf('</' + tag + '>');
  if (startStartTag === -1 || startEndTag === -1) return [];

  // check that the tag has an end
  var endStartTag = str.substring(startStartTag + tag.length, str.length).indexOf('>');
  if (endStartTag === -1) return [];
  endStartTag += startStartTag + tag.length;

  var startTagLength = endStartTag - startStartTag;
  var endTagLength = ('</' + tag + '>').length;

  var res = {};
  res.outer = str.substring(startStartTag, startEndTag + endTagLength);
  res.inner = str.substring(startStartTag + startTagLength + 1, startEndTag);
  res.attr = str.substring(startStartTag + ('<' + tag).length, endStartTag);

  str = str.substring(startEndTag + endTagLength, str.length);

  var res2 = Helpers.parseHTMLTag2(tag, str);
  return [res].concat(res2);

};

//
// Misc functions
// ==============

Helpers.o2s = function (o) {
  var out = '';
  for (var p in o) {
    out += p + ': ' + o[p] + ';';
  }
  return out;
};

Helpers.jsonParse = function (data) {
  try {
    return JSON.parse(data);
  } catch (e) {
    log.log('Error parsing JSON:' + e);
  }
};

Helpers.getBrowser = function () {
  var res = 'unknown';

  // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
  if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
    res = 'opera';
  }

  // Firefox 1.0+
  if (typeof InstallTrigger !== 'undefined') {
    res = 'firefox';
  }

  // At least Safari 3+: "[object HTMLElementConstructor]"
  if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0) {
    res = 'safari';
  }

  // Chrome 1+
  if (!!window.chrome && res !== 'opera') {
    res = 'chrome';
  }

  // At least IE6
  if ( /*@cc_on!@*/ false || !!document.documentMode) {
    res = 'ie';
  }

  return {
    browser: res,
    version: (navigator ? navigator.userAgent.toLowerCase() : 'other')
  };
};
