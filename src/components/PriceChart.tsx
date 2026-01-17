'use client'

import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

interface PriceHistoryData {
    data: string
    preco: number
    loja: string
}

interface PriceChartProps {
    historico: PriceHistoryData[]
    lojas: string[]
}

const CORES_LOJAS: Record<string, { bg: string; border: string }> = {
    'Shopee': { bg: 'rgba(255, 87, 34, 0.1)', border: 'rgb(255, 87, 34)' },
    'Amazon': { bg: 'rgba(255, 153, 0, 0.1)', border: 'rgb(255, 153, 0)' },
    'Petz': { bg: 'rgba(76, 175, 80, 0.1)', border: 'rgb(76, 175, 80)' },
    'Cobasi': { bg: 'rgba(33, 150, 243, 0.1)', border: 'rgb(33, 150, 243)' },
    'Petlove': { bg: 'rgba(156, 39, 176, 0.1)', border: 'rgb(156, 39, 176)' },
}

export default function PriceChart({ historico, lojas }: PriceChartProps) {
    if (!historico || historico.length === 0) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-gray-500 text-sm">
                    Histórico de preços será exibido após algumas atualizações
                </p>
            </div>
        )
    }

    // Agrupa por data
    const datasUnicas = [...new Set(historico.map(h => h.data))].sort()

    // Cria dataset para cada loja
    const datasets = lojas.map(loja => {
        const cores = CORES_LOJAS[loja] || { bg: 'rgba(128, 128, 128, 0.1)', border: 'rgb(128, 128, 128)' }

        const precosPorData = datasUnicas.map(data => {
            const registro = historico.find(h => h.data === data && h.loja === loja)
            return registro?.preco || null
        })

        return {
            label: loja,
            data: precosPorData,
            borderColor: cores.border,
            backgroundColor: cores.bg,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
        }
    })

    const data = {
        labels: datasUnicas.map(d => {
            const date = new Date(d)
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        }),
        datasets,
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context: { dataset: { label?: string }; parsed: { y: number | null } }) {
                        const label = context.dataset.label || ''
                        const value = context.parsed.y
                        if (value !== null) {
                            return `${label}: R$ ${value.toFixed(2).replace('.', ',')}`
                        }
                        return `${label}: N/A`
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                ticks: {
                    callback: function (value: string | number) {
                        return 'R$ ' + Number(value).toFixed(0)
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                📈 Histórico de Preços (últimos 30 dias)
            </h3>
            <div className="h-64">
                <Line data={data} options={options} />
            </div>
        </div>
    )
}
