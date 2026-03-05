import { NextResponse } from 'next/server';
import pool from '../../../../../lib/mysql';
import { authMiddleware } from '../../../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;

        const { id } = await params;
        const { recipient_ids } = await request.json();

        if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
            return NextResponse.json({ error: 'Vui lòng chọn người nhận' }, { status: 400 });
        }

        connection = await pool.getConnection();

        // 1. Verify document exists and user has permission
        const [docs]: any = await connection.query('SELECT name, sender_id FROM documents WHERE id = ?', [id]);
        if (!docs[0]) return NextResponse.json({ error: 'Không tìm thấy văn bản' }, { status: 404 });

        if (user.role !== 'admin' && docs[0].sender_id !== user.id) {
            return NextResponse.json({ error: 'Bạn không có quyền chia sẻ văn bản này' }, { status: 403 });
        }

        const docName = docs[0].name;

        await connection.beginTransaction();

        // 2. Add recipients (if not already exists with same status)
        for (const recipientId of recipient_ids) {
            // Check if already shared
            const [existing]: any = await connection.query(
                'SELECT id FROM document_sharing WHERE document_id = ? AND user_id = ?',
                [id, recipientId]
            );

            if (existing.length > 0) {
                // Update status to pending if already exists
                await connection.query(
                    'UPDATE document_sharing SET status = "pending", processed_at = NULL WHERE id = ?',
                    [existing[0].id]
                );
            } else {
                await connection.query(
                    'INSERT INTO document_sharing (document_id, user_id, status) VALUES (?, ?, "pending")',
                    [id, recipientId]
                );
            }

            // 3. Create notification for each recipient
            await connection.query(
                'INSERT INTO notifications (user_id, sender_id, doc_id, type, message) VALUES (?, ?, ?, ?, ?)',
                [recipientId, user.id, id, 'share_request', `Bạn nhận được yêu cầu chia sẻ văn bản: ${docName}`]
            );
        }

        await connection.commit();

        return NextResponse.json({ success: true, count: recipient_ids.length });
    } catch (error: any) {
        console.error('API Share error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
