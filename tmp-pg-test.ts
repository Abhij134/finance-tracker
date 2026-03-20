import { Client } from 'pg';

const testConnection = async (name: string, connectionString: string) => {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query('SELECT 1 as connected');
        console.log(`[SUCCESS] ${name}`);
        await client.end();
    } catch (err: any) {
        console.error(`[FAILED] ${name} -> ${err.message}`);
    }
};

async function run() {
    const password = "Abhijeetgautam134";
    const user = "postgres.ngegqphmpvqmwkkxoabn";

    // Test aws-1 pooler
    await testConnection("aws-1 Pooler (Port 6543)", `postgresql://${user}:${password}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`);

    // Test aws-0 pooler
    await testConnection("aws-0 Pooler (Port 6543)", `postgresql://${user}:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`);

    // Test Direct Connection
    await testConnection("Direct Connection (Port 5432) aws-0", `postgresql://postgres:${password}@db.ngegqphmpvqmwkkxoabn.supabase.co:5432/postgres`);
}

run();
