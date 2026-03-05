import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';

export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();

        // Check if category column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM documents LIKE "category"');
        const columnExists = (columns as any[]).length > 0;

        if (!columnExists) {
            await connection.query(`
                ALTER TABLE documents 
                ADD COLUMN category VARCHAR(50) DEFAULT 'other' AFTER is_important
            `);
        }

        return NextResponse.json({ success: true, message: columnExists ? 'Column already exists' : 'Database schema updated successfully' });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
