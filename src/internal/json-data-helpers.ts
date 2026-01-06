import { logger } from '../main';

export function parseData(newData: unknown, currentData: unknown, propertyPath?: string | null): unknown {
    let parsedData = newData;
    if (typeof parsedData === 'string') {
        try {
            parsedData = JSON.parse(parsedData);
        } catch {
            // Ignore JSON parsing errors and treat as plain string.
        }
    }

    const dataIsNull = parsedData == null
        || (typeof parsedData === 'string' && (parsedData.toLowerCase() === 'null' || parsedData.toLowerCase() === 'undefined'));

    if (propertyPath == null || propertyPath.length < 1) {
        let dataToSet = dataIsNull ? undefined : parsedData;
        if (currentData && Array.isArray(currentData) && !Array.isArray(parsedData) && !dataIsNull) {
            dataToSet = [...currentData, parsedData];
        }
        return dataToSet;
    }

    if (!currentData) {
        throw new Error('Property path is defined but there is no current data.');
    }

    let cursor = currentData as Record<string, unknown> | unknown[];
    const pathNodes = propertyPath.split('.');
    for (let i = 0; i < pathNodes.length; i += 1) {
        let node: string | number = pathNodes[i];

        if (!Number.isNaN(Number(node))) {
            node = Number(node);
        }

        try {
            const isLastItem = i === pathNodes.length - 1;
            if (isLastItem) {
                if (dataIsNull && Array.isArray(cursor) && typeof node === 'number' && !Number.isNaN(node)) {
                    cursor.splice(node, 1);
                } else if (Array.isArray((cursor as Record<string, unknown>)[node as keyof typeof cursor]) && !Array.isArray(parsedData) && !dataIsNull) {
                    ((cursor as Record<string, unknown>)[node as keyof typeof cursor] as unknown[]).push(parsedData);
                } else {
                    (cursor as Record<string, unknown>)[node as keyof typeof cursor] = dataIsNull ? undefined : parsedData;
                }
            } else {
                cursor = (cursor as Record<string, unknown>)[node as keyof typeof cursor] as Record<string, unknown> | unknown[];
            }
        } catch (error) {
            logger.warn(`Failed to parse data at path "${propertyPath}": ${error}`);
            return currentData;
        }
    }

    return currentData;
}
