const fields =
  'ISHUOQI,ISBUY,MAXSG,FCODE,SHORTNAME,PDATE,NAV,ACCNAV,NAVCHGRT,NAVCHGRT100,GSZ,GSZZL,GZTIME,NEWPRICE,CHANGERATIO,ZJL,HQDATE,ISREDBAGS,SYL_Z,SYL_Y,SYL_3Y,SYL_6Y,SYL_JN,SYL_1N,SYL_2N,SYL_3N,SYL_5N,SYL_LN,RSBTYPE,RSFUNDTYPE,SYRQ,INDEXCODE,NEWINDEXTEXCH,TRKERROR1,RATECOST_Y,ENDNAV'

export function createTiantianFundRequestBody(fundCodes: readonly string[]): URLSearchParams {
  if (fundCodes.length === 0 || fundCodes.length > 50) {
    throw new RangeError('A Tiantian fund request must contain 1 to 50 codes')
  }

  return new URLSearchParams({
    APPID: 'FAVOR,FAVOR_ED',
    CODES: fundCodes.join(','),
    FIELDS: fields,
    deviceid: crypto.randomUUID(),
    pageIndex: '1',
    pageSize: '50',
    plat: 'Iphone',
    product: 'EFund',
    version: '6.8.1',
  })
}
