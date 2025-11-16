import {
    EventFilter,
    FilterSettings,
    PresetValue
} from '@crowbartools/firebot-custom-scripts-types/types/modules/event-filter-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';

/**
 * Platform event filter - filters events based on detected platform
 */
export const platformFilter: EventFilter = {
    id: 'mage-platform-lib:platform',
    name: 'Platform',
    description: 'Filter events by platform (Kick, Twitch, YouTube, or Unknown)',
    events: [
        { eventSourceId: 'twitch', eventId: 'viewer-arrived' },
        { eventSourceId: 'twitch', eventId: 'follow' },
        { eventSourceId: 'twitch', eventId: 'chat-message' },
        { eventSourceId: 'twitch', eventId: 'stream-online' },
        { eventSourceId: 'twitch', eventId: 'stream-offline' },
        { eventSourceId: 'twitch', eventId: 'timeout' },
        { eventSourceId: 'twitch', eventId: 'banned' }
    ],
    comparisonTypes: ['is', 'is not'],
    valueType: 'preset',
    presetValues(): PresetValue[] {
        return [
            { value: 'kick', display: 'Kick' },
            { value: 'twitch', display: 'Twitch' },
            { value: 'youtube', display: 'YouTube' },
            { value: 'unknown', display: 'Unknown' }
        ];
    },
    predicate(filterSettings: FilterSettings, eventData: { eventMeta: Record<string, unknown> }): boolean {
        // Construct a trigger object from event data
        const trigger: Trigger = {
            type: 'event',
            metadata: {
                username: '',
                ...eventData.eventMeta
            }
        };

        // Detect platform from trigger
        const detectedPlatform = detectPlatform(trigger);

        // Compare based on comparison type
        if (filterSettings.comparisonType === 'is') {
            return detectedPlatform === filterSettings.value;
        } else if (filterSettings.comparisonType === 'is not') {
            return detectedPlatform !== filterSettings.value;
        }

        return false;
    }
};
