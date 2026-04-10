import { NextRequest, NextResponse } from "next/server";
import { extractFromPDF, extractFromImage } from "@/lib/extractTransactions";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const abortController = new AbortController();

            req.signal.addEventListener("abort", () => {
                abortController.abort();
            });

            const send = (data: object) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    // stream already closed
                }
            };

            try {
                const formData = await req.formData();
                const file = formData.get("file") as File | null;
                const imageBase64 = formData.get("image") as string | null;

                const onProgress = (data: {
                    percent: number;
                    message: string;
                    currentPage: number;
                    totalPages: number;
                    transactions?: any[];
                }) => {
                    if (abortController.signal.aborted) return;
                    // Send progress update
                    send({
                        type: "progress",
                        percent: data.percent,
                        message: data.message,
                        currentPage: data.currentPage,
                        totalPages: data.totalPages,
                    });
                    // Stream individual transactions as they arrive
                    if (data.transactions && data.transactions.length > 0) {
                        data.transactions.forEach(tx => {
                            send({ type: "transaction", transaction: tx });
                        });
                    }
                };

                console.log("[extract API] File received:", file?.name, file?.size, "bytes");
                console.log("[extract API] GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);

                if (imageBase64) {
                    const transactions = await extractFromImage(
                        imageBase64,
                        onProgress,
                        abortController.signal
                    );
                    send({ type: "done", transactions });
                } else if (file) {
                    const bytes = await file.arrayBuffer();
                    const transactions = await extractFromPDF(
                        bytes,
                        onProgress,
                        abortController.signal
                    );
                    send({ type: "done", transactions });
                } else {
                    send({ type: "error", message: "No file or image provided" });
                }
            } catch (err: any) {
                if (err.name === "AbortError") {
                    send({ type: "aborted", message: "Scan stopped by user" });
                } else {
                    console.error("[extract API]", err);
                    send({ type: "error", message: err?.message ?? "Extraction failed" });
                }
            } finally {
                try { controller.close(); } catch { /* already closed */ }
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
