import { NEYNAR_API_KEY } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export interface SendNotificationResult {
    success: boolean;
    message?: string;
    details?: any;
}

export const sendNotification = async (
    targetFids: number[],
    title: string,
    body: string,
    targetUrl: string
): Promise<SendNotificationResult> => {
    if (!NEYNAR_API_KEY) {
        return { success: false, message: 'Missing NEYNAR_API_KEY' };
    }

    try {
        const notificationId = uuidv4();

        const payload = {
            notification: {
                title,
                body,
                target_url: targetUrl,
                uuid: notificationId
            },
            target_fids: targetFids
        };

        const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': NEYNAR_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (response.ok) {
            return { success: true, details: responseData };
        } else {
            return {
                success: false,
                message: `Failed to send: ${response.status} ${response.statusText}`,
                details: responseData
            };
        }

    } catch (error) {
        console.error('Error sending notification:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
};
