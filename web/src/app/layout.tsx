import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/contexts/Web3Context'
import { Navbar } from '@/components/Navbar'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Supply Chain Tracker - dApp',
  description: 'Aplicación descentralizada para gestión de cadena de suministros',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Web3Provider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="py-6 text-center text-surface-500 text-sm border-t border-surface-200">
              <p>Supply Chain Tracker © 2025</p>
            </footer>
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}

