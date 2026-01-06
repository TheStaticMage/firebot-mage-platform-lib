import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

export function extractTriggerUserId(trigger: Trigger | undefined): string | undefined {
    const metadata = trigger?.metadata as Record<string, unknown> | undefined;
    const chatMessage = metadata?.chatMessage as Record<string, unknown> | undefined;
    const eventData = metadata?.eventData as Record<string, unknown> | undefined;
    const user = metadata?.user as Record<string, unknown> | undefined;

    const chatUserId = typeof chatMessage?.userId === 'string' ? chatMessage.userId : undefined;
    const eventUserId = typeof eventData?.userId === 'string' ? eventData.userId : undefined;
    const metadataUserId = typeof user?.id === 'string' ? user.id : undefined;

    return chatUserId || eventUserId || metadataUserId;
}
