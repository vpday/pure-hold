import type { IndexGroupDefinition } from '../models/indexGroupDefinition'

export const defaultIndexGroups = [
  {
    id: 'cn',
    name: '沪深京',
    quoteCodes: [
      '1.000001',
      '1.000009',
      '1.000010',
      '1.000043',
      '1.000044',
      '1.000300',
      '1.000510',
      '1.000680',
      '1.000681',
      '1.000688',
      '1.000698',
      '1.000699',
      '1.000847',
      '1.000852',
      '1.000888',
      '1.000903',
      '1.000904',
      '1.000905',
      '1.000906',
      '1.000985',
    ],
  },
  { id: 'hk', name: '港股', quoteCodes: ['100.HSCEI', '124.HSTECH'] },
  { id: 'us', name: '美股', quoteCodes: ['100.SPX', '100.NDX100', '251.NDXTMC'] },
] as const satisfies readonly IndexGroupDefinition[]
