'use client'

import { useState } from 'react'
import { StorageCondition, UnitOfMeasure } from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
import { PtLoteBuilderInput, getCurrentISODate, getFutureDate } from '@/builders/pharma'

interface PtLoteFormProps {
  onSubmit: (data: PtLoteBuilderInput) => void
  isLoading?: boolean
  availableBoms?: Token[]  // BOMs disponibles para seleccionar como parentId
}

export function PtLoteForm({ onSubmit, isLoading, availableBoms = [] }: PtLoteFormProps) {
  const [formData, setFormData] = useState<PtLoteBuilderInput>({
    productName: '',
    genericName: '',
    dosageForm: 'comprimido',
    strength: '',
    presentation: '',
    batchNumber: '',
    expirationDate: getFutureDate(24),
    manufacturingDate: getCurrentISODate(),
    manufacturerName: '',
    manufacturerCountry: 'CL',
    manufacturerGln: '',
    storageCondition: StorageCondition.AMBIENT,
    minTemp: 15,
    maxTemp: 25,
    shelfLife: 24,
    ispRegistration: '',
    atcCode: '',
    prescription: false,
    quantity: 1000,
    unit: UnitOfMeasure.UNITS,
    gtin: '',
    bomTokenId: undefined,
    qualityReleaseDate: '',
    qualityResponsibleQP: ''
  })

  const handleChange = (field: keyof PtLoteBuilderInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del Producto */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">💊 Información del Producto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre Comercial *</label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              className="input-field"
              placeholder="Ej: Tapsin®"
              required
            />
          </div>
          <div>
            <label className="label">Nombre Genérico (DCI)</label>
            <input
              type="text"
              value={formData.genericName}
              onChange={(e) => handleChange('genericName', e.target.value)}
              className="input-field"
              placeholder="Ej: Paracetamol"
            />
          </div>
          <div>
            <label className="label">Forma Farmacéutica *</label>
            <select
              value={formData.dosageForm}
              onChange={(e) => handleChange('dosageForm', e.target.value)}
              className="select-field"
              required
            >
              <option value="comprimido">Comprimido</option>
              <option value="capsula">Cápsula</option>
              <option value="jarabe">Jarabe</option>
              <option value="suspension">Suspensión</option>
              <option value="solucion">Solución</option>
              <option value="inyectable">Inyectable</option>
              <option value="crema">Crema</option>
              <option value="gel">Gel</option>
              <option value="supositorio">Supositorio</option>
              <option value="parche">Parche</option>
            </select>
          </div>
          <div>
            <label className="label">Concentración *</label>
            <input
              type="text"
              value={formData.strength}
              onChange={(e) => handleChange('strength', e.target.value)}
              className="input-field"
              placeholder="Ej: 500 mg"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Presentación *</label>
            <input
              type="text"
              value={formData.presentation}
              onChange={(e) => handleChange('presentation', e.target.value)}
              className="input-field"
              placeholder="Ej: Caja con 30 comprimidos recubiertos"
              required
            />
          </div>
        </div>
      </div>

      {/* Información del Lote */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📦 Información del Lote</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Número de Lote *</label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) => handleChange('batchNumber', e.target.value)}
              className="input-field"
              placeholder="Ej: PT-2024-001"
              required
            />
          </div>
          <div>
            <label className="label">Fecha de Fabricación *</label>
            <input
              type="date"
              value={formData.manufacturingDate}
              onChange={(e) => handleChange('manufacturingDate', e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Fecha de Vencimiento *</label>
            <input
              type="date"
              value={formData.expirationDate}
              onChange={(e) => handleChange('expirationDate', e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>
      </div>

      {/* Fabricante */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🏭 Fabricante</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Nombre del Fabricante *</label>
            <input
              type="text"
              value={formData.manufacturerName}
              onChange={(e) => handleChange('manufacturerName', e.target.value)}
              className="input-field"
              placeholder="Ej: Laboratorio Chile S.A."
              required
            />
          </div>
          <div>
            <label className="label">País *</label>
            <select
              value={formData.manufacturerCountry}
              onChange={(e) => handleChange('manufacturerCountry', e.target.value)}
              className="select-field"
              required
            >
              <option value="CL">Chile</option>
              <option value="AR">Argentina</option>
              <option value="BR">Brasil</option>
              <option value="US">Estados Unidos</option>
              <option value="DE">Alemania</option>
            </select>
          </div>
          <div>
            <label className="label">GLN</label>
            <input
              type="text"
              value={formData.manufacturerGln}
              onChange={(e) => handleChange('manufacturerGln', e.target.value)}
              className="input-field"
              placeholder="13 dígitos"
              maxLength={13}
            />
          </div>
        </div>
      </div>

      {/* Almacenamiento */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🌡️ Almacenamiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label className="label">Vida Útil (meses)</label>
            <input
              type="number"
              value={formData.shelfLife ?? ''}
              onChange={(e) => handleChange('shelfLife', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Cantidad */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📊 Cantidad del Lote</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Cantidad *</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', Number(e.target.value))}
              className="input-field"
              min="1"
              required
            />
          </div>
          <div>
            <label className="label">Unidad *</label>
            <select
              value={formData.unit}
              onChange={(e) => handleChange('unit', e.target.value as UnitOfMeasure)}
              className="select-field"
              required
            >
              <option value={UnitOfMeasure.UNITS}>Unidades</option>
              <option value={UnitOfMeasure.KG}>Kilogramos</option>
              <option value={UnitOfMeasure.L}>Litros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Información Regulatoria */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📋 Información Regulatoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Registro ISP *</label>
            <input
              type="text"
              value={formData.ispRegistration}
              onChange={(e) => handleChange('ispRegistration', e.target.value)}
              className="input-field"
              placeholder="Ej: F-12345/21"
              required
            />
          </div>
          <div>
            <label className="label">Código ATC</label>
            <input
              type="text"
              value={formData.atcCode}
              onChange={(e) => handleChange('atcCode', e.target.value)}
              className="input-field font-mono"
              placeholder="Ej: N02BE01"
              maxLength={7}
            />
          </div>
          <div>
            <label className="label">GTIN (14 dígitos)</label>
            <input
              type="text"
              value={formData.gtin}
              onChange={(e) => handleChange('gtin', e.target.value)}
              className="input-field font-mono"
              maxLength={14}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.prescription}
              onChange={(e) => handleChange('prescription', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-surface-700">Requiere receta médica</span>
          </label>
        </div>
      </div>

      {/* BOM Relacionado */}
      {availableBoms.length > 0 && (
        <div className="bg-surface-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-surface-800 mb-4">🔗 BOM Relacionado</h3>
          <select
            value={formData.bomTokenId ?? ''}
            onChange={(e) => handleChange('bomTokenId', e.target.value ? Number(e.target.value) : undefined)}
            className="select-field"
          >
            <option value="">Sin BOM asociado</option>
            {availableBoms.map(bom => (
              <option key={bom.id.toString()} value={Number(bom.id)}>
                #{bom.id.toString()} - {bom.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-surface-500 mt-2">
            Si seleccionas un BOM, este se usará como parentId del token.
          </p>
        </div>
      )}

      {/* Liberación de Calidad */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">✅ Liberación de Calidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de Liberación</label>
            <input
              type="date"
              value={formData.qualityReleaseDate}
              onChange={(e) => handleChange('qualityReleaseDate', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">QP Responsable</label>
            <input
              type="text"
              value={formData.qualityResponsibleQP}
              onChange={(e) => handleChange('qualityResponsibleQP', e.target.value)}
              className="input-field"
              placeholder="Nombre del Químico Farmacéutico"
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




