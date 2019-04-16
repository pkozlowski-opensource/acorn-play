const acorn = require('acorn');
const estraverse = require('estraverse');

const parserPluginFactory = require('./parser').jshPluginFactory;
const DecoratorTransform = require('./ast_transforms').DecoratorTransform;

const toProduceAstMatcher = require('./test_matchers').toProduceAstMatcher;

function parse(src) {
  const parser = acorn.Parser.extend(parserPluginFactory());
  const ast = estraverse.replace(parser.parse(src), new DecoratorTransform());
  return ast;
}


describe('decorator', () => {

  beforeEach(function() {
    jasmine.addMatchers({toProduceAst: toProduceAstMatcher});
  });

  it('should add decorator to the FunctionDeclaration', () => {
    expect(parse(`
      @Template()
      function tpl() {}
    `)).toProduceAst({
      'body': [{
        type: 'FunctionDeclaration',
        id: {name: 'tpl'},
        decorator: {
          'type': 'JshDecorator',
          'name': 'Template',
          'arguments': [],
        }
      }]
    });
  });
});