import type { BodySectionKey, CircumferencePart } from '../types'

/** 기본 둘레: 허리 · 엉덩이 · 허벅지 · 팔 */
export const DEFAULT_CIRCUMFERENCE_PARTS: CircumferencePart[] = [
  { id: 'waist', name: '허리', builtin: true },
  { id: 'hip', name: '엉덩이', builtin: true },
  { id: 'thigh', name: '허벅지', builtin: true },
  { id: 'arm', name: '팔', builtin: true },
]

export function resolveCircumferenceParts(parts?: CircumferencePart[]): CircumferencePart[] {
  if (!parts?.length) return DEFAULT_CIRCUMFERENCE_PARTS
  return parts
}

export const BODY_SECTION_LABELS: Record<BodySectionKey, string> = {
  weight: '체중',
  circumference: '신체둘레',
  photo: '눈바디',
}

/** 섹션별 기본 측정 주기(일) */
export const DEFAULT_BODY_SECTION_INTERVALS: Record<BodySectionKey, number> = {
  weight: 7,
  circumference: 14,
  photo: 14,
}

export function resolveBodySectionIntervals(
  stored?: Partial<Record<BodySectionKey, number>>,
): Record<BodySectionKey, number> {
  return { ...DEFAULT_BODY_SECTION_INTERVALS, ...stored }
}
