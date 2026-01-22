import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function rateLimitMiddleware(request: Request) {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_middleware_${ip}`);

    if (!success) {
        return NextResponse.json(
            {
                error: 'Too many requests',
                message: 'Você excedeu o limite de requisições. Tente novamente em alguns segundos.',
                limit,
                reset,
                remaining,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': '60',
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                },
            }
        );
    }

    return null;
}

export async function sanitizeInput(input: string): Promise<string> {
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

export function sanitizeUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return parsed.toString();
        }
        return null;
    } catch {
        return null;
    }
}
