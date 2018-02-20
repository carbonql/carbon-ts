import * as babel from 'babel-core';
import { isExpression } from 'babel-types';
import { makeBoolValue, Expression, makeBlockExpression, makeLambdaExpression, Identifiers, makeIdentifier, Node, Nodes, makeReturnStmt, makeStringValue } from './ast';

export const parse = (text: string): Expression | null => {
  try {
    const result = babel.transform(text);
    return traverse(result.ast);
  } catch (e) {
    console.log(e);
  }

  return null;
}

const traverse = (n: babel.Node): Node => {
  if (!babel.types.isFile(n)) {
    throw new Error("Expected first element of AST to be of type 'File'")
  }

  console.log(JSON.stringify(n, null, "  "));

  const body = makeBlockExpression();
  n.program.body.forEach(e => {
    body.exprs.push(traverseHelper(e))
  });

  return body;
}

const traverseHelper = (n: babel.Node): Node => {
  switch (n.type) {
  case "ArrowFunctionExpression":
    {
      const af = <babel.types.ArrowFunctionExpression>n;
      if (af.async || af.generator) {
        throw new Error("Lambda function must not be async or a generator");
      }

      // Create params.
      const params: Identifiers = [];
      for (const param of af.params) {
        if (!babel.types.isIdentifier(param)) {
          throw new Error("Only simple function parameters permitted; cannot have varargs, assignments");
        }
        params.push(makeIdentifier(param.name));
      }

      // Create body.
      //
      // NOTE: The body of an arrow function is either a `BlockStatement` or an
      // `Expression`.
      const body: Nodes = [];
      if (babel.types.isBlockStatement(af.body)) {
        // NOTE: Lines in the body proven to have no side-effects and not assign
        // to a variable are in the `directives` member, and are safely ignored.
        for (const e of af.body.body) {
          body.push(traverseHelper(e));
        }
      } else {
        body.push(makeReturnStmt(traverseHelper(af.body)));
      }

      return makeLambdaExpression(params, ...body);
    }
  case "ExpressionStatement":
    {
      const es = <babel.types.ExpressionStatement>n;
      return traverseHelper(es.expression);
    }
  case "ReturnStatement":
    {
      const rs = <babel.types.ReturnStatement>n;
      return makeReturnStmt(traverseHelper(rs.argument));
    }
  case "StringLiteral":
    {
      const sl = <babel.types.StringLiteral>n;
      return makeStringValue(sl.value);
    }
  default:
    {
      throw new Error("Unrecognized node type: " + n.type);
    }
  }
}
