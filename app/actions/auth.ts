"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/auth-helpers";

// SIGN UP API
export async function signUpUser(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;
    const userId = formData.get("userId") as string;

    if (!email || !password || !username || !userId) {
        return { success: false, error: "Email, User ID, Username, and Password are required." };
    }

    if (username.trim().length < 3) {
        return { success: false, error: "Username must be at least 3 characters long." };
    }

    // Check if the username OR userId is already taken in the public Prisma database
    try {
        const existingUsername = await prisma.user.findFirst({
            where: { username: username.trim() }
        });

        if (existingUsername) {
            return { success: false, error: "Username is already taken." };
        }

        const existingUserId = await prisma.user.findFirst({
            where: { userId: userId.trim() }
        });

        if (existingUserId) {
            return { success: false, error: "User ID is already taken. Please choose another one." };
        }
    } catch (e: any) {
        console.error("SignUp Prisma Error:", e);
        return { success: false, error: "Database error: " + (e?.message || "Unknown Prisma fault.") };
    }

    // Sign up via Supabase, passing both username and userId in the metadata
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username.trim(),
                userId: userId.trim(),
            }
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Since we are returning immediately, the Postgres trigger will handle the database syncing.
    return { success: true };
}

// LOG IN API
export async function signInUser(formData: FormData) {
    const userId = formData.get("userId") as string;
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "true";

    // Pass rememberMe to createClient to configure cookie persistence
    const supabase = await createClient(rememberMe);

    if (!userId || !password) {
        return { success: false, error: "User ID and password are required." };
    }

    try {
        // Look up the user by userId to retrieve their email address required by Supabase Auth
        const dbUser = await prisma.user.findFirst({
            where: { userId: userId.trim() },
            select: { email: true }
        });

        if (!dbUser || !dbUser.email) {
            return { success: false, error: "User not exists, please create an account" };
        }

        // Use the found email to authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: dbUser.email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Verify Prisma sync
        if (data.user) {
            await ensureUser(supabase, data.user.id);
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Database error during login." };
    }
}

// SEND PASSWORD RECOVERY OTP
export async function sendPasswordResetOTP(email: string) {
    const supabase = await createClient();

    if (!email) {
        return { success: false, error: "Email is required." };
    }

    // Step 1: Specifically verify that this email exists in our records
    try {
        const existingUser = await prisma.user.findFirst({
            where: { email: email.trim() },
            select: { id: true }
        });

        if (!existingUser) {
            return { success: false, error: "This email address is not registered with any account." };
        }
    } catch (e: any) {
        return { success: false, error: "Database error while verifying email." };
    }

    // Step 2: Send the OTP via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

// VERIFY RECOVERY OTP AND SET NEW PASSWORD
export async function verifyResetOTPAndSetPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const token = formData.get("token") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !token || !newPassword || !confirmPassword) {
        return { success: false, error: "All fields are required." };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: "Passwords do not match." };
    }

    // Step 1: Verify the recovery OTP to establish a session
    const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (otpError) {
        return { success: false, error: otpError.message || "Invalid or expired code." };
    }

    // Step 2: Now that the user has a temporary session, update their password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        return { success: false, error: updateError.message || "Failed to set new password." };
    }

    // Immediately sign the user out so they must manually log in again to verify
    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    return { success: true };
}

// VERIFY RECOVERY OTP AND RETURN USER ID
export async function recoverUserId(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const token = formData.get("token") as string;

    if (!email || !token) {
        return { success: false, error: "Email and OTP are required." };
    }

    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (otpError || !otpData.user) {
        return { success: false, error: otpError?.message || "Invalid or expired code." };
    }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: otpData.user.id },
            select: { userId: true, username: true }
        });

        // Sign out to prevent an unpassworded session from lingering
        await supabase.auth.signOut();

        if (!dbUser || !dbUser.userId) {
            return { success: false, error: "Your account is missing a User ID mapping. Please sign up again." };
        }

        return { success: true, userId: dbUser.userId, username: dbUser.username };
    } catch (e: any) {
        return { success: false, error: "Database error retrieving User ID." };
    }
}

// GENERAL UTILITIES
export async function handleSignOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
}

export async function getUserProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        const dbUsers: any[] = await prisma.$queryRaw`SELECT id, email, username, "userId", image, birthdate FROM "User" WHERE id = ${user.id}`;
        const dbUser = dbUsers[0];

        if (!dbUser) {
            return { success: false, error: "User profile not found in database" };
        }

        return { success: true, user: dbUser };
    } catch (error: any) {
        console.error("Error fetching user profile:", error);
        return { success: false, error: error.message || "Failed to fetch profile" };
    }
}

export async function changePassword(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const oldPassword = formData.get("oldPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!oldPassword || !newPassword) {
        return { success: false, error: "Both old and new password are required" };
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to change password" };
    }
}

export async function changeUsername(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const newUsername = formData.get("newUsername") as string;

    if (!newUsername || newUsername.trim().length < 3) {
        return { success: false, error: "Username must be at least 3 characters long." };
    }

    try {
        const existingUsername = await prisma.user.findFirst({
            where: { username: newUsername.trim() }
        });

        if (existingUsername && existingUsername.id !== user.id) {
            return { success: false, error: "Username is already taken." };
        }

        // Update in Prisma
        await prisma.user.update({
            where: { id: user.id },
            data: { username: newUsername.trim() }
        });

        // Update in Supabase Meta
        await supabase.auth.updateUser({
            data: { username: newUsername.trim() }
        });

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to change username" };
    }
}

export async function deleteUserAccount(password?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        await prisma.user.delete({
            where: { id: user.id }
        });

        await supabase.auth.signOut();
        revalidatePath("/", "layout");

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete account" };
    }
}

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const username = formData.get("username") as string;
    const birthdate = formData.get("birthdate") as string;
    const image = formData.get("image") as string;

    const dataToUpdate: any = {};
    if (username && username.trim().length >= 3) {
        const existingUsername = await prisma.user.findFirst({
            where: { username: username.trim() }
        });
        if (existingUsername && existingUsername.id !== user.id) {
            return { success: false, error: "Username is already taken." };
        }
        dataToUpdate.username = username.trim();
        await supabase.auth.updateUser({ data: { username: username.trim() } });
    }
    if (birthdate) {
        dataToUpdate.birthdate = new Date(birthdate);
    }
    if (image) {
        dataToUpdate.image = image;
    }

    try {
        if (dataToUpdate.username && !dataToUpdate.birthdate && !dataToUpdate.image) {
            await prisma.$executeRawUnsafe(`UPDATE "User" SET username = '${dataToUpdate.username}' WHERE id = '${user.id}'`);
        } else {
            const updates = [];
            if (dataToUpdate.username) updates.push(`username = '${dataToUpdate.username}'`);
            if (dataToUpdate.birthdate) updates.push(`birthdate = '${dataToUpdate.birthdate.toISOString()}'`);
            if (dataToUpdate.image) updates.push(`image = '${dataToUpdate.image}'`);
            if (updates.length > 0) {
                await prisma.$executeRawUnsafe(`UPDATE "User" SET ${updates.join(', ')} WHERE id = '${user.id}'`);
            }
        }
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update profile" };
    }
}
