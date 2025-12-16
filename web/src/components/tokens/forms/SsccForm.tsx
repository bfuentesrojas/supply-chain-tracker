'use client'

import { useState } from 'react'
import { StorageCondition } from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
import { SsccBuilderInput, SsccContentInput, getCurrentISODate, generateSSCCCheckDigit } from '@/builders/pharma'

interface SsccFormProps {
  onSubmit: (data: SsccBuilderInput) => void
  isLoading?: boolean
  availablePtLotes?: Token[]  // Productos terminados disponibles
}

export function SsccForm({ onSubmit, isLoading, availablePtLotes = [] }: SsccFormProps) {
  const [formData, setFormData] = useState<Omit<SsccBuilderInput, 'contents'>>({
    sscc: '',
    gtin: '',
    packagingType: 'pallet',
    packagingQuantity: 1,
    grossWeight: undefined,
    netWeight: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    shipmentDate: getCurrentISODate(),
    originName: '',
    originGln: '',
    originAddress: '',
    destinationName: '',
    destinationGln: '',
    destinationAddress: '',
    storageCondition: StorageCondition.AMBIENT,
    minTemp: 15,
    maxTemp: 25
  })

  const [contents, setContents] = useState<SsccContentInput[]>([])
  const [newContent, setNewContent] = useState<Partial<SsccContentInput>>({
    tokenId: 0,
    batchNumber: '',
    quantity: 1
  })

  const handleChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerateSSCC = () => {
    // Generar SSCC ejemplo: extensión(1) + GS1 prefix(7) + serial(9)
    const extension = '0'
    const gs1Prefix = '7800001' // Prefijo ejemplo para Chile
    const serial = String(Date.now()).slice(-9)
    const sscc17 = extension + gs1Prefix + serial
    try {
      const sscc = generateSSCCCheckDigit(sscc17)
      handleChange('sscc', sscc)
    } catch (e) {
      console.error('Error generando SSCC:', e)
    }
  }

  const handleAddContent = () => {
    if (newContent.tokenId && newContent.batchNumber && newContent.quantity) {
      setContents(prev => [...prev, {
        tokenId: newContent.tokenId!,
        batchNumber: newContent.batchNumber!,
        quantity: newContent.quantity!
      }])
      setNewContent({ tokenId: 0, batchNumber: '', quantity: 1 })
    }
  }

  const handleRemoveContent = (index: number) => {
    setContents(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      contents
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificación SSCC */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📦 Identificación SSCC</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">SSCC (18 dígitos) *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.sscc}
                onChange={(e) => handleChange('sscc', e.target.value)}
                className="input-field font-mono flex-1"
                placeholder="000000000000000000"
                maxLength={18}
                required
              />
              <button
                type="button"
                onClick={handleGenerateSSCC}
                className="btn-secondary px-3"
                title="Generar SSCC"
              >
                🎲
              </button>
            </div>
          </div>
          <div>
            <label className="label">GTIN (opcional)</label>
            <input
              type="text"
              value={formData.gtin}
              onChange={(e) => handleChange('gtin', e.target.value)}
              className="input-field font-mono"
              placeholder="14 dígitos"
              maxLength={14}
            />
          </div>
        </div>
      </div>

      {/* Embalaje */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📏 Información del Embalaje</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Tipo de Embalaje *</label>
            <select
              value={formData.packagingType}
              onChange={(e) => handleChange('packagingType', e.target.value)}
              className="select-field"
              required
            >
              <option value="pallet">Pallet</option>
              <option value="caja">Caja</option>
              <option value="contenedor">Contenedor</option>
              <option value="bolsa">Bolsa</option>
              <option value="tambor">Tambor</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad de Unidades *</label>
            <input
              type="number"
              value={formData.packagingQuantity}
              onChange={(e) => handleChange('packagingQuantity', Number(e.target.value))}
              className="input-field"
              min="1"
              required
            />
          </div>
          <div>
            <label className="label">Peso Bruto (kg)</label>
            <input
              type="number"
              value={formData.grossWeight ?? ''}
              onChange={(e) => handleChange('grossWeight', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="label">Peso Neto (kg)</label>
            <input
              type="number"
              value={formData.netWeight ?? ''}
              onChange={(e) => handleChange('netWeight', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="0"
              step="0.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="label">Largo (cm)</label>
            <input
              type="number"
              value={formData.length ?? ''}
              onChange={(e) => handleChange('length', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="0"
            />
          </div>
          <div>
            <label className="label">Ancho (cm)</label>
            <input
              type="number"
              value={formData.width ?? ''}
              onChange={(e) => handleChange('width', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="0"
            />
          </div>
          <div>
            <label className="label">Alto (cm)</label>
            <input
              type="number"
              value={formData.height ?? ''}
              onChange={(e) => handleChange('height', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📋 Contenido del SSCC</h3>
        
        {contents.length > 0 && (
          <div className="mb-4 space-y-2">
            {contents.map((content, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-surface-200">
                <div className="flex-1">
                  <p className="font-medium text-surface-800">
                    Token #{content.tokenId}
                  </p>
                  <p className="text-sm text-surface-500">
                    Lote: {content.batchNumber} • Cantidad: {content.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveContent(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-white rounded-lg border-2 border-dashed border-surface-300">
          <p className="text-sm font-medium text-surface-600 mb-3">Agregar contenido:</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              {availablePtLotes.length > 0 ? (
                <select
                  value={newContent.tokenId || ''}
                  onChange={(e) => setNewContent(prev => ({ ...prev, tokenId: Number(e.target.value) }))}
                  className="select-field"
                >
                  <option value="">Seleccionar Token</option>
                  {availablePtLotes.map(token => (
                    <option key={token.id.toString()} value={Number(token.id)}>
                      #{token.id.toString()} - {token.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={newContent.tokenId || ''}
                  onChange={(e) => setNewContent(prev => ({ ...prev, tokenId: Number(e.target.value) }))}
                  className="input-field"
                  placeholder="Token ID"
                  min="1"
                />
              )}
            </div>
            <div>
              <input
                type="text"
                value={newContent.batchNumber}
                onChange={(e) => setNewContent(prev => ({ ...prev, batchNumber: e.target.value }))}
                className="input-field"
                placeholder="Número de Lote"
              />
            </div>
            <div>
              <input
                type="number"
                value={newContent.quantity || ''}
                onChange={(e) => setNewContent(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="input-field"
                placeholder="Cantidad"
                min="1"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddContent}
                className="btn-secondary w-full"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logística */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🚚 Información Logística</h3>
        <div className="mb-4">
          <label className="label">Fecha de Envío</label>
          <input
            type="date"
            value={formData.shipmentDate}
            onChange={(e) => handleChange('shipmentDate', e.target.value)}
            className="input-field max-w-xs"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Origen */}
          <div className="p-4 bg-white rounded-lg">
            <p className="font-medium text-surface-800 mb-3">📍 Origen</p>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.originName}
                onChange={(e) => handleChange('originName', e.target.value)}
                className="input-field"
                placeholder="Nombre del origen *"
                required
              />
              <input
                type="text"
                value={formData.originGln}
                onChange={(e) => handleChange('originGln', e.target.value)}
                className="input-field font-mono"
                placeholder="GLN (13 dígitos)"
                maxLength={13}
              />
              <input
                type="text"
                value={formData.originAddress}
                onChange={(e) => handleChange('originAddress', e.target.value)}
                className="input-field"
                placeholder="Dirección"
              />
            </div>
          </div>
          {/* Destino */}
          <div className="p-4 bg-white rounded-lg">
            <p className="font-medium text-surface-800 mb-3">🎯 Destino</p>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.destinationName}
                onChange={(e) => handleChange('destinationName', e.target.value)}
                className="input-field"
                placeholder="Nombre del destino"
              />
              <input
                type="text"
                value={formData.destinationGln}
                onChange={(e) => handleChange('destinationGln', e.target.value)}
                className="input-field font-mono"
                placeholder="GLN (13 dígitos)"
                maxLength={13}
              />
              <input
                type="text"
                value={formData.destinationAddress}
                onChange={(e) => handleChange('destinationAddress', e.target.value)}
                className="input-field"
                placeholder="Dirección"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Almacenamiento */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🌡️ Condiciones de Transporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Condición *</label>
            <select
              value={formData.storageCondition}
              onChange={(e) => handleChange('storageCondition', e.target.value as StorageCondition)}
              className="select-field"
              required
            >
              <option value={StorageCondition.AMBIENT}>Ambiente</option>
              <option value={StorageCondition.REFRIGERATED}>Refrigerado</option>
              <option value={StorageCondition.FROZEN}>Congelado</option>
              <option value={StorageCondition.CONTROLLED}>Controlado</option>
            </select>
          </div>
          <div>
            <label className="label">Temp. Mín (°C)</label>
            <input
              type="number"
              value={formData.minTemp ?? ''}
              onChange={(e) => handleChange('minTemp', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Temp. Máx (°C)</label>
            <input
              type="number"
              value={formData.maxTemp ?? ''}
              onChange={(e) => handleChange('maxTemp', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {contents.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          ⚠️ Debes agregar al menos un contenido al SSCC.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || contents.length === 0}
        className="btn-primary w-full"
      >
        {isLoading ? 'Generando...' : 'Generar Features JSON'}
      </button>
    </form>
  )
}




