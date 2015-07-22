    // workaround since NodeList do not inherit Array (not for IE6/7/8)
    NodeList.prototype.forEach = Array.prototype.forEach;
    NamedNodeMap.prototype.forEach = Array.prototype.forEach;

    var mergeArray = function (arr) {
      return arr.reduce(function (prev, curr, idx, arr) {
        return merge(prev, curr);
      }, {});
    }

    var merge = function (source, target) {
      if (source === undefined)
        source = {};
      if (target === undefined)
        target = {};
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
      return target;
    };

    var parseNodeAttr = function (node, attrName) {
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
