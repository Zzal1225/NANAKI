import type { NutrientAmount } from '../types'

/** 시드 카탈로그 — 자동완성용 기본 제품 (개인 DB에 없으면 여기서 제안) */
export type CatalogProduct = {
  name: string
  nutrients: NutrientAmount[]
  capacity?: string
}

export const SUPPLEMENT_CATALOG: CatalogProduct[] = [
  {
    name: '오메가3',
    capacity: '90정',
    nutrients: [
      { name: 'EPA', amount: 500, unit: 'mg' },
      { name: 'DHA', amount: 250, unit: 'mg' },
    ],
  },
  {
    name: '종합비타민',
    capacity: '60정',
    nutrients: [
      { name: 'Vitamin A', amount: 1000, unit: 'IU' },
      { name: 'Vitamin C', amount: 100, unit: 'mg' },
      { name: 'Vitamin D', amount: 1000, unit: 'IU' },
      { name: 'Magnesium', amount: 1, unit: 'mg' },
    ],
  },
  {
    name: '마그네슘',
    capacity: '60정',
    nutrients: [{ name: 'Magnesium', amount: 5, unit: 'mg' }],
  },
  {
    name: '루테인',
    capacity: '30정',
    nutrients: [{ name: 'Lutein', amount: 20, unit: 'mg' }],
  },
  {
    name: '비타민D',
    capacity: '60정',
    nutrients: [{ name: 'Vitamin D', amount: 2000, unit: 'IU' }],
  },
  {
    name: '프로바이오틱스',
    capacity: '30포',
    nutrients: [{ name: 'Lactobacillus', amount: 10, unit: '억 CFU' }],
  },
]

export function searchCatalog(query: string): CatalogProduct[] {
  const q = query.trim().toLowerCase()
  if (!q) return SUPPLEMENT_CATALOG
  return SUPPLEMENT_CATALOG.filter((p) => p.name.toLowerCase().includes(q))
}
