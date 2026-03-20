const { Pool } = require('pg');

const pool = new Pool({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.ngegqphmpvqmwkkxoabn',
    password: 'Abhijeetgautam134',
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("lib/prisma.ts error:", err.message);
    } else {
        console.log("lib/prisma.ts Success:", res.rows[0]);
    }
    pool.end();
});
