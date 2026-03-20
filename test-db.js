const { Client } = require('pg');

async function test(url) {
    const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
        await c.connect();
        console.log(`[SUCCESS] ${url.split('@')[1]}`);
        await c.end();
    } catch (e) {
        console.log(`[ERROR]   ${url.split('@')[1]}: ${e.message}`);
    }
}

async function run() {
    await test('postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@aws-0-ap-south-1.pooler.supabase.com:6543/postgres');
    await test('postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@aws-0-ap-south-1.pooler.supabase.com:5432/postgres');
    await test('postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
    await test('postgresql://postgres.ngegqphmpvqmwkkxoabn:Abhijeetgautam134@aws-1-ap-south-1.pooler.supabase.com:5432/postgres');
}

run();
