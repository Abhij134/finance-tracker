import webpush from 'web-push';
import prisma from '@/lib/prisma';

// Configure web-push with your VAPID keys from environment variables
// Make sure to add these to your .env.local file
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
);

/**
 * Sends a push notification to a specific user.
 * It fetches all active subscriptions for the user and sends the payload to each device.
 * It also handles '410 Gone' errors by deleting expired subscriptions from the database.
 */
export async function sendBudgetAlert(userId: string, payload: { title: string; body: string; icon?: string }) {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) {
            console.log(`No active push subscriptions found for user ${userId}`);
            return;
        }

        const notificationPayload = JSON.stringify(payload);

        const pushPromises = subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };

            try {
                await webpush.sendNotification(pushSubscription, notificationPayload);
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                    console.log('Subscription expired. Deleting from database...');
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id },
                    });
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        });

        await Promise.all(pushPromises);
        console.log(`Budget alert sent successfully to user ${userId}`);
    } catch (error) {
        console.error('Failed to send budget alert:', error);
    }
}
