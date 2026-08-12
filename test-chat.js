

async function run() {
    console.log("Testing POST /api/chat");
    try {
        const res = await fetch("http://127.0.0.1:3000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Provide a dummy cookie so it doesn't fail on getServerSession
                "Cookie": "next-auth.session-token=123"
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "hello" }]
            })
        });
        
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text.substring(0, 500));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

run();
