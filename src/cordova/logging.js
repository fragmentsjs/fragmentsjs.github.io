//
// Logging for Cordova
// ==================

(function () {

  // Private functions/variables
  // ---------------------------

  // Make sure to update Content-Security-Policy in index.html if this is changed       
  var LOG_SERVER = 'http://localhost:8126';

  // convert arguments to a string
  var serialize = function () {
    var args = Array.prototype.slice.call(arguments);
    var msg = '';
    args.forEach(function (arg) {
      if (typeof arg === 'object') msg += JSON.stringify(arg);
      else msg += arg;
    });

    return msg;
  };

  var addLogDiv = function () {
    var div = document.createElement("div");
    div.id = 'log';
    document.body.appendChild(div);
  };

  // manage a div used for logging
  var logInDiv = function () {
    var msg = serialize(arguments);

    if (document.getElementById('log') && document.getElementById('log').childElementCount > 30)
      document.body.removeChild(document.getElementById('log'));

    if (!document.getElementById('log')) addLogDiv();

    document.getElementById('log').innerHTML += msg + '<br/>';
  };

  var logRemote = function () {
    var msg = serialize(arguments);

    var req = new XMLHttpRequest();
    req.open('POST', LOG_SERVER);
    req.send(msg);
  };

  // Logging both in the app and on the remote server
  var log = function () {
    logInDiv(arguments);
    logRemote(arguments);
  };

  // Exports
  // -------

  console.log = log;
  console.info = log;
  console.error = log;

  window.onerror = log;
  window.logRemote = logRemote;

}());
