import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import { authMiddleware } from '../../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;

        const { notificationId, action } = await request.json(); // action: 'accept' | 'reject'

        if (!notificationId || !['accept', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get notification details
        const [notifications]: any = await connection.query(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, user.id]
        );
        if (!notifications[0]) {
            return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 });
        }

        const notif = notifications[0];
        const docId = notif.doc_id;
        const senderId = notif.sender_id;

        // 2. Update document_sharing status
        const status = action === 'accept' ? 'accepted' : 'rejected';
        await connection.query(
            'UPDATE document_sharing SET status = ?, processed_at = NOW() WHERE document_id = ? AND user_id = ?',
            [status, docId, user.id]
        );

        // 3. Mark notification as read
        await connection.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [notificationId]
        );

        // 4. Create response notification for the sender
        const [docs]: any = await connection.query('SELECT name FROM documents WHERE id = ?', [docId]);
        const docName = docs[0]?.name || 'Văn bản';

        const responseType = action === 'accept' ? 'share_accepted' : 'share_rejected';
        const responseMsg = action === 'accept'
            ? `${user.username} đã chấp nhận văn bản: ${docName}`
            : `${user.username} đã từ chối văn bản: ${docName}`;

        await connection.query(
            'INSERT INTO notifications (user_id, sender_id, doc_id, type, message) VALUES (?, ?, ?, ?, ?)',
            [senderId, user.id, docId, responseType, responseMsg]
        );

        await connection.commit();

        return NextResponse.json({ success: true, status });
    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error('Notification action error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
