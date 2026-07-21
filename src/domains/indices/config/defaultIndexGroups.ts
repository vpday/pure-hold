import type { IndexGroupDefinition } from '../models/indexGroupDefinition'

export const defaultIndexGroups = [
  {
    id: 'cn',
    name: '沪深京',
    quoteCodes: [
      '1.000001',
      '0.399001',
      '0.399006',
      '1.000510',
      '1.000985',
      '1.000300',
      '1.000905',
      '1.000852',
      '2.932000',
      '1.000698',
      '0.399673',
      '1.000688',
      '0.399850',
    ],
  },
  { id: 'hk', name: '港股', quoteCodes: ['100.HSCEI', '124.HSTECH'] },
  { id: 'us', name: '美股', quoteCodes: ['100.SPX', '100.NDX100', '251.NDXTMC'] },
] as const satisfies readonly IndexGroupDefinition[]
