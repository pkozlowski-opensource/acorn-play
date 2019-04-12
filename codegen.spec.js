const acorn = require('acorn');
const escodegen = require('escodegen');

const prettier = require('prettier');
const jsdiff = require('diff');
const chalk = require('chalk');

const parserPluginFactory = require('./parser').jshPluginFactory;
const generate = require('./codegen').generate;

const parser = acorn.Parser.extend(parserPluginFactory());

function transpile(src) {
  return generate(parser.parse(src, {sourceType: 'module'}));
}

describe('code generation', () => {

  beforeEach(function() {
    jasmine.addMatchers({
      toOutput: function(util, customEqualityTesters) {
        return {
          compare: function(actual, expected) {
            const actualPretty = prettier.format(actual, {parser: 'babel'});

            // parse and re-generate expected output to:
            // - make sure that the expected value is valid
            // - have identical formatting (as we are using the same code
            // generator)
            const expectedPretty = prettier.format(
                escodegen.generate(
                    acorn.Parser.parse(expected, {sourceType: 'module'})),
                {parser: 'babel'});

            const result = {};

            result.pass = expectedPretty === actualPretty;
            if (result.pass) {
              result.message = `All good`;
            } else {
              const diffResults =
                  jsdiff.diffChars(expectedPretty, actualPretty);
              result.message = diffResults
                                   .map((part) => {
                                     return part.added ?
                                         chalk.green(part.value) :
                                         part.removed ? chalk.red(part.value) :
                                                        chalk.gray(part.value);
                                   })
                                   .join('');
            }

            return result;
          }
        };
      }
    });
  });

  describe('template function signature', () => {
    it('should do nothing when there are no template tags', () => {
      expect(transpile(`
        import {foo} from 'bar';
  
        function notATemplate() {        
        }
      `)).toOutput(`
        import {foo} from 'bar';
  
        function notATemplate() {        
        }
      `);
    });

    it('should add context argument to template functions', () => {
      expect(transpile(`    
        @Template()
        function emptyTemplate(someArg) {        
        }
      `)).toOutput(`
        function emptyTemplate($renderContext, someArg) {
        }
      `);
    });
  });

  describe('instructions', () => {

    it('should do nothing to literal statements outside of template functions',
       () => {
         expect(transpile(`"Hello, World!"`)).toOutput(`"Hello, World!"`);
       });

    it('should generate single text node in template functions', () => {
      expect(transpile(`    
        @Template()
        function hello() {        
          "Hello, World!"
        }
      `)).toOutput(`
        import {Θtext} from "fw-x";
        function hello($renderContext) {
          Θtext($renderContext, 0, "Hello, World!");
        }
      `);
    });

    it('should generate tags with text nodes', () => {
      expect(transpile(`    
        @Template()
        function hello() {        
          <h1>"Hello, World!"</h1>
        }
      `)).toOutput(`
        import {ΘelementEnd, ΘelementStart, Θtext} from "fw-x";
        function hello($renderContext) {
          ΘelementStart($renderContext, 0, "h1");
          Θtext($renderContext, 1, "Hello, World!");
          ΘelementEnd($renderContext, 0);
        }
      `);
    });

  });

});