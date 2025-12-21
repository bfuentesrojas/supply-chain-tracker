import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * GET /api/tools/health
 * Verifica el estado de las herramientas Foundry
 */
export async function GET() {
  try {
    const health: Record<string, { available: boolean; version?: string; error?: string }> = {}
    
    // Verificar forge
    try {
      const { stdout } = await execFileAsync('forge', ['--version'], { timeout: 5000 })
      health.forge = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.forge = {
        available: false,
        error: error.message || 'Forge no disponible'
      }
    }
    
    // Verificar anvil
    try {
      const { stdout } = await execFileAsync('anvil', ['--version'], { timeout: 5000 })
      health.anvil = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.anvil = {
        available: false,
        error: error.message || 'Anvil no disponible'
      }
    }
    
    // Verificar cast
    try {
      const { stdout } = await execFileAsync('cast', ['--version'], { timeout: 5000 })
      health.cast = {
        available: true,
        version: stdout.trim()
      }
    } catch (error: any) {
      health.cast = {
        available: false,
        error: error.message || 'Cast no disponible'
      }
    }
    
    // Verificar si anvil está corriendo
    const anvilRunning = await checkAnvilRunning()
    
    return NextResponse.json({
      success: true,
      tools: health,
      anvil: {
        running: anvilRunning,
        port: anvilRunning ? 8545 : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error verificando estado de herramientas'
      },
      { status: 500 }
    )
  }
}

async function checkAnvilRunning(): Promise<boolean> {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout } = await execAsync('pgrep -f "anvil.*8545"')
    return stdout.trim().length > 0
  } catch {
    return false
  }
}



