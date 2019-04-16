const testHelper = require('./test_helper');

function toProduceAstMatcher(util, customEqualityTesters) {
  return {
    compare: function(actual, expected) {
      const result = {};

      result.pass = !testHelper.isAstDifferent(expected, actual);
      if (result.pass) {
        result.message = `All good`;
      } else {
        console.log(JSON.stringify(actual, null, 2));
        const expectedIntersection =
            testHelper.objectIntersect(actual, expected);
        result.message = testHelper.formatDiff(
            JSON.stringify(expected, null, 2),
            JSON.stringify(expectedIntersection, null, 2));
      }

      return result;
    }
  };
}

module.exports = {
  toProduceAstMatcher: toProduceAstMatcher
};