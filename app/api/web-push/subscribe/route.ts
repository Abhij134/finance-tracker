import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await req.json();

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
        }

        // Save or update the push subscription
        await prisma.pushSubscription.upsert({
            where: {
                endpoint: subscription.endpoint,
            },
            create: {
                userId: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            update: {
                userId: user.id,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        });

        return NextResponse.json({ success: true, message: "Subscription saved successfully" });
    } catch (error) {
        console.error("Error saving push subscription:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
