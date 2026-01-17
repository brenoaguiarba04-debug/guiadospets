import Link from 'next/link'

export default function Footer() {
    return (
        <footer className="bg-gray-800 text-gray-300 mt-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center space-y-4">
                    <p className="text-lg">
                        🐾 <span className="font-bold text-white">GuiaDoPet</span> - O melhor para o seu melhor amigo.
                    </p>
                    <div className="flex justify-center gap-4 text-sm">
                        <Link href="#" className="hover:text-white transition-colors">
                            Sobre
                        </Link>
                        <span>·</span>
                        <Link href="#" className="hover:text-white transition-colors">
                            Contato
                        </Link>
                        <span>·</span>
                        <Link href="#" className="hover:text-white transition-colors">
                            Política de Privacidade
                        </Link>
                    </div>
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} GuiaDoPet. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </footer>
    )
}
