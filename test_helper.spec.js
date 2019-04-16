const objectIntersect = require('./test_helper').objectIntersect;

describe('objectIntersect', () => {

  it('equal objects',
     () => { expect(objectIntersect({a: 1}, {a: 1})).toEqual({a: 1}); });

  it('same keys',
     () => { expect(objectIntersect({a: 1}, {a: 2})).toEqual({a: 1}); });

  it('additional keys in actual',
     () => { expect(objectIntersect({a: 1, b: 2}, {a: 2})).toEqual({a: 1}); });

  it('additional keys in expected', () => {
    expect(objectIntersect({a: 1}, {a: 2, b: 2})).toEqual({a: 1, b: undefined});
  });

  it('nested objects', () => {
    expect(objectIntersect({a: {b: 1, c: 2}, d: 3}, {a: {b: 0, c: 2}, d: 3}))
        .toEqual({a: {b: 1, c: 2}, d: 3});
  });

  it('nested objects with additional keys in actual', () => {
    expect(objectIntersect({a: {b: 1, c: 2}, d: 3, e: 4}, {
      a: {b: 0, c: 2},
      d: 3
    })).toEqual({a: {b: 1, c: 2}, d: 3});
  });

  it('nested objects with additional keys in expected', () => {
    expect(objectIntersect(
               {
                 a: {b: 1, c: 2},
                 d: 3,
               },
               {
                 a: {b: 0, c: 2, add: 2.5},
                 d: 3,
               }))
        .toEqual({
          a: {
            b: 1,
            c: 2,
            add: undefined,
          },
          d: 3
        });
  });

  it('arrays with the same length', () => {
    expect(objectIntersect([1, 2], [0, 2])).toEqual([1, 2]);
  });

  it('arrays with more elements in actual', () => {
    expect(objectIntersect([1, 2, 3], [0, 2])).toEqual([1, 2, 3]);
  });

  it('arrays with more elements in expected', () => {
    expect(objectIntersect([1, 2], [0, 2, 3])).toEqual([1, 2, undefined]);
  });

});