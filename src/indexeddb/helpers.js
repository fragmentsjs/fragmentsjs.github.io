// helpers.js
//------------------------------
//
// 2015-04-01, Jonas Colmsjö
//------------------------------
//
// Misc helpers functions
//
// Usage:
//
//   <script src='./src/helpers.js'></script>
//   ...
//   var loggerOptions = {
//     debug: true,
//     filename: 'myfile.js',
//     noLogging: false
//   };
//
//   var log = new Helpers.log(loggerOptions);
//
//
// Using
// [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
//

var Helpers = {};

Helpers.MODULE_NAME = 'Helpers';

// Logging class
// --------------
//
// Each instance has its own options for logging level
//
// options: {
//   debug: boolean,
//   info: boolean,
//   noLogging: boolean,
//   filename: string to prefix logging with
// };

Helpers.log = function(options) {
  var self = this;
  self._debug = false;
  self._info = true;
  self._noLogging = false;
  self._filename = null;
  if (options !== undefined) {
    self.logLevel(options);
  }
};

Helpers.log.prototype.debug = function() {
  var self = this;
  if (self._debug && !self._noLogging) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('DEBUG');
    self.log.apply(this, args);
  }
};

Helpers.log.prototype.info = function() {
  var self = this;
  if (self._info && !self._noLogging) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('INFO');
    self.log.apply(this, args);
  }
};

Helpers.log.prototype.log = function() {
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

Helpers.log.prototype.logLevel = function(options) {
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
Helpers.log.prototype.dump = function(exprs, labels) {
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
// ----------------------
//
// Using a global vairable and 'Static' functions instead of class
// Use like this: Helpers.registerEvent(...)

// Keep a reference to all event listeners registered (there is no other
// way to access the listeners)
window.listeners = {};

Helpers.registerEvent = function(elId, event, listener) {

  if (window.listeners[elId] === undefined) {
    window.listeners[elId] = {};
  }

  window.listeners[elId][event] = listener;

  document.getElementById(elId).addEventListener(event, listener);
};

Helpers.unregisterEvent = function(elId, event) {
  res = null;

  if (window.listeners[elId] !== undefined &&
    window.listeners[elId][event] !== undefined) {
    res = window.listeners[elId][event];
    window.listeners[elId][event] = null;
    window.listeners[elId].removeEventListener(listener);
  }
  return res;
};


//
// Super simple HTML parser
// ------------------------
//

Helpers.removeHTMLComments = function(str) {
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
Helpers.parseHTMLTag = function(tag, str, outer) {
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
Helpers.parseHTMLTag2 = function(tag, str) {
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
// Export module
// ---------------------------------------------------------------------------
// The name of the module becomes the filename automatically in browserify
module.exports = Helpers;
