const fields =
  'SHORTNAME,ESTABDATE,BENCH,FTYPE,FEATURE,INDEXCODE,INDEXNAME,ISBUY,MINSG,MAXSG,RZDF,DWJZ,LJJZ,FSRQ,RATE,SOURCERATE,ENDNAV,FEGMRQ,JJGS,RISKLEVEL,TTYPE,TTYPENAME,BENCHRATIO,BENCH_CORR,TRKERROR,ESTDIFF,SALESEXP,TRUSTEXP,MGREXP,SGZT,SHZT,SSBCFMDATA,RDMCFMDATA,DRAWCFMDATA,RLEVEL_CX,RLEVEL_SZ'

export function createTiantianFundBasicInfoRequestBody(fundCode: string): URLSearchParams {
  if (!/^\d{6}$/.test(fundCode)) {
    throw new RangeError('A Tiantian fund code must contain exactly 6 digits')
  }

  return new URLSearchParams({
    FCODES: fundCode,
    FIELDS: fields,
    deviceid: crypto.randomUUID(),
    plat: 'Web',
    product: 'EFund',
    version: '6.8.3',
  })
}
