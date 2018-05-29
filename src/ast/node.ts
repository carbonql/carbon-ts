//
// Core interfaces.
//
// The main constituents of the VM for our expression DSL. Captured is a notion
// of expressions, statements, block expressions, and primtive values.
//

export type NodeType =
    IntValueType
  | StringValueType
  | BoolValueType
  | ObjectValueType
  | IdentifierType
  | IndexExpressionType
  | VariableDeclarationStmtType
  | ReturnStmtType
  | BlockExpressionType
  | LambdaExpressionType
  | ApplyExpressionType
  | ConditionalExpressionType;

export type IntValueType                = "IntValue"
export type StringValueType             = "StringValue"
export type BoolValueType               = "BoolValue"
export type ObjectValueType             = "ObjectValue"
export type IdentifierType              = "Identifier"
export type IndexExpressionType         = "IndexExpression"
export type VariableDeclarationStmtType = "VariableDeclarationStmt"
export type ReturnStmtType              = "ReturnStmt"
export type BlockExpressionType         = "BlockExpression"
export type LambdaExpressionType        = "LambdaExpression"
export type ApplyExpressionType         = "ApplyExpression"
export type ConditionalExpressionType   = "ConditionalExpression"

export interface Node {
  readonly type: NodeType;
}

export interface Expression extends Node {}

export interface Block extends Node {}

export interface Statement extends Node {}

export type Nodes = Node[];

export type Expressions = Expression[];

//
// Primitive values.
//

export interface IntValue extends Expression {
  readonly type: IntValueType;
  readonly value: number;
}

export const makeIntValue = (i: number): IntValue => {
	return {type: "IntValue", value: i};
}

export interface StringValue extends Expression {
  readonly value: string;
}

export const makeStringValue = (s: string): StringValue => {
	return {type: "StringValue", value: s};
}

export interface BoolValue extends Expression {
  readonly value: boolean;
}

export const makeBoolValue = (b: boolean): BoolValue => {
	return {type: "BoolValue", value: b};
}

//
// Object.
//

export interface ObjectValue extends Expression {
  readonly value: { [key: string]: Expression };
}

export const makeObjectValue = (o: { [key: string]: Expression }): ObjectValue => {
	return {type: "ObjectValue", value: o};
}

//
// Identifier.
//

export interface Identifier extends Expression {
  readonly name: string;
}

export type Identifiers = Identifier[];

export const makeIdentifier = (name: string): Identifier => {
	return {type: "Identifier", name: name};
}

//
// Index expression.
//

export interface IndexExpression extends Expression {
  readonly target: Expression;
  readonly index: Identifier;
}

export const makeIndexExpr = (target: Expression, index: string): IndexExpression => {
	return {type: "IndexExpression", target: target, index: makeIdentifier(index)};
}

//
// Variable declaration statement.
//

export interface VariableDeclarationStmt extends Statement {
  readonly id:            Identifier;
  readonly rightHandSide: Expression;
}

export const makeVariableDeclarationStatement = (name: string, rhs: Expression): VariableDeclarationStmt => {
	return {type: "VariableDeclarationStmt", id: makeIdentifier(name), rightHandSide: rhs};
}

//
// Return statement.
//

export interface ReturnStmt extends Statement {
  readonly expr: Expression;
}

export const makeReturnStmt = (expr: Expression): ReturnStmt => {
	return {type: "ReturnStmt", expr: expr};
}

//
// Block expression.
//

export interface BlockExpression extends Block {
  readonly exprs: Nodes;
}

export const makeBlockExpression = (...exprs: Nodes): BlockExpression => {
	return {type: "BlockExpression", exprs: exprs};
}

//
// Lambda expression.
//

export interface LambdaExpression extends Expression {
  readonly params: Identifiers;
  readonly body:   BlockExpression;
}

export const makeLambdaExpression = (params: Identifiers, ...body: Nodes): LambdaExpression => {
	return {type: "LambdaExpression", params: params, body: makeBlockExpression(...body)};
}

//
// Apply expression.
//

export interface ApplyExpression extends Expression {
  readonly target:    Expression;
  readonly arguments: Expressions;
}

export const makeApplyExpression = (target: Expression, args: Expressions): ApplyExpression => {
	return {type: "ApplyExpression", target: target, arguments: args};
}

//
// Conditional expression.
//

export interface ConditionalExpression extends Block {
  readonly predicate: Expression;
  readonly ifTrue:    BlockExpression;
  readonly ifFalse:   BlockExpression;
}

export const makeConditionalExpression = (
  predicate: Expression, ifTrue: BlockExpression, ifFalse: BlockExpression
): ConditionalExpression => {
	return {type: "ConditionalExpression", predicate: predicate, ifTrue: ifTrue, ifFalse: ifFalse};
}
