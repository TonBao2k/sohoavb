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

    // Outbox: documents I sent
    const query = `
      SELECT d.*, 
        (SELECT COUNT(*) FROM document_sharing WHERE document_id = d.id) as total_recipients,
        (SELECT COUNT(*) FROM document_sharing WHERE document_id = d.id AND status = 'accepted') as read_count
      FROM documents d
      WHERE d.sender_id = ?
      ORDER BY d.created_at DESC`;

    const [rows] = await connection.query(query, [user.id]);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET outbox error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
