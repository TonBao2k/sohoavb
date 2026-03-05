import { NextResponse } from 'next/server';
import pool from '../../../lib/mysql';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin có quyền truy cập' }, { status: 403 });
        }

        connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT id, username, full_name, email, role, created_at FROM users');
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('GET users error:', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function POST(request: Request) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin có quyền tạo tài khoản' }, { status: 403 });
        }

        const { username, full_name, email, password, role } = await request.json();
        console.log('POST user data:', { username, full_name, email, password, role }); // Debug log

        if (!username || !full_name || !email || !password || !['admin', 'user'].includes(role)) {
            console.error('POST user error: Missing or invalid data', { username, full_name, email, password, role });
            return NextResponse.json({ error: 'Thiếu hoặc thông tin không hợp lệ' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed password:', hashedPassword); // Debug log

        connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO users (username, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, full_name, email, hashedPassword, role]
        );
        console.log('User inserted:', { username, email, role }); // Debug log
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('POST user error:', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}