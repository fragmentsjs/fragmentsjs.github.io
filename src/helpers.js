// workaround since NodeList do not inherit Array (not for IE6/7/8)
NodeList.prototype.forEach = Array.prototype.forEach;
NamedNodeMap.prototype.forEach = Array.prototype.forEach;

// [ {a:}, {b:}, ...] => {a:, b:, ...}
var mergeArray = function (arr) {
  return arr.reduce(function (prev, curr, idx, arr) {
    return merge(prev, curr);
  }, {});
}

// {a:, b:) & {c:, d} => {a:, b:, c:, d:}
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

// <tag attrName='a=b,c=d'/> => {a: b, c: d}
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
