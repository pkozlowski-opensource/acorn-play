const estraverse = require('estraverse');
const escodegen = require('escodegen');

const DecoratorTransform = require('./ast_transforms').DecoratorTransform;

const INSTRUCTIONS = {
  text: 'Θtext',
  elementStart: 'ΘelementStart',
  elementEnd: 'ΘelementEnd',
  element: 'Θelement',
};

function createImport(what, from) {
  const specifierNames = Array.from(what).sort();
  return {
    type: 'ImportDeclaration',
    specifiers: specifierNames.map((specifierName) => {
      const specifier = {type: 'Identifier', name: specifierName};
      return {
        type: 'ImportSpecifier',
        imported: specifier,
        local: specifier,
      };
    }),
    source: {type: 'Literal', value: from}
  };
}

function createInstruction(name, idx, args) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: name},
      arguments: [
        {type: 'Identifier', name: '$renderContext'},
        {type: 'Literal', value: idx}
      ].concat(args || [])
    }
  };
}

function createAttrsArray(attrs) {
  const attrElements = [];
  attrs.forEach((attr) => {
    attrElements.push({type: 'Literal', value: attr.name});
    attrElements.push({type: 'Literal', value: attr.value});
  });
  return {type: 'ArrayExpression', elements: attrElements};
}

function createElementInstruction(type, idx, tagName, attrs) {
  const instructionArgs = [{type: 'Literal', value: tagName}];
  if (attrs.length) {
    instructionArgs.push(createAttrsArray(attrs));
  }
  return createInstruction(type, idx, instructionArgs);
}

class CodeGenTransform {
  constructor() {
    this.instructionImports = new Set();
    this.instructionsCounter = 0;
    this.elementsStack = [];
  }

  enter(node, parent) {
    if (node.type === 'JshElementStart') {
      node.instructionIndex = this.visitor.instructionsCounter++;
      this.visitor.elementsStack.push(node);
      this.visitor.instructionImports.add(INSTRUCTIONS.elementStart);
      return createElementInstruction(
          INSTRUCTIONS.elementStart, node.instructionIndex, node.name,
          node.attributes);
    } else if (node.type === 'JshElementEnd') {
      const closedNode = this.visitor.elementsStack.pop();
      this.visitor.instructionImports.add(INSTRUCTIONS.elementEnd);
      return createInstruction(
          INSTRUCTIONS.elementEnd, closedNode.instructionIndex);
    } else if (node.type === 'JshElement') {
      this.visitor.instructionImports.add(INSTRUCTIONS.element);
      return createElementInstruction(
          INSTRUCTIONS.element, this.visitor.instructionsCounter++, node.name,
          node.attributes);
    } else if (node.type === 'FunctionDeclaration' && node.decorator) {
      node.params.unshift({type: 'Identifier', name: '$renderContext'});
      this.visitor.inTemplate = true;
      this.visitor.instructionsCounter = 0;
    } else if (node.type === 'ExpressionStatement') {
      if (this.visitor.inTemplate && node.expression.type === 'Literal') {
        this.visitor.instructionImports.add(INSTRUCTIONS.text);
        return createInstruction(
            INSTRUCTIONS.text, this.visitor.instructionsCounter++,
            [{type: 'Literal', value: node.expression.value}]);
      }
    }
  }

  leave(node, parent) {
    if (node.type === 'FunctionDeclaration' && node.decorator) {
      this.visitor.inTemplate = false;
    } else if (node.type === 'Program') {
      if (this.visitor.instructionImports.size) {
        node.body.unshift(
            createImport(this.visitor.instructionImports, 'fw-x'));
      }
    }
  }
}

function generate(ast) {
  const decoratedAst = estraverse.replace(ast, new DecoratorTransform());
  const instructionsAst =
      estraverse.replace(decoratedAst, new CodeGenTransform());
  return escodegen.generate(instructionsAst);
}

module.exports = {
  generate: generate
};