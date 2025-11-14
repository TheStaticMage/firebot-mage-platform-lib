import {
    serialize,
    deserialize,
    isSerializedMessage,
    DeserializationError,
    ChecksumError,
    SerializedMessage
} from '../ipc-serializer';

describe('IPC Serializer', () => {
    describe('serialize', () => {
        it('should serialize to a JSON string', () => {
            const payload = { username: 'test', action: 'ban' };
            const jsonString = serialize(payload);

            expect(typeof jsonString).toBe('string');
            const parsed = JSON.parse(jsonString) as SerializedMessage;
            expect(parsed.payload).toEqual(payload);
            expect(parsed.checksum).toBeDefined();
            expect(parsed.timestamp).toBeDefined();
            expect(parsed.version).toBe('1.0.0');
        });

        it('should strip undefined values', () => {
            const payload = { username: 'test', optional: undefined };
            const jsonString = serialize(payload);
            const parsed = JSON.parse(jsonString) as SerializedMessage<{ username: string }>;

            expect(parsed.payload).toEqual({ username: 'test' });
            expect('optional' in (parsed.payload as Record<string, unknown>)).toBe(false);
        });

        it('should handle nested objects with undefined', () => {
            const payload = {
                user: { name: 'test', age: undefined },
                items: [1, undefined, 3]
            };
            const jsonString = serialize(payload);
            const parsed = JSON.parse(jsonString) as SerializedMessage;

            expect(parsed.payload).toEqual({
                user: { name: 'test' },
                items: [1, null, 3]
            });
        });

        it('should handle arrays', () => {
            const payload = [1, 2, 3];
            const jsonString = serialize(payload);
            const parsed = JSON.parse(jsonString) as SerializedMessage;

            expect(parsed.payload).toEqual([1, 2, 3]);
        });

        it('should handle null values', () => {
            const payload = { value: null };
            const jsonString = serialize(payload);
            const parsed = JSON.parse(jsonString) as SerializedMessage;

            expect(parsed.payload).toEqual({ value: null });
        });
    });

    describe('deserialize', () => {
        it('should deserialize a valid message', () => {
            const original = { username: 'test', action: 'ban' };
            const jsonString = serialize(original);
            const deserialized = deserialize(jsonString);

            expect(deserialized).toEqual(original);
        });

        it('should throw ChecksumError for tampered payload', () => {
            const jsonString = serialize({ username: 'test' });
            const parsed = JSON.parse(jsonString);
            parsed.payload.username = 'hacker';
            const tamperedString = JSON.stringify(parsed);

            expect(() => deserialize(tamperedString)).toThrow(ChecksumError);
        });

        it('should throw DeserializationError for invalid structure', () => {
            expect(() => deserialize('{}')).toThrow(DeserializationError);
            expect(() => deserialize('{"payload": null}')).toThrow(DeserializationError);
        });

        it('should throw DeserializationError for invalid JSON', () => {
            expect(() => deserialize('invalid json')).toThrow(DeserializationError);
        });
    });

    describe('isSerializedMessage', () => {
        it('should return true for valid serialized message', () => {
            const jsonString = serialize({ test: true });
            const parsed = JSON.parse(jsonString);
            expect(isSerializedMessage(parsed)).toBe(true);
        });

        it('should return false for invalid objects', () => {
            expect(isSerializedMessage({})).toBe(false);
            expect(isSerializedMessage(null)).toBe(false);
            expect(isSerializedMessage({ payload: 'test' })).toBe(false);
        });
    });

    describe('round-trip tests', () => {
        it('should handle complex nested structures', () => {
            const payload = {
                user: {
                    id: 123,
                    name: 'test',
                    settings: {
                        theme: 'dark',
                        notifications: true
                    }
                },
                items: [
                    { id: 1, name: 'item1' },
                    { id: 2, name: 'item2' }
                ]
            };

            const jsonString = serialize(payload);
            const result = deserialize(jsonString);

            expect(result).toEqual(payload);
        });

        it('should maintain data types', () => {
            const payload = {
                string: 'test',
                number: 42,
                boolean: true,
                null: null,
                array: [1, 2, 3],
                object: { nested: 'value' }
            };

            const jsonString = serialize(payload);
            const result = deserialize<typeof payload>(jsonString);

            expect(result).toEqual(payload);
            expect(typeof result.string).toBe('string');
            expect(typeof result.number).toBe('number');
            expect(typeof result.boolean).toBe('boolean');
        });
    });
});
