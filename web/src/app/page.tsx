'use client'

import { useWeb3 } from '@/contexts/Web3Context'
import Link from 'next/link'

export default function Home() {
  const { isConnected, account, connectWallet } = useWeb3()

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        {/* Background decorativo */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="text-gradient">Supply Chain</span>
            <br />
            <span className="text-surface-800">Tracker</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-surface-600 mb-10 max-w-3xl mx-auto animate-slide-up">
            Gestiona tu cadena de suministros de forma transparente, segura y descentralizada 
            utilizando la tecnología blockchain de Ethereum.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {!isConnected ? (
              <button onClick={connectWallet} className="btn-primary text-lg">
                Conectar Wallet
              </button>
            ) : (
              <Link href="/dashboard" className="btn-primary text-lg">
                Ir al Dashboard
              </Link>
            )}
            <Link href="/track" className="btn-secondary text-lg">
              Rastrear Producto
            </Link>
          </div>

          {isConnected && (
            <p className="mt-6 text-surface-500 animate-fade-in">
              Conectado: <span className="font-mono text-primary-600">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-surface-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-surface-800">
            Características Principales
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-surface-800">Trazabilidad Total</h3>
              <p className="text-surface-600">
                Rastrea cada producto desde su origen hasta el consumidor final con registros inmutables en blockchain.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-accent-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <svg className="w-7 h-7 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-surface-800">Gestión de Roles</h3>
              <p className="text-surface-600">
                Fabricantes, distribuidores, minoristas y consumidores con permisos específicos para cada etapa.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-surface-800">Verificación Instantánea</h3>
              <p className="text-surface-600">
                Verifica la autenticidad y el historial de cualquier producto en segundos con su ID único.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-surface-800">
            ¿Cómo Funciona?
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Registro', desc: 'Regístrate como participante en la cadena' },
              { step: '2', title: 'Creación', desc: 'Los fabricantes crean productos con información detallada' },
              { step: '3', title: 'Transferencia', desc: 'Transfiere productos entre participantes de la cadena' },
              { step: '4', title: 'Verificación', desc: 'Cualquiera puede verificar el historial del producto' },
            ].map((item, index) => (
              <div key={item.step} className="text-center" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-surface-800">{item.title}</h3>
                <p className="text-surface-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Listo para comenzar?
          </h2>
          <p className="text-xl mb-8 text-white/80">
            Conecta tu wallet y empieza a gestionar tu cadena de suministros de forma descentralizada.
          </p>
          {!isConnected ? (
            <button onClick={connectWallet} className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-surface-100 transition-all duration-300 shadow-lg hover:shadow-xl">
              Conectar Wallet
            </button>
          ) : (
            <Link href="/dashboard" className="inline-block px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-surface-100 transition-all duration-300 shadow-lg hover:shadow-xl">
              Ir al Dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}







