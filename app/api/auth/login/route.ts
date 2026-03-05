import { NextResponse } from 'next/server';
import pool from '../../../../lib/mysql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
    let connection;
    try {
        const { username, password } = await request.json();
        console.log('Login attempt:', { username, password }); // Debug log
        if (!username || !password) {
            console.error('Login error: Missing username or password');
            return NextResponse.json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' }, { status: 400 });
        }

        connection = await pool.getConnection();
        console.log('Database connection acquired');

        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
        const users = rows as any[];
        console.log('Query result rows:', users.length);

        if (!users[0]) {
            console.error('Login error: User not found');
            return NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 401 });
        }

        const match = await bcrypt.compare(password, users[0].password);
        console.log('Password match result:', match, 'Stored hash:', users[0].password); // Debug log

        if (!match) {
            console.error('Login error: Password mismatch');
            return NextResponse.json({ error: 'Mật khẩu không đúng' }, { status: 401 });
        }

        const token = jwt.sign(
            { id: users[0].id, username: users[0].username, role: users[0].role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '7d' }
        );

        console.log('JWT token generated successfully');
        return NextResponse.json({ success: true, token, user: { id: users[0].id, username: users[0].username, role: users[0].role } });
    } catch (error: any) {
        console.error('Login error details:', error.message, error.stack);
        return NextResponse.json({ error: `Lỗi server: ${error.message}` }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
            console.log('Database connection released');
        }
    }
}