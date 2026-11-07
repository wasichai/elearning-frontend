import { describe, expect, it } from 'vitest'
import { initialsOf } from './Initials'

describe('initialsOf', () => {
  it('de un nombre, las dos primeras palabras sin lo que va entre paréntesis', () => {
    expect(initialsOf('Diego Docente (demo)')).toBe('DD')
    expect(initialsOf('Ana María Quispe Huamán')).toBe('AM')
    expect(initialsOf('Rosa')).toBe('R')
  })

  it('de un correo, su parte local', () => {
    expect(initialsOf('ana.torres@demo.local')).toBe('AT')
    expect(initialsOf('estudiante@demo.local')).toBe('E')
  })

  it('en mayúscula, también con tildes', () => {
    expect(initialsOf('álvaro ñahui')).toBe('ÁÑ')
  })
})
