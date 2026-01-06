import { parseData } from '../json-data-helpers';

describe('parseData', () => {
    describe('JSON parsing', () => {
        it('parses valid JSON strings', () => {
            const result = parseData('{"key":"value"}', null);
            expect(result).toEqual({ key: 'value' });
        });

        it('parses JSON arrays', () => {
            const result = parseData('[1,2,3]', null);
            expect(result).toEqual([1, 2, 3]);
        });

        it('handles invalid JSON strings as plain text', () => {
            const result = parseData('not json', null);
            expect(result).toBe('not json');
        });

        it('returns non-string data as-is', () => {
            const result = parseData({ key: 'value' }, null);
            expect(result).toEqual({ key: 'value' });
        });

        it('returns numbers as-is', () => {
            const result = parseData(42, null);
            expect(result).toBe(42);
        });

        it('returns booleans as-is', () => {
            const result = parseData(true, null);
            expect(result).toBe(true);
        });
    });

    describe('null/undefined handling', () => {
        it('returns undefined for null value', () => {
            const result = parseData(null, null);
            expect(result).toBeUndefined();
        });

        it('returns undefined for undefined value', () => {
            const result = parseData(undefined, null);
            expect(result).toBeUndefined();
        });

        it('returns undefined for string "null"', () => {
            const result = parseData('null', null);
            expect(result).toBeUndefined();
        });

        it('returns undefined for string "NULL"', () => {
            const result = parseData('NULL', null);
            expect(result).toBeUndefined();
        });

        it('returns undefined for string "undefined"', () => {
            const result = parseData('undefined', null);
            expect(result).toBeUndefined();
        });

        it('returns undefined for string "UNDEFINED"', () => {
            const result = parseData('UNDEFINED', null);
            expect(result).toBeUndefined();
        });

        it('returns string "nullstring" as-is (not a keyword)', () => {
            const result = parseData('nullstring', null);
            expect(result).toBe('nullstring');
        });
    });

    describe('without property path', () => {
        it('returns parsed data when currentData is null', () => {
            const result = parseData('{"key":"value"}', null);
            expect(result).toEqual({ key: 'value' });
        });

        it('returns parsed data when currentData is undefined', () => {
            const result = parseData('{"key":"value"}', undefined);
            expect(result).toEqual({ key: 'value' });
        });

        it('returns parsed data when currentData is not an array', () => {
            const result = parseData('{"key":"value"}', { old: 'data' });
            expect(result).toEqual({ key: 'value' });
        });

        it('appends to array when currentData is array and new data is not array', () => {
            const currentData = [1, 2, 3];
            const result = parseData(4, currentData);
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it('does not append when currentData is array but new data is also array', () => {
            const currentData = [1, 2, 3];
            const result = parseData([4, 5], currentData);
            expect(result).toEqual([4, 5]);
        });

        it('does not append when currentData is array but new data is null', () => {
            const currentData = [1, 2, 3];
            const result = parseData(null, currentData);
            expect(result).toBeUndefined();
        });

        it('does not append when currentData is array but new data is "null"', () => {
            const currentData = [1, 2, 3];
            const result = parseData('null', currentData);
            expect(result).toBeUndefined();
        });
    });

    describe('with property path', () => {
        it('throws error when property path is defined but currentData is null', () => {
            expect(() => parseData('value', null, 'path')).toThrow('Property path is defined but there is no current data.');
        });

        it('throws error when property path is defined but currentData is undefined', () => {
            expect(() => parseData('value', undefined, 'path')).toThrow('Property path is defined but there is no current data.');
        });

        it('sets top-level property', () => {
            const currentData = { existing: 'value' };
            const result = parseData('new value', currentData, 'newKey');
            expect(result).toEqual({ existing: 'value', newKey: 'new value' });
        });

        it('sets nested property', () => {
            const currentData = { outer: { existing: 'value' } };
            const result = parseData('new value', currentData, 'outer.newKey');
            expect(result).toEqual({ outer: { existing: 'value', newKey: 'new value' } });
        });

        it('sets deeply nested property', () => {
            const currentData = { a: { b: { c: { existing: 'value' } } } };
            const result = parseData('new value', currentData, 'a.b.c.newKey');
            expect(result).toEqual({ a: { b: { c: { existing: 'value', newKey: 'new value' } } } });
        });

        it('removes array element when data is null and path is numeric', () => {
            const currentData = [1, 2, 3, 4, 5];
            const result = parseData(null, currentData, '2');
            expect(result).toEqual([1, 2, 4, 5]);
        });

        it('removes array element when data is "null" and path is numeric', () => {
            const currentData = [1, 2, 3, 4, 5];
            const result = parseData('null', currentData, '2');
            expect(result).toEqual([1, 2, 4, 5]);
        });

        it('sets array element when data is not null', () => {
            const currentData = [1, 2, 3, 4, 5];
            const result = parseData(99, currentData, '2');
            expect(result).toEqual([1, 2, 99, 4, 5]);
        });

        it('appends to nested array when target is array and new data is not array', () => {
            const currentData = { items: [1, 2, 3] };
            const result = parseData(4, currentData, 'items');
            expect(result).toEqual({ items: [1, 2, 3, 4] });
        });

        it('replaces nested array when target is array and new data is also array', () => {
            const currentData = { items: [1, 2, 3] };
            const result = parseData([4, 5], currentData, 'items');
            expect(result).toEqual({ items: [4, 5] });
        });

        it('sets property to undefined when data is null', () => {
            const currentData = { key: 'value' };
            const result = parseData(null, currentData, 'key');
            expect(result).toEqual({ key: undefined });
        });

        it('sets property to undefined when data is "null"', () => {
            const currentData = { key: 'value' };
            const result = parseData('null', currentData, 'key');
            expect(result).toEqual({ key: undefined });
        });

        it('sets property to undefined when data is "undefined"', () => {
            const currentData = { key: 'value' };
            const result = parseData('undefined', currentData, 'key');
            expect(result).toEqual({ key: undefined });
        });

        it('handles numeric path nodes as array indices', () => {
            const currentData = { arr: [10, 20, 30] };
            const result = parseData(99, currentData, 'arr.1');
            expect(result).toEqual({ arr: [10, 99, 30] });
        });

        it('handles string path nodes that look like numbers as array indices', () => {
            const currentData = { arr: [10, 20, 30] };
            const result = parseData(99, currentData, 'arr.1');
            expect(result).toEqual({ arr: [10, 99, 30] });
        });

        it('handles mixed path nodes', () => {
            const currentData = { outer: { arr: [10, 20, 30] } };
            const result = parseData(99, currentData, 'outer.arr.1');
            expect(result).toEqual({ outer: { arr: [10, 99, 30] } });
        });

        it('handles property names that are numeric strings', () => {
            const currentData = { '123': 'old value' };
            const result = parseData('new value', currentData, '123');
            expect(result).toEqual({ '123': 'new value' });
        });
    });

    describe('edge cases', () => {
        it('handles empty property path', () => {
            const result = parseData('value', { existing: 'data' }, '');
            expect(result).toEqual('value');
        });

        it('handles single-character property path', () => {
            const currentData = { a: 'old' };
            const result = parseData('new', currentData, 'a');
            expect(result).toEqual({ a: 'new' });
        });


        it('handles complex JSON object with nested structures', () => {
            const currentData = {
                users: [
                    { name: 'Alice', stats: { points: 100 } },
                    { name: 'Bob', stats: { points: 200 } }
                ]
            };
            const result = parseData(150, currentData, 'users.0.stats.points');
            expect(result).toEqual({
                users: [
                    { name: 'Alice', stats: { points: 150 } },
                    { name: 'Bob', stats: { points: 200 } }
                ]
            });
        });

        it('handles JSON string with nested structures', () => {
            const currentData = { data: { old: 'value' } };
            const result = parseData('{"nested":"value"}', currentData, 'data');
            expect(result).toEqual({ data: { nested: 'value' } });
        });
    });
});
