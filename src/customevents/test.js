var assert = chai.assert;

describe("iframes and events:", function() {

  before(function(done) {
    console.log('Create iframe');

    frame = document.createElement('iframe');
    frame.id = 'frame';
    frame.name = 'frame';
    frame.sandbox = 'allow-scripts allow-same-origin';
    frame.src = 'base/frame.html';
    document.documentElement.appendChild(frame);

    done();
  });

  it("test dynamically loaded iframe", function(done) {
    setTimeout(function() {
      console.log('test dynamically loaded iframe');
      var doc = document.getElementById('frame').contentWindow.document;

      assert.isNotNull(doc, 'frame not created correctly');
      assert.isNotNull(doc.getElementById('button2'),
        'frame content not created correctly');

      done();

    }, 100)
  });

  it("test to trigger event", function(done) {
    setTimeout(function() {
      console.log('test to trigger event');
      var frame = document.getElementById('frame');
      frame.contentWindow.init();

      var button = frame.contentDocument.getElementById('button2');
      var event = new Event('click');

      // A message is pronted in the console when using debug in Karma.
      // The command line putput does not show this though.
      frame.contentWindow.dispatchEvent(event);
      button.dispatchEvent(event);

      done();
    }, 100);
  });

});
