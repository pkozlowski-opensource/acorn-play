const acorn = require('acorn');
const parserPluginFactory = require('./parser').jshPluginFactory;

const parser = acorn.Parser.extend(parserPluginFactory());
const testHelper = require('./test_helper');

function test(name, src, expectedAst) {
  it(name, () => {
    const producedAst = parser.parse(src);
    const astIntersection =
        testHelper.objectIntersect(producedAst, expectedAst);
    expect(testHelper.isAstDifferent(expectedAst, producedAst))
        .toBeFalsy(
            `Expected:\n\n ${JSON.stringify(expectedAst, null, 2)} \n\nbut got:\n\n ${JSON.stringify(astIntersection, null, 2)}`);
  });
}

describe('parser', () => {

  beforeEach(function() {
    jasmine.addMatchers({
      toProduceAst: function(util, customEqualityTesters) {
        return {
          compare: function(src, expected) {
            const actual = parser.parse(src);
            const result = {};

            result.pass = !testHelper.isAstDifferent(expected, actual);
            if (result.pass) {
              result.message = `All good`;
            } else {
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
    });
  });

  describe('JS blocks', () => {

    it('should parse JS without tags nor decorators', () => {
      expect('let i = 0;').toProduceAst({
        body: [{type: 'VariableDeclaration'}]
      });
    });
  });

  describe('tags', () => {
    it('should parse element start', () => {
      expect('<a>').toProduceAst(
          {body: [{type: 'JshElementStart', name: 'a'}]});
    });

    it('should parse element end', () => {
      expect('</a>').toProduceAst({body: [{type: 'JshElementEnd', name: 'a'}]});
    });

    it('should parse element start followed by end without children', () => {
      expect('<a></a>').toProduceAst({
        'body': [
          {type: 'JshElementStart', name: 'a'},
          {type: 'JshElementEnd', name: 'a'}
        ]
      });
    });

    it('should parse nested elements', () => {
      expect('<a><b></b></a>').toProduceAst({
        'body': [
          {type: 'JshElementStart', name: 'a'},
          {type: 'JshElementStart', name: 'b'},
          {type: 'JshElementEnd', name: 'b'},
          {type: 'JshElementEnd', name: 'a'},
        ]
      });
    });

    it('should parse self-closing elements', () => {
      expect('<a/>').toProduceAst({body: [{type: 'JshElement', name: 'a'}]});
    });

    it('should parse element start where tag name is JS keyword', () => {
      expect('<if>').toProduceAst(
          {body: [{type: 'JshElementStart', name: 'if'}]});
    });

    it('should parse element start where tag name contains numbers', () => {
      expect('<h1>').toProduceAst(
          {body: [{type: 'JshElementStart', name: 'h1'}]});
    });

  });

  describe('attributes', () => {

    describe('without value', () => {

      it('should parse a single attribute without a value', () => {
        expect('<a href>').toProduceAst({
          body: [
            {
              type: 'JshElementStart',
              name: 'a',
              attributes: [{type: 'JshAttribute', name: 'href'}]
            },
          ]
        });
      });

      it('should parse multiple attributes without value', () => {
        expect('<a href checked>').toProduceAst({
          body: [
            {
              type: 'JshElementStart',
              name: 'a',
              attributes: [
                {type: 'JshAttribute', name: 'href'},
                {type: 'JshAttribute', name: 'checked'},
              ]
            },
          ]
        });
      });

      it('should parse attributes with JS keywords', () => {
        expect('<a if for>').toProduceAst({
          body: [
            {
              name: 'a',
              attributes: [
                {type: 'JshAttribute', name: 'if'},
                {type: 'JshAttribute', name: 'for'},
              ]
            },
          ]
        });
      });

      it('should parse a single attribute with []', () => {
        expect('<a [if]>').toProduceAst({
          body: [
            {
              name: 'a',
              attributes: [
                {type: 'JshAttribute', name: '[if]'},
              ]
            },
          ]
        });
      });

      it('should parse a single attribute with ()', () => {
        expect('<button (click)>').toProduceAst({
          body: [
            {
              name: 'button',
              attributes: [
                {type: 'JshAttribute', name: '(click)'},
              ]
            },
          ]
        });
      });

    });

    describe('with quoted values', () => {

      it('should parse single attribute with double-quoted value', () => {
        expect('<a href="http://go.com">').toProduceAst({
          body: [
            {
              type: 'JshElementStart',
              name: 'a',
              attributes: [
                {type: 'JshAttribute', name: 'href', value: 'http://go.com'}
              ]
            },
          ]
        });
      });

      it('should parse single attribute with single-quoted value', () => {
        expect(`<a href='http://go.com'>`).toProduceAst({
          body: [
            {
              type: 'JshElementStart',
              name: 'a',
              attributes: [
                {type: 'JshAttribute', name: 'href', value: 'http://go.com'}
              ]
            },
          ]
        });
      });

    });

    describe('with expression values', () => {

      it('should parse attribute with expression binding', () => {
        expect(`<a href={expr}>`).toProduceAst({
          body: [
            {
              type: 'JshElementStart',
              name: 'a',
              attributes: [{
                type: 'JshAttribute',
                name: 'href',
                value: {type: 'Identifier'}
              }]
            },
          ]
        });
      });
    });

  });

  describe('text nodes', () => {

    it('should parse standalone string expression statements', () => {
      expect('"Hello, World!"').toProduceAst({
        body: [{type: 'ExpressionStatement'}]
      });
    });

    it('should parse string expression statements between tags', () => {
      expect(`<h1>"Hello, World!"</h1>`).toProduceAst({
        body: [
          {type: 'JshElementStart'},
          {type: 'ExpressionStatement'},
          {type: 'JshElementEnd'},
        ]
      });
    });

    it('should parse string expression statements mixed with tags', () => {
      expect(`<h1>"Hello, "<b>"World!"</b></h1>`).toProduceAst({
        body: [
          {type: 'JshElementStart', name: 'h1'},
          {type: 'ExpressionStatement'},
          {type: 'JshElementStart', name: 'b'},
          {type: 'ExpressionStatement'},
          {type: 'JshElementEnd', name: 'b'},
          {type: 'JshElementEnd', name: 'h1'},
        ]
      });
    });
  });

  describe('decorators', () => {

    it('should parse CallExpression decorator', () => {
      expect('@Component()').toProduceAst({
        body: [{type: 'JshDecorator', name: 'Component', arguments: []}]
      });
    });

    it('should parse Identifier decorator', () => {
      expect('@Component').toProduceAst({
        body: [{type: 'JshDecorator', name: 'Component', arguments: []}]
      });
    });

    it('should parse CallExpression decorator with arguments', () => {
      expect('@Component({tag: "div"})').toProduceAst({
        body: [{
          type: 'JshDecorator',
          name: 'Component',
          arguments: [{type: 'ObjectExpression'}]
        }]
      });
    });

    it('should decorate template functions', () => {
      expect(`
        @Component()
        function sayHello(name) {
        }
      `).toProduceAst({
        body: [
          {type: 'JshDecorator', name: 'Component'},
          {type: 'FunctionDeclaration'}
        ]
      });
    });

  });

  describe('integration', () => {

    it('should parse tags and text nodes inside function declarations', () => {
      expect(`
        @Component()
        function sayHello(name) {
          <h1>"Hello, {{name}}"</h1>
        }
      `).toProduceAst({});
    });
  })

});


test('single event handler', `<button (click)='doSth()'>`, {
  body: [
    {
      type: 'JshElementStart',
      name: 'button',
      attributes: [{type: 'JshAttribute', name: '(click)', value: 'doSth()'}]
    },
  ]
});

test(
    'multiple event handlers with statements',
    `<button (click)='doSth(); doSthElse()' (keydown)="i++">`, {
      body: [
        {
          type: 'JshElementStart',
          name: 'button',
          attributes: [
            {
              type: 'JshAttribute',
              name: '(click)',
              value: 'doSth(); doSthElse()'
            },
            {type: 'JshAttribute', name: '(keydown)', value: 'i++'}
          ]
        },
      ]
    });


// attributes on self-closing elements
test('self-closing elements', '<a href="http://go.com"/>', {
  'body': [
    {
      type: 'JshElement',
      name: 'a',
      attributes:
          [{type: 'JshAttribute', name: 'href', value: 'http://go.com'}]
    },
  ]
});

// elements and JS blocks mix
test('element inside JS block', 'if (true) { <div></div> }', {
  'body': [{
    type: 'IfStatement',
    consequent: {
      type: 'BlockStatement',
      body: [
        {type: 'JshElementStart', name: 'div'},
        {type: 'JshElementEnd', name: 'div'}
      ]
    }
  }]
});

test('element next to JS block', 'if (true) {} <div></div> if (false) {}', {
  'body': [
    {type: 'IfStatement'},
    {type: 'JshElementStart', name: 'div'},
    {type: 'JshElementEnd', name: 'div'},
    {type: 'IfStatement'},
  ]
});

test('JS blocks inside element', '<a>let a = 1;</a>', {
  'body': [
    {type: 'JshElementStart', name: 'a'},
    {type: 'VariableDeclaration'},
    {type: 'JshElementEnd', name: 'a'},
  ]
});

// components
test('tag names indicating components', '<$cmpt></$cmpt>', {
  'body': [
    {type: 'JshElementStart', name: '$cmpt'},
    {type: 'JshElementEnd', name: '$cmpt'},
  ]
});

test('self-closing tag names indicating components', '<$cmpt/>', {
  'body': [
    {type: 'JshElement', name: '$cmpt'},
  ]
});

test('attributes on self-closing components', '<$cmpt do="good"/>', {
  'body': [
    {
      type: 'JshElement',
      name: '$cmpt',
      attributes: [{type: 'JshAttribute', name: 'do', value: 'good'}]
    },
  ]
});

// tests to write:
// <a ""> - rubbish in the attribute name place
// </*&$$ - rubbish after </
// </a attr - attribute after </