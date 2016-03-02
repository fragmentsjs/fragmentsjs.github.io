//
// from Facebooks Flux: https://github.com/facebook/flux/blob/master/src/Dispatcher.js
// 

(function () {
  'use strict';

  var _prefix = 'ID_';

  // ignoring arguments beyond cond and msg
  var invariant = function (cond, msg) {
    if (!cond) throw new Error(msg);
  }

  class Dispatch {

    constructor() {
      this._callbacks = {};
      this._isDispatching = false;
      this._isPending = {};
      this._lastID = 1;
    }

    register(callback) {
      var id = _prefix + this._lastID++;
      this._callbacks[id] = callback;
      return id;
    }

    unregister(id) {
      invariant(
        this._callbacks[id],
        'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
        id
      );
      delete this._callbacks[id];
    }

    dispatch(payload) {
      invariant(!this._isDispatching,
        'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
      );
      this._startDispatching(payload);
      try {
        for (var id in this._callbacks) {
          if (this._isPending[id]) {
            continue;
          }
          this._invokeCallback(id);
        }
      } finally {
        this._stopDispatching();
      }
    }

    _invokeCallback(id) {
      this._isPending[id] = true;
      this._callbacks[id](this._pendingPayload);
    }

    _startDispatching(payload) {
      for (var id in this._callbacks) {
        this._isPending[id] = false;
      }
      this._pendingPayload = payload;
      this._isDispatching = true;
    }

    _stopDispatching() {
      delete this._pendingPayload;
      this._isDispatching = false;
    }
  };

  window['dispatch'] = Dispatch;

})();
