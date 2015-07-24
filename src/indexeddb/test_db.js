// test_db.js
//------------------------------
//
// 2015-04-28, Jonas Colmsjö
//------------------------------
//
// Test the Db class
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------


var chai = require('chai');
var assert = chai.assert;

var Db = require('./db.js');

describe('Db class', function() {
  'use strict';

  var bucket;


  it('should be able to delete a bucket (in case test has been failed)',
  function(done) {

    bucket = new Db({dbName: 'mydb', bucketName: 'mybucket'});

    bucket.deleteBucket()
    .then(function() {
      done();
    })
    .catch(function(err) {
      console.log('ERROR:', err);
      done();
    });

  });

  it('should be able to create buckets', function(done) {
    bucket.createBucket()
    .then(function() {
      done();
    })
    .catch(function(err) {
      console.log('ERROR:', err);
      done();
    });
  });


  it('should be able to put to and get from bucket', function(done) {
     bucket.add('key1', 'value1')
    .then(function() {
      return bucket.add('key2', 'value2');
    })
    .then(function() {
      return bucket.get('key1');
    })
    .then(function(res) {
      assert.ok(res === 'value1');
      done();
    })
    .catch(function(err) {
      console.log('ERROR:', err);
      done();
    });
  });


/*  it('see what happens if we uncoordinated operation', function(done) {
    bucket.add('key1', 'value1')
    .then(function() {
      return bucket.add('key2', 'value2');
    })
    .then(function() {
      return bucket.get('key1');
    })
    .then(function(res) {
      assert.ok(res === 'value1');
      done();
    })
    .catch(function(err) {
      console.log('ERROR: ' + JSON.stringify(err));
      done();
    });
  });
*/

  it('should be able to delete buckets', function(done) {
    this.timeout(10000);

    bucket.deleteBucket()
    .then(function() {
      done();
    })
    .catch(function(err) {
      console.log('ERROR:', err);
      done();
    });
  });

  after(function() {
    console.log('In the after function...');
    bucket.close();
  });


});
