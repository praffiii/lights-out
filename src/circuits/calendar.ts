import type { Theme } from '#/shell/theme.ts'

export type CircuitPhoto = { small: string; large: string; place: string; credit: string; source?: string }

export type CalendarCircuit = {
  tile: string
  code: string
  name: string
  gp: string
  tz: string
  lengthKm: string
  laps: number
  firstGp: number
  photo: CircuitPhoto
}

const photo = (circuitId: string, place: string, credit: string, source?: string): CircuitPhoto => ({
  small: `/img/circuits/${circuitId}-720.webp`,
  large: `/img/circuits/${circuitId}-2400.webp`,
  place,
  credit,
  source,
})

export const CALENDAR = {
  albert_park: { tile: 'au-1953', code: 'AUS', name: 'Albert Park', gp: 'Australian GP', tz: 'Australia/Melbourne', lengthKm: '5.278', laps: 58, firstGp: 1996, photo: photo('albert_park', 'Albert Park from Eureka Skydeck · Melbourne, 2014', 'Photo Chris Phutully · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:2014_Melbourne_Grand_Prix_(From_Eureka_Skydeck).jpg') },
  shanghai: { tile: 'cn-2004', code: 'CHN', name: 'Shanghai', gp: 'Chinese GP', tz: 'Asia/Shanghai', lengthKm: '5.451', laps: 56, firstGp: 2004, photo: photo('shanghai', 'From orbit · Shanghai, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Shanghai_International_Circuit,_April_7,_2018_SkySat.jpg') },
  suzuka: { tile: 'jp-1962', code: 'JPN', name: 'Suzuka', gp: 'Japanese GP', tz: 'Asia/Tokyo', lengthKm: '5.807', laps: 53, firstGp: 1987, photo: photo('suzuka', 'From orbit · Suzuka, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Suzuka_International_Racing_Course,_July_10,_2018_SkySat.jpg') },
  miami: { tile: 'us-2022', code: 'MIA', name: 'Miami', gp: 'Miami GP', tz: 'America/New_York', lengthKm: '5.412', laps: 57, firstGp: 2022, photo: photo('miami', 'The grid · Miami, 2025', 'Photo Bassfish22 · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:The_first_three_rows_of_the_grid_ahead_of_the_race_start_miami_gp_2025.jpg') },
  villeneuve: { tile: 'ca-1978', code: 'CAN', name: 'Gilles Villeneuve', gp: 'Canadian GP', tz: 'America/Toronto', lengthKm: '4.361', laps: 70, firstGp: 1978, photo: photo('villeneuve', 'From orbit · Montreal, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Circuit_Gilles-Villeneuve,_May_29,_2018_SkySat.jpg') },
  monaco: { tile: 'mc-1929', code: 'MON', name: 'Monaco', gp: 'Monaco GP', tz: 'Europe/Monaco', lengthKm: '3.337', laps: 78, firstGp: 1950, photo: photo('monaco', 'Above the harbour · Monaco, 2022', 'Photo crash71100 · CC0', 'https://commons.wikimedia.org/wiki/File:Circuit_de_Monaco_(54799423456).jpg') },
  catalunya: { tile: 'es-1991', code: 'ESP', name: 'Catalunya', gp: 'Barcelona GP', tz: 'Europe/Madrid', lengthKm: '4.657', laps: 66, firstGp: 1991, photo: photo('catalunya', 'From orbit · Montmeló, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat.jpg') },
  red_bull_ring: { tile: 'at-1969', code: 'AUT', name: 'Red Bull Ring', gp: 'Austrian GP', tz: 'Europe/Vienna', lengthKm: '4.318', laps: 71, firstGp: 1970, photo: photo('red_bull_ring', 'From the air · Spielberg, 2022', 'Photo Vanessa Machelett · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Luftaufnahme_(c)Red_Bull_Ring.jpg') },
  silverstone: { tile: 'gb-1948', code: 'GBR', name: 'Silverstone', gp: 'British GP', tz: 'Europe/London', lengthKm: '5.891', laps: 52, firstGp: 1950, photo: photo('silverstone', 'From orbit · Silverstone, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Silverstone_Circuit,_July_2,_2018_SkySat.jpg') },
  spa: { tile: 'be-1925', code: 'BEL', name: 'Spa-Francorchamps', gp: 'Belgian GP', tz: 'Europe/Brussels', lengthKm: '7.004', laps: 44, firstGp: 1950, photo: photo('spa', 'From orbit · Spa-Francorchamps, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Circuit_de_Spa-Francorchamps,_April_22,_2018_SkySat_(cropped).jpg') },
  hungaroring: { tile: 'hu-1986', code: 'HUN', name: 'Hungaroring', gp: 'Hungarian GP', tz: 'Europe/Budapest', lengthKm: '4.381', laps: 70, firstGp: 1986, photo: photo('hungaroring', 'From gate 3 · Hungaroring, 2022', 'Photo LoMit · CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Hungaroring_-_wide_view_from_gate_3_09-2022.jpg') },
  zandvoort: { tile: 'nl-1948', code: 'NED', name: 'Zandvoort', gp: 'Dutch GP', tz: 'Europe/Amsterdam', lengthKm: '4.259', laps: 72, firstGp: 1952, photo: photo('zandvoort', 'From the air · Zandvoort, 2018', 'Photo dronepicr · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Circuit_Zandvoort_motorsport_race_track_in_the_Netherlands_(46940292845).jpg') },
  monza: { tile: 'it-1922', code: 'ITA', name: 'Monza', gp: 'Italian GP', tz: 'Europe/Rome', lengthKm: '5.793', laps: 53, firstGp: 1950, photo: photo('monza', 'From orbit · Monza, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Autodromo_Nazionale_Monza,_April_22,_2018_SkySat_(cropped).jpg') },
  madring: { tile: 'es-2026', code: 'MAD', name: 'Madring', gp: 'Spanish GP', tz: 'Europe/Madrid', lengthKm: '5.474', laps: 57, firstGp: 2026, photo: photo('madring', 'IFEMA, home of the Madring · Madrid, 2009', 'Photo Luis García · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:IFEMA_(Campo_de_las_Naciones)_01.jpg') },
  baku: { tile: 'az-2016', code: 'AZE', name: 'Baku', gp: 'Azerbaijan GP', tz: 'Asia/Baku', lengthKm: '6.003', laps: 51, firstGp: 2016, photo: photo('baku', 'Maiden Tower · Baku, 2026', 'Photo Press Service of the President of Azerbaijan · CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Formula_1_2026_Azerbaijan_Grand_Prix_7.jpg') },
  sepang: { tile: 'my-1999', code: 'MAL', name: 'Sepang', gp: 'Bahrain GP in Malaysia', tz: 'Asia/Kuala_Lumpur', lengthKm: '5.543', laps: 56, firstGp: 1999, photo: photo('sepang', 'Main grandstand · Sepang, 2012', 'Photo Leminhel · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Sepang_International_Circuit_1.JPG') },
  marina_bay: { tile: 'sg-2008', code: 'SIN', name: 'Marina Bay', gp: 'Singapore GP', tz: 'Asia/Singapore', lengthKm: '4.940', laps: 62, firstGp: 2008, photo: photo('marina_bay', 'From Marina Bay Sands · Singapore, 2019', 'Photo Dietmar Rabich · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Singapore_(SG),_View_from_Marina_Bay_Sands,_Singapore_Flyer_--_2019_--_4720.jpg') },
  americas: { tile: 'us-2012', code: 'USA', name: 'Circuit of the Americas', gp: 'United States GP', tz: 'America/Chicago', lengthKm: '5.513', laps: 56, firstGp: 2012, photo: photo('americas', 'Main straight and Turn 1 · Austin, 2017', 'Photo Lars Plougmann · CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Main_straight_and_turn_1_hill,_Circuit_of_the_Americas.jpg') },
  rodriguez: { tile: 'mx-1962', code: 'MEX', name: 'Hermanos Rodríguez', gp: 'Mexico City GP', tz: 'America/Mexico_City', lengthKm: '4.304', laps: 71, firstGp: 1963, photo: photo('rodriguez', 'From the air · Mexico City, 2025', 'Photo ProtoplasmaKid · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Vista_a%C3%A9rea_del_Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_03.jpg') },
  interlagos: { tile: 'br-1940', code: 'BRA', name: 'Interlagos', gp: 'São Paulo GP', tz: 'America/Sao_Paulo', lengthKm: '4.309', laps: 71, firstGp: 1973, photo: photo('interlagos', 'From the air · São Paulo, 2022', 'Photo Governo do Estado de São Paulo · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Grande_Pr%C3%AAmio_S%C3%A3o_Paulo_de_F%C3%B3rmula_1_(52497080967).jpg') },
  vegas: { tile: 'us-2023', code: 'LVG', name: 'Las Vegas', gp: 'Las Vegas GP', tz: 'America/Los_Angeles', lengthKm: '6.201', laps: 50, firstGp: 2023, photo: photo('vegas', 'Pit straight · Las Vegas, 2025', 'Photo DHSgov · Public domain', 'https://commons.wikimedia.org/wiki/File:Las_Vegas_Grand_Prix_(54942342239).jpg') },
  losail: { tile: 'qa-2004', code: 'QAT', name: 'Lusail', gp: 'Qatar GP', tz: 'Asia/Qatar', lengthKm: '5.419', laps: 57, firstGp: 2021, photo: photo('losail', 'Main straight at night · Lusail, 2013', 'Photo Trinidade · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Grand_Stand.JPG') },
  yas_marina: { tile: 'ae-2009', code: 'ABU', name: 'Yas Marina', gp: 'Abu Dhabi GP', tz: 'Asia/Dubai', lengthKm: '5.281', laps: 58, firstGp: 2009, photo: photo('yas_marina', 'From orbit · Abu Dhabi, 2018', 'Photo Planet Labs · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Yas_Marina_Circuit,_October_12,_2018_SkySat_(cropped).jpg') },
} satisfies Record<string, CalendarCircuit>

const byId = new Map<string, CalendarCircuit>(Object.entries(CALENDAR))

export const calendarCircuit = (circuitId: string) => byId.get(circuitId)

export const grandPrix = (gp: string) => gp.replace(/\bGP\b/, 'Grand Prix')

export type TileState = 'done' | 'upcoming' | 'now' | 'hover'

export const tileSrc = (tile: string, state: TileState, theme: Theme) => `/circuits/tiles/${tile}-${state}-${theme}.webp`
