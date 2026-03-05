import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import { authMiddleware } from '../../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;

        connection = await pool.getConnection();

        // Admin sees all incoming distributions, users see only what's sent to them
        let query = `
      SELECT d.*, u.full_name as sender_name, ds.status as read_status, ds.created_at as received_at
      FROM documents d
      JOIN document_sharing ds ON d.id = ds.document_id
      JOIN users u ON d.sender_id = u.id
      WHERE ds.user_id = ?
      ORDER BY ds.created_at DESC`;

        const [rows] = await connection.query(query, [user.id]);
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('GET inbox error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
