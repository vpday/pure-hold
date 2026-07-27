import { randomUUID } from 'node:crypto'
import { rm, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const endpoint = 'https://fundcomapi.tiantianfunds.com/mm/FundIndex/FundZSBIndexRankV2'
const defaultOutput = fileURLToPath(
  new URL('../src/domains/indices/config/indexDefinitions.json', import.meta.url),
)
const maximumPages = 500

export function parseIndexRankPage(value) {
  if (
    !isRecord(value) ||
    value.success !== true ||
    value.errorCode !== 0 ||
    !Array.isArray(value.data)
  ) {
    throw new Error('Index rank response was unsuccessful')
  }

  return value.data
}

export function normalizeIndexDefinitions(records) {
  const definitions = records
    .filter((record) => isRecord(record) && record.ISQUOT === '1')
    .map(normalizeRecord)
  definitions.sort((left, right) => left.quoteCode.localeCompare(right.quoteCode, 'en'))

  const quoteCodes = new Set()
  for (const definition of definitions) {
    if (quoteCodes.has(definition.quoteCode)) {
      throw new Error(`Duplicate quote code: ${definition.quoteCode}`)
    }
    quoteCodes.add(definition.quoteCode)
  }

  return definitions
}

export async function updateIndexDefinitions({ output = defaultOutput } = {}) {
  const records = []
  let pageCount = 0

  for (let pageIndex = 1; pageIndex <= maximumPages; pageIndex += 1) {
    const page = await fetchPage(pageIndex)
    pageCount = pageIndex
    process.stdout.write(`Fetched page ${pageIndex}: ${page.length} records.\n`)

    if (page.length === 0) {
      const definitions = normalizeIndexDefinitions(records)
      await writeAtomically(output, formatIndexDefinitions(definitions))
      process.stdout.write(`Fetched ${records.length} records across ${pageCount} pages.\n`)
      process.stdout.write(`Included ${definitions.length} records where ISQUOT=1.\n`)
      process.stdout.write(`Excluded ${records.length - definitions.length} records.\n`)
      process.stdout.write(`Wrote ${output}.\n`)
      return
    }

    records.push(...page)
    await sleep(randomDelay())
  }

  throw new Error(`Index rank pagination exceeded ${maximumPages} pages`)
}

function normalizeRecord(record) {
  const securityCode = requiredString(record.INDEXCODE, 'INDEXCODE')
  const name = requiredString(record.INDEXNAME, 'INDEXNAME')
  const indexType = nullableString(record.INDEXTYPE, 'INDEXTYPE')
  const quoteMarketCode = requiredString(record.NEWINDEXTEXCH, 'NEWINDEXTEXCH')
  const sectorNames = splitNullableList(record.SEC_NAME, 'SEC_NAME')
  const sectorCodes = splitNullableList(record.SEC_CODE, 'SEC_CODE')

  if ((sectorNames === null) !== (sectorCodes === null)) {
    throw new Error(`Sector names and codes must both be present for ${securityCode}`)
  }
  if (sectorNames !== null && sectorCodes !== null && sectorNames.length !== sectorCodes.length) {
    throw new Error(`Sector names and codes must have equal lengths for ${securityCode}`)
  }

  const quoteCode = `${quoteMarketCode}.${securityCode}`
  return {
    id: quoteCode,
    quoteCode,
    securityCode,
    name,
    sectorNames,
    sectorCodes,
    typeName: nullableString(record.TYPE_NAME, 'TYPE_NAME'),
    typeCode: nullableString(record.TYPE_CODE, 'TYPE_CODE'),
    indexType,
    quoteMarketCode,
    refreshMarketCodes: toRefreshMarketCodes(quoteMarketCode, securityCode),
  }
}

function toRefreshMarketCodes(quoteMarketCode, securityCode) {
  if (quoteMarketCode === '0') {
    return ['SZ']
  }
  if (quoteMarketCode === '1') {
    return ['SH']
  }
  if (quoteMarketCode === '2') {
    return ['SH', 'SZ']
  }
  if (quoteMarketCode === '124') {
    return ['HK']
  }
  if (quoteMarketCode === '125') {
    return ['SH', 'SZ', 'HK']
  }
  if (quoteMarketCode === '251') {
    return ['US']
  }
  if (quoteMarketCode === '118' && securityCode === 'AU9999') {
    return ['SQ']
  }
  if (quoteMarketCode === '100') {
    const marketCode = {
      N225: 'JW',
      FTSE: 'UK',
      GDAXI: 'DE',
      NDX100: 'US',
      HSI: 'HK',
      SPX: 'US',
      HSCEI: 'HK',
    }[securityCode]
    if (marketCode) {
      return [marketCode]
    }
  }

  throw new Error(`No refresh market mapping for ${quoteMarketCode}.${securityCode}`)
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value.trim()
}

function nullableString(value, field) {
  if (value === null) {
    return null
  }
  return requiredString(value, field)
}

function splitNullableList(value, field) {
  const text = nullableString(value, field)
  if (text === null) {
    return null
  }

  const values = text.split(',').map((item) => item.trim())
  if (values.some((item) => item === '')) {
    throw new Error(`${field} contains an empty item`)
  }
  return values
}

function formatIndexDefinitions(definitions) {
  return `${JSON.stringify(definitions, null, 2).replace(
    /\[\n((?:\s+"(?:[^"\\]|\\.)*",?\n)+)\s+\]/g,
    (array, items) => {
      const values = items
        .trim()
        .split('\n')
        .map((item) => item.trim().replace(/,$/, ''))
      return `[${values.join(', ')}]`
    },
  )}\n`
}

async function fetchPage(pageIndex) {
  const body = new URLSearchParams({
    indexValue: '',
    pageIndex: String(pageIndex),
    pageSize: '20',
    sortName: 'NEWCHG',
    sortType: 'DESC',
    secCode: '0',
    type: '0',
    valuationType: '0',
    plat: 'Web',
    product: 'EFund',
    version: '6.5.5',
    deviceid: randomUUID(),
  })
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Index rank request failed on page ${pageIndex} with status ${response.status}`)
  }

  try {
    return parseIndexRankPage(await response.json())
  } catch (error) {
    throw new Error(`Index rank response was invalid on page ${pageIndex}`, { cause: error })
  }
}

async function writeAtomically(output, content) {
  const temporaryOutput = `${output}.tmp`
  await rm(temporaryOutput, { force: true })
  try {
    await writeFile(temporaryOutput, content, 'utf8')
    await rename(temporaryOutput, output)
  } catch (error) {
    await rm(temporaryOutput, { force: true })
    throw error
  }
}

function randomDelay() {
  return 1000 + Math.floor(Math.random() * 2001)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  updateIndexDefinitions().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
