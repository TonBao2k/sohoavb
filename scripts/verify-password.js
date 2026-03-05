const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function verify() {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'sohoavb',
    });

    try {
        const [rows] = await pool.query('SELECT username, password FROM users');
        for (const user of rows) {
            console.log(`\nUser: ${user.username}`);
            console.log(`Hash: ${user.password}`);
            // Test common passwords
            const testPasswords = ['admin123', '123456', '1223456', 'admin', 'password'];
            for (const pwd of testPasswords) {
                const match = await bcrypt.compare(pwd, user.password);
                if (match) {
                    console.log(`✅ Password matches: "${pwd}"`);
                }
            }
        }
    } finally {
        await pool.end();
    }
}

verify().catch(console.error);
