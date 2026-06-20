export interface Airport {
  iata: string
  icao: string
  lat: number
  lon: number
  name: string
}

const AIRPORT_LIST: Airport[] = [
  { iata: 'ATL', icao: 'KATL', lat: 33.6407, lon: -84.4277, name: 'Atlanta' },
  { iata: 'LAX', icao: 'KLAX', lat: 33.9425, lon: -118.408, name: 'Los Angeles' },
  { iata: 'ORD', icao: 'KORD', lat: 41.9742, lon: -87.9073, name: 'Chicago O\'Hare' },
  { iata: 'DFW', icao: 'KDFW', lat: 32.8998, lon: -97.0403, name: 'Dallas Fort Worth' },
  { iata: 'DEN', icao: 'KDEN', lat: 39.8561, lon: -104.6737, name: 'Denver' },
  { iata: 'JFK', icao: 'KJFK', lat: 40.6413, lon: -73.7781, name: 'New York JFK' },
  { iata: 'SFO', icao: 'KSFO', lat: 37.6213, lon: -122.379, name: 'San Francisco' },
  { iata: 'SEA', icao: 'KSEA', lat: 47.4502, lon: -122.3088, name: 'Seattle' },
  { iata: 'LAS', icao: 'KLAS', lat: 36.084, lon: -115.1537, name: 'Las Vegas' },
  { iata: 'MCO', icao: 'KMCO', lat: 28.4312, lon: -81.3081, name: 'Orlando' },
  { iata: 'EWR', icao: 'KEWR', lat: 40.6895, lon: -74.1745, name: 'Newark' },
  { iata: 'MIA', icao: 'KMIA', lat: 25.7959, lon: -80.287, name: 'Miami' },
  { iata: 'PHX', icao: 'KPHX', lat: 33.4373, lon: -112.0078, name: 'Phoenix' },
  { iata: 'IAH', icao: 'KIAH', lat: 29.9902, lon: -95.3368, name: 'Houston Bush' },
  { iata: 'BOS', icao: 'KBOS', lat: 42.3656, lon: -71.0096, name: 'Boston' },
  { iata: 'MSP', icao: 'KMSP', lat: 44.882, lon: -93.2218, name: 'Minneapolis' },
  { iata: 'DTW', icao: 'KDTW', lat: 42.2162, lon: -83.3554, name: 'Detroit' },
  { iata: 'FLL', icao: 'KFLL', lat: 26.0726, lon: -80.1527, name: 'Fort Lauderdale' },
  { iata: 'PHL', icao: 'KPHL', lat: 39.8721, lon: -75.2411, name: 'Philadelphia' },
  { iata: 'LGA', icao: 'KLGA', lat: 40.7769, lon: -73.874, name: 'New York LaGuardia' },
  { iata: 'CLT', icao: 'KCLT', lat: 35.2141, lon: -80.9431, name: 'Charlotte' },
  { iata: 'SLC', icao: 'KSLC', lat: 40.7884, lon: -111.9778, name: 'Salt Lake City' },
  { iata: 'BWI', icao: 'KBWI', lat: 39.1754, lon: -76.6683, name: 'Baltimore' },
  { iata: 'IAD', icao: 'KIAD', lat: 38.9531, lon: -77.4565, name: 'Washington Dulles' },
  { iata: 'DCA', icao: 'KDCA', lat: 38.8521, lon: -77.0377, name: 'Washington Reagan' },
  { iata: 'MDW', icao: 'KMDW', lat: 41.786, lon: -87.7524, name: 'Chicago Midway' },
  { iata: 'HNL', icao: 'PHNL', lat: 21.3245, lon: -157.9251, name: 'Honolulu' },
  { iata: 'ANC', icao: 'PANC', lat: 61.1744, lon: -149.9982, name: 'Anchorage' },
  { iata: 'PDX', icao: 'KPDX', lat: 45.5898, lon: -122.5951, name: 'Portland' },
  { iata: 'SAN', icao: 'KSAN', lat: 32.7338, lon: -117.1933, name: 'San Diego' },
  { iata: 'TPA', icao: 'KTPA', lat: 27.9755, lon: -82.5332, name: 'Tampa' },
  { iata: 'STL', icao: 'KSTL', lat: 38.7487, lon: -90.37, name: 'St. Louis' },
  { iata: 'MCI', icao: 'KMCI', lat: 39.2976, lon: -94.7139, name: 'Kansas City' },
  { iata: 'RDU', icao: 'KRDU', lat: 35.8776, lon: -78.7875, name: 'Raleigh Durham' },
  { iata: 'OAK', icao: 'KOAK', lat: 37.7213, lon: -122.2208, name: 'Oakland' },
  { iata: 'MEM', icao: 'KMEM', lat: 35.0424, lon: -89.9767, name: 'Memphis' },
  { iata: 'LHR', icao: 'EGLL', lat: 51.477, lon: -0.4613, name: 'London Heathrow' },
  { iata: 'LGW', icao: 'EGKK', lat: 51.1481, lon: -0.1903, name: 'London Gatwick' },
  { iata: 'STN', icao: 'EGSS', lat: 51.885, lon: 0.235, name: 'London Stansted' },
  { iata: 'CDG', icao: 'LFPG', lat: 49.0097, lon: 2.5479, name: 'Paris CDG' },
  { iata: 'ORY', icao: 'LFPO', lat: 48.7233, lon: 2.3794, name: 'Paris Orly' },
  { iata: 'AMS', icao: 'EHAM', lat: 52.3086, lon: 4.7639, name: 'Amsterdam' },
  { iata: 'FRA', icao: 'EDDF', lat: 50.0379, lon: 8.5622, name: 'Frankfurt' },
  { iata: 'MUC', icao: 'EDDM', lat: 48.3538, lon: 11.7861, name: 'Munich' },
  { iata: 'MAD', icao: 'LEMD', lat: 40.4983, lon: -3.5676, name: 'Madrid' },
  { iata: 'BCN', icao: 'LEBL', lat: 41.2974, lon: 2.0833, name: 'Barcelona' },
  { iata: 'FCO', icao: 'LIRF', lat: 41.8003, lon: 12.2389, name: 'Rome' },
  { iata: 'MXP', icao: 'LIMC', lat: 45.6306, lon: 8.7281, name: 'Milan Malpensa' },
  { iata: 'ZRH', icao: 'LSZH', lat: 47.4647, lon: 8.5492, name: 'Zurich' },
  { iata: 'VIE', icao: 'LOWW', lat: 48.1103, lon: 16.5697, name: 'Vienna' },
  { iata: 'BRU', icao: 'EBBR', lat: 50.9014, lon: 4.4844, name: 'Brussels' },
  { iata: 'CPH', icao: 'EKCH', lat: 55.6181, lon: 12.6561, name: 'Copenhagen' },
  { iata: 'OSL', icao: 'ENGM', lat: 60.1976, lon: 11.1004, name: 'Oslo' },
  { iata: 'ARN', icao: 'ESSA', lat: 59.6519, lon: 17.9186, name: 'Stockholm' },
  { iata: 'HEL', icao: 'EFHK', lat: 60.3172, lon: 24.9633, name: 'Helsinki' },
  { iata: 'DUB', icao: 'EIDW', lat: 53.4213, lon: -6.2701, name: 'Dublin' },
  { iata: 'LIS', icao: 'LPPT', lat: 38.7813, lon: -9.1359, name: 'Lisbon' },
  { iata: 'ATH', icao: 'LGAV', lat: 37.9364, lon: 23.9445, name: 'Athens' },
  { iata: 'WAW', icao: 'EPWA', lat: 52.1657, lon: 20.9671, name: 'Warsaw' },
  { iata: 'PRG', icao: 'LKPR', lat: 50.1008, lon: 14.26, name: 'Prague' },
  { iata: 'BUD', icao: 'LHBP', lat: 47.4298, lon: 19.2611, name: 'Budapest' },
  { iata: 'IST', icao: 'LTFM', lat: 41.2753, lon: 28.7519, name: 'Istanbul' },
  { iata: 'SAW', icao: 'LTFJ', lat: 40.8985, lon: 29.3092, name: 'Istanbul Sabiha' },
  { iata: 'DXB', icao: 'OMDB', lat: 25.2532, lon: 55.3657, name: 'Dubai' },
  { iata: 'AUH', icao: 'OMAA', lat: 24.433, lon: 54.6511, name: 'Abu Dhabi' },
  { iata: 'DOH', icao: 'OTHH', lat: 25.2731, lon: 51.608, name: 'Doha' },
  { iata: 'BAH', icao: 'OBBI', lat: 26.2708, lon: 50.6336, name: 'Bahrain' },
  { iata: 'KWI', icao: 'OKBK', lat: 29.2267, lon: 47.9689, name: 'Kuwait' },
  { iata: 'RUH', icao: 'OERK', lat: 24.9576, lon: 46.6988, name: 'Riyadh' },
  { iata: 'JED', icao: 'OEJN', lat: 21.6796, lon: 39.1565, name: 'Jeddah' },
  { iata: 'CAI', icao: 'HECA', lat: 30.1219, lon: 31.4056, name: 'Cairo' },
  { iata: 'NBO', icao: 'HKJK', lat: -1.3192, lon: 36.9275, name: 'Nairobi' },
  { iata: 'JNB', icao: 'FAOR', lat: -26.1392, lon: 28.246, name: 'Johannesburg' },
  { iata: 'CPT', icao: 'FACT', lat: -33.9649, lon: 18.6017, name: 'Cape Town' },
  { iata: 'LOS', icao: 'DNMM', lat: 6.5774, lon: 3.3212, name: 'Lagos' },
  { iata: 'ADD', icao: 'HAAB', lat: 8.9779, lon: 38.7993, name: 'Addis Ababa' },
  { iata: 'BOM', icao: 'VABB', lat: 19.0896, lon: 72.8656, name: 'Mumbai' },
  { iata: 'DEL', icao: 'VIDP', lat: 28.5562, lon: 77.1, name: 'Delhi' },
  { iata: 'BLR', icao: 'VOBL', lat: 13.1979, lon: 77.7063, name: 'Bangalore' },
  { iata: 'MAA', icao: 'VOMM', lat: 12.9941, lon: 80.1709, name: 'Chennai' },
  { iata: 'HYD', icao: 'VOHS', lat: 17.2403, lon: 78.4294, name: 'Hyderabad' },
  { iata: 'CCU', icao: 'VECC', lat: 22.6547, lon: 88.4467, name: 'Kolkata' },
  { iata: 'PEK', icao: 'ZBAA', lat: 40.0799, lon: 116.6031, name: 'Beijing Capital' },
  { iata: 'PKX', icao: 'ZBAD', lat: 39.5098, lon: 116.4105, name: 'Beijing Daxing' },
  { iata: 'PVG', icao: 'ZSPD', lat: 31.1434, lon: 121.8052, name: 'Shanghai Pudong' },
  { iata: 'SHA', icao: 'ZSSS', lat: 31.1979, lon: 121.3363, name: 'Shanghai Hongqiao' },
  { iata: 'CAN', icao: 'ZGGG', lat: 23.3924, lon: 113.299, name: 'Guangzhou' },
  { iata: 'SZX', icao: 'ZGSZ', lat: 22.6393, lon: 113.8107, name: 'Shenzhen' },
  { iata: 'CTU', icao: 'ZUUU', lat: 30.5785, lon: 103.9469, name: 'Chengdu' },
  { iata: 'KMG', icao: 'ZPPP', lat: 24.9924, lon: 102.7433, name: 'Kunming' },
  { iata: 'URC', icao: 'ZWWW', lat: 43.9071, lon: 87.4742, name: 'Urumqi' },
  { iata: 'KHN', icao: 'ZSCN', lat: 28.865, lon: 115.9001, name: 'Nanchang' },
  { iata: 'TFU', icao: 'ZUTF', lat: 30.3125, lon: 103.9417, name: 'Chengdu Tianfu' },
  { iata: 'HKG', icao: 'VHHH', lat: 22.308, lon: 113.9185, name: 'Hong Kong' },
  { iata: 'TPE', icao: 'RCTP', lat: 25.0777, lon: 121.2326, name: 'Taipei' },
  { iata: 'NRT', icao: 'RJAA', lat: 35.7647, lon: 140.3864, name: 'Tokyo Narita' },
  { iata: 'HND', icao: 'RJTT', lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
  { iata: 'KIX', icao: 'RJBB', lat: 34.4347, lon: 135.244, name: 'Osaka Kansai' },
  { iata: 'ICN', icao: 'RKSI', lat: 37.4691, lon: 126.4505, name: 'Seoul Incheon' },
  { iata: 'GMP', icao: 'RKSS', lat: 37.5583, lon: 126.7906, name: 'Seoul Gimpo' },
  { iata: 'BKK', icao: 'VTBS', lat: 13.6811, lon: 100.7472, name: 'Bangkok Suvarnabhumi' },
  { iata: 'DMK', icao: 'VTBD', lat: 13.9126, lon: 100.6067, name: 'Bangkok Don Mueang' },
  { iata: 'SIN', icao: 'WSSS', lat: 1.3644, lon: 103.9915, name: 'Singapore Changi' },
  { iata: 'KUL', icao: 'WMKK', lat: 2.7456, lon: 101.7099, name: 'Kuala Lumpur' },
  { iata: 'CGK', icao: 'WIII', lat: -6.1256, lon: 106.6559, name: 'Jakarta' },
  { iata: 'MNL', icao: 'RPLL', lat: 14.5086, lon: 121.0197, name: 'Manila' },
  { iata: 'SGN', icao: 'VVTS', lat: 10.8188, lon: 106.6519, name: 'Ho Chi Minh City' },
  { iata: 'HAN', icao: 'VVNB', lat: 21.2212, lon: 105.807, name: 'Hanoi' },
  { iata: 'SYD', icao: 'YSSY', lat: -33.9461, lon: 151.1772, name: 'Sydney' },
  { iata: 'MEL', icao: 'YMML', lat: -37.6733, lon: 144.8433, name: 'Melbourne' },
  { iata: 'BNE', icao: 'YBBN', lat: -27.3842, lon: 153.1175, name: 'Brisbane' },
  { iata: 'PER', icao: 'YPPH', lat: -31.9403, lon: 115.9669, name: 'Perth' },
  { iata: 'AKL', icao: 'NZAA', lat: -37.0082, lon: 174.7917, name: 'Auckland' },
  { iata: 'YYZ', icao: 'CYYZ', lat: 43.6777, lon: -79.6248, name: 'Toronto' },
  { iata: 'YVR', icao: 'CYVR', lat: 49.1967, lon: -123.1815, name: 'Vancouver' },
  { iata: 'YUL', icao: 'CYUL', lat: 45.4706, lon: -73.7408, name: 'Montreal' },
  { iata: 'YYC', icao: 'CYYC', lat: 51.1315, lon: -114.0106, name: 'Calgary' },
  { iata: 'GRU', icao: 'SBGR', lat: -23.4356, lon: -46.4731, name: 'Sao Paulo' },
  { iata: 'GIG', icao: 'SBGL', lat: -22.8099, lon: -43.2505, name: 'Rio de Janeiro' },
  { iata: 'EZE', icao: 'SAEZ', lat: -34.8222, lon: -58.5358, name: 'Buenos Aires' },
  { iata: 'BOG', icao: 'SKBO', lat: 4.7016, lon: -74.1469, name: 'Bogota' },
  { iata: 'LIM', icao: 'SPIM', lat: -12.0219, lon: -77.1143, name: 'Lima' },
  { iata: 'SCL', icao: 'SCEL', lat: -33.3931, lon: -70.7858, name: 'Santiago' },
  { iata: 'MEX', icao: 'MMMX', lat: 19.4363, lon: -99.0721, name: 'Mexico City' },
  { iata: 'CUN', icao: 'MMUN', lat: 21.0365, lon: -86.8771, name: 'Cancun' },
  { iata: 'SVO', icao: 'UUEE', lat: 55.9736, lon: 37.4125, name: 'Moscow Sheremetyevo' },
  { iata: 'DME', icao: 'UUDD', lat: 55.4088, lon: 37.9063, name: 'Moscow Domodedovo' },
  { iata: 'LED', icao: 'ULLI', lat: 59.8003, lon: 30.2625, name: 'St. Petersburg' },
]

// Build lookup maps
export const AIRPORTS_BY_IATA: Record<string, Airport> = {}
export const AIRPORTS_BY_ICAO: Record<string, Airport> = {}

for (const ap of AIRPORT_LIST) {
  AIRPORTS_BY_IATA[ap.iata] = ap
  AIRPORTS_BY_ICAO[ap.icao] = ap
}

export function getAirportCoords(code: string): [number, number] | null {
  const upper = code?.toUpperCase()
  const ap = AIRPORTS_BY_IATA[upper] || AIRPORTS_BY_ICAO[upper]
  if (!ap) return null
  return [ap.lat, ap.lon]
}

export function getAirportName(code: string): string {
  const upper = code?.toUpperCase()
  const ap = AIRPORTS_BY_IATA[upper] || AIRPORTS_BY_ICAO[upper]
  return ap ? ap.name : code
}
