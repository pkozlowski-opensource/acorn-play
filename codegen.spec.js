const acorn = require('acorn');
const escodegen = require('escodegen');
const prettier = require('prettier');

const parserPluginFactory = require('./parser').jshPluginFactory;
const generate = require('./codegen').generate;

const testHelper = require('./test_helper');

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
              result.message =
                  testHelper.formatDiff(expectedPretty, actualPretty);
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

    it('should generate element for self-closing tags', () => {
      expect(transpile(`    
        @Template()
        function hello() {        
          <br/>
        }
      `)).toOutput(`
        import {Θelement} from "fw-x";
        function hello($renderContext) {
          Θelement($renderContext, 0, "br");
        }
      `);
    });

    it('should generate elements with static attributes', () => {
      expect(transpile(`    
        @Template()
        function hello() {        
          <img src="picture.png"></img>
        }
      `)).toOutput(`
        import {ΘelementEnd, ΘelementStart} from "fw-x";
        function hello($renderContext) {
          ΘelementStart($renderContext, 0, "img", ["src", "picture.png"]);
          ΘelementEnd($renderContext, 0);
        }
      `);
    });

    it('should generate self-closing elements with static attributes', () => {
      expect(transpile(`    
        @Template()
        function hello() {        
          <img id="pic" src="picture.png"/>
        }
      `)).toOutput(`
        import {Θelement} from "fw-x";
        function hello($renderContext) {
          Θelement($renderContext, 0, "img", ["id", "pic", "src", "picture.png"]);
        }
      `);
    });

  });

});