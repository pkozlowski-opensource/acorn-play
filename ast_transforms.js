const estraverse = require('estraverse');

class DecoratorTransform {
  constructor() { this.decorator = null; }

  enter(node, parent) {
    if (node.type === 'JshDecorator') {
      this.visitor.decorator = node;
      return estraverse.VisitorOption.Remove;
    } else if (node.type === 'FunctionDeclaration') {
      if (this.visitor.decorator) {
        node.decorator = this.visitor.decorator;
        this.visitor.decorator = null;
      }
    }
  }

  fallback(node) { return node; }
}

module.exports = {
  DecoratorTransform: DecoratorTransform
};