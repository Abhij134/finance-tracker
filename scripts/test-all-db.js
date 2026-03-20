const { Client } = require('pg');

// Test 1: Pooler (aws-1)
const poolerUrl = "postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
// Test 2: Direct
const directUrl = "postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@db.ngegqphmpvqmwkkxoabn.supabase.co:5432/postgres";

async function test(name, url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`PASS: ${name}`);
        await client.end();
    } catch (e) {
        console.log(`FAIL: ${name} - ${e.message}`);
    }
}

async function run() {
    await test("Pooler-AWS1", poolerUrl);
    await test("Direct-Host", directUrl);
}

run();
