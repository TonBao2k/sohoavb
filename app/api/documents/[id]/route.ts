import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import fs from 'fs/promises';
import path from 'path';
import { authMiddleware } from '../../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    const { id } = await params;
    connection = await pool.getConnection();

    // 1. Get document details
    const [docs]: any = await connection.query(`
      SELECT d.*, u.full_name as sender_name 
      FROM documents d
      LEFT JOIN users u ON d.sender_id = u.id
      WHERE d.id = ?`, [id]);

    if (!docs[0]) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    const doc = docs[0];

    // 2. Security check: Admin, Sender, or Recipient
    const [recepientCheck]: any = await connection.query(
      'SELECT status FROM document_sharing WHERE document_id = ? AND user_id = ?',
      [id, user.id]
    );

    const isRecipient = recepientCheck.length > 0;
    const isSender = doc.sender_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isSender && !isRecipient) {
      return NextResponse.json({ error: 'Không có quyền xem văn bản này' }, { status: 403 });
    }

    // 3. Mark as read if recipient
    if (isRecipient && recepientCheck[0].status === 'pending') {
      await connection.query(
        'UPDATE document_sharing SET status = "accepted", processed_at = NOW() WHERE document_id = ? AND user_id = ?',
        [id, user.id]
      );
      doc.read_status = 'accepted';
    }

    // 4. Get recipient list if admin or sender
    if (isAdmin || isSender) {
      const [recipients]: any = await connection.query(`
        SELECT ds.*, u.full_name, u.username, u.department, u.position
        FROM document_sharing ds
        JOIN users u ON ds.user_id = u.id
        WHERE ds.document_id = ?`, [id]);
      doc.recipients = recipients;
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    const { id } = await params;
    connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT file_path, sender_id FROM documents WHERE id = ?', [id]);
    if (!rows[0]) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    if (user.role !== 'admin' && rows[0].sender_id !== user.id) {
      return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
    }

    if (rows[0].file_path) {
      await fs.unlink(path.join(process.cwd(), 'public', rows[0].file_path)).catch(() => { });
    }

    await connection.query('DELETE FROM documents WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    const { id } = await params;
    const body = await request.json();
    const { number, type, name, summary, issued_date, category } = body;

    connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT sender_id FROM documents WHERE id = ?', [id]);
    if (!rows[0]) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    if (user.role !== 'admin' && rows[0].sender_id !== user.id) {
      return NextResponse.json({ error: 'Không có quyền sửa' }, { status: 403 });
    }

    await connection.query(
      'UPDATE documents SET number = ?, type = ?, name = ?, summary = ?, issued_date = ?, category = ? WHERE id = ?',
      [number, type || null, name, summary || null, issued_date || null, category || 'other', id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Số hiệu văn bản này đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    const { id } = await params;
    const body = await request.json();
    const { is_important } = body;

    if (typeof is_important !== 'boolean') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    connection = await pool.getConnection();

    // Check document access
    const [rows]: any = await connection.query('SELECT sender_id FROM documents WHERE id = ?', [id]);
    if (!rows[0]) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const [recepientCheck]: any = await connection.query(
      'SELECT id FROM document_sharing WHERE document_id = ? AND user_id = ?',
      [id, user.id]
    );

    const isRecipient = recepientCheck.length > 0;
    const isSender = rows[0].sender_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isSender && !isRecipient) {
      return NextResponse.json({ error: 'Không có quyền thực hiện' }, { status: 403 });
    }

    await connection.query('UPDATE documents SET is_important = ? WHERE id = ?', [is_important, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}