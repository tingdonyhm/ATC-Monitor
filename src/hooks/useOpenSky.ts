import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AircraftState, OpenSkyResponse } from '../types/flight'

const t = () => Date.now() / 1000
const MOCK_AIRCRAFT: AircraftState[] = [
  // USA
  { icao24: 'a1b2c3', callsign: 'UAL123', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -87.6298, latitude: 41.8781, baroAltitude: 10668, onGround: false, velocity: 245, trueTrack: 45, verticalRate: 0, geoAltitude: 10700, squawk: '1234', spi: false, positionSource: 0, departure: 'ORD', arrival: 'JFK' },
  { icao24: 'b2c3d4', callsign: 'DAL456', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -73.9857, latitude: 40.7484, baroAltitude: 11278, onGround: false, velocity: 258, trueTrack: 270, verticalRate: -2, geoAltitude: 11300, squawk: '2345', spi: false, positionSource: 0, departure: 'JFK', arrival: 'LAX' },
  { icao24: 'c3d4e5', callsign: 'AAL789', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -118.2437, latitude: 34.0522, baroAltitude: 9144, onGround: false, velocity: 235, trueTrack: 180, verticalRate: 5, geoAltitude: 9200, squawk: '3456', spi: false, positionSource: 0, departure: 'LAX', arrival: 'SFO' },
  { icao24: 'd4e5f6', callsign: 'SWA101', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -95.3698, latitude: 29.7604, baroAltitude: 7620, onGround: false, velocity: 220, trueTrack: 90, verticalRate: 10, geoAltitude: 7650, squawk: '4567', spi: false, positionSource: 0, departure: 'IAH', arrival: 'MIA' },
  { icao24: 'e1f2a3', callsign: 'FDX707', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -90.1994, latitude: 38.627, baroAltitude: 8534, onGround: false, velocity: 230, trueTrack: 75, verticalRate: 12, geoAltitude: 8600, squawk: '1357', spi: false, positionSource: 0, departure: 'STL', arrival: 'ATL' },
  { icao24: 'f2a3b4', callsign: 'UPS808', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -85.7585, latitude: 38.2527, baroAltitude: 9449, onGround: false, velocity: 238, trueTrack: 290, verticalRate: 0, geoAltitude: 9450, squawk: '2468', spi: false, positionSource: 0, departure: 'SDF', arrival: 'ORD' },
  { icao24: 'us0007', callsign: 'UAL500', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -122.4194, latitude: 37.7749, baroAltitude: 9754, onGround: false, velocity: 240, trueTrack: 100, verticalRate: 0, geoAltitude: 9800, squawk: '1470', spi: false, positionSource: 0, departure: 'SFO', arrival: 'DEN' },
  { icao24: 'us0008', callsign: 'DAL900', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -104.9903, latitude: 39.7392, baroAltitude: 10363, onGround: false, velocity: 242, trueTrack: 210, verticalRate: -3, geoAltitude: 10400, squawk: '1581', spi: false, positionSource: 0, departure: 'DEN', arrival: 'DFW' },
  { icao24: 'us0009', callsign: 'AAL333', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -80.1918, latitude: 25.7617, baroAltitude: 8839, onGround: false, velocity: 228, trueTrack: 320, verticalRate: 5, geoAltitude: 8900, squawk: '1692', spi: false, positionSource: 0, departure: 'MIA', arrival: 'JFK' },
  { icao24: 'us0010', callsign: 'SWA202', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -112.074, latitude: 33.4484, baroAltitude: 7925, onGround: false, velocity: 218, trueTrack: 155, verticalRate: 8, geoAltitude: 7950, squawk: '1803', spi: false, positionSource: 0, departure: 'PHX', arrival: 'LAX' },
  // Canada
  { icao24: 'e7f8a9', callsign: 'ACA300', originCountry: 'Canada', timePosition: t(), lastContact: t(), longitude: -79.3832, latitude: 43.6532, baroAltitude: 10058, onGround: false, velocity: 242, trueTrack: 220, verticalRate: 0, geoAltitude: 10100, squawk: '7913', spi: false, positionSource: 0, departure: 'YYZ', arrival: 'JFK' },
  { icao24: 'ca0002', callsign: 'WJA441', originCountry: 'Canada', timePosition: t(), lastContact: t(), longitude: -114.0719, latitude: 51.0447, baroAltitude: 10668, onGround: false, velocity: 238, trueTrack: 270, verticalRate: 0, geoAltitude: 10700, squawk: '2135', spi: false, positionSource: 0, departure: 'YYC', arrival: 'YVR' },
  // Europe
  { icao24: 'e5f6a7', callsign: 'BAW112', originCountry: 'United Kingdom', timePosition: t(), lastContact: t(), longitude: -0.1276, latitude: 51.5074, baroAltitude: 12192, onGround: false, velocity: 265, trueTrack: 315, verticalRate: 0, geoAltitude: 12200, squawk: '5678', spi: false, positionSource: 0, departure: 'LHR', arrival: 'JFK' },
  { icao24: 'uk0002', callsign: 'EZY221', originCountry: 'United Kingdom', timePosition: t(), lastContact: t(), longitude: -1.8904, latitude: 52.4538, baroAltitude: 9449, onGround: false, velocity: 230, trueTrack: 50, verticalRate: -2, geoAltitude: 9500, squawk: '5799', spi: false, positionSource: 0, departure: 'BHX', arrival: 'AMS' },
  { icao24: 'f6a7b8', callsign: 'DLH202', originCountry: 'Germany', timePosition: t(), lastContact: t(), longitude: 8.6821, latitude: 50.1109, baroAltitude: 11582, onGround: false, velocity: 255, trueTrack: 60, verticalRate: -5, geoAltitude: 11600, squawk: '6789', spi: false, positionSource: 0, departure: 'FRA', arrival: 'IST' },
  { icao24: 'de0002', callsign: 'EWG445', originCountry: 'Germany', timePosition: t(), lastContact: t(), longitude: 13.4050, latitude: 52.5200, baroAltitude: 10058, onGround: false, velocity: 245, trueTrack: 130, verticalRate: 0, geoAltitude: 10100, squawk: '6800', spi: false, positionSource: 0, departure: 'BER', arrival: 'MUC' },
  { icao24: 'a7b8c9', callsign: 'AFR303', originCountry: 'France', timePosition: t(), lastContact: t(), longitude: 2.3488, latitude: 48.8534, baroAltitude: 10972, onGround: false, velocity: 248, trueTrack: 200, verticalRate: 3, geoAltitude: 11000, squawk: '7890', spi: false, positionSource: 0, departure: 'CDG', arrival: 'MAD' },
  { icao24: 'a3b4c5', callsign: 'KLM909', originCountry: 'Netherlands', timePosition: t(), lastContact: t(), longitude: 4.7683, latitude: 52.3086, baroAltitude: 10363, onGround: false, velocity: 252, trueTrack: 110, verticalRate: -3, geoAltitude: 10400, squawk: '3579', spi: false, positionSource: 0, departure: 'AMS', arrival: 'DXB' },
  { icao24: 'f8a9b0', callsign: 'IBE400', originCountry: 'Spain', timePosition: t(), lastContact: t(), longitude: -3.7038, latitude: 40.4168, baroAltitude: 10668, onGround: false, velocity: 250, trueTrack: 30, verticalRate: 0, geoAltitude: 10700, squawk: '8024', spi: false, positionSource: 0, departure: 'MAD', arrival: 'LHR' },
  { icao24: 'it0001', callsign: 'AZA610', originCountry: 'Italy', timePosition: t(), lastContact: t(), longitude: 12.4964, latitude: 41.9028, baroAltitude: 11278, onGround: false, velocity: 248, trueTrack: 180, verticalRate: 0, geoAltitude: 11300, squawk: '8135', spi: false, positionSource: 0, departure: 'FCO', arrival: 'CAI' },
  { icao24: 'a9b0c1', callsign: 'THY500', originCountry: 'Turkey', timePosition: t(), lastContact: t(), longitude: 28.9784, latitude: 41.0082, baroAltitude: 11582, onGround: false, velocity: 258, trueTrack: 245, verticalRate: -2, geoAltitude: 11600, squawk: '9135', spi: false, positionSource: 0, departure: 'IST', arrival: 'DXB' },
  { icao24: 'ru0001', callsign: 'AFL241', originCountry: 'Russia', timePosition: t(), lastContact: t(), longitude: 37.6173, latitude: 55.7558, baroAltitude: 11887, onGround: false, velocity: 262, trueTrack: 90, verticalRate: 0, geoAltitude: 11900, squawk: '9246', spi: false, positionSource: 0, departure: 'SVO', arrival: 'PEK' },
  { icao24: 'gr0001', callsign: 'AEE311', originCountry: 'Greece', timePosition: t(), lastContact: t(), longitude: 23.7275, latitude: 37.9838, baroAltitude: 10058, onGround: false, velocity: 242, trueTrack: 60, verticalRate: 0, geoAltitude: 10100, squawk: '8246', spi: false, positionSource: 0, departure: 'ATH', arrival: 'IST' },
  { icao24: 'no0001', callsign: 'NAX452', originCountry: 'Norway', timePosition: t(), lastContact: t(), longitude: 10.7522, latitude: 59.9139, baroAltitude: 9754, onGround: false, velocity: 238, trueTrack: 200, verticalRate: -3, geoAltitude: 9800, squawk: '8357', spi: false, positionSource: 0, departure: 'OSL', arrival: 'LHR' },
  { icao24: 'pl0001', callsign: 'LOT231', originCountry: 'Poland', timePosition: t(), lastContact: t(), longitude: 21.0122, latitude: 52.2297, baroAltitude: 10668, onGround: false, velocity: 250, trueTrack: 270, verticalRate: 0, geoAltitude: 10700, squawk: '8468', spi: false, positionSource: 0, departure: 'WAW', arrival: 'FRA' },
  // India
  { icao24: 'ind001', callsign: 'AIC101', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 72.8656, latitude: 19.0896, baroAltitude: 9144, onGround: false, velocity: 220, trueTrack: 90, verticalRate: 0, geoAltitude: 9200, squawk: '1111', spi: false, positionSource: 0, departure: 'BOM', arrival: 'DEL' },
  { icao24: 'ind002', callsign: 'IGO202', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 77.1, latitude: 28.5562, baroAltitude: 10668, onGround: false, velocity: 235, trueTrack: 180, verticalRate: -3, geoAltitude: 10700, squawk: '1112', spi: false, positionSource: 0, departure: 'DEL', arrival: 'BLR' },
  { icao24: 'ind003', callsign: 'SEJ303', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 80.1709, latitude: 12.9941, baroAltitude: 8534, onGround: false, velocity: 210, trueTrack: 270, verticalRate: 5, geoAltitude: 8600, squawk: '1113', spi: false, positionSource: 0, departure: 'MAA', arrival: 'BOM' },
  { icao24: 'ind004', callsign: 'AIC404', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 88.4467, latitude: 22.6547, baroAltitude: 11278, onGround: false, velocity: 245, trueTrack: 45, verticalRate: 0, geoAltitude: 11300, squawk: '1114', spi: false, positionSource: 0, departure: 'CCU', arrival: 'DEL' },
  { icao24: 'ind005', callsign: 'IGO505', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 78.4294, latitude: 17.2403, baroAltitude: 7620, onGround: false, velocity: 200, trueTrack: 135, verticalRate: 8, geoAltitude: 7650, squawk: '1115', spi: false, positionSource: 0, departure: 'HYD', arrival: 'MAA' },
  { icao24: 'ind006', callsign: 'GOW606', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 85.8, latitude: 20.3, baroAltitude: 9754, onGround: false, velocity: 225, trueTrack: 315, verticalRate: -2, geoAltitude: 9800, squawk: '1116', spi: false, positionSource: 0, departure: 'BBI', arrival: 'CCU' },
  { icao24: 'ind007', callsign: 'AIC707', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 74.5, latitude: 15.3, baroAltitude: 10058, onGround: false, velocity: 230, trueTrack: 60, verticalRate: 0, geoAltitude: 10100, squawk: '1117', spi: false, positionSource: 0, departure: 'GOI', arrival: 'BOM' },
  { icao24: 'ind008', callsign: 'IGO808', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 76.9, latitude: 11.0, baroAltitude: 8839, onGround: false, velocity: 215, trueTrack: 200, verticalRate: 3, geoAltitude: 8900, squawk: '1118', spi: false, positionSource: 0, departure: 'COK', arrival: 'MAA' },
  { icao24: 'ind009', callsign: 'AIC919', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 68.9, latitude: 22.3, baroAltitude: 9449, onGround: false, velocity: 218, trueTrack: 45, verticalRate: 0, geoAltitude: 9500, squawk: '1119', spi: false, positionSource: 0, departure: 'AMD', arrival: 'DEL' },
  { icao24: 'ind010', callsign: 'IGO110', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 73.8, latitude: 18.5, baroAltitude: 8229, onGround: false, velocity: 205, trueTrack: 300, verticalRate: -5, geoAltitude: 8300, squawk: '1120', spi: false, positionSource: 0, departure: 'PNQ', arrival: 'BOM' },
  { icao24: 'ind011', callsign: 'AIC211', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 92.7, latitude: 26.1, baroAltitude: 10363, onGround: false, velocity: 222, trueTrack: 90, verticalRate: 0, geoAltitude: 10400, squawk: '1121', spi: false, positionSource: 0, departure: 'GAU', arrival: 'CCU' },
  { icao24: 'ind012', callsign: 'SEJ412', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 75.8, latitude: 26.9, baroAltitude: 7620, onGround: false, velocity: 198, trueTrack: 220, verticalRate: 6, geoAltitude: 7700, squawk: '1122', spi: false, positionSource: 0, departure: 'JAI', arrival: 'BOM' },
  // Middle East
  { icao24: 'b8c9d0', callsign: 'UAE404', originCountry: 'United Arab Emirates', timePosition: t(), lastContact: t(), longitude: 55.2708, latitude: 25.2048, baroAltitude: 13106, onGround: false, velocity: 275, trueTrack: 135, verticalRate: 0, geoAltitude: 13100, squawk: '8901', spi: false, positionSource: 0, departure: 'DXB', arrival: 'SIN' },
  { icao24: 'me0001', callsign: 'QTR101', originCountry: 'Qatar', timePosition: t(), lastContact: t(), longitude: 51.608, latitude: 25.2731, baroAltitude: 12192, onGround: false, velocity: 270, trueTrack: 90, verticalRate: 0, geoAltitude: 12200, squawk: '2001', spi: false, positionSource: 0, departure: 'DOH', arrival: 'BOM' },
  { icao24: 'me0002', callsign: 'ETD232', originCountry: 'United Arab Emirates', timePosition: t(), lastContact: t(), longitude: 54.3773, latitude: 24.4539, baroAltitude: 12802, onGround: false, velocity: 272, trueTrack: 270, verticalRate: 0, geoAltitude: 12800, squawk: '2112', spi: false, positionSource: 0, departure: 'AUH', arrival: 'LHR' },
  { icao24: 'me0003', callsign: 'SVA781', originCountry: 'Saudi Arabia', timePosition: t(), lastContact: t(), longitude: 46.7219, latitude: 24.6877, baroAltitude: 11582, onGround: false, velocity: 260, trueTrack: 45, verticalRate: -3, geoAltitude: 11600, squawk: '2223', spi: false, positionSource: 0, departure: 'RUH', arrival: 'DXB' },
  { icao24: 'me0004', callsign: 'THY781', originCountry: 'Turkey', timePosition: t(), lastContact: t(), longitude: 44.3661, latitude: 33.3152, baroAltitude: 11278, onGround: false, velocity: 255, trueTrack: 320, verticalRate: 0, geoAltitude: 11300, squawk: '2334', spi: false, positionSource: 0, departure: 'BGW', arrival: 'IST' },
  // Asia
  { icao24: 'b4c5d6', callsign: 'SIA010', originCountry: 'Singapore', timePosition: t(), lastContact: t(), longitude: 103.8198, latitude: 1.3521, baroAltitude: 13411, onGround: false, velocity: 278, trueTrack: 355, verticalRate: 0, geoAltitude: 13400, squawk: '4680', spi: false, positionSource: 0, departure: 'SIN', arrival: 'HKG' },
  { icao24: 'c5d6e7', callsign: 'CPA100', originCountry: 'Hong Kong', timePosition: t(), lastContact: t(), longitude: 114.1694, latitude: 22.3193, baroAltitude: 12192, onGround: false, velocity: 265, trueTrack: 80, verticalRate: 6, geoAltitude: 12200, squawk: '5791', spi: false, positionSource: 0, departure: 'HKG', arrival: 'NRT' },
  { icao24: 'd0e1f2', callsign: 'JAL606', originCountry: 'Japan', timePosition: t(), lastContact: t(), longitude: 139.6917, latitude: 35.6895, baroAltitude: 11887, onGround: false, velocity: 258, trueTrack: 25, verticalRate: -8, geoAltitude: 11900, squawk: '0123', spi: false, positionSource: 0, departure: 'NRT', arrival: 'LAX' },
  { icao24: 'jp0002', callsign: 'ANA271', originCountry: 'Japan', timePosition: t(), lastContact: t(), longitude: 130.4017, latitude: 33.5904, baroAltitude: 10668, onGround: false, velocity: 255, trueTrack: 50, verticalRate: 0, geoAltitude: 10700, squawk: '0234', spi: false, positionSource: 0, departure: 'FUK', arrival: 'NRT' },
  { icao24: 'cn0001', callsign: 'CCA981', originCountry: 'China', timePosition: t(), lastContact: t(), longitude: 116.4074, latitude: 39.9042, baroAltitude: 11582, onGround: false, velocity: 260, trueTrack: 180, verticalRate: 0, geoAltitude: 11600, squawk: '3301', spi: false, positionSource: 0, departure: 'PEK', arrival: 'PVG' },
  { icao24: 'cn0002', callsign: 'CSN456', originCountry: 'China', timePosition: t(), lastContact: t(), longitude: 113.2644, latitude: 23.1291, baroAltitude: 10972, onGround: false, velocity: 255, trueTrack: 90, verticalRate: -2, geoAltitude: 11000, squawk: '3412', spi: false, positionSource: 0, departure: 'CAN', arrival: 'HKG' },
  { icao24: 'cn0003', callsign: 'CES531', originCountry: 'China', timePosition: t(), lastContact: t(), longitude: 121.4737, latitude: 31.2304, baroAltitude: 10363, onGround: false, velocity: 252, trueTrack: 270, verticalRate: 0, geoAltitude: 10400, squawk: '3523', spi: false, positionSource: 0, departure: 'PVG', arrival: 'SIN' },
  { icao24: 'kr0001', callsign: 'KAL781', originCountry: 'South Korea', timePosition: t(), lastContact: t(), longitude: 126.978, latitude: 37.5665, baroAltitude: 11278, onGround: false, velocity: 258, trueTrack: 130, verticalRate: 0, geoAltitude: 11300, squawk: '4401', spi: false, positionSource: 0, departure: 'ICN', arrival: 'SIN' },
  { icao24: 'th0001', callsign: 'THA662', originCountry: 'Thailand', timePosition: t(), lastContact: t(), longitude: 100.5018, latitude: 13.7563, baroAltitude: 12192, onGround: false, velocity: 265, trueTrack: 270, verticalRate: 0, geoAltitude: 12200, squawk: '5501', spi: false, positionSource: 0, departure: 'BKK', arrival: 'DXB' },
  { icao24: 'my0001', callsign: 'MAS371', originCountry: 'Malaysia', timePosition: t(), lastContact: t(), longitude: 101.6869, latitude: 3.139, baroAltitude: 12802, onGround: false, velocity: 268, trueTrack: 45, verticalRate: 3, geoAltitude: 12800, squawk: '5612', spi: false, positionSource: 0, departure: 'KUL', arrival: 'NRT' },
  { icao24: 'pk0001', callsign: 'PIA781', originCountry: 'Pakistan', timePosition: t(), lastContact: t(), longitude: 67.0011, latitude: 24.8607, baroAltitude: 10668, onGround: false, velocity: 245, trueTrack: 315, verticalRate: 0, geoAltitude: 10700, squawk: '5723', spi: false, positionSource: 0, departure: 'KHI', arrival: 'DXB' },
  { icao24: 'id0001', callsign: 'GIA415', originCountry: 'Indonesia', timePosition: t(), lastContact: t(), longitude: 106.8456, latitude: -6.2088, baroAltitude: 11887, onGround: false, velocity: 262, trueTrack: 90, verticalRate: 0, geoAltitude: 11900, squawk: '5834', spi: false, positionSource: 0, departure: 'CGK', arrival: 'SIN' },
  // Africa
  { icao24: 'b0c1d2', callsign: 'ETH600', originCountry: 'Ethiopia', timePosition: t(), lastContact: t(), longitude: 38.7578, latitude: 9.032, baroAltitude: 12802, onGround: false, velocity: 270, trueTrack: 5, verticalRate: 0, geoAltitude: 12800, squawk: '0246', spi: false, positionSource: 0, departure: 'ADD', arrival: 'DXB' },
  { icao24: 'za0001', callsign: 'SAA281', originCountry: 'South Africa', timePosition: t(), lastContact: t(), longitude: 28.0473, latitude: -26.2041, baroAltitude: 11582, onGround: false, velocity: 258, trueTrack: 350, verticalRate: 0, geoAltitude: 11600, squawk: '6601', spi: false, positionSource: 0, departure: 'JNB', arrival: 'LHR' },
  { icao24: 'ng0001', callsign: 'AWN101', originCountry: 'Nigeria', timePosition: t(), lastContact: t(), longitude: 3.3792, latitude: 6.5244, baroAltitude: 10363, onGround: false, velocity: 245, trueTrack: 90, verticalRate: -2, geoAltitude: 10400, squawk: '6712', spi: false, positionSource: 0, departure: 'LOS', arrival: 'ACC' },
  { icao24: 'ke0001', callsign: 'KQA101', originCountry: 'Kenya', timePosition: t(), lastContact: t(), longitude: 36.8219, latitude: -1.2921, baroAltitude: 10972, onGround: false, velocity: 250, trueTrack: 180, verticalRate: 0, geoAltitude: 11000, squawk: '6823', spi: false, positionSource: 0, departure: 'NBO', arrival: 'ADD' },
  // South America
  { icao24: 'd6e7f8', callsign: 'TAM200', originCountry: 'Brazil', timePosition: t(), lastContact: t(), longitude: -46.6333, latitude: -23.5505, baroAltitude: 11278, onGround: false, velocity: 255, trueTrack: 160, verticalRate: -4, geoAltitude: 11300, squawk: '6802', spi: false, positionSource: 0, departure: 'GRU', arrival: 'EZE' },
  { icao24: 'br0002', callsign: 'GLO1234', originCountry: 'Brazil', timePosition: t(), lastContact: t(), longitude: -43.1729, latitude: -22.9068, baroAltitude: 9754, onGround: false, velocity: 240, trueTrack: 200, verticalRate: 0, geoAltitude: 9800, squawk: '6913', spi: false, positionSource: 0, departure: 'GIG', arrival: 'GRU' },
  { icao24: 'ar0001', callsign: 'ARG1141', originCountry: 'Argentina', timePosition: t(), lastContact: t(), longitude: -58.3816, latitude: -34.6037, baroAltitude: 10668, onGround: false, velocity: 248, trueTrack: 270, verticalRate: 0, geoAltitude: 10700, squawk: '7001', spi: false, positionSource: 0, departure: 'EZE', arrival: 'SCL' },
  { icao24: 'co0001', callsign: 'AVA451', originCountry: 'Colombia', timePosition: t(), lastContact: t(), longitude: -74.0721, latitude: 4.711, baroAltitude: 9449, onGround: false, velocity: 235, trueTrack: 330, verticalRate: 5, geoAltitude: 9500, squawk: '7112', spi: false, positionSource: 0, departure: 'BOG', arrival: 'MIA' },
  // Australia & Oceania
  { icao24: 'c9d0e1', callsign: 'QFA505', originCountry: 'Australia', timePosition: t(), lastContact: t(), longitude: 151.2093, latitude: -33.8688, baroAltitude: 12497, onGround: false, velocity: 262, trueTrack: 340, verticalRate: 0, geoAltitude: 12500, squawk: '9012', spi: false, positionSource: 0, departure: 'SYD', arrival: 'SIN' },
  { icao24: 'au0002', callsign: 'VOZ891', originCountry: 'Australia', timePosition: t(), lastContact: t(), longitude: 144.9631, latitude: -37.8136, baroAltitude: 10058, onGround: false, velocity: 245, trueTrack: 60, verticalRate: 5, geoAltitude: 10100, squawk: '9123', spi: false, positionSource: 0, departure: 'MEL', arrival: 'SYD' },
  { icao24: 'nz0001', callsign: 'ANZ181', originCountry: 'New Zealand', timePosition: t(), lastContact: t(), longitude: 174.7633, latitude: -36.8485, baroAltitude: 11278, onGround: false, velocity: 255, trueTrack: 180, verticalRate: 0, geoAltitude: 11300, squawk: '9234', spi: false, positionSource: 0, departure: 'AKL', arrival: 'SYD' },
  // Transatlantic / oceanic
  { icao24: 'oc0001', callsign: 'BAW173', originCountry: 'United Kingdom', timePosition: t(), lastContact: t(), longitude: -40.0, latitude: 50.0, baroAltitude: 12497, onGround: false, velocity: 270, trueTrack: 280, verticalRate: 0, geoAltitude: 12500, squawk: '5100', spi: false, positionSource: 0, departure: 'LHR', arrival: 'JFK' },
  { icao24: 'oc0002', callsign: 'UAL901', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -30.0, latitude: 52.0, baroAltitude: 12192, onGround: false, velocity: 268, trueTrack: 100, verticalRate: 0, geoAltitude: 12200, squawk: '5200', spi: false, positionSource: 0, departure: 'JFK', arrival: 'LHR' },
  { icao24: 'oc0003', callsign: 'SIA321', originCountry: 'Singapore', timePosition: t(), lastContact: t(), longitude: 80.0, latitude: 20.0, baroAltitude: 13106, onGround: false, velocity: 275, trueTrack: 310, verticalRate: 0, geoAltitude: 13100, squawk: '5300', spi: false, positionSource: 0, departure: 'SIN', arrival: 'LHR' },
  { icao24: 'oc0004', callsign: 'QFA11', originCountry: 'Australia', timePosition: t(), lastContact: t(), longitude: 160.0, latitude: -20.0, baroAltitude: 12802, onGround: false, velocity: 265, trueTrack: 10, verticalRate: 0, geoAltitude: 12800, squawk: '5400', spi: false, positionSource: 0, departure: 'SYD', arrival: 'LAX' },
  { icao24: 'oc0005', callsign: 'AFR022', originCountry: 'France', timePosition: t(), lastContact: t(), longitude: -55.0, latitude: 5.0, baroAltitude: 11887, onGround: false, velocity: 260, trueTrack: 330, verticalRate: 0, geoAltitude: 11900, squawk: '5500', spi: false, positionSource: 0, departure: 'GRU', arrival: 'CDG' },
  { icao24: 'oc0006', callsign: 'UAE218', originCountry: 'United Arab Emirates', timePosition: t(), lastContact: t(), longitude: 20.0, latitude: 15.0, baroAltitude: 12192, onGround: false, velocity: 272, trueTrack: 250, verticalRate: 0, geoAltitude: 12200, squawk: '5600', spi: false, positionSource: 0, departure: 'DXB', arrival: 'JNB' },
]

function parseStates(raw: (string | number | boolean | null)[][]): AircraftState[] {
  return raw
    .filter(s => s[5] !== null && s[6] !== null)
    .slice(0, 500)
    .map(s => ({
      icao24: String(s[0] ?? ''),
      callsign: s[1] ? String(s[1]).trim() : null,
      originCountry: String(s[2] ?? ''),
      timePosition: s[3] as number | null,
      lastContact: s[4] as number,
      longitude: s[5] as number | null,
      latitude: s[6] as number | null,
      baroAltitude: s[7] as number | null,
      onGround: Boolean(s[8]),
      velocity: s[9] as number | null,
      trueTrack: s[10] as number | null,
      verticalRate: s[11] as number | null,
      geoAltitude: s[13] as number | null,
      squawk: s[14] ? String(s[14]) : null,
      spi: Boolean(s[15]),
      positionSource: s[16] as number ?? 0,
    }))
}

const OPENSKY_AUTH = {
  username: import.meta.env.VITE_OPENSKY_USERNAME as string | undefined,
  password: import.meta.env.VITE_OPENSKY_PASSWORD as string | undefined,
}

async function fetchOpenSky(): Promise<AircraftState[]> {
  try {
    const res = await axios.get('/api/opensky', { timeout: 20000 })
    const data = res.data
    if (!data?.states || !Array.isArray(data.states) || data.states.length === 0) return MOCK_AIRCRAFT
    // adsb.lol returns pre-built AircraftState objects; OpenSky returns raw arrays
    if (data._source === 'adsb.lol') {
      return (data.states as AircraftState[]).slice(0, 5000)
    }
    return parseStates(data.states)
  } catch {
    return MOCK_AIRCRAFT
  }
}

export function useOpenSky() {
  const query = useQuery({
    queryKey: ['opensky'],
    queryFn: fetchOpenSky,
    initialData: MOCK_AIRCRAFT,
    refetchInterval: 60000,
    staleTime: 55000,
  })

  // If we're still on the hardcoded fallback (live fetch failed or hasn't
  // resolved yet), flag it so the UI can warn the user.
  const isMock = query.data === MOCK_AIRCRAFT

  return { ...query, isMock }
}
