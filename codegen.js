const estraverse = require('estraverse');
const escodegen = require('escodegen');

const INSTRUCTIONS = {
  text: 'Θtext',
  elementStart: 'ΘelementStart',
  elementEnd: 'ΘelementEnd'
};

function instruction(name, args) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {type: 'Identifier', name: name},
      arguments: args
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
      return instruction(INSTRUCTIONS.elementStart, [
        {type: 'Literal', value: node.instructionIndex},
        {type: 'Literal', value: node.name},
      ]);
    } else if (node.type === 'JshElementEnd') {
      const closedNode = this.visitor.elementsStack.pop();
      this.visitor.instructionImports.add(INSTRUCTIONS.elementEnd);
      return instruction(INSTRUCTIONS.elementEnd, [
        {type: 'Literal', value: closedNode.instructionIndex},
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
        return instruction(INSTRUCTIONS.text, [
          {type: 'Literal', value: this.visitor.instructionsCounter++},
          {type: 'Literal', value: node.expression.value}
        ]);
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
        const instructionsToImport = [];
        this.visitor.instructionImports.forEach((instruction) => {
          const specifier = {type: 'Identifier', name: instruction};
          instructionsToImport.push({
            type: 'ImportSpecifier',
            imported: specifier,
            local: specifier,
          });
        });

        node.body.unshift({
          type: 'ImportDeclaration',
          specifiers: instructionsToImport,
          source: {type: 'Literal', value: 'fw-x'}
        });
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