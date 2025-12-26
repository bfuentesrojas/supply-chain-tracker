'use client'

import { useState } from 'react'
import { StorageCondition, UnitOfMeasure } from '@/types/pharma'
import { ApiMpBuilderInput } from '@/builders/pharma'
import { getCurrentISODate, getFutureDate } from '@/builders/pharma'

interface ApiMpFormProps {
  onSubmit: (data: ApiMpBuilderInput) => void
  isLoading?: boolean
}

export function ApiMpForm({ onSubmit, isLoading }: ApiMpFormProps) {
  const [formData, setFormData] = useState<ApiMpBuilderInput>({
    substanceName: '',
    casNumber: '',
    grade: 'USP',
    purity: undefined,
    batchNumber: '',
    expirationDate: getFutureDate(24),
    manufacturingDate: getCurrentISODate(),
    manufacturerName: '',
    manufacturerCountry: 'CL',
    manufacturerGln: '',
    storageCondition: StorageCondition.AMBIENT,
    minTemp: 15,
    maxTemp: 25,
    lightSensitive: false,
    quantity: 1,
    unit: UnitOfMeasure.KG,
    gtin: '',
    ispRegistration: '',
    certificates: []
  })

  const handleChange = (field: keyof ApiMpBuilderInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información de la Sustancia */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🧪 Información de la Sustancia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre de la Sustancia *</label>
            <input
              type="text"
              value={formData.substanceName}
              onChange={(e) => handleChange('substanceName', e.target.value)}
              className="input-field"
              placeholder="Ej: Paracetamol"
              required
            />
          </div>
          <div>
            <label className="label">Número CAS</label>
            <input
              type="text"
              value={formData.casNumber}
              onChange={(e) => handleChange('casNumber', e.target.value)}
              className="input-field"
              placeholder="Ej: 103-90-2"
            />
          </div>
          <div>
            <label className="label">Grado Farmacéutico *</label>
            <select
              value={formData.grade}
              onChange={(e) => handleChange('grade', e.target.value)}
              className="select-field"
              required
            >
              <option value="USP">USP (Farmacopea de EE.UU.)</option>
              <option value="EP">EP (Farmacopea Europea)</option>
              <option value="BP">BP (Farmacopea Británica)</option>
              <option value="JP">JP (Farmacopea Japonesa)</option>
              <option value="FCC">FCC (Food Chemicals Codex)</option>
            </select>
          </div>
          <div>
            <label className="label">Pureza (%)</label>
            <input
              type="number"
              value={formData.purity || ''}
              onChange={(e) => handleChange('purity', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
              placeholder="Ej: 99.5"
              min="0"
              max="100"
              step="0.01"
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
              placeholder="Ej: LOT-2024-001"
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
              placeholder="Ej: Pharma Labs Chile"
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
              <option value="IN">India</option>
              <option value="CN">China</option>
            </select>
          </div>
          <div>
            <label className="label">GLN del Fabricante</label>
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
        <h3 className="text-lg font-semibold text-surface-800 mb-4">🌡️ Condiciones de Almacenamiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Condición *</label>
            <select
              value={formData.storageCondition}
              onChange={(e) => handleChange('storageCondition', e.target.value as StorageCondition)}
              className="select-field"
              required
            >
              <option value={StorageCondition.AMBIENT}>Ambiente (15-25°C)</option>
              <option value={StorageCondition.REFRIGERATED}>Refrigerado (2-8°C)</option>
              <option value={StorageCondition.FROZEN}>Congelado (-20°C)</option>
              <option value={StorageCondition.CONTROLLED}>Controlado</option>
            </select>
          </div>
          <div>
            <label className="label">Temp. Mínima (°C)</label>
            <input
              type="number"
              value={formData.minTemp ?? ''}
              onChange={(e) => handleChange('minTemp', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Temp. Máxima (°C)</label>
            <input
              type="number"
              value={formData.maxTemp ?? ''}
              onChange={(e) => handleChange('maxTemp', e.target.value ? Number(e.target.value) : undefined)}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lightSensitive}
                onChange={(e) => handleChange('lightSensitive', e.target.checked)}
                className="w-5 h-5 rounded border-surface-300"
              />
              <span className="text-surface-700">Sensible a la luz</span>
            </label>
          </div>
        </div>
      </div>

      {/* Cantidad */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📊 Cantidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Cantidad *</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', Number(e.target.value))}
              className="input-field"
              min="0.001"
              step="0.001"
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
              <option value={UnitOfMeasure.KG}>Kilogramos (kg)</option>
              <option value={UnitOfMeasure.G}>Gramos (g)</option>
              <option value={UnitOfMeasure.MG}>Miligramos (mg)</option>
              <option value={UnitOfMeasure.L}>Litros (L)</option>
              <option value={UnitOfMeasure.ML}>Mililitros (ml)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Información Regulatoria */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📋 Información Regulatoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">GTIN (14 dígitos)</label>
            <input
              type="text"
              value={formData.gtin}
              onChange={(e) => handleChange('gtin', e.target.value)}
              className="input-field font-mono"
              placeholder="00000000000000"
              maxLength={14}
            />
          </div>
          <div>
            <label className="label">Registro ISP</label>
            <input
              type="text"
              value={formData.ispRegistration}
              onChange={(e) => handleChange('ispRegistration', e.target.value)}
              className="input-field"
              placeholder="Ej: ISP-F-12345"
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




