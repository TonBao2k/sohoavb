import { NextResponse } from 'next/server';
import pool from '../../../lib/mysql';
import { authMiddleware } from '../../../lib/middleware';

export const dynamic = 'force-dynamic';

// GET all notifications for current user
export async function GET(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;

        connection = await pool.getConnection();

        const [rows] = await connection.query(
            `SELECT n.*, u.username as sender_username, d.number as doc_number, d.name as doc_name
             FROM notifications n
             LEFT JOIN users u ON n.sender_id = u.id
             LEFT JOIN documents d ON n.doc_id = d.id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC`,
            [user.id]
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('GET notifications error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

// PATCH mark as read
export async function PATCH(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;

        const { id, all } = await request.json();

        connection = await pool.getConnection();

        if (all) {
            await connection.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
                [user.id]
            );
        } else if (id) {
            await connection.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [id, user.id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PATCH notifications error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
