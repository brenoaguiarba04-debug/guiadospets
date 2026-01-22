'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
    ttfb: number;
}

export default function PerformanceMonitor() {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            const fcp = entries.find((e) => e.name === 'first-contentful-paint')?.startTime || 0;
            const lcp = entries.find((e) => e.name === 'largest-contentful-paint')?.startTime || 0;
            const cls = entries.reduce((sum, e) => {
                if ((e as any).hadRecentInput) return sum;
                if (e.entryType === 'layout-shift') {
                    return sum + (e as any).value;
                }
                return sum;
            }, 0);

            setMetrics({
                fcp: Math.round(fcp),
                lcp: Math.round(lcp),
                cls: Math.round(cls * 1000) / 1000,
                fid: 0,
                ttfb: 0,
            });
        });

        try {
            observer.observe({ type: 'paint', buffered: true });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
            observer.observe({ type: 'layout-shift', buffered: true });
        } catch {
        }

        return () => observer.disconnect();
    }, []);

    if (!metrics) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
            <div className="font-bold mb-2">Core Web Vitals</div>
            <div>FCP: {metrics.fcp}ms</div>
            <div>LCP: {metrics.lcp}ms</div>
            <div>CLS: {metrics.cls}</div>
            <div>TTFB: {Math.round(metrics.ttfb)}ms</div>
        </div>
    );
}
