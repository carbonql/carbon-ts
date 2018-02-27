import { expect } from 'chai';
import * as Enumerable from "../src/ql/query";

var seq = Enumerable.range(5, 10); // 5-14
var seq2 = Enumerable.range(5, 5); // 5-9

const seqEqual = <T>(ie: Enumerable.IEnumerable<T>, target: T[]) => {
  expect(ie.toArray()).deep.equal(target);
}

describe("where", () => {
  it("filters both elements and indexes", function () {
    seqEqual(seq.where(x => x % 2 === 0), [6, 8, 10, 12, 14]);
    seqEqual(seq.where((_, i) => i % 2 === 0), [5, 7, 9, 11, 13]);
  });

  it("two calls to `where` compose", function () {
    seqEqual(
      seq.where(x => x % 2 === 0).where(x => x % 3 === 0),
      [6, 12]);
    seqEqual(
      seq.where((_, i) => i % 2 === 0).where((_, i) => i % 2 === 0),
      [5, 9, 13]);
    seqEqual(
      seq.where(x => x % 2 === 0).where((_, i) => i % 2 === 0),
      [6, 10, 14]);
    seqEqual(
      seq.where((_, i) => i % 2 === 0).where(x => x % 3 === 0),
      [9]);
  });
});

describe("select", () => {
  it("select projects both elements and indexes", function () {
    seqEqual(seq2.select(x => x * 10), [50, 60, 70, 80, 90]);
    seqEqual(seq2.select((_, i) => i * 2), [0, 2, 4, 6, 8]);
  });

  it("two calls to `select` compose", function () {
      seqEqual(seq2.select(x => x * 10).select(x => x * 2), [100, 120, 140, 160, 180]);
      seqEqual(seq2.select((_, i) => i * 2).select((x, i) => x + i * 20), [0, 22, 44, 66, 88]);
      seqEqual(seq2.select(x => x * 10).select((x, i) => x + i * 2), [50, 62, 74, 86, 98]);
      seqEqual(seq2.select((_, i) => i * 2).select(x => x * 10), [0, 20, 40, 60, 80]);
  });
});

describe("where/select", () => {
  it("xs.select(...).where(...)", function () {
      seqEqual(seq.where(x => x % 2 === 0).select(x => x * 2), [12, 16, 20, 24, 28]);
      seqEqual(seq.where(x => x % 2 === 0).select((x, i) => x + i * 2), [6, 10, 14, 18, 22]);
      seqEqual(seq.where((_, i) => i % 2 === 0).select(x => x * 2), [10, 14, 18, 22, 26]);
      seqEqual(seq.where((_, i) => i % 2 === 0).select((x, i) => x + i * 2), [5, 9, 13, 17, 21]);
  });

  it("xs.where(...).select(...)", function () {
      seqEqual(
        seq.select(x => x * 2).where(x => x % 2 === 0),
        [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
      seqEqual(seq.select((x, i) => x + i * 2).where(x => x % 2 === 0), [8, 14, 20, 26, 32]);
      seqEqual(seq.select(x => x * 2).where((_, i) => i % 2 === 0), [10, 14, 18, 22, 26]);
      seqEqual(seq.select((x, i) => x + i * 2).where((_, i) => i % 2 === 0), [5, 11, 17, 23, 29]);
  });

  it("xs.where(...).select(...).where(...)", function () {
      seqEqual(
        seq.where(x => x % 2 === 0).select(x => x * 2).where(x => x % 3 === 0),
        [12, 24]);
      seqEqual(
        seq.where(x => x % 2 === 0).select((x, i) => x + i * 2).where((_, i) => i % 2 === 0),
        [6, 14, 22]);
      seqEqual(
        seq.where((_, i) => i %2 === 0).select(x => x * 2).where((_, i) => i % 2 === 0),
        [10, 18, 26]);
      seqEqual(
        seq.where((_, i) => i %2 === 0).select((x, i) => x + i * 2).where(x => x % 3 === 0),
        [9, 21]);
  });

  it("xs.select(...).where(...).select(...)", function () {
      seqEqual(
        seq.select(x => x * 2).where(x => x % 2 == 0).select(x => x * 2),
        [20, 24, 28, 32, 36, 40, 44, 48, 52, 56]);
      seqEqual(
        seq.select((x, i) => x + i * 2).where(x => x % 2 === 0).select((_, i) => i *2),
        [0, 2, 4, 6, 8]);
      seqEqual(
        seq.select(x => x * 2).where((_, i) => i % 2 === 0).select((x, i) => x * 2+ i),
        [20, 29, 38, 47, 56]);
      seqEqual(
        seq.select((x, i) => x +  i * 2).where((_, i) => i % 2 === 0).select(x => x * 2),
        [10, 22, 34, 46, 58]);
  });
});
