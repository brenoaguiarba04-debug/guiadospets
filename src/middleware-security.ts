import { type NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/security-headers';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    if (request.nextUrl.pathname.startsWith('/api/')) {
        addSecurityHeaders(response);
    }

    return response;
}

export const config = {
    matcher: [
        '/api/:path*',
    ],
};
