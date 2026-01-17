import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <div className="text-8xl mb-4">🐾</div>
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">404</h1>
                <p className="text-gray-600 mb-6">Produto não encontrado</p>
                <Link
                    href="/"
                    className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-colors"
                >
                    Voltar ao início
                </Link>
            </div>
        </div>
    )
}
