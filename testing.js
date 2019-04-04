const acorn = require('acorn');
const Parser = acorn.Parser;

const jshPluginFactory = require('./parser').jshPluginFactory;


const jshParser = Parser.extend(jshPluginFactory({}));

// test harness....
const tests = [];
const ftests = [];

function test(name, source, ast) {
  tests.push({name, source, ast});
}

function ftest(name, source, ast) {
  ftests.push({name, source, ast});
}

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
      for (let i=0; i<expectedValue.length; i++) {
        if (isAstDifferent(expectedValue[i], actualValue[i])) {
          return true;
        }
      }
    } else if (expectedValueType === "object") {
      if (isAstDifferent(expectedValue, actualValue)) {
        return true;
      }
    } else if (expectedValue !== actualValue) {
      return true;
    }
  }

  return false;
}

function run() {
  let okCounter = 0;
  let koCounter = 0;
  const testsToRun = ftests.length ? ftests : tests;
  for (let i=0; i<testsToRun.length; i++) {
    const test = testsToRun[i];
    const producedAst = jshParser.parse(test.source);
    // console.log(JSON.stringify(producedAst, null, 2));
    // const producedAst = Parser.parse(test.source);
    if (isAstDifferent(test.ast, producedAst)) {
      console.log(
          `${test.name} failed! Expected:\n ${JSON.stringify(test.ast, null, 2)} \nbut got:\n ${JSON.stringify(producedAst, null, 2)}`);
      koCounter++;
    } else {
      okCounter++;
    }
  }
  console.log('TOTAL: ', okCounter + koCounter);
  console.log('');
  console.log('Passed: ', okCounter);
  console.log('Failed: ', koCounter);

  console.log('');
  if (koCounter) {
    console.log('FAIL :-(');
  } else {
    console.log('PASS :-)');
  }
}

module.exports = {
  run: run,
  test: test,
  ftest: ftest
}