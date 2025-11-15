/**
 * IPC Serializer
 *
 * Provides safe JSON-based serialization for IPC messages with checksum validation.
 * Strips undefined values to ensure JSON compatibility and prevent runtime bugs.
 */

import * as crypto from 'crypto';

/**
 * Serializer version for compatibility tracking
 */
const SERIALIZER_VERSION = '1.0.0';

/**
 * Serialized message wrapper with integrity checking
 */
export interface SerializedMessage<T = unknown> {
    /**
     * The serialized payload (undefined values stripped)
     */
    payload: T;

    /**
     * SHA-256 checksum of the payload for integrity verification
     */
    checksum: string;

    /**
     * Timestamp when the message was serialized
     */
    timestamp: number;

    /**
     * Serializer version
     */
    version: string;
}

/**
 * Serialization error
 */
export class SerializationError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'SerializationError';
    }
}

/**
 * Deserialization error
 */
export class DeserializationError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'DeserializationError';
    }
}

/**
 * Checksum verification error
 */
export class ChecksumError extends Error {
    constructor(expected: string, actual: string) {
        super(`Checksum mismatch: expected ${expected}, got ${actual}`);
        this.name = 'ChecksumError';
    }
}

/**
 * Recursively strips undefined values from an object
 * Converts undefined to null for JSON compatibility
 */
function stripUndefined<T>(obj: T): T {
    if (obj === undefined) {
        return null as T;
    }

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => stripUndefined(item)) as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            result[key] = stripUndefined(value);
        }
    }
    return result as T;
}

/**
 * Computes SHA-256 checksum of a JSON string
 */
function computeChecksum(jsonString: string): string {
    return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Internal function to create a serialized message
 */
function createSerializedMessage<T>(payload: T): SerializedMessage<T> {
    // Strip undefined values to ensure JSON compatibility
    const cleanPayload = stripUndefined(payload);

    // Convert to JSON string for checksum
    const jsonString = JSON.stringify(cleanPayload);

    // Compute checksum
    const checksum = computeChecksum(jsonString);

    return {
        payload: cleanPayload,
        checksum,
        timestamp: Date.now(),
        version: SERIALIZER_VERSION
    };
}

/**
 * Internal function to validate a deserialized message
 */
function validateSerializedMessage<T>(message: SerializedMessage<T>): T {
    // Validate message structure
    if (!message || typeof message !== 'object') {
        throw new DeserializationError('Invalid message structure: not an object');
    }

    if (!message.payload) {
        throw new DeserializationError('Invalid message structure: missing payload');
    }

    if (!message.checksum) {
        throw new DeserializationError('Invalid message structure: missing checksum');
    }

    // Recompute checksum to verify integrity
    const jsonString = JSON.stringify(message.payload);
    const computedChecksum = computeChecksum(jsonString);

    if (computedChecksum !== message.checksum) {
        throw new ChecksumError(message.checksum, computedChecksum);
    }

    return message.payload;
}

/**
 * Type guard to check if a value is a serialized message
 */
export function isSerializedMessage(value: unknown): value is SerializedMessage {
    return (
        typeof value === 'object' &&
        value !== null &&
        'payload' in value &&
        'checksum' in value &&
        'timestamp' in value &&
        'version' in value
    );
}

/**
 * Serializes a payload to a JSON string for IPC transmission
 *
 * @param payload The payload to serialize
 * @returns JSON string of the serialized message with checksum
 * @throws SerializationError if serialization fails
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function serialize<T>(payload: T): string {
    try {
        const message = createSerializedMessage(payload);
        return JSON.stringify(message);
    } catch (error) {
        throw new SerializationError('Failed to serialize payload to JSON string', error);
    }
}

/**
 * Deserializes and validates a message from a JSON string
 *
 * @param jsonString The JSON string to deserialize
 * @returns The validated payload
 * @throws DeserializationError if parsing or deserialization fails
 * @throws ChecksumError if checksum verification fails
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function deserialize<T>(jsonString: string): T {
    try {
        const message = JSON.parse(jsonString) as SerializedMessage<T>;
        return validateSerializedMessage(message);
    } catch (error) {
        if (error instanceof ChecksumError || error instanceof DeserializationError) {
            throw error;
        }
        throw new DeserializationError('Failed to parse JSON string', error);
    }
}
