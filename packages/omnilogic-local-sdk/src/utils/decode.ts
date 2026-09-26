// the cell thermistor curve, tenths of °F
const THERMISTOR: number[] = [
  8000, 3740, 3136, 2817, 2603, 2444, 2318, 2214, 2125, 2048, 1980, 1919, 1864,
  1813, 1767, 1723, 1683, 1645, 1610, 1576, 1544, 1514, 1485, 1458, 1431, 1406,
  1381, 1358, 1335, 1313, 1291, 1270, 1250, 1230, 1211, 1193, 1174, 1156, 1139,
  1122, 1105, 1088, 1072, 1056, 1041, 1025, 1010, 995, 980, 966, 951, 937, 923,
  909, 895, 881, 868, 854, 841, 828, 815, 802, 789, 776, 763, 750, 737, 725,
  712, 699, 687, 674, 661, 649, 636, 624, 611, 598, 586, 573,
];

// a 16-bit value sent as two bytes
export const word = (high: number, low: number) => high * 256 + low;

// cell voltage: ADC count → volts
export const cellVolts = (raw: number) => ((raw * 5) / 255) * 8.15;

// cell current: ADC count → amps, a raw 0 reported as 0
export const cellAmps = (raw: number) =>
  raw === 0 ? 0 : (raw * 5) / 255 / 0.489;

// thermistor count → °F, NaN past the table's end (raw ≥ 640)
export const thermistorF = (raw: number) => {
  const i = raw >> 3;
  const lo = THERMISTOR[i];
  if (lo === undefined) {
    return Number.NaN;
  }
  const hi = THERMISTOR[i + 1] ?? lo;
  return (lo + ((raw & 7) / 8) * (hi - lo)) / 10;
};

// two BCD nibbles → the decimal they spell (0x58 → 58)
const bcd = (byte: number) => (byte >> 4) * 10 + (byte & 0x0f);

// the pump drive's power: two BCD bytes spelling watts
export const bcdWatts = (msb: number, lsb: number) => bcd(msb) * 100 + bcd(lsb);

// six ASCII bytes → their digits, spaces and nulls dropped ("1015 " → "1015")
const revisionDigits = (bytes: number[]) =>
  String.fromCharCode(...bytes).replaceAll(/[^0-9]/g, "");

// the display board's revision as the panel shows it: "1015" → "10.1.5"
export const displayRevision = (bytes: number[]) => {
  const d = revisionDigits(bytes);
  return d.length >= 4
    ? `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3, 4)}`
    : d;
};

// the drive's revision as the panel shows it: "0073" → "0.73"
export const driveRevision = (bytes: number[]) => {
  const d = revisionDigits(bytes);
  return d.length >= 4 ? `${Number(d.slice(0, 2))}.${d.slice(2, 4)}` : d;
};
