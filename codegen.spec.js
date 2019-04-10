const acorn = require('acorn');
const prettier = require('prettier');

const parserPluginFactory = require('./parser').jshPluginFactory;
const generate = require('./codegen').generate;

const parser = acorn.Parser.extend(parserPluginFactory({}));

function transpile(src) {
  return generate(parser.parse(src));
}

describe('code generation', () => {

  beforeEach(function() {
    jasmine.addMatchers({
      toOutput: function(util, customEqualityTesters) {
        return {
          compare: function(actual, expected) {
            const actualPretty = prettier.format(actual);
            const expectedPretty = prettier.format(expected);

            const result = {};

            result.pass = actualPretty === expectedPretty;
            if (result.pass) {
              result.message = `All good`;
            } else {
              result.message = `Not the same :-(`
            }

            return result;
          }
        };
      }
    });
  });

  it('should do nothing when there are no template tags', () => {

    expect(transpile(`
      function notATemplate() {        
      }
    `)).toOutput(`
      function notATemplate() {        
      }
    `);

  });

});