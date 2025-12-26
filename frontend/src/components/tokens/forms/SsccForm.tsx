'use client'

import { useState } from 'react'
import { StorageCondition } from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
import { SsccBuilderInput, getCurrentISODate, generateSSCCCheckDigit } from '@/builders/pharma'

interface SsccFormProps {
  onSubmit: (data: SsccBuilderInput) => void
  isLoading?: boolean
  availablePtLotes?: Token[]  // Productos terminados disponibles
}

export function SsccForm({ onSubmit, isLoading, availablePtLotes = [] }: SsccFormProps) {
  const [formData, setFormData] = useState<SsccBuilderInput>({
    sscc: '',
    gtin: '',
    packagingType: 'pallet',
    packagingQuantity: 1,
    grossWeight: undefined,
    netWeight: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    contents: [], // Ya no se usa, pero se mantiene para compatibilidad con el tipo
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      contents: [] // Ya no se usa, el contrato maneja los padres
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

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Generando...' : 'Generar Features JSON'}
      </button>
    </form>
  )
}




