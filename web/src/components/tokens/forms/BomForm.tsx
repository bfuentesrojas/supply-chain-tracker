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

  const [components, setComponents] = useState<BOMComponent[]>([])
  const [newComponent, setNewComponent] = useState<Partial<BOMComponent>>({
    tokenId: 0,
    name: '',
    quantity: 0,
    unit: UnitOfMeasure.MG,
    isActive: true,
    percentage: undefined
  })

  const handleChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddComponent = () => {
    if (newComponent.name && newComponent.quantity && newComponent.quantity > 0) {
      setComponents(prev => [...prev, {
        tokenId: newComponent.tokenId || 0,
        name: newComponent.name!,
        quantity: newComponent.quantity!,
        unit: newComponent.unit || UnitOfMeasure.MG,
        isActive: newComponent.isActive ?? true,
        percentage: newComponent.percentage
      }])
      setNewComponent({
        tokenId: 0,
        name: '',
        quantity: 0,
        unit: UnitOfMeasure.MG,
        isActive: true,
        percentage: undefined
      })
    }
  }

  const handleRemoveComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      components
    })
  }

  const activeCount = components.filter(c => c.isActive).length
  const excipientCount = components.filter(c => !c.isActive).length

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

      {/* Componentes */}
      <div className="bg-surface-50 rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-surface-800">🧪 Componentes</h3>
          <div className="flex gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {activeCount} Activo{activeCount !== 1 ? 's' : ''}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
              {excipientCount} Excipiente{excipientCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Lista de componentes */}
        {components.length > 0 && (
          <div className="mb-4 space-y-2">
            {components.map((comp, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-surface-200">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  comp.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {comp.isActive ? 'ACTIVO' : 'EXCIP'}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-surface-800">{comp.name}</p>
                  <p className="text-sm text-surface-500">
                    {comp.quantity} {comp.unit}
                    {comp.percentage ? ` (${comp.percentage}%)` : ''}
                    {comp.tokenId > 0 ? ` • Token #${comp.tokenId}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(index)}
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

        {/* Agregar nuevo componente */}
        <div className="p-4 bg-white rounded-lg border-2 border-dashed border-surface-300">
          <p className="text-sm font-medium text-surface-600 mb-3">Agregar componente:</p>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={newComponent.name}
                onChange={(e) => setNewComponent(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="Nombre"
              />
            </div>
            <div>
              <input
                type="number"
                value={newComponent.quantity || ''}
                onChange={(e) => setNewComponent(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="input-field"
                placeholder="Cantidad"
                min="0"
                step="0.001"
              />
            </div>
            <div>
              <select
                value={newComponent.unit}
                onChange={(e) => setNewComponent(prev => ({ ...prev, unit: e.target.value as UnitOfMeasure }))}
                className="select-field"
              >
                <option value={UnitOfMeasure.MG}>mg</option>
                <option value={UnitOfMeasure.G}>g</option>
                <option value={UnitOfMeasure.KG}>kg</option>
                <option value={UnitOfMeasure.ML}>ml</option>
                <option value={UnitOfMeasure.L}>L</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newComponent.isActive}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-surface-700">Activo</span>
              </label>
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddComponent}
                className="btn-secondary w-full py-2"
              >
                + Agregar
              </button>
            </div>
          </div>
          {availableTokens.length > 0 && (
            <div className="mt-3">
              <label className="text-sm text-surface-600">Token relacionado (opcional):</label>
              <select
                value={newComponent.tokenId}
                onChange={(e) => setNewComponent(prev => ({ ...prev, tokenId: Number(e.target.value) }))}
                className="select-field mt-1"
              >
                <option value={0}>Sin token</option>
                {availableTokens.map(token => (
                  <option key={token.id.toString()} value={Number(token.id)}>
                    #{token.id.toString()} - {token.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      {components.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          ⚠️ Debes agregar al menos un componente (principio activo) para crear el BOM.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || components.length === 0 || activeCount === 0}
        className="btn-primary w-full"
      >
        {isLoading ? 'Generando...' : 'Generar Features JSON'}
      </button>
    </form>
  )
}
