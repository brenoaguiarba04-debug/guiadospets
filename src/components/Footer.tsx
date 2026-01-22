import Link from 'next/link'
import Image from 'next/image'
import {
    Truck,
    CreditCard,
    ShieldCheck,
    Phone,
    Instagram,
    Facebook,
    Twitter,
    Mail,
    MapPin
} from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-100 pt-16 pb-8 border-t border-gray-200">
            {/* Trust Bar */}
            <div className="max-w-7xl mx-auto px-4 mb-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm">
                        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Entrega rápida</h4>
                            <p className="text-sm text-gray-500">Para todo o Brasil</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm">
                        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Parcele sua compra</h4>
                            <p className="text-sm text-gray-500">Em até 12x sem juros</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm">
                        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Site Seguro</h4>
                            <p className="text-sm text-gray-500">Proteção de dados</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm">
                        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Atendimento</h4>
                            <p className="text-sm text-gray-500">Seg. à Sex. 9h-18h</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Institucional */}
                    <div>
                        <h3 className="font-black text-gray-800 text-lg mb-4">Institucional</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Sobre o GuiaDoPet</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Trabalhe Conosco</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Parceiros</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Blog</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 font-bold">Clube de Descontos</Link></li>
                        </ul>
                    </div>

                    {/* Ajuda */}
                    <div>
                        <h3 className="font-black text-gray-800 text-lg mb-4">Ajuda</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Central de Atendimento</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Política de Entrega</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Trocas e Devoluções</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Política de Privacidade</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Termos de Uso</Link></li>
                        </ul>
                    </div>

                    {/* Destaques */}
                    <div>
                        <h3 className="font-black text-gray-800 text-lg mb-4">Destaques</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Rações Premium</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Antipulgas e Carrapatos</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Areias Sanitárias</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Farmácia Pet</Link></li>
                            <li><Link href="/" className="hover:text-purple-600 transition-colors">Acessórios</Link></li>
                        </ul>
                    </div>

                    {/* Contato e Redes */}
                    <div>
                        <h3 className="font-black text-gray-800 text-lg mb-4">Atendimento</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail size={16} />
                                <span>contato@guiadopet.com.br</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin size={16} />
                                <span>São Paulo, SP</span>
                            </div>
                        </div>

                        <h3 className="font-black text-gray-800 text-lg mb-4">Redes Sociais</h3>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm hover:text-purple-600 hover:scale-110 transition-all">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm hover:text-purple-600 hover:scale-110 transition-all">
                                <Facebook size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm hover:text-purple-600 hover:scale-110 transition-all">
                                <Twitter size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-200 pt-8 mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <p className="text-sm text-gray-500">
                                © {new Date().getFullYear()} GuiaDoPet - Comparador de Preços. CNPJ: 00.000.000/0000-00
                            </p>
                        </div>
                        <div className="flex gap-4 grayscale opacity-70">
                            {/* Placeholder for payment methods - using simple divs or text for now if no images */}
                            <div className="h-8 w-12 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">VISA</div>
                            <div className="h-8 w-12 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">MC</div>
                            <div className="h-8 w-12 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">PIX</div>
                            <div className="h-8 w-12 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">BOLETO</div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
