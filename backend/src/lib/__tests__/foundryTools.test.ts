/**
 * Tests unitarios para foundryTools.ts
 */

import { sanitizeArgs, validateCommand } from '../foundryTools'

describe('foundryTools', () => {
  describe('sanitizeArgs', () => {
    it('debe sanitizar argumentos normales removiendo caracteres peligrosos', () => {
      const args = ['build', '--force']
      const result = sanitizeArgs(args)
      expect(result).toEqual(['build', '--force'])
    })

    it('debe preservar firmas de función válidas con paréntesis', () => {
      const args = ['call', '0x1234', 'transfer(address,uint256)']
      const result = sanitizeArgs(args)
      expect(result[2]).toContain('transfer(address,uint256)')
    })

    it('debe remover caracteres peligrosos de argumentos normales', () => {
      const args = ['build', 'test; rm -rf /']
      const result = sanitizeArgs(args)
      // La función remueve caracteres peligrosos como ; pero mantiene el texto
      expect(result[1]).not.toContain(';')
      expect(result[1]).not.toContain('|')
      expect(result[1]).not.toContain('`')
    })

    it('debe normalizar espacios en blanco', () => {
      const args = ['build', 'test\n\r\t   arg']
      const result = sanitizeArgs(args)
      expect(result[1]).not.toContain('\n')
      expect(result[1]).not.toContain('\r')
      expect(result[1]).not.toContain('\t')
    })

    it('debe lanzar error para argumentos vacíos después de sanitización', () => {
      const args = ['build', '   ']
      expect(() => sanitizeArgs(args)).toThrow('Argumento inválido después de sanitización')
    })

    it('debe lanzar error para argumentos demasiado largos', () => {
      const longArg = 'a'.repeat(1001)
      const args = ['build', longArg]
      expect(() => sanitizeArgs(args)).toThrow('Argumento demasiado largo')
    })
  })

  describe('validateCommand', () => {
    it('debe validar comandos permitidos de forge', () => {
      expect(validateCommand('forge', 'build')).toBe(true)
      expect(validateCommand('forge', 'test')).toBe(true)
      expect(validateCommand('forge', 'script')).toBe(true)
    })

    it('debe rechazar comandos no permitidos de forge', () => {
      expect(validateCommand('forge', 'invalid')).toBe(false)
      expect(validateCommand('forge', 'install')).toBe(false)
    })

    it('debe validar comandos permitidos de cast', () => {
      expect(validateCommand('cast', 'call')).toBe(true)
      expect(validateCommand('cast', 'send')).toBe(true)
      expect(validateCommand('cast', 'balance')).toBe(true)
      expect(validateCommand('cast', 'block-number')).toBe(true)
    })

    it('debe rechazar comandos no permitidos de cast', () => {
      expect(validateCommand('cast', 'invalid')).toBe(false)
    })

    it('debe validar comandos permitidos de anvil', () => {
      expect(validateCommand('anvil', 'start')).toBe(true)
      expect(validateCommand('anvil', 'stop')).toBe(true)
    })

    it('debe rechazar comandos no permitidos de anvil', () => {
      expect(validateCommand('anvil', 'invalid')).toBe(false)
    })
  })
})

