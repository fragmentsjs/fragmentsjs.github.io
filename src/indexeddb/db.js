// db.js
//------------------------------
//
// 2015-04-28, Jonas Colmsjö
//------------------------------
//
// A wrapper on IndexedDB that fits the API of Gizur OData Server.
// Data is either stored in tables or buckets. Tables are implemented with
// object stores with in-line keys (with a key-path). Buckets use out-of-line
// keys (and don't need any key-path).
//
// A row in a table is represented with JSON objects:
// `{column1: value1, ..., columnN: valueN}`
// The object sotre key-path is one of the columns. Index can be created when
// searching on other columns.
//
// Buckets are key/value stores. Anything object (that IndexedDB supports)
// can be stored in a bucket. The key is typically a string but can
// also be dates, floats or arrays.
//
// Promises are used to handle all async operations.
//
// Usage: `npm install promise underscore chai`
//        `browserify -d db.js -d test_db.js -o bundle.js` and include
//        `bundle.js` with `script tag`. Also install Mocha:
//        `bower install mocha`
//
// More about [IndexedDb](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------

//
// make operations easy to use and promise-enabled, just do createBucket
// without thinking about versions, upgradeevents etc.
//
// Put event mgmt logic in one function
//
// openIDB_(operation, arguments)
//
// operation = createBucket | deleteBucket | add | get | delete 
//
// invariants are true before and after the operation
//  * for create/deleteBucket is self.idb_ === null and self.version_ has changed
//  * for add, get, delete is self.idb_ !== null and and self.version_ has not changed

var Promise = require('promise');
var _ = require('underscore');

var Helpers = require('./helpers.js');

//
// constructor
// -----------

Db = function(options) {
  var self = this;

  var loggerOptions = {
    debug: true,
    filename: 'db.js',
    noLogging: false
  };

  self.logger_ = new Helpers.log(loggerOptions);
  self.logger_.debug('Constructor.');

  if (!options.dbName || (!options.tableName && !options.bucketName)) {
    throw 'Db.constructor: database name and table or bucket name is mandatory.'
  }

  // STABLE, EXPERIMENTAL or NOT_SUPPORTED
  self.idbSupport_ = null;

  // reference to open IndexexEb
  self.idb_ = null;
  self.version_ = null;

  // Name of IndexedDB database to open
  self.dbName_ = options.dbName;

  // Name of table to open (used a name of oobject store)
  self.tableName_ = (options.tableName) ? options.tableName : null;

  // Name of bucket to open (used a name of oobject store)
  self.bucketName_ = (options.bucketName) ? options.bucketName : null;

  // Each Db instance can have only one cursor which is used for read/write
  // operations
  self.cursor_ = null;

  // Check that IndexedDN is supported
  self.checkForIndexDBSupport_();
};

//
// Internal helpers
// ---------------


Db.prototype.execTrans_ = function(storeOp, mode, debugStr) {
  var self = this;

  return new Promise(function(fulfill, reject) {
    self.logger_.debug(debugStr +' (' + self.version_ + ')');

    var trans = self.idb_.transaction(self.bucketName_, mode);

    trans.oncomplete = function(evt) {
      self.logger_.debug(debugStr, 'oncomplete (' + self.version_ + ')');
      fulfill(evt);
    };

    trans.onerror = function(err) {
      self.logger_.log(debugStr, 'onerror:' + JSON.stringify(err) +
                       ' (' + self.version_ + ')');
      reject(err);
    };

    var store = trans.objectStore(self.bucketName_);
    var request = storeOp(store);

    // fwait until trans.oncomplete before fulfilling
    request.onsuccess = function(evt) {
      self.logger_.debug(debugStr, 'onsuccess (' + self.version_ + ')');
    };
  });
};

Db.prototype.add_ = function(key, value) {
  return this.execTrans_(function(store) {return store.add(value, key)}, 'readwrite', 'add');
};

Db.prototype.get_ = function(key) {
  return this.execTrans_(function(store) {return store.get(key)}, 'readonly', 'get');
};

var del = function(fulfill, reject) {};

var update = function(fulfill, reject) {};

var createBucket = function() {
  var self = this;
  self.logger_.debug('createBucket', self.bucketName_);
  self.idb_.createObjectStore(self.bucketName_);
};

var deleteBucket = function() {
  var self = this;

  self.logger_.debug('deleteBucket', self.bucketName_);

  if (self.idb_.objectStoreNames.contains(self.bucketName_)) {
    self.logger_.debug('deleteBucket', self.bucketName_ +
      ' exists. Deleting. ' + '(' + self.version_ + ')');

    self.idb_.deleteObjectStore(self.bucketName_);
  } else {
    self.logger_.log('deleteBucket', self.bucketName_ +
      ' does not exist. Cannot delete. ' + '(' + self.version_ + ')');
  }
};

Db.prototype.opToString_ = function(op) {
  var self = this;

  if (op === self.add_) {
    return 'add';
  }
  if (op === self.get_) {
    return 'get';
  }
  if (op === del) {
    return 'del';
  }
  if (op === update) {
    return 'update';
  }
  if (op === createBucket) {
    return 'createBucket';
  }
  if (op === deleteBucket) {
    return 'deleteBucket';
  }
  return 'unknow operation';
};

Db.prototype.openIDB_ = function(op) {
  var self = this;

  if (!op) {
    throw 'operation is mandatory';
  }

  // remove op from arguments
  var args = Array.prototype.slice.call(arguments);
  args = args.slice(1, args.length);

  var open = function(upgrade) {

    return new Promise(function(fulfill, reject) {

      // make sure we've got this right
      if (upgrade && self.version_ === null) {
        reject('Internal error: must know version when upgrading');
      }

      self.logger_.debug('openIDB_', self.opToString_(op) +
                         ' with upgrade=' + upgrade);

      // no need to open indexeddb if its already open and upgrade not needed
      if (!upgrade && self.idb_ !== null) {
        return fulfill();
      }

      // Make sure we're closed if we're going to upgrade
      if (upgrade) {
        self.close();
      }

      var onError = function(err) {
        self.logger_.debug('openIDB_', self.opToString_(op) +
                           'an error occured', err);
        reject(err);
      }

      var request;

      if (upgrade) {
        request = window.indexedDB.open(self.dbName_, ++self.version_);
      } else {
        request = window.indexedDB.open(self.dbName_);
      }

      request.onblocked = function(evt) {
        self.logger_.debug('openIDB_', self.opToString_(op),
               'onblocked: need to wait for som other operation to finish.');
      };

      // We can only create Object stores in a versionchange transaction.
      request.onupgradeneeded = function(evt) {
        self.logger_.debug('openIDB_', self.opToString_(op),
                           'onupgradeneeded ('+ self.version_ + ')');

        // Save a reference to the database
        self.idb_ = evt.target.result;

        // Set an all error handler
        self.idb_.onerror = onError;

        // create/deleteBucket must be done here
        if (op === createBucket || op === deleteBucket) {
          op.apply(self, args);
        }
      };

      request.onsuccess = function(evt) {
        // Save a reference to the database
        self.idb_ = evt.target.result;

        // save the version
        self.version_ = self.idb_.version;

        // Set an error handler
        self.idb_.onerror = onError;

        self.idb_.onversionchange = function(evt) {
          self.logger_.debug('openIDB_', self.opToString_(op),
                             'onversionchange - should this happen?');
        };

        self.logger_.debug('openIDB_', self.opToString_(op),
                           'onsuccess (' + self.version_ + ')');

        fulfill();
      };

      request.onerror = onError;
    });
  };

  // These operations require that the version is increased
  var upgrade = (op === createBucket || op === deleteBucket);

  // we must know the version when upgrading
  if (upgrade && self.version_ === null) {
    self.logger_.debug('openIDB_', self.opToString_(op),
                       'Need to upgrade, must fetch the version first.')

    return open(false).then(function() {
//      self.close();
      return open(true);
    });
  } else {
    self.logger_.debug('openIDB_', self.opToString_(op));

    return open(upgrade).then(function() {
      if (op !== createBucket && op !== deleteBucket) {
        return op.apply(self, args);
      }
    });
  }

};

// closing the IndexedDB is performed in a separate thread in the browser
// An onblocked event will be fired if new operations are initiated before the
// close is completed
Db.prototype.close = function() {
  var self = this;

  // cannot close if indexeddb isn't open
  if (self.idb_ === null) {
    return;
  }

  self.logger_.debug('close');

  self.idb_.close();
  self.idb_ = null;
};

// Make sure that IndexedDB is supported. Throw error otherwise
Db.prototype.checkForIndexDBSupport_ = function() {
  var self = this;

  // only need to check once
  if (self.idbSupport_ !== null) {
    return self.idbSupport_;
  }

  self.idbSupport_ = 'STABLE';

  if (!window.indexedDB) {
    self.idbSupport_ = 'EXPERIMENTAL';

    window.indexedDB = window.indexedDB || window.mozIndexedDB ||
      window.webkitIndexedDB || window.msIndexedDB;

    window.IDBTransaction = window.IDBTransaction ||
      window.webkitIDBTransaction ||
      window.msIDBTransaction;

    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange ||
      window.msIDBKeyRange;

    if (!window.indexedDB) {
      self.idbSupport_ = 'NOT_SUPPORTED'
    }
  }

  self.logger_.debug('checkForIndexDBSupport:IndexedDB support:' +
    self.idbSupport_);

  if (self.idbSupport_ === 'NOT_SUPPORTED') {
    throw 'Db: IndexedDB not supported. ' +
    'Exiting, IndexedDB support is mandatory';
  }

  return self.idbSupport_;
};

//
// Exported functions
// ------------------

// store a value in a bucket
Db.prototype.add = function(key, value) {
  return this.openIDB_(this.add_, key, value);
  //return this.add2_(key, value);
};

Db.prototype.get = function(key) {
  return this.openIDB_(this.get_, key);
  //return this.get2_(key);
};

// create an object store that represents buckets
Db.prototype.createBucket = function() {
  return this.openIDB_(createBucket);
};

// create an object store that represents buckets
Db.prototype.deleteBucket = function() {
  return this.openIDB_(deleteBucket);
};


//
// Old stuff - DELETE
// -------------------

Db.prototype.add2_ = function(key, value) {
  var self = this;

  return new Promise(function(fulfill, reject) {
    self.logger_.debug('add:' + key + ':' + value + ' (' + self.version_ + ')');

    var trans = self.idb_.transaction(self.bucketName_, "readwrite");

    trans.oncomplete = function(evt) {
      self.logger_.debug('add: oncomplete (' + self.version_ + ')');
      fulfill(evt);
    };

    trans.onerror = function(err) {
      self.logger_.log('add: onerror', err, '(' + self.version_ + ')');
      reject(err);
    };

    var store = trans.objectStore(self.bucketName_);
    var request = store.add(value, key);

    // fwait until trans.oncomplete before fulfilling
    request.onsuccess = function(evt) {
      self.logger_.debug('add: onsuccess (' + self.version_ + ')');
    };
  });
};

Db.prototype.get2_ = function(key) {
  var self = this;

  return new Promise(function(fulfill, reject) {
    self.logger_.debug('get: key=' + key);

    var trans = self.idb_.transaction(self.bucketName_, "readonly");
    var store = trans.objectStore(self.bucketName_);
    var request = store.get(key);

    request.onsuccess = function(evt) {
      self.logger_.debug('get: onsuccess',request.result, '(' + self.version_ + ')');
      fulfill(request.result);
    };

    request.onerror = function(err) {
      self.logger_.log('get: onerror', err);
      reject(err);
    };
  });
};



// The name of the module becomes the filename automatically in browserify
module.exports = Db;
