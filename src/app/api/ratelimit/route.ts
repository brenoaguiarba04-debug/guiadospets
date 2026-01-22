import { type NextRequest, NextResponse } from 'next/server';
import { sanitizeInput, sanitizeUrl } from '@/lib/security';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const endpoint = searchParams.get('endpoint') || 'unknown';

    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 60;

    const key = `ratelimit:${ip}:${endpoint}`;
    const record = global.rateLimitStore?.get(key);

    if (!record || now > record.resetTime) {
        if (!global.rateLimitStore) {
            global.rateLimitStore = new Map();
        }
        global.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });

        return NextResponse.json({
            success: true,
            remaining: maxRequests - 1,
            limit: maxRequests,
        });
    }

    if (record.count >= maxRequests) {
        return NextResponse.json(
            {
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            },
            { status: 429 }
        );
    }

    record.count++;

    return NextResponse.json({
        success: true,
        remaining: maxRequests - record.count,
        limit: maxRequests,
    });
}

export async function POST(request: NextRequest) {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
        try {
            const body = await request.json();
            const sanitizedBody: Record<string, unknown> = {};

            for (const [key, value] of Object.entries(body)) {
                if (typeof value === 'string') {
                    sanitizedBody[key] = sanitizeInput(value);
                } else {
                    sanitizedBody[key] = value;
                }
            }

            return NextResponse.json({ sanitized: true, data: sanitizedBody });
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
}

declare global {
    var rateLimitStore: Map<string, { count: number; resetTime: number }> | undefined;
}
