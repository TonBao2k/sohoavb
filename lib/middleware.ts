import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function authMiddleware(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('Middleware: Token received:', token); // Add this
    if (!token) {
        console.log('Middleware: No token provided');
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { id: number; username: string; role: string };
        console.log('Middleware: Token decoded:', decoded); // Add this
        (request as any).user = decoded;
        return null;
    } catch (error) {
        console.error('Middleware: Token verification failed:', error); // Add this
        return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }
}