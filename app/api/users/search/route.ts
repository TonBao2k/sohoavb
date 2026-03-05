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

        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';

        connection = await pool.getConnection();
        // Allow users to find potential recipients. 
        // In a real gov app, this would filter by department.
        const [rows] = await connection.query(
            'SELECT id, username, full_name, role, department, position FROM users WHERE (username LIKE ? OR full_name LIKE ?) AND id != ? LIMIT 10',
            [`%${query}%`, `%${query}%`, user.id]
        );
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('GET users search error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
