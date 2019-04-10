const escodegen = require('escodegen');

function generate(ast) {
  return escodegen.generate(ast);
}

module.exports = {
  generate: generate
};