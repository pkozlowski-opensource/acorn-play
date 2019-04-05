const acorn = require('acorn');

const TokContext = acorn.TokContext;
const TokenType = acorn.TokenType;
const tt = acorn.tokTypes;

const tc_oTag = new TokContext('<tag', false);
const tc_cTag = new TokContext('</tag', false);

const jshTokens = {
  jshName: new TokenType('jshName'),
  jshTagStart: new TokenType('jshTagStart'),
  jshTagEnd: new TokenType('jshTagEnd')
};

jshTokens.jshTagStart.updateContext = function() {
  this.context.push(tc_oTag);  // start opening tag context
  this.exprAllowed = false;
};

jshTokens.jshTagEnd.updateContext = function() {
  this.context.pop();
};

function isJshNameStart(ch) {
  // A-Z || a-z || [ || ( || $
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 91 || ch === 40 || ch === 36;
}

function isJshNamePart(ch) {  
  // isJshNameStart || ] || )
  return isJshNameStart(ch) || ch === 93 || ch === 41;
}


function jshPlugin(options, Parser) {
  return class JshParser extends Parser {
    _parseAttribute() {
      let node = this.startNode();

      // attribute name      
      node.name = this.value;
      this.expect(jshTokens.jshName);

      // attribute value
      if (this.eat(tt.eq)) {
        if (this.type === tt.string || this.type === jshTokens.jshName) {
          node.value = this.value;
          this.eat(jshTokens.jshName) || this.eat(tt.string);
        } else if (this.type === tt.braceL) {
          this.expect(tt.braceL);
          node.value = this.parseExpression();
          this.expect(tt.braceR);
        } else {
          this.unexpected();
        }        
      }

      return this.finishNode(node, 'JshAttribute');
    }

    _parseElementStartEnd() {
      let startPos = this.start;
      let startLoc = this.startLoc;
      let node = this.startNodeAt(startPos, startLoc);

      this.expect(jshTokens.jshTagStart);  // <
      if (this.type === jshTokens.jshName) {
        node.name = this.value;
        node.attributes = [];
        this.next();  // tag name

        // attributes
        while (this.type !== jshTokens.jshTagEnd && this.type !== tt.slash) {
          node.attributes.push(this._parseAttribute());
        }

        // is self-closing?
        if (this.type === tt.slash) {
          this.expect(tt.slash);             // /
          this.expect(jshTokens.jshTagEnd);  // >
          return this.finishNode(node, 'JshElement');
        } else {
          this.expect(jshTokens.jshTagEnd);  // >
          return this.finishNode(node, 'JshElementStart');
        }

      } else if (this.type === tt.slash) {
        this.next();  // skip /
        node.name = this.value;
        this.next();                       // tag name
        this.expect(jshTokens.jshTagEnd);  // >
        return this.finishNode(node, 'JshElementEnd');
      }
    }

    _readJshName() {
      let ch, start = this.pos;
      do {
        ch = this.input.charCodeAt(++this.pos);
      } while (isJshNamePart(ch));

      return this.finishToken(
          jshTokens.jshName, this.input.slice(start, this.pos));
    }

    readToken(code) {
      let context = this.curContext();
      if (!context.isExpr) {
        let ch = this.input.charCodeAt(this.pos);
        if (ch === 60) {  // <
          ++this.pos;
          return this.finishToken(jshTokens.jshTagStart);
        }

        if (context === tc_oTag || context === tc_cTag) {
          if (isJshNameStart(code)) {  // <a
            return this._readJshName();
          } else if (code == 62) {  // </a
            ++this.pos;
            return this.finishToken(jshTokens.jshTagEnd);
          } else {  // <|rubbish|
            // this.unexpected();
          }
        }
      }
      return super.readToken(code);
    }

    parseStatement(context, topLevel, exportss) {
      if (this.type === jshTokens.jshTagStart) {
        return this._parseElementStartEnd();
      }
      return super.parseStatement(context, topLevel, exportss);
    }

    updateContext(prevType) {
      if (prevType === jshTokens.jshTagStart && this.type === tt.slash) {
        this.context.pop();         // pop open tag context
        this.context.push(tc_cTag); // push close tag context
      }

      return super.updateContext(prevType);
    }
  }
}

function jshPluginFactory(options) {
  return function(Parser) { return jshPlugin({}, Parser); }
}

module.exports = {
  jshPluginFactory: jshPluginFactory
}