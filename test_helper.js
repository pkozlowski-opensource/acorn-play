const jsdiff = require('diff');
const chalk = require('chalk');

function isAstDifferent(expected, actual) {
  const keys = Object.keys(expected);

  for (let key of keys) {
    const expectedValue = expected[key];
    const expectedValueType = typeof expectedValue;
    if (actual == null) {
      debugger;
    }
    const actualValue = actual[key];

    if (Array.isArray(expectedValue)) {
      if (expectedValue.length !== actualValue.length) {
        return true;
      }
      for (let i = 0; i < expectedValue.length; i++) {
        if (isAstDifferent(expectedValue[i], actualValue[i])) {
          return true;
        }
      }
    } else if (expectedValueType === 'object') {
      if (isAstDifferent(expectedValue, actualValue)) {
        return true;
      }
    } else if (expectedValue !== actualValue) {
      return true;
    }
  }

  return false;
}

function objectIntersect(actual, expected) {
  const expectedKeys = Object.keys(expected);
  const isArray = Array.isArray(expected);
  const intersection = isArray ? [] : {};

  if (isArray) {
    const len = Math.max(actual.length, expected.length);
    for (let i = 0; i < len; i++) {
      const actualValue = actual[i];
      if (typeof actualValue === 'object') {
        intersection[i] = objectIntersect(actualValue, expected[i]);
      } else {
        intersection[i] = actual[i];
      }
    }
  } else {
    expectedKeys.forEach((key) => {
      const actualValue = actual[key];
      if (typeof actualValue === 'object') {
        intersection[key] = objectIntersect(actualValue, expected[key]);
      } else {
        intersection[key] = actual[key];
      }
    });
  }

  return intersection;
}

function formatDiff(expected, actual) {
  const diffResults = jsdiff.diffChars(expected, actual);
  return diffResults
      .map((part) => {
        return part.added ?
            chalk.green(part.value) :
            part.removed ? chalk.red(part.value) : chalk.gray(part.value);
      })
      .join('');
}

module.exports = {
  isAstDifferent: isAstDifferent,
  objectIntersect: objectIntersect,
  formatDiff: formatDiff
};