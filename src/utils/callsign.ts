// ICAO airline prefix (3-letter, from ADS-B callsigns) -> IATA (2-letter)
export const ICAO_TO_IATA: Record<string, string> = {
  UAL: 'UA', DAL: 'DL', AAL: 'AA', SWA: 'WN', BAW: 'BA', DLH: 'LH',
  AFR: 'AF', KLM: 'KL', UAE: 'EK', QTR: 'QR', AIC: 'AI', IGO: '6E',
  SIA: 'SQ', CPA: 'CX', JAL: 'JL', ANA: 'NH', QFA: 'QF', ACA: 'AC',
  THY: 'TK', RYR: 'FR', EZY: 'U2', VIR: 'VS', ETH: 'ET', SAS: 'SK',
  AAR: 'OZ', KAL: 'KE', CES: 'MU', CCA: 'CA', CSN: 'CZ', UAL2: 'UA',
  JBU: 'B6', ASA: 'AS', FFT: 'F9', NKS: 'NK', WJA: 'WS', TAM: 'JJ',
  AVA: 'AV', LAN: 'LA', GLO: 'G3', AZU: 'AD', SAA: 'SA', MSR: 'MS',
  ETD: 'EY', SVA: 'SV', GFA: 'GF', RJA: 'RJ', ELY: 'LY', ICE: 'FI',
  FIN: 'AY', IBE: 'IB', VLG: 'VY', TVF: 'TO', WZZ: 'W6', EWG: 'EW',
  AUA: 'OS', SWR: 'LX', BEL: 'SN', TAP: 'TP', AEE: 'A3', LOT: 'LO',
  THA: 'TG', MAS: 'MH', GIA: 'GA', PAL: 'PR', VJC: 'VJ', HVN: 'VN',
  KAC: 'KU', ABY: 'G9', FDB: 'FZ', MEA: 'ME', OMA: 'WY', KNE: 'XY',
  IRA: 'IR', UZB: 'HY', CYP: 'CY', RBA: 'AT', TAR: 'TU', DAH: 'AH',
  MXD: 'OD', BTK: 'ID', LNI: 'JT', CEB: '5J', SLK: 'MI', AXM: 'AK',
  JST: 'JQ', VOZ: 'VA', ANZ: 'NZ', CHH: 'HU', CXA: 'MF', CDG: 'SC',
  CQH: 'AQ', CSH: 'FM', JAI: '9W', SEJ: 'SG', GOW: 'G8', VTI: 'UK',
  AKJ: 'I5', NOZ: 'DY', NAX: 'DY', PGT: 'PC', VKG: 'DK', BCS: 'QY',
  GTI: '5Y', CLX: 'CV', ROT: 'RO', TAY: '3V', CFG: 'DE', JAF: 'TB',
  NJE: 'NJ', EJU: 'EC', AFL: 'SU', SBI: 'S7', UTA: 'UT',
  AXB: 'IX', JZR: 'J9', MAU: 'MK', TSC: 'TS', BBC: 'BG', WJA: 'WS',
}

// Commercial airline flights use an ICAO airline designator (3 letters) followed
// by a flight number, e.g. "UAL234", "DLH441", "AIC301". Private/GA aircraft use
// their registration (N3499X, OKKAL, G-ABCD…), which doesn't match this shape.
export function isAirlineCallsign(cs?: string | null): boolean {
  if (!cs) return false
  return /^[A-Z]{3}\d/.test(cs.trim().toUpperCase())
}

// Convert an ICAO callsign (e.g. "UAL234") to its IATA flight number (e.g. "UA234").
// Falls back to the original callsign when no mapping is known.
export function toIataCallsign(callsign: string | null | undefined): string {
  if (!callsign) return ''
  const cs = callsign.trim().toUpperCase()
  const m = cs.match(/^([A-Z]{3})(\d+[A-Z]?)$/)
  if (m && ICAO_TO_IATA[m[1]]) return ICAO_TO_IATA[m[1]] + m[2]
  return cs
}
