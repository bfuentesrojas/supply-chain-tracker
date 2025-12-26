'use client'

import { useState } from 'react'
import { UnitOfMeasure, BOMComponent } from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
import { BomBuilderInput } from '@/builders/pharma'

interface BomFormProps {
  onSubmit: (data: BomBuilderInput) => void
  isLoading?: boolean
  availableTokens?: Token[]  // Tokens disponibles para seleccionar como componentes
}

export function BomForm({ onSubmit, isLoading, availableTokens = [] }: BomFormProps) {
  const [formData, setFormData] = useState<Omit<BomBuilderInput, 'components'>>({
    productName: '',
    version: '1.0',
    totalYieldValue: 1000,
    totalYieldUnit: UnitOfMeasure.UNITS,
    instructions: '',
    ispRegistration: ''
  })

  // Los componentes ahora se manejan directamente en el wizard mediante parentIds
  const [components] = useState<BOMComponent[]>([])

  const handleChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Las funciones de componentes ya no son necesarias - se manejan en el wizard

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Crear un array vacío de componentes - los padres se manejan en el wizard
    onSubmit({
      ...formData,
      components: []
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del Producto */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📋 Información del BOM</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nombre del Producto *</label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              className="input-field"
              placeholder="Ej: Paracetamol 500mg Comprimidos"
              required
            />
          </div>
          <div>
            <label className="label">Versión *</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => handleChange('version', e.target.value)}
              className="input-field"
              placeholder="Ej: 1.0"
              pattern="\d+\.\d+"
              required
            />
          </div>
        </div>
      </div>

      {/* Rendimiento Total */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📊 Rendimiento del Lote</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Cantidad Total *</label>
            <input
              type="number"
              value={formData.totalYieldValue}
              onChange={(e) => handleChange('totalYieldValue', Number(e.target.value))}
              className="input-field"
              min="1"
              required
            />
          </div>
          <div>
            <label className="label">Unidad *</label>
            <select
              value={formData.totalYieldUnit}
              onChange={(e) => handleChange('totalYieldUnit', e.target.value as UnitOfMeasure)}
              className="select-field"
              required
            >
              <option value={UnitOfMeasure.UNITS}>Unidades</option>
              <option value={UnitOfMeasure.KG}>Kilogramos (kg)</option>
              <option value={UnitOfMeasure.G}>Gramos (g)</option>
              <option value={UnitOfMeasure.L}>Litros (L)</option>
              <option value={UnitOfMeasure.ML}>Mililitros (ml)</option>
            </select>
          </div>
        </div>
      </div>


      {/* Instrucciones */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📝 Instrucciones</h3>
        <textarea
          value={formData.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="input-field min-h-[100px]"
          placeholder="Instrucciones de fabricación resumidas..."
        />
      </div>

      {/* Información Regulatoria */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📋 Información Regulatoria</h3>
        <div>
          <label className="label">Registro Sanitario ISP</label>
          <input
            type="text"
            value={formData.ispRegistration}
            onChange={(e) => handleChange('ispRegistration', e.target.value)}
            className="input-field"
            placeholder="Ej: ISP-F-12345"
          />
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




