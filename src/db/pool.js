import { Client } from 'pg';

const client = new Client({
    host: 'db.yushxqtjeqlaphtqheai.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'k%r06£7h38^W[p=+Gsr:',
    ssl: { rejectUnauthorized: false }
});

async function testDirectConnection() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM users');
        console.log('✓ Database time:', res.rows[0]);
        await client.end();
    } catch (error) {
        console.error('✗ Connection failed:', error);
    }
}

testDirectConnection()
