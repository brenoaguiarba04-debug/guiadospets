import { type NextRequest, NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const cached = global.cacheStore?.get(key);

    if (cached) {
        return NextResponse.json({ data: cached.data, timestamp: cached.timestamp });
    }

    return NextResponse.json({ data: null, timestamp: null });
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { key, data, timestamp } = body;

    if (!key || data === undefined) {
        return NextResponse.json({ error: 'Key and data are required' }, { status: 400 });
    }

    if (!global.cacheStore) {
        global.cacheStore = new Map();
    }

    global.cacheStore.set(key, { data, timestamp: timestamp || Date.now() });

    if (global.cacheStore.size > 1000) {
        const firstKey = global.cacheStore.keys().next().value;
        if (firstKey) {
            global.cacheStore.delete(firstKey);
        }
    }

    return NextResponse.json({ success: true });
}

declare global {
    var cacheStore: Map<string, { data: unknown; timestamp: number }> | undefined;
}
