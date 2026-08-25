import { describe, expect, test } from 'vitest'
import { consummateVs } from './latinText'

describe('consummateVs', () => {
  test('renders lowercase v as u and uppercase U as V', () => {
    expect(consummateVs('servus vult')).toBe('seruus uult')
    expect(consummateVs('Urbs Uxor')).toBe('Vrbs Vxor')
  })

  test('leaves macrons and existing u/V untouched', () => {
    expect(consummateVs('ūva')).toBe('ūua')
    expect(consummateVs('Vult')).toBe('Vult')
    expect(consummateVs('manūs')).toBe('manūs')
  })
})
