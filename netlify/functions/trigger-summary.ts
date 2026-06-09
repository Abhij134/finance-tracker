import type { Config } from "@netlify/functions";

// Runs every day at 6:00 AM UTC
export const config: Config = {
  schedule: "0 6 * * *",
};

export default async function handler() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    console.error("[trigger-summary] Missing NEXT_PUBLIC_SITE_URL or CRON_SECRET env vars.");
    return;
  }

  const endpoint = `${siteUrl}/api/cron/summary`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-cron-secret": cronSecret,
      },
    });

    const body = await res.json();
    console.log(`[trigger-summary] Response ${res.status}:`, body);
  } catch (err) {
    console.error("[trigger-summary] Failed to call cron endpoint:", err);
  }
}
