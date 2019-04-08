const Parser = require('acorn').Parser;
const escodegen = require('escodegen');

const ast = Parser.parse('function foo() {}');

console.log(escodegen.generate(ast));
