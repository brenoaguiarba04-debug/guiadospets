import { supabase } from './supabase';

const SWR_CONFIG = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
    dedupingInterval: 5000,
    errorRetryCount: 3,
};

export async function fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000
): Promise<T> {
    try {
        const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`, {
            method: 'GET',
        });

        if (response.ok) {
            const cached = await response.json();
            if (cached.data && Date.now() - cached.timestamp < ttl) {
                return cached.data;
            }
        }

        const data = await fetcher();

        await fetch('/api/cache', {
            method: 'POST',
            body: JSON.stringify({ key, data, timestamp: Date.now() }),
        });

        return data;
    } catch (error) {
        console.error('Cache fetch error:', error);
        return fetcher();
    }
}

export async function getCachedProducts(category?: string) {
    const key = category ? `products:${category}` : 'products:all';
    return fetchWithCache(key, async () => {
        let query = supabase.from('produtos').select('*').order('id', { ascending: false });

        if (category) {
            query = query.ilike('categoria', `%${category}%`);
        }

        const { data } = await query;
        return data || [];
    }, 300000);
}

export async function getCachedPrices(produtoId: number) {
    return fetchWithCache(`prices:${produtoId}`, async () => {
        const { data } = await supabase
            .from('precos')
            .select('*')
            .eq('produto_id', produtoId)
            .order('preco', { ascending: true });
        return data || [];
    }, 180000);
}
