const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    // Basic config from environment or defaults
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sohoavb',
    });

    try {
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Updating admin password to: ${password}`);
        console.log(`Hashed password: ${hashedPassword}`);

        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('✅ Admin password updated successfully!');
        } else {
            console.error('❌ Admin user not found.');
        }
    } catch (error) {
        console.error('❌ Error updating admin password:', error.message);
    } finally {
        await pool.end();
    }
}

resetAdmin();
