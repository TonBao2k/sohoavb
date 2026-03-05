import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../../../../lib/middleware';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    let connection;
    try {
        const authResult = await authMiddleware(request as any);
        if (authResult) return authResult;
        const user = (request as any).user;
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin có quyền sửa tài khoản' }, { status: 403 });
        }

        const { id } = await params;
        if (!id || isNaN(Number(id))) {
            console.error('PUT user error: Invalid ID', id);
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const { username, full_name, email, password, role } = await request.json();
        console.log('PUT user data:', { username, full_name, email, password, role }); // Debug log

        if (!username || !full_name || !email || !['admin', 'user'].includes(role)) {
            console.error('PUT user error: Missing or invalid data', { username, full_name, email, role });
            return NextResponse.json({ error: 'Thiếu hoặc thông tin không hợp lệ' }, { status: 400 });
        }

        connection = await pool.getConnection();
        const [rows]: any = await connection.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!rows[0]) {
            console.error('PUT user error: User not found', id);
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
        }

        const updates: any = { username, full_name, email, role };
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
            console.log('Hashed password:', updates.password); // Debug log
        }

        await connection.query(
            `UPDATE users SET username = ?, full_name = ?, email = ?, role = ?${password ? ', password = ?' : ''} WHERE id = ?`,
            password ? [username, full_name, email, role, updates.password, id] : [username, full_name, email, role, id]
        );
        console.log('User updated:', { id, username, email, role }); // Debug log
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PUT user error:', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    let connection;
    try {
        const authResult = await authMiddleware(_ as any);
        if (authResult) return authResult;
        const user = (_ as any).user;
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin có quyền xóa tài khoản' }, { status: 403 });
        }

        const { id } = await params;
        if (!id || isNaN(Number(id))) {
            console.error('DELETE user error: Invalid ID', id);
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        connection = await pool.getConnection();
        const [rows]: any = await connection.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!rows[0]) {
            console.error('DELETE user error: User not found', id);
            return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
        }

        await connection.query('DELETE FROM users WHERE id = ?', [id]);
        console.log('User deleted:', id); // Debug log
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE user error:', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}