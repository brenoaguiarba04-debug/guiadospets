'use client'

import Script from 'next/script'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

// Função para rastrear eventos personalizados
export function trackEvent(action: string, category: string, label: string, value?: number) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        })
    }
}

// Função específica para rastrear cliques em links de afiliado
export function trackAffiliateClick(loja: string, productName: string, price: number) {
    trackEvent('click', 'affiliate', `${loja} - ${productName}`, Math.round(price))

    // Também envia como conversão
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'purchase_intent', {
            currency: 'BRL',
            value: price,
            items: [{
                item_name: productName,
                affiliation: loja,
                price: price,
            }]
        })
    }
}

export default function GoogleAnalytics() {
    if (!GA_ID) {
        return null // Não renderiza nada se não tiver ID configurado
    }

    return (
        <>
            {/* Google Analytics 4 */}
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_ID}', {
                        page_title: document.title,
                        send_page_view: true
                    });
                `}
            </Script>
        </>
    )
}
