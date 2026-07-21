import indexDefinitions from './indexDefinitions.json' with { type: 'json' }

import type { IndexDefinition } from '../models/indexDefinition'

export const defaultIndexDefinitions: readonly IndexDefinition[] = indexDefinitions
