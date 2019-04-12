const estraverse = require('estraverse');
const escodegen = require('escodegen');

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

class DecoratorsTransform {
  constructor() {
    this.instructionImports = new Set();
    this.instructionsCounter = 0;
    this.elementsStack = [];
  }

  enter(node, parent) {
    if (node.type === 'JshDecorator') {
      this.decorator = node;
      return estraverse.VisitorOption.Remove;
    } else if (node.type === 'JshElementStart') {
      node.instructionIndex = this.visitor.instructionsCounter++;
      this.visitor.elementsStack.push(node);
      this.visitor.instructionImports.add(INSTRUCTIONS.elementStart);
      return createInstruction(
          INSTRUCTIONS.elementStart, node.instructionIndex, [
            {type: 'Literal', value: node.name},
          ]);
    } else if (node.type === 'JshElementEnd') {
      const closedNode = this.visitor.elementsStack.pop();
      this.visitor.instructionImports.add(INSTRUCTIONS.elementEnd);
      return createInstruction(
          INSTRUCTIONS.elementEnd, closedNode.instructionIndex);
    } else if (node.type === 'JshElement') {
      this.visitor.instructionImports.add(INSTRUCTIONS.element);
      return createInstruction(
          INSTRUCTIONS.element, this.visitor.instructionsCounter++, [
            {type: 'Literal', value: node.name},
          ]);
    } else if (node.type === 'FunctionDeclaration') {
      if (this.decorator) {
        node.params.unshift({type: 'Identifier', name: '$renderContext'});
        node.decorator = this.decorator;
        this.inTemplate = true;
        this.visitor.instructionsCounter = 0;
      }
    } else if (node.type === 'ExpressionStatement') {
      if (this.inTemplate && node.expression.type === 'Literal') {
        this.visitor.instructionImports.add(INSTRUCTIONS.text);
        return createInstruction(
            INSTRUCTIONS.text, this.visitor.instructionsCounter++,
            [{type: 'Literal', value: node.expression.value}]);
      }
    }
  }

  leave(node, parent) {
    if (node.type === 'FunctionDeclaration') {
      if (node.decorator) {
        this.inTemplate = false;
      }
    } else if (node.type === 'Program') {
      if (this.visitor.instructionImports.size) {
        node.body.unshift(
            createImport(this.visitor.instructionImports, 'fw-x'));
      }
    }
  }
}

function generate(ast) {
  const newAst = estraverse.replace(ast, new DecoratorsTransform());
  return escodegen.generate(newAst);
}

module.exports = {
  generate: generate
};