import { NextResponse } from 'next/server';
import pool from '../../../lib/mysql';
import { authMiddleware } from '../../../lib/middleware';
import path from 'path';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

export const dynamic = 'force-dynamic';

// GET all documents for Admin, or personal documents list
export async function GET(request: Request) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    connection = await pool.getConnection();

    let query = '';
    let params: any[] = [];

    if (user.role === 'admin') {
      // Admin sees everything
      query = `
        SELECT d.*, u.full_name as sender_name 
        FROM documents d 
        LEFT JOIN users u ON d.sender_id = u.id 
        ORDER BY d.created_at DESC`;
    } else {
      // Users see documents they sent OR documents shared with them (and accepted)
      query = `
        SELECT DISTINCT d.*, u.full_name as sender_name 
        FROM documents d 
        LEFT JOIN users u ON d.sender_id = u.id 
        LEFT JOIN document_sharing ds ON d.id = ds.document_id
        WHERE d.sender_id = ? OR (ds.user_id = ? AND ds.status = 'accepted')
        ORDER BY d.created_at DESC`;
      params = [user.id, user.id];
    }

    const [rows] = await connection.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET documents error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST share: Upload and distribute to one or more users
export async function POST(request: Request) {
  let connection;
  try {
    const authResult = await authMiddleware(request as any);
    if (authResult) return authResult;
    const user = (request as any).user;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const number = formData.get('number') as string;
    const type = formData.get('type') as string;
    const name = formData.get('name') as string;
    const summary = formData.get('summary') as string;
    const issued_date = formData.get('issued_date') as string;
    const category = formData.get('category') as string || 'other';
    const recipientIdsString = formData.get('recipient_ids') as string; // JSON array string

    if (!file || !number || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert document
    const [docResult]: any = await connection.query(
      'INSERT INTO documents (number, type, name, summary, file_path, file_name_original, file_size, user_id, sender_id, issued_date, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [number, type || null, name, summary || null, `/uploads/${fileName}`, file.name, file.size, user.id, user.id, issued_date || null, category]
    );

    const documentId = docResult.insertId;

    // 2. Insert recipients with status 'pending' and notifications
    if (recipientIdsString) {
      const recipientIds: number[] = JSON.parse(recipientIdsString);
      if (Array.isArray(recipientIds) && recipientIds.length > 0) {
        for (const recipientId of recipientIds) {
          await connection.query(
            'INSERT INTO document_sharing (document_id, user_id, status) VALUES (?, ?, ?)',
            [documentId, recipientId, 'pending']
          );

          // Create notification
          await connection.query(
            'INSERT INTO notifications (user_id, sender_id, doc_id, type, message) VALUES (?, ?, ?, ?, ?)',
            [recipientId, user.id, documentId, 'share_request', `${user.username} đã gửi cho bạn một văn bản: ${name}`]
          );
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('POST document share error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Số hiệu văn bản này đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}