'use client'

import { useState } from 'react'
import { 
  ComplianceLogType, 
  CAPASeverity, 
  RecallClass, 
  UnitOfMeasure,
  TempReading
} from '@/types/pharma'
import { Token } from '@/contracts/SupplyChain'
import { 
  TempLogBuilderInput, 
  CapaBuilderInput, 
  RecallBuilderInput,
  getCurrentISODate 
} from '@/builders/pharma'

type ComplianceLogData = TempLogBuilderInput | CapaBuilderInput | RecallBuilderInput

interface ComplianceLogFormProps {
  onSubmit: (data: ComplianceLogData, logType: ComplianceLogType) => void
  isLoading?: boolean
  availableSsccs?: Token[]
  availablePtLotes?: Token[]
}

export function ComplianceLogForm({ 
  onSubmit, 
  isLoading, 
  availableSsccs = [],
  availablePtLotes = []
}: ComplianceLogFormProps) {
  const [logType, setLogType] = useState<ComplianceLogType>(ComplianceLogType.TEMP_LOG)

  // TempLog state
  const [tempLogData, setTempLogData] = useState<TempLogBuilderInput>({
    ssccTokenId: 0,
    startDate: getCurrentISODate(),
    endDate: getCurrentISODate(),
    readings: [],
    minAllowed: 2,
    maxAllowed: 8,
    deviceModel: '',
    deviceSerialNumber: '',
    deviceCalibrationDate: ''
  })

  const [newReading, setNewReading] = useState<Partial<TempReading>>({
    timestamp: new Date().toISOString(),
    value: 5,
    sensorId: '',
    location: ''
  })

  // CAPA state
  const [capaData, setCapaData] = useState<CapaBuilderInput>({
    ssccTokenId: 0,
    capaId: '',
    severity: CAPASeverity.MEDIUM,
    description: '',
    rootCause: '',
    correctiveActions: [],
    preventiveActions: [],
    status: 'open',
    openDate: getCurrentISODate(),
    dueDate: '',
    closeDate: '',
    affectedBatches: [],
    responsiblePerson: ''
  })

  const [newCorrectiveAction, setNewCorrectiveAction] = useState('')
  const [newPreventiveAction, setNewPreventiveAction] = useState('')
  const [newAffectedBatch, setNewAffectedBatch] = useState('')

  // Recall state
  const [recallData, setRecallData] = useState<RecallBuilderInput>({
    ptLoteTokenId: 0,
    recallId: '',
    recallClass: RecallClass.CLASS_II,
    reason: '',
    description: '',
    initiatedDate: getCurrentISODate(),
    effectiveDate: getCurrentISODate(),
    affectedBatches: [],
    affectedQuantity: 0,
    affectedUnit: UnitOfMeasure.UNITS,
    regions: [],
    distributors: [],
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    ispNotificationDate: '',
    ispNotificationNumber: ''
  })

  const [newRecallBatch, setNewRecallBatch] = useState('')
  const [newRegion, setNewRegion] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    switch (logType) {
      case ComplianceLogType.TEMP_LOG:
        onSubmit(tempLogData, logType)
        break
      case ComplianceLogType.CAPA:
        onSubmit(capaData, logType)
        break
      case ComplianceLogType.RECALL:
        onSubmit(recallData, logType)
        break
    }
  }

  const addReading = () => {
    if (newReading.value !== undefined) {
      setTempLogData(prev => ({
        ...prev,
        readings: [...prev.readings, {
          timestamp: newReading.timestamp || new Date().toISOString(),
          value: newReading.value!,
          sensorId: newReading.sensorId,
          location: newReading.location
        }]
      }))
      setNewReading({ timestamp: new Date().toISOString(), value: 5, sensorId: '', location: '' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de tipo */}
      <div className="bg-surface-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">📝 Tipo de Registro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setLogType(ComplianceLogType.TEMP_LOG)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              logType === ComplianceLogType.TEMP_LOG
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <div className="text-2xl mb-2">🌡️</div>
            <div className="font-semibold text-surface-800">TempLog</div>
            <div className="text-sm text-surface-500">Registro de temperatura</div>
          </button>
          <button
            type="button"
            onClick={() => setLogType(ComplianceLogType.CAPA)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              logType === ComplianceLogType.CAPA
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-semibold text-surface-800">CAPA</div>
            <div className="text-sm text-surface-500">Acciones correctivas/preventivas</div>
          </button>
          <button
            type="button"
            onClick={() => setLogType(ComplianceLogType.RECALL)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              logType === ComplianceLogType.RECALL
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <div className="text-2xl mb-2">🚨</div>
            <div className="font-semibold text-surface-800">Recall</div>
            <div className="text-sm text-surface-500">Retiro de producto</div>
          </button>
        </div>
      </div>

      {/* TempLog Form */}
      {logType === ComplianceLogType.TEMP_LOG && (
        <>
          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">🌡️ Configuración TempLog</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">SSCC Token *</label>
                {availableSsccs.length > 0 ? (
                  <select
                    value={tempLogData.ssccTokenId}
                    onChange={(e) => setTempLogData(prev => ({ ...prev, ssccTokenId: Number(e.target.value) }))}
                    className="select-field"
                    required
                  >
                    <option value={0}>Seleccionar SSCC</option>
                    {availableSsccs.map(sscc => (
                      <option key={sscc.id.toString()} value={Number(sscc.id)}>
                        #{sscc.id.toString()} - {sscc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={tempLogData.ssccTokenId || ''}
                    onChange={(e) => setTempLogData(prev => ({ ...prev, ssccTokenId: Number(e.target.value) }))}
                    className="input-field"
                    placeholder="ID del token SSCC"
                    required
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={tempLogData.startDate}
                    onChange={(e) => setTempLogData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Fecha Fin *</label>
                  <input
                    type="date"
                    value={tempLogData.endDate}
                    onChange={(e) => setTempLogData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Temp. Mín Permitida (°C) *</label>
                <input
                  type="number"
                  value={tempLogData.minAllowed}
                  onChange={(e) => setTempLogData(prev => ({ ...prev, minAllowed: Number(e.target.value) }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Temp. Máx Permitida (°C) *</label>
                <input
                  type="number"
                  value={tempLogData.maxAllowed}
                  onChange={(e) => setTempLogData(prev => ({ ...prev, maxAllowed: Number(e.target.value) }))}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">📊 Lecturas de Temperatura</h3>
            
            {tempLogData.readings.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-2">
                {tempLogData.readings.map((reading, i) => (
                  <div key={i} className="flex items-center gap-4 p-2 bg-white rounded border">
                    <span className="text-sm text-surface-500">{new Date(reading.timestamp).toLocaleString()}</span>
                    <span className={`font-mono font-semibold ${
                      reading.value < tempLogData.minAllowed || reading.value > tempLogData.maxAllowed
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {reading.value}°C
                    </span>
                    <button
                      type="button"
                      onClick={() => setTempLogData(prev => ({
                        ...prev,
                        readings: prev.readings.filter((_, idx) => idx !== i)
                      }))}
                      className="ml-auto text-red-500 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-white rounded-lg border-2 border-dashed">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <input
                  type="datetime-local"
                  value={newReading.timestamp?.slice(0, 16)}
                  onChange={(e) => setNewReading(prev => ({ ...prev, timestamp: new Date(e.target.value).toISOString() }))}
                  className="input-field text-sm"
                />
                <input
                  type="number"
                  value={newReading.value}
                  onChange={(e) => setNewReading(prev => ({ ...prev, value: Number(e.target.value) }))}
                  className="input-field"
                  placeholder="°C"
                  step="0.1"
                />
                <input
                  type="text"
                  value={newReading.sensorId}
                  onChange={(e) => setNewReading(prev => ({ ...prev, sensorId: e.target.value }))}
                  className="input-field"
                  placeholder="Sensor ID"
                />
                <input
                  type="text"
                  value={newReading.location}
                  onChange={(e) => setNewReading(prev => ({ ...prev, location: e.target.value }))}
                  className="input-field"
                  placeholder="Ubicación"
                />
                <button type="button" onClick={addReading} className="btn-secondary">
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">📱 Dispositivo (opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={tempLogData.deviceModel}
                onChange={(e) => setTempLogData(prev => ({ ...prev, deviceModel: e.target.value }))}
                className="input-field"
                placeholder="Modelo"
              />
              <input
                type="text"
                value={tempLogData.deviceSerialNumber}
                onChange={(e) => setTempLogData(prev => ({ ...prev, deviceSerialNumber: e.target.value }))}
                className="input-field"
                placeholder="Número de Serie"
              />
              <input
                type="date"
                value={tempLogData.deviceCalibrationDate}
                onChange={(e) => setTempLogData(prev => ({ ...prev, deviceCalibrationDate: e.target.value }))}
                className="input-field"
                placeholder="Fecha Calibración"
              />
            </div>
          </div>

          {tempLogData.readings.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
              ⚠️ Debes agregar al menos una lectura de temperatura.
            </div>
          )}
        </>
      )}

      {/* CAPA Form */}
      {logType === ComplianceLogType.CAPA && (
        <>
          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">⚠️ Información del CAPA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">SSCC Token *</label>
                <input
                  type="number"
                  value={capaData.ssccTokenId || ''}
                  onChange={(e) => setCapaData(prev => ({ ...prev, ssccTokenId: Number(e.target.value) }))}
                  className="input-field"
                  placeholder="ID del token SSCC"
                  required
                />
              </div>
              <div>
                <label className="label">ID del CAPA *</label>
                <input
                  type="text"
                  value={capaData.capaId}
                  onChange={(e) => setCapaData(prev => ({ ...prev, capaId: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: CAPA-2024-001"
                  required
                />
              </div>
              <div>
                <label className="label">Severidad *</label>
                <select
                  value={capaData.severity}
                  onChange={(e) => setCapaData(prev => ({ ...prev, severity: e.target.value as CAPASeverity }))}
                  className="select-field"
                  required
                >
                  <option value={CAPASeverity.LOW}>Baja</option>
                  <option value={CAPASeverity.MEDIUM}>Media</option>
                  <option value={CAPASeverity.HIGH}>Alta</option>
                  <option value={CAPASeverity.CRITICAL}>Crítica</option>
                </select>
              </div>
              <div>
                <label className="label">Estado *</label>
                <select
                  value={capaData.status}
                  onChange={(e) => setCapaData(prev => ({ ...prev, status: e.target.value as CapaBuilderInput['status'] }))}
                  className="select-field"
                  required
                >
                  <option value="open">Abierto</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="closed">Cerrado</option>
                  <option value="verified">Verificado</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Descripción del Problema *</label>
                <textarea
                  value={capaData.description}
                  onChange={(e) => setCapaData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field min-h-[80px]"
                  placeholder="Descripción detallada del problema..."
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Causa Raíz</label>
                <textarea
                  value={capaData.rootCause}
                  onChange={(e) => setCapaData(prev => ({ ...prev, rootCause: e.target.value }))}
                  className="input-field min-h-[60px]"
                  placeholder="Análisis de causa raíz..."
                />
              </div>
              <div>
                <label className="label">Responsable *</label>
                <input
                  type="text"
                  value={capaData.responsiblePerson}
                  onChange={(e) => setCapaData(prev => ({ ...prev, responsiblePerson: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Fecha Apertura *</label>
                <input
                  type="date"
                  value={capaData.openDate}
                  onChange={(e) => setCapaData(prev => ({ ...prev, openDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">✅ Acciones Correctivas</h3>
            {capaData.correctiveActions.length > 0 && (
              <ul className="mb-3 space-y-1">
                {capaData.correctiveActions.map((action, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">•</span>
                    {action}
                    <button
                      type="button"
                      onClick={() => setCapaData(prev => ({
                        ...prev,
                        correctiveActions: prev.correctiveActions.filter((_, idx) => idx !== i)
                      }))}
                      className="text-red-500 ml-auto"
                    >✕</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCorrectiveAction}
                onChange={(e) => setNewCorrectiveAction(e.target.value)}
                className="input-field flex-1"
                placeholder="Nueva acción correctiva..."
              />
              <button
                type="button"
                onClick={() => {
                  if (newCorrectiveAction) {
                    setCapaData(prev => ({
                      ...prev,
                      correctiveActions: [...prev.correctiveActions, newCorrectiveAction]
                    }))
                    setNewCorrectiveAction('')
                  }
                }}
                className="btn-secondary"
              >+</button>
            </div>
          </div>
        </>
      )}

      {/* Recall Form */}
      {logType === ComplianceLogType.RECALL && (
        <>
          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">🚨 Información del Recall</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">PT_LOTE Token *</label>
                <input
                  type="number"
                  value={recallData.ptLoteTokenId || ''}
                  onChange={(e) => setRecallData(prev => ({ ...prev, ptLoteTokenId: Number(e.target.value) }))}
                  className="input-field"
                  placeholder="ID del token PT_LOTE"
                  required
                />
              </div>
              <div>
                <label className="label">ID del Recall *</label>
                <input
                  type="text"
                  value={recallData.recallId}
                  onChange={(e) => setRecallData(prev => ({ ...prev, recallId: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: ISP-RECALL-2024-001"
                  required
                />
              </div>
              <div>
                <label className="label">Clase de Recall *</label>
                <select
                  value={recallData.recallClass}
                  onChange={(e) => setRecallData(prev => ({ ...prev, recallClass: e.target.value as RecallClass }))}
                  className="select-field"
                  required
                >
                  <option value={RecallClass.CLASS_I}>Clase I - Riesgo grave</option>
                  <option value={RecallClass.CLASS_II}>Clase II - Riesgo temporal</option>
                  <option value={RecallClass.CLASS_III}>Clase III - Bajo riesgo</option>
                </select>
              </div>
              <div>
                <label className="label">Motivo *</label>
                <input
                  type="text"
                  value={recallData.reason}
                  onChange={(e) => setRecallData(prev => ({ ...prev, reason: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descripción *</label>
                <textarea
                  value={recallData.description}
                  onChange={(e) => setRecallData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field min-h-[80px]"
                  required
                />
              </div>
              <div>
                <label className="label">Fecha Inicio *</label>
                <input
                  type="date"
                  value={recallData.initiatedDate}
                  onChange={(e) => setRecallData(prev => ({ ...prev, initiatedDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Fecha Efectiva *</label>
                <input
                  type="date"
                  value={recallData.effectiveDate}
                  onChange={(e) => setRecallData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">📦 Lotes Afectados</h3>
            {recallData.affectedBatches.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {recallData.affectedBatches.map((batch, i) => (
                  <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
                    {batch}
                    <button
                      type="button"
                      onClick={() => setRecallData(prev => ({
                        ...prev,
                        affectedBatches: prev.affectedBatches.filter((_, idx) => idx !== i)
                      }))}
                    >✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRecallBatch}
                onChange={(e) => setNewRecallBatch(e.target.value)}
                className="input-field flex-1"
                placeholder="Número de lote..."
              />
              <button
                type="button"
                onClick={() => {
                  if (newRecallBatch) {
                    setRecallData(prev => ({
                      ...prev,
                      affectedBatches: [...prev.affectedBatches, newRecallBatch]
                    }))
                    setNewRecallBatch('')
                  }
                }}
                className="btn-secondary"
              >+ Agregar</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Cantidad Afectada *</label>
                <input
                  type="number"
                  value={recallData.affectedQuantity || ''}
                  onChange={(e) => setRecallData(prev => ({ ...prev, affectedQuantity: Number(e.target.value) }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Unidad *</label>
                <select
                  value={recallData.affectedUnit}
                  onChange={(e) => setRecallData(prev => ({ ...prev, affectedUnit: e.target.value as UnitOfMeasure }))}
                  className="select-field"
                  required
                >
                  <option value={UnitOfMeasure.UNITS}>Unidades</option>
                  <option value={UnitOfMeasure.KG}>Kilogramos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">📞 Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={recallData.contactName}
                onChange={(e) => setRecallData(prev => ({ ...prev, contactName: e.target.value }))}
                className="input-field"
                placeholder="Nombre *"
                required
              />
              <input
                type="tel"
                value={recallData.contactPhone}
                onChange={(e) => setRecallData(prev => ({ ...prev, contactPhone: e.target.value }))}
                className="input-field"
                placeholder="Teléfono"
              />
              <input
                type="email"
                value={recallData.contactEmail}
                onChange={(e) => setRecallData(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="input-field"
                placeholder="Email"
              />
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isLoading || 
          (logType === ComplianceLogType.TEMP_LOG && tempLogData.readings.length === 0) ||
          (logType === ComplianceLogType.CAPA && capaData.correctiveActions.length === 0) ||
          (logType === ComplianceLogType.RECALL && recallData.affectedBatches.length === 0)
        }
        className="btn-primary w-full"
      >
        {isLoading ? 'Generando...' : 'Generar Features JSON'}
      </button>
    </form>
  )
}
