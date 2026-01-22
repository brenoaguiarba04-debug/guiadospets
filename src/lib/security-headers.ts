import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const contentSecurityPolicy = {
    'default-src': ["'self'"],
    'script-src': [
        "'self'",
        "'unsafe-inline'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
        "'self'",
        'https://www.google-analytics.com',
        'https://api.supabase.co',
    ],
    'frame-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
};

export function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const csp = Object.entries(contentSecurityPolicy)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    return response;
}

export async function securityMiddleware(request: NextRequest) {
    const response = NextResponse.next();
    addSecurityHeaders(response);

    if (request.nextUrl.pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const apiRateLimit = 60;

        const rateLimitKey = `ratelimit:${ip}:${request.nextUrl.pathname}`;
        const currentCount = parseInt(request.headers.get('x-ratelimit-count') || '0');

        if (currentCount > apiRateLimit) {
            return new NextResponse('Too Many Requests', { status: 429 });
        }

        response.headers.set('x-ratelimit-count', (currentCount + 1).toString());
    }

    return response;
}
