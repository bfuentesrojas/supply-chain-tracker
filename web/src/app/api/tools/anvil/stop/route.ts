import { NextResponse } from 'next/server'
import { getAnvilPid } from '@/lib/foundryTools'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/tools/anvil/stop
 * Detiene Anvil si está corriendo
 */
export async function POST() {
  try {
    const pid = await getAnvilPid()
    
    if (!pid) {
      return NextResponse.json({
        success: true,
        message: 'Anvil no está corriendo',
        timestamp: new Date().toISOString()
      })
    }
    
    // Intentar detener usando kill
    try {
      await execAsync(`kill ${pid}`)
      
      // Esperar un momento y verificar
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const stillRunning = await getAnvilPid()
      
      if (stillRunning) {
        // Si aún está corriendo, usar kill -9
        await execAsync(`kill -9 ${pid}`)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Anvil detenido correctamente',
        pid,
        timestamp: new Date().toISOString()
      })
    } catch (killError: any) {
      // Intentar con pkill como fallback
      try {
        await execAsync('pkill -f "anvil.*8545"')
        return NextResponse.json({
          success: true,
          message: 'Anvil detenido usando pkill',
          timestamp: new Date().toISOString()
        })
      } catch (pkillError: any) {
        throw new Error(`Error deteniendo Anvil: ${killError.message}`)
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error deteniendo Anvil'
      },
      { status: 500 }
    )
  }
}









