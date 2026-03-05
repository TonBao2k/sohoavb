const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetUser() {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'sohoavb',
    });

    try {
        const username = 'baobao';
        const newPassword = '123456';
        const hashed = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for "${username}" to "${newPassword}"`);
        console.log(`New hash: ${hashed}`);

        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashed, username]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Password for "${username}" updated successfully!`);
        } else {
            console.error(`❌ User "${username}" not found.`);
        }
    } finally {
        await pool.end();
    }
}

resetUser().catch(console.error);
