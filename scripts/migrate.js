// migrate.js
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sohoavb',
  });

  console.log('Starting migration...');

  try {
    // 1. Update users table
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department VARCHAR(255),
      ADD COLUMN IF NOT EXISTS position VARCHAR(255)
    `);
    console.log('Updated users table.');

    // 2. Update documents table
    await connection.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS sender_id INT,
      ADD COLUMN IF NOT EXISTS summary TEXT,
      ADD CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('Updated documents table.');

    // 3. Create document_recipients table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        user_id INT NOT NULL,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME NULL,
        status ENUM('received', 'read') DEFAULT 'received',
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Created document_recipients table.');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
