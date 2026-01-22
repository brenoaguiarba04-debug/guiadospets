describe('Security Sanitization', () => {
    describe('Input Sanitization', () => {
        function sanitizeInput(input: string): string {
            return input
                .replace(/</g, '')
                .replace(/>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .trim();
        }

        it('removes HTML tags from input', () => {
            const input = '<script>alert("xss")</script>Test';
            const sanitized = sanitizeInput(input);
            expect(sanitized.includes('<script>')).toBe(false);
            expect(sanitized.includes('</script>')).toBe(false);
            expect(sanitized).toBe('scriptalert("xss")/scriptTest');
        });

        it('removes javascript protocol', () => {
            const input = 'javascript:alert("xss")';
            const sanitized = sanitizeInput(input);
            expect(sanitized.includes('javascript')).toBe(false);
        });

        it('removes event handlers', () => {
            const input = '<img onerror="alert(1)" src="x">';
            const sanitized = sanitizeInput(input);
            expect(sanitized.includes('onerror=')).toBe(false);
        });

        it('handles normal text', () => {
            const input = 'Normal text without special characters';
            const sanitized = sanitizeInput(input);
            expect(sanitized).toBe(input);
        });
    });

    describe('URL Sanitization', () => {
        function sanitizeUrl(url: string): string | null {
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

        it('accepts valid HTTPS URLs', () => {
            const url = 'https://example.com';
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBe('https://example.com/');
        });

        it('accepts valid HTTP URLs', () => {
            const url = 'http://example.com';
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBe('http://example.com/');
        });

        it('rejects javascript protocol', () => {
            const url = 'javascript:alert(1)';
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBeNull();
        });

        it('rejects data URLs', () => {
            const url = 'data:text/html,<script>alert(1)</script>';
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBeNull();
        });

        it('handles invalid URLs', () => {
            const url = 'not-a-url';
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBeNull();
        });
    });

    describe('Price Formatting', () => {
        function formatPrice(price: number): string {
            return `R$ ${price.toFixed(2).replace('.', ',')}`;
        }

        it('formats price correctly', () => {
            expect(formatPrice(99.90)).toBe('R$ 99,90');
        });

        it('handles zero', () => {
            expect(formatPrice(0)).toBe('R$ 0,00');
        });

        it('handles large numbers', () => {
            expect(formatPrice(1234.56)).toBe('R$ 1234,56');
        });

        it('handles small decimals', () => {
            expect(formatPrice(0.01)).toBe('R$ 0,01');
        });
    });
});

describe('URL Construction', () => {
    function buildProductUrl(baseUrl: string, produtoId: number): string {
        return `${baseUrl}/produto/${produtoId}`;
    }

    function buildCategoryUrl(baseUrl: string, category: string): string {
        return `${baseUrl}/categoria/${category}`;
    }

    function buildBrandUrl(baseUrl: string, brand: string): string {
        return `${baseUrl}/marca/${brand}`;
    }

    it('builds product URLs correctly', () => {
        expect(buildProductUrl('https://guiadopet.com.br', 123))
            .toBe('https://guiadopet.com.br/produto/123');
    });

    it('builds category URLs correctly', () => {
        expect(buildCategoryUrl('https://guiadopet.com.br', 'racoes'))
            .toBe('https://guiadopet.com.br/categoria/racoes');
    });

    it('builds brand URLs correctly', () => {
        expect(buildBrandUrl('https://guiadopet.com.br', 'royal-canin'))
            .toBe('https://guiadopet.com.br/marca/royal-canin');
    });
});

describe('Rate Limiting Logic', () => {
    interface RateLimitRecord {
        count: number;
        resetTime: number;
    }

    function checkRateLimit(
        record: RateLimitRecord | undefined,
        maxRequests: number,
        windowMs: number
    ): { allowed: boolean; remaining: number; resetTime: number } {
        const now = Date.now();

        if (!record || now > record.resetTime) {
            return {
                allowed: true,
                remaining: maxRequests - 1,
                resetTime: now + windowMs,
            };
        }

        if (record.count >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: record.resetTime,
            };
        }

        return {
            allowed: true,
            remaining: maxRequests - record.count - 1,
            resetTime: record.resetTime,
        };
    }

    it('allows first request', () => {
        const result = checkRateLimit(undefined, 60, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(59);
    });

    it('allows requests within limit', () => {
        const record = { count: 10, resetTime: Date.now() + 60000 };
        const result = checkRateLimit(record, 60, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(49);
    });

    it('blocks requests at limit', () => {
        const record = { count: 60, resetTime: Date.now() + 60000 };
        const result = checkRateLimit(record, 60, 60000);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('resets after window expires', () => {
        const record = { count: 60, resetTime: Date.now() - 1000 };
        const result = checkRateLimit(record, 60, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(59);
    });
});
