const acorn = require('acorn');
const parserPluginFactory = require('./parser').jshPluginFactory;

const parser = acorn.Parser.extend(parserPluginFactory());

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

function test(name, src, expectedAst) {
  it(name, () => {
    const producedAst = parser.parse(src);
    expect(isAstDifferent(expectedAst, producedAst))
        .toBeFalsy(
            `Expected:\n\n ${JSON.stringify(expectedAst, null, 2)} \n\nbut got:\n\n ${JSON.stringify(producedAst, null, 2)}`);
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

            result.pass = !isAstDifferent(expected, actual);
            if (result.pass) {
              result.message = `All good`;
            } else {
              result.message =
                  `Expected:\n\n ${JSON.stringify(expected, null, 2)} \n\nbut got:\n\n ${JSON.stringify(actual, null, 2)}`;
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

});

// attributes - without value
test('single attribute without value', '<a href>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'href'}]
    },
  ]
});

test('multiple attributes without value', '<a href checked>', {
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

test('single attribute being a keyword', '<a if>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'if'}]
    },
  ]
});

test('single attribute with []', '<a [if]>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: '[if]'}]
    },
  ]
});

test('single attribute with ()', '<a (click)>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: '(click)'}]
    },
  ]
});

// attributes - with double quoted value
test('single attribute with quoted value', '<a href="http://go.com">', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes:
          [{type: 'JshAttribute', name: 'href', value: 'http://go.com'}]
    },
  ]
});

// attributes - with single quoted value
test('single attribute without value', `<a href='http://go.com'>`, {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes:
          [{type: 'JshAttribute', name: 'href', value: 'http://go.com'}]
    },
  ]
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

// attributes - with expression bindings
test('single attribute without value', `<a href={expr}>`, {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes:
          [{type: 'JshAttribute', name: 'href', value: {type: 'Identifier'}}]
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
// <a ""> - rubish in the attribute name place
// </*&$$ - rubbish after </
// </a attr - attribute after </