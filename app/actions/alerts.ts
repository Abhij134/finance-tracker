"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEmailPreferences() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                largeTxEmailEnabled: true,
                largeTxThreshold: true,
                periodicSummaryEmailEnabled: true,
                unusualSpendingEmailEnabled: true,
                unusualSpendingThreshold: true,
            }
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        return { success: true, preferences: user };
    } catch (error: any) {
        console.error("Error fetching email preferences:", error);
        return { success: false, error: "Failed to fetch email preferences" };
    }
}

export async function updateEmailPreference(key: "largeTxEmailEnabled" | "largeTxThreshold" | "periodicSummaryEmailEnabled" | "unusualSpendingEmailEnabled" | "unusualSpendingThreshold", value: boolean | number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { [key]: value }
        });

        revalidatePath("/alerts");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating email preference:", error);
        return { success: false, error: "Failed to update preference" };
    }
}
