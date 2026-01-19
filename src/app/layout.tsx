import type { Metadata } from "next";
import { Nunito, Titan_One } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Wishlist from "@/components/Wishlist";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const titanOne = Titan_One({
  variable: "--font-titan",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuiaDoPet - Compare Preços de Produtos Pet",
  description: "Compare preços de rações, medicamentos e acessórios para seu pet. Encontre as melhores ofertas em lojas confiáveis.",
  keywords: "pet, ração, cachorro, gato, preços, comparação, petshop, bravecto, nexgard",
  openGraph: {
    title: "GuiaDoPet - Compare Preços",
    description: "O melhor comparador de preços para produtos pet do Brasil.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <head>
          <GoogleAnalytics />
        </head>
        <body className={`${nunito.variable} ${titanOne.variable} font-sans antialiased bg-white`}>
          {children}
          <Wishlist />
        </body>
      </html>
    </ClerkProvider>
  );
}
