
// Overload:function(start, count)
// Overload:function(start, count, step)
export const range = (
  start: number, count: number, step: number = 1,
): IEnumerable<number> => {
  return new EnumerableBase(function () {
    var value: number = 0;
    var index = 0;

    return new EnumeratorBase(
      function () { value = start - step; },
      function (this: any) {
        return (index++ < count)
            ? this.yieldReturn(value += step)
            : this.yieldBreak();
      },
      Functions.Blank);
  });
};

// export var Utils: {
//   createLambda(expression: any): (...params: any[]) => any;
//   createEnumerable<T>(getEnumerator: () => IEnumerator<T>): IEnumerable<T>;
//   createEnumerator<T>(initialize: () => void, tryGetNext: () => boolean, dispose: () => void): IEnumerator<T>;
//   extendTo(type: any): void;
// };
// export function choice<T>(...params: T[]): IEnumerable<T>;
// export function cycle<T>(...params: T[]): IEnumerable<T>;
// export function empty<T>(): IEnumerable<T>;
// // from<T>, obj as JScript's IEnumerable or WinMD IIterable<T> is IEnumerable<T> but it can't define.
// export function from(): IEnumerable<any>; // empty
// export function from<T>(obj: IEnumerable<T>): IEnumerable<T>;
// export function from(obj: number): IEnumerable<number>;
// export function from(obj: boolean): IEnumerable<boolean>;
// export function from(obj: string): IEnumerable<string>;
// export function from<T>(obj: T[]): IEnumerable<T>;
// export function from<T>(obj: { length: number;[x: number]: T; }): IEnumerable<T>;
// export function from(obj: any): IEnumerable<{ key: string; value: any }>;
// export function make<T>(element: T): IEnumerable<T>;
// export function matches<T>(input: string, pattern: RegExp): IEnumerable<T>;
// export function matches<T>(input: string, pattern: string, flags?: string): IEnumerable<T>;
// export function range(start: number, count: number, step?: number): IEnumerable<number>;
// export function rangeDown(start: number, count: number, step?: number): IEnumerable<number>;
// export function rangeTo(start: number, to: number, step?: number): IEnumerable<number>;
// export function repeat<T>(element: T, count?: number): IEnumerable<T>;
// export function repeatWithFinalize<T>(initializer: () => T, finalizer: (element: T) => void): IEnumerable<T>;
// export function generate<T>(func: () => T, count?: number): IEnumerable<T>;
// export function toInfinity(start?: number, step?: number): IEnumerable<number>;
// export function toNegativeInfinity(start?: number, step?: number): IEnumerable<number>;
// export function unfold<T>(seed: T, func: (value: T) => T): IEnumerable<T>;
// export function defer<T>(enumerableFactory: () => IEnumerable<T>): IEnumerable<T>;

type WherePredicate<T> = (element: T, index: number) => boolean;
type Selector<T, TResult> = (element: T, index: number) => TResult;
type ForEachAction<T> = (element: T, index: number) => void | boolean;

export interface IEnumerable<T> {
  getEnumerator(): IEnumerator<T>;

  // Extension Methods
  // traverseBreadthFirst(childrenSelector: (element: T) => IEnumerable<T>): IEnumerable<T>;
  // traverseBreadthFirst<TResult>(childrenSelector: (element: T) => IEnumerable<T>, resultSelector: (element: T, nestLevel: number) => TResult): IEnumerable<TResult>;
  // traverseDepthFirst<TResult>(childrenSelector: (element: T) => IEnumerable<T>): IEnumerable<T>;
  // traverseDepthFirst<TResult>(childrenSelector: (element: T) => IEnumerable<T>, resultSelector?: (element: T, nestLevel: number) => TResult): IEnumerable<TResult>;
  // flatten(): IEnumerable<any>;
  // pairwise<TResult>(selector: (prev: T, current: T) => TResult): IEnumerable<TResult>;
  // scan(func: (prev: T, current: T) => T): IEnumerable<T>;
  // scan<TAccumulate>(seed: TAccumulate, func: (prev: TAccumulate, current: T) => TAccumulate): IEnumerable<TAccumulate>;
  select<TResult>(selector: Selector<T, TResult>): IEnumerable<TResult>;
  // selectMany<TOther>(collectionSelector: (element: T, index: number) => IEnumerable<TOther>): IEnumerable<TOther>;
  // selectMany<TCollection, TResult>(collectionSelector: (element: T, index: number) => IEnumerable<TCollection>, resultSelector: (outer: T, inner: TCollection) => TResult): IEnumerable<TResult>;
  // selectMany<TOther>(collectionSelector: (element: T, index: number) => TOther[]): IEnumerable<TOther>;
  // selectMany<TCollection, TResult>(collectionSelector: (element: T, index: number) => TCollection[], resultSelector: (outer: T, inner: TCollection) => TResult): IEnumerable<TResult>;
  // selectMany<TOther>(collectionSelector: (element: T, index: number) => { length: number;[x: number]: TOther; }): IEnumerable<TOther>;
  // selectMany<TCollection, TResult>(collectionSelector: (element: T, index: number) => { length: number;[x: number]: TCollection; }, resultSelector: (outer: T, inner: TCollection) => TResult): IEnumerable<TResult>;
  where(predicate: WherePredicate<T>): IEnumerable<T>;
  // choose(selector: (element: T, index: number) => T): IEnumerable<T>;
  // ofType<TResult>(type: any): IEnumerable<TResult>;
  // zip<TResult>(second: IEnumerable<T>, resultSelector: (first: T, second: T, index: number) => TResult): IEnumerable<TResult>;
  // zip<TResult>(second: { length: number;[x: number]: T; }, resultSelector: (first: T, second: T, index: number) => TResult): IEnumerable<TResult>;
  // zip<TResult>(second: T[], resultSelector: (first: T, second: T, index: number) => TResult): IEnumerable<TResult>;
  // zip<TResult>(...params: any[]): IEnumerable<TResult>; // last one is selector
  // merge<TResult>(...params: IEnumerable<T>[]): IEnumerable<T>;
  // merge<TResult>(...params: { length: number;[x: number]: T; }[]): IEnumerable<T>;
  // merge<TResult>(...params: T[][]): IEnumerable<T>;
  // join<TInner, TKey, TResult>(inner: IEnumerable<TInner>, outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // join<TInner, TKey, TResult>(inner: { length: number;[x: number]: TInner; }, outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // join<TInner, TKey, TResult>(inner: TInner[], outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // groupJoin<TInner, TKey, TResult>(inner: IEnumerable<TInner>, outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // groupJoin<TInner, TKey, TResult>(inner: { length: number;[x: number]: TInner; }, outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // groupJoin<TInner, TKey, TResult>(inner: TInner[], outerKeySelector: (outer: T) => TKey, innerKeySelector: (inner: TInner) => TKey, resultSelector: (outer: T, inner: TInner) => TResult, compareSelector?: (obj: T) => TKey): IEnumerable<TResult>;
  // all(predicate: (element: T) => boolean): boolean;
  // any(predicate?: (element: T) => boolean): boolean;
  // isEmpty(): boolean;
  // concat(...sequences: IEnumerable<T>[]): IEnumerable<T>;
  // concat(...sequences: { length: number;[x: number]: T; }[]): IEnumerable<T>;
  // concat(...sequences: T[]): IEnumerable<T>;
  // insert(index: number, second: IEnumerable<T>): IEnumerable<T>;
  // insert(index: number, second: { length: number;[x: number]: T; }): IEnumerable<T>;
  // alternate(alternateValue: T): IEnumerable<T>;
  // alternate(alternateSequence: { length: number;[x: number]: T; }): IEnumerable<T>;
  // alternate(alternateSequence: IEnumerable<T>): IEnumerable<T>;
  // alternate(alternateSequence: T[]): IEnumerable<T>;
  // contains(value: T): boolean;
  // contains<TCompare>(value: T, compareSelector?: (element: T) => TCompare): boolean;
  // defaultIfEmpty(defaultValue?: T): IEnumerable<T>;
  // distinct(): IEnumerable<T>;
  // distinct<TCompare>(compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // distinctUntilChanged(): IEnumerable<T>;
  // distinctUntilChanged<TCompare>(compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // except(second: { length: number;[x: number]: T; }): IEnumerable<T>;
  // except<TCompare>(second: { length: number;[x: number]: T; }, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // except(second: IEnumerable<T>): IEnumerable<T>;
  // except<TCompare>(second: IEnumerable<T>, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // except(second: T[]): IEnumerable<T>;
  // except<TCompare>(second: T[], compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // intersect(second: { length: number;[x: number]: T; }): IEnumerable<T>;
  // intersect<TCompare>(second: { length: number;[x: number]: T; }, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // intersect(second: IEnumerable<T>): IEnumerable<T>;
  // intersect<TCompare>(second: IEnumerable<T>, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // intersect(second: T[]): IEnumerable<T>;
  // intersect<TCompare>(second: T[], compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // union(second: { length: number;[x: number]: T; }): IEnumerable<T>;
  // union<TCompare>(second: { length: number;[x: number]: T; }, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // union(second: IEnumerable<T>): IEnumerable<T>;
  // union<TCompare>(second: IEnumerable<T>, compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // union(second: T[]): IEnumerable<T>;
  // union<TCompare>(second: T[], compareSelector: (element: T) => TCompare): IEnumerable<T>;
  // sequenceEqual(second: { length: number;[x: number]: T; }): boolean;
  // sequenceEqual<TCompare>(second: { length: number;[x: number]: T; }, compareSelector: (element: T) => TCompare): boolean;
  // sequenceEqual(second: IEnumerable<T>): boolean;
  // sequenceEqual<TCompare>(second: IEnumerable<T>, compareSelector: (element: T) => TCompare): boolean;
  // sequenceEqual(second: T[]): boolean;
  // sequenceEqual<TCompare>(second: T[], compareSelector: (element: T) => TCompare): boolean;
  // orderBy<TKey>(keySelector: (element: T) => TKey): IOrderedEnumerable<T>;
  // orderByDescending<TKey>(keySelector: (element: T) => TKey): IOrderedEnumerable<T>;
  // reverse(): IEnumerable<T>;
  // shuffle(): IEnumerable<T>;
  // weightedSample(weightSelector: (element: T) => number): IEnumerable<T>;
  // groupBy<TKey>(keySelector: (element: T) => TKey): IEnumerable<IGrouping<TKey, T>>;
  // groupBy<TKey, TElement>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement): IEnumerable<IGrouping<TKey, TElement>>;
  // groupBy<TKey, TElement, TResult>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, resultSelector: (key: TKey, element: IEnumerable<TElement>) => TResult): IEnumerable<TResult>;
  // groupBy<TKey, TElement, TResult, TCompare>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, resultSelector: (key: TKey, element: IEnumerable<TElement>) => TResult, compareSelector: (element: T) => TCompare): IEnumerable<TResult>;
  // // :IEnumerable<IGrouping<TKey, T>>
  // partitionBy<TKey>(keySelector: (element: T) => TKey): IEnumerable<IGrouping<TKey, any>>;
  // // :IEnumerable<IGrouping<TKey, TElement>>
  // partitionBy<TKey, TElement>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement): IEnumerable<IGrouping<TKey, TElement>>;
  // partitionBy<TKey, TElement, TResult>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, resultSelector: (key: TKey, element: IEnumerable<TElement>) => TResult): IEnumerable<TResult>;
  // partitionBy<TKey, TElement, TResult, TCompare>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, resultSelector: (key: TKey, element: IEnumerable<TElement>) => TResult, compareSelector: (element: T) => TCompare): IEnumerable<TResult>;
  // buffer(count: number): IEnumerable<T>;
  // aggregate(func: (prev: T, current: T) => T): T;
  // aggregate<TAccumulate>(seed: TAccumulate, func: (prev: TAccumulate, current: T) => TAccumulate): TAccumulate;
  // aggregate<TAccumulate, TResult>(seed: TAccumulate, func: (prev: TAccumulate, current: T) => TAccumulate, resultSelector: (last: TAccumulate) => TResult): TResult;
  // average(selector?: (element: T) => number): number;
  // count(predicate?: (element: T, index: number) => boolean): number;
  // max(selector?: (element: T) => number): number;
  // min(selector?: (element: T) => number): number;
  // maxBy<TKey>(keySelector: (element: T) => TKey): T;
  // minBy<TKey>(keySelector: (element: T) => TKey): T;
  // sum(selector?: (element: T) => number): number;
  // elementAt(index: number): T;
  // elementAtOrDefault(index: number, defaultValue?: T): T;
  // first(predicate?: (element: T, index: number) => boolean): T;
  // firstOrDefault(predicate?: (element: T, index: number) => boolean, defaultValue?: T): T;
  // last(predicate?: (element: T, index: number) => boolean): T;
  // lastOrDefault(predicate?: (element: T, index: number) => boolean, defaultValue?: T): T;
  // single(predicate?: (element: T, index: number) => boolean): T;
  // singleOrDefault(predicate?: (element: T, index: number) => boolean, defaultValue?: T): T;
  // skip(count: number): IEnumerable<T>;
  // skipWhile(predicate: (element: T, index: number) => boolean): IEnumerable<T>;
  // take(count: number): IEnumerable<T>;
  // takeWhile(predicate: (element: T, index: number) => boolean): IEnumerable<T>;
  // takeExceptLast(count?: number): IEnumerable<T>;
  // takeFromLast(count: number): IEnumerable<T>;
  // indexOf(item: T): number;
  // indexOf(predicate: (element: T, index: number) => boolean): number;
  // lastIndexOf(item: T): number;
  // lastIndexOf(predicate: (element: T, index: number) => boolean): number;
  // asEnumerable(): IEnumerable<T>;
  // cast<TResult>(): IEnumerable<TResult>;
  toArray(): T[];
  // toLookup<TKey>(keySelector: (element: T) => TKey): ILookup<TKey, T>;
  // toLookup<TKey, TElement>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement): ILookup<TKey, TElement>;
  // toLookup<TKey, TElement, TCompare>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, compareSelector: (key: TKey) => TCompare): ILookup<TKey, TElement>;
  // toObject(keySelector: (element: T) => any, elementSelector?: (element: T) => any): Object;
  // // :IDictionary<TKey, T>
  // toDictionary<TKey>(keySelector: (element: T) => TKey): IDictionary<TKey, any>;
  // toDictionary<TKey, TValue>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TValue): IDictionary<TKey, TValue>;
  // toDictionary<TKey, TValue, TCompare>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TValue, compareSelector: (key: TKey) => TCompare): IDictionary<TKey, TValue>;
  // toJSONString(replacer: (key: string, value: any) => any): string;
  // toJSONString(replacer: any[]): string;
  // toJSONString(replacer: (key: string, value: any) => any, space: any): string;
  // toJSONString(replacer: any[], space: any): string;
  // toJoinedString(separator?: string): string;
  // toJoinedString<TResult>(separator: string, selector: (element: T, index: number) => TResult): string;
  // doAction(action: (element: T, index: number) => void): IEnumerable<T>;
  // doAction(action: (element: T, index: number) => boolean): IEnumerable<T>;
  forEach(action: ForEachAction<T>): void;
  // forEach(action: (element: T, index: number) => boolean): void;

  // write(separator?: string): void;
  // write<TResult>(separator: string, selector: (element: T) => TResult): void;
  // writeLine(): void;
  // writeLine<TResult>(selector: (element: T) => TResult): void;
  // force(): void;
  // letBind<TResult>(func: (source: IEnumerable<T>) => { length: number;[x: number]: TResult; }): IEnumerable<TResult>;
  // letBind<TResult>(func: (source: IEnumerable<T>) => TResult[]): IEnumerable<TResult>;
  // letBind<TResult>(func: (source: IEnumerable<T>) => IEnumerable<TResult>): IEnumerable<TResult>;
  // share(): IDisposableEnumerable<T>;
  // memoize(): IDisposableEnumerable<T>;
  // catchError(handler: (exception: any) => void): IEnumerable<T>;
  // finallyAction(finallyAction: () => void): IEnumerable<T>;
  // log(): IEnumerable<T>;
  // log<TValue>(selector: (element: T) => TValue): IEnumerable<T>;
  // trace(message?: string): IEnumerable<T>;
  // trace<TValue>(message: string, selector: (element: T) => TValue): IEnumerable<T>;
}

export class EnumerableBase<T> implements IEnumerable<T> {
  constructor(private _getEnumerator: () => IEnumerator<T>) { };

  getEnumerator(): IEnumerator<T> { return this._getEnumerator(); };

  select<TResult>(
    selector: Selector<T, TResult>
  ): IEnumerable<TResult> {
    selector = utils.createLambda(selector);

    if (selector.length <= 1) {
      return new WhereSelectEnumerable(this, <any>null, selector);
    }
    else {
      var source = this;

      return new EnumerableBase<TResult>(function () {
        var enumerator: any;
        var index = 0;

        return new EnumeratorBase<TResult>(
          function () { enumerator = source.getEnumerator(); },
          function (this: any) {
            return (enumerator.moveNext())
              ? this.yieldReturn(selector(enumerator.current(), index++))
              : false;
          },
          function () { utils.dispose(enumerator); });
      });
    }
  };

  // Overload:function(predicate<element>)
  // Overload:function(predicate<element,index>)
  where(
    predicate: WherePredicate<T>
  ): IEnumerable<T> {
    predicate = utils.createLambda(predicate);

    if (predicate.length <= 1) {
      return new WhereEnumerable(this, predicate);
    }
    else {
      var source = this;

      return new EnumerableBase(function () {
        var enumerator: IEnumerator<T>;
        var index = 0;

        return new EnumeratorBase(
          function () { enumerator = source.getEnumerator(); },
          function (this: any) {
            while (enumerator.moveNext()) {
              if (predicate(enumerator.current(), index++)) {
                return this.yieldReturn(enumerator.current());
              }
            }
            return false;
          },
          function () { utils.dispose(enumerator); });
      });
    }
  };

  toArray(): T[] {
    const arr: T[] = [];
    this.forEach(function (x) { arr.push(x); });
    return arr;
  };

  // Overload:function(action<element>)
  // Overload:function(action<element,index>)
  // Overload:function(func<element,bool>)
  // Overload:function(func<element,index,bool>)
  forEach(action: ForEachAction<T>) {
    action = utils.createLambda(action);

    var index = 0;
    var enumerator = this.getEnumerator();
    try {
      while (enumerator.moveNext()) {
        if (action(enumerator.current(), index++) === false) break;
      }
    } finally {
      utils.dispose(enumerator);
    }
  };
}

// optimization for multiple where and multiple select and whereselect
class WhereEnumerable<T> extends EnumerableBase<T> {
  constructor(
    private readonly prevSource: IEnumerable<T>,
    private readonly prevPredicate: WherePredicate<T>, // predicate.length always <= 1
  ) {
    super(<any>null);
  };

  //
  // IEnumerable methods.
  //

  getEnumerator(): IEnumerator<T> {
    var predicate = this.prevPredicate;
    var source = this.prevSource;
    var enumerator: IEnumerator<T>;

    return new EnumeratorBase<T>(
      function () { enumerator = source.getEnumerator(); },
      function (this: any) {
        while (enumerator.moveNext()) {
          if ((<any>predicate)(enumerator.current())) {
            return this.yieldReturn(enumerator.current());
          }
        }
        return false;
      },
      function () { utils.dispose(enumerator); });
  };

  //
  // Extension methods.
  //

  where(predicate: WherePredicate<T>): IEnumerable<T> {
    predicate = utils.createLambda(predicate);

    if (predicate.length <= 1) {
      var prevPredicate = this.prevPredicate;
      var composedPredicate = function (x: T) {
        return (<any>prevPredicate)(x) && (<any>predicate)(x);
      };
      return new WhereEnumerable(this.prevSource, composedPredicate);
    }
    else {
      // if predicate use index, can't compose
      return super.where(predicate);
    }
  };

  select<TResult>(
    selector: Selector<T, TResult>
  ): IEnumerable<TResult> {
    selector = utils.createLambda(selector);

    return (selector.length <= 1)
      ? new WhereSelectEnumerable(this.prevSource, this.prevPredicate, selector)
      : super.select(selector);
  };
}

class WhereSelectEnumerable<T, TResult> extends EnumerableBase<TResult> {
  constructor(
    private readonly prevSource: IEnumerable<T>,
    private readonly prevPredicate: WherePredicate<T>, // predicate.length always <= 1 or null
    private readonly prevSelector: Selector<T, TResult>,  // selector.length always <= 1
  ) {
    super(<any>null);
  };

  //
  // IEnumerable methods.
  //

  getEnumerator(): IEnumerator<TResult> {
    var predicate = this.prevPredicate;
    var selector = this.prevSelector;
    var source = this.prevSource;
    var enumerator: IEnumerator<T>;

    return new EnumeratorBase<TResult>(
      function () { enumerator = source.getEnumerator(); },
      function (this: any) {
        while (enumerator.moveNext()) {
          if (predicate == null || (<any>predicate)(enumerator.current())) {
            return this.yieldReturn((<any>selector)(enumerator.current()));
          }
        }
        return false;
      },
      function () { utils.dispose(enumerator); });
  };

  //
  // Extension methods.
  //

  where(predicate: WherePredicate<TResult>): IEnumerable<TResult> {
    predicate = utils.createLambda(predicate);

    return (predicate.length <= 1)
      ? new WhereEnumerable(this, predicate)
      : super.where(predicate);
  };

  select<TResult2>(
    selector: Selector<TResult, TResult2>
  ): IEnumerable<TResult2> {
    selector = utils.createLambda(selector);

    if (selector.length <= 1) {
      var prevSelector = this.prevSelector;
      var composedSelector = function (x: T) {
        return (<any>selector)((<any>prevSelector)(x));
      };
      return new WhereSelectEnumerable(this.prevSource, this.prevPredicate, composedSelector);
    }
    else {
      // if selector use index, can't compose
      return super.select(selector);
    }
  };
}

export interface IEnumerator<T> {
  current(): T;
  moveNext(): boolean;
  dispose(): void;
}

// IEnumerator State
enum State {
  Before = 0,
  Running = 1,
  After = 2,
};

// NOTE: "Enumerator" is conflict JScript's "Enumerator"
export class EnumeratorBase<T> implements IEnumerator<T> {
  private readonly _yielder: Yielder<T>;
  private _state = State.Before;

  constructor(
    private readonly _initialize: any,
    private readonly _tryGetNext: any,
    private readonly _dispose: any
  ) {
    this._yielder = new Yielder<T>();
  }

  public moveNext() {
    try {
      switch (this._state) {
        case State.Before:
          this._state = State.Running;
          this._initialize();
          if (this._tryGetNext.apply(this._yielder)) {
            return true;
          }
          else {
            this.dispose();
            return false;
          }
        case State.Running:
          if (this._tryGetNext.apply(this._yielder)) {
            return true;
          }
          else {
            this.dispose();
            return false;
          }
        case State.After:
          return false;
      }

      throw new Error("INTERNAL ERROR: Query enumerator is in invalid state")
    }
    catch (e) {
      this.dispose();
      throw e;
    }
  };

  public dispose() {
      if (this._state != State.Running) return;

      try {
          this._dispose();
      }
      finally {
          this._state = State.After;
      }
  };

  public current(): T { return this._yielder.current(); };
}

// export interface IOrderedEnumerable<T> extends IEnumerable<T> {
//   createOrderedEnumerable<TKey>(keySelector: (element: T) => TKey, descending: boolean): IOrderedEnumerable<T>;
//   thenBy<TKey>(keySelector: (element: T) => TKey): IOrderedEnumerable<T>;
//   thenByDescending<TKey>(keySelector: (element: T) => TKey): IOrderedEnumerable<T>;
// }

// export interface IDisposableEnumerable<T> extends IEnumerable<T> {
//   dispose(): void;
// }

// export interface IDictionary<TKey, TValue> {
//   add(key: TKey, value: TValue): void;
//   get(key: TKey): TValue;
//   set(key: TKey, value: TValue): boolean;
//   contains(key: TKey): boolean;
//   clear(): void;
//   remove(key: TKey): void;
//   count(): number;
//   toEnumerable(): IEnumerable<{ key: TKey; value: TValue }>;
// }

// export interface ILookup<TKey, TElement> {
//   count(): number;
//   get(key: TKey): IEnumerable<TElement>;
//   contains(key: TKey): boolean;
//   toEnumerable(): IEnumerable<IGrouping<TKey, TElement>>;
// }

// export interface IGrouping<TKey, TElement> extends IEnumerable<TElement> {
//   key(): TKey;
// }

//
// Helpers.
//

// for tryGetNext
class Yielder<T> {
  private _current: T | null = null;

  public current(): T {
    if (this._current == null) {
      throw new Error("INTERNAL ERROR: query enumerator yielded `null`");
    }
    return this._current;
  };

  public yieldReturn(value: any) {
    this._current = value;
    return true;
  };

  public yieldBreak() {
      return false;
  };
}

// ReadOnly Function
var Functions = {
  Identity: function<T> (x: T) { return x; },
  True: function () { return true; },
  Blank: function () { }
};

// const Type
var Types = {
  Boolean: typeof true,
  Number: typeof 0,
  String: typeof "",
  Object: typeof {},
  Undefined: typeof undefined,
  Function: typeof function () { }
};

// createLambda cache
var funcCache: { [key: string]: any } = { "": Functions.Identity };

namespace utils {
  export function createLambda(expression: string | any): any {
    if (expression == null) return Functions.Identity;
    if (typeof expression === Types.String) {
      // get from cache
      var f = funcCache[expression];
      if (f != null) {
        return f;
      }

      if (expression.indexOf("=>") === -1) {
        var regexp = new RegExp("[$]+", "g");

        var maxLength = 0;
        var match;
        while ((match = regexp.exec(expression)) != null) {
          var paramNumber = match[0].length;
          if (paramNumber > maxLength) {
              maxLength = paramNumber;
          }
        }

        var argArray = [];
        for (var i = 1; i <= maxLength; i++) {
          var dollar = "";
          for (var j = 0; j < i; j++) {
              dollar += "$";
          }
          argArray.push(dollar);
        }

        var args = Array.prototype.join.call(argArray, ",");

        f = new Function(args, "return " + expression);
        funcCache[expression] = f;
        return f;
      }
      else {
        var expr = expression.match(/^[(\s]*([^()]*?)[)\s]*=>(.*)/);
        f = new Function(expr[1], "return " + expr[2]);
        funcCache[expression] = f;
        return f;
      }
    }
    return expression;
  }

  export function dispose<T>(obj: IEnumerator<T>) {
    if (obj != null) obj.dispose();
  }
}
