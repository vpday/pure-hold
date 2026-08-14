import type { Portfolio } from '../../models/index.ts'
import { createPortfolio } from '../../models/index.ts'

export function validateAndClonePortfolio(value: unknown): Portfolio {
  const validated = createPortfolio(value)
  if (!hasSameKeyShape(value, validated)) {
    throw new TypeError('Portfolio contains unknown fields')
  }
  return validated
}

function hasSameKeyShape(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }
    return left.every((value, index) => hasSameKeyShape(value, right[index]))
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false
    const leftKeys = Object.keys(left)
      .filter((key) => left[key] !== undefined)
      .sort()
    const rightKeys = Object.keys(right)
      .filter((key) => right[key] !== undefined)
      .sort()
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) => key === rightKeys[index] && hasSameKeyShape(left[key], right[key]),
      )
    )
  }

  return true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
