const testing = require('./testing');
const test = testing.test;
const ftest = testing.ftest;
const run = testing.run;

// JS blocks
test('should parse JS', 'let i = 0;', {body: [{type: 'VariableDeclaration'}]});

// elements
test('element start', '<a>', {'body': [{type: 'JshElementStart', name: 'a'}]});
test(
    'keyword as a tag name', '<if>',
    {'body': [{type: 'JshElementStart', name: 'if'}]});

test('element end', '</a>', {'body': [{type: 'JshElementEnd', name: 'a'}]});

test('element without children', '<a></a>', {
  'body': [
    {type: 'JshElementStart', name: 'a'}, {type: 'JshElementEnd', name: 'a'}
  ]
});

test('nested elements', '<a><b></b></a>', {
  'body': [
    {type: 'JshElementStart', name: 'a'},
    {type: 'JshElementStart', name: 'b'},
    {type: 'JshElementEnd', name: 'b'},
    {type: 'JshElementEnd', name: 'a'},
  ]
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

test('single attribute with []', '<a (click)>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: '(click)'}]
    },
  ]
});

// attributes - with unquoted value
test('single attribute with unquoted value', '<a id=some>', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'id', value: 'some'}]
    },
  ]
});

// attributes - with double quoted value
test('single attribute with quoted value', '<a href="http://go.com">', {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'href', value: 'http://go.com'}]
    },
  ]
});

// attributes - with single quoted value
test('single attribute without value', `<a href='http://go.com'>`, {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'href', value: 'http://go.com'}]
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

// attributes - with expression bindings 
test('single attribute without value', `<a href={expr}>`, {
  body: [
    {
      type: 'JshElementStart',
      name: 'a',
      attributes: [{type: 'JshAttribute', name: 'href', value: {type: 'Identifier'}}]
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
})

// tests to write:
// <a/> - self closing element
// <a href/> - attrs on self closing element
// <a ""> - rubish in the attribute name place
// < - standalone <
// </*&$$ - rubbish after </
// </a attr - attribute after </

run();