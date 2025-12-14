'use client'

import { useRouter } from 'next/navigation'
import { AccessGate } from '@/components/AccessGate'
import { CreateTokenWizard } from '@/components/tokens'

function CreateTokenContent() {
  const router = useRouter()

  const handleSuccess = (tokenId: bigint) => {
    console.log('Token creado:', tokenId.toString())
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-800">Crear Nuevo Token</h1>
        <p className="text-surface-600 mt-2">
          Registra productos, materias primas, lotes y unidades logísticas en la blockchain
        </p>
      </div>

      <CreateTokenWizard 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default function CreateTokenPage() {
  return (
    <AccessGate requireApproval={true}>
      <CreateTokenContent />
    </AccessGate>
  )
}
