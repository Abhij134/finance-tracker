async function run() {
    const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ role: 'user', content: 'set budget overall to 5000' }]
        })
    });
    
    if (!res.ok) {
        console.error("HTTP Error", res.status, await res.text());
        return;
    }
    
    console.log("Headers:", res.headers);
    
    // It's a stream
    const text = await res.text();
    console.log("Stream output:");
    console.log(text);
}

run();
