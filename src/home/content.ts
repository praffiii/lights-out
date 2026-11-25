import type { To } from '#/shell/context.ts'

export type Photo = { src: string; place: string; credit: string; srcSet?: string; source?: string }

export const PHOTOS = {
  heroLight: { src: '/img/hero-light.jpg', place: 'Lewis Hamilton · Ferrari SF-25 · Suzuka, 2025', credit: 'Photo Liauzh · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_FP1.jpg' },
  heroDark: { src: '/img/hero-dark.jpg', place: 'McLaren MCL39 · Las Vegas, 2025', credit: 'Photo DHSgov · Public domain', source: 'https://commons.wikimedia.org/wiki/File:Las_Vegas_Grand_Prix_(54941206297)_(cropped).jpg' },
  ch01: { src: '/img/ch01.jpg', place: 'The grid · Shanghai, 2024', credit: 'Photo Liauzh · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Sprint_Grid_Top_3_-_Chinese_GP_2024.jpg' },
  ch02: { src: '/img/ch02.jpg', srcSet: '/img/ch02.jpg 1400w, /img/ch02-3543.jpg 3543w', place: 'Main straight · Baku, 2026', credit: 'Photo Press Service of the President of Azerbaijan · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Formula_1_2026_Azerbaijan_Grand_Prix_1.jpg' },
  ch02Straight: { src: '/img/ch02-straight.jpg', place: 'The straight · Sepang, 2017', credit: 'Photo Morio · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Max_Verstappen_overtaking_Lewis_Hamilton_2017_Malaysia_1.jpg' },
  ch02Turn1: { src: '/img/ch02-turn1.jpg', place: 'Turn 1 · Sepang, 2017', credit: 'Photo Morio · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Max_Verstappen_overtaking_Lewis_Hamilton_2017_Malaysia_3.jpg' },
  ch02Exit: { src: '/img/ch02-exit.jpg', place: 'The exit · Sepang, 2017', credit: 'Photo Morio · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Max_Verstappen_overtaking_Lewis_Hamilton_2017_Malaysia_2.jpg' },
  ch02Tow: { src: '/img/ch02-tow.jpg', srcSet: '/img/ch02-tow.jpg 2000w, /img/ch02-tow-3388.jpg 3388w', place: 'The tow · Spa-Francorchamps, 2026', credit: 'Photo Der Alf · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:F1_2026,_TGR_Haas_F1_Team,_Haas_VF-26,_Oliver_Bearman,_Esteban_Ocon,_Spa_Francorchamps_(55425688103).jpg' },
  ch03: { src: '/img/ch03.jpg', place: 'Pit exit · Suzuka, 2024', credit: 'Photo Cineyas · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Max_Verstappen_in_the_RB20.jpg' },
  ch03Medium: { src: '/img/ch03-medium.jpg', place: 'Medium slick · 2026', credit: 'Photo TaurusEmerald · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Pirelli_P_Zero_Formula_1_Medium_Slick_Tyre_2026.jpg' },
  ch03Sc: { src: '/img/ch03-sc.jpg', place: 'Safety car · Suzuka, 2026', credit: 'Photo Ysys3455 · CC0', source: 'https://commons.wikimedia.org/wiki/File:F1%E3%82%BB%E3%83%BC%E3%83%95%E3%83%86%E3%82%A3%E3%82%AB%E3%83%BC_%E9%88%B4%E9%B9%BF2026.jpg' },
  ch04: { src: '/img/ch04.jpg', place: 'Safety car board · Zandvoort, 2024', credit: 'Photo Steffen Prößdorf · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Gro%C3%9Fer_Preis_der_Niederlande_2024,_Porsche_Mobil_1_Supercup_STP_3666_by_Stepro.jpg' },
  ch04Marshal: { src: '/img/ch04-marshal.jpg', place: 'Track marshal · Zandvoort, 2024', credit: 'Photo Steffen Prößdorf · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:2024-08-24_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3286_by_Stepro.jpg' },
  ch04Sweep: { src: '/img/ch04-sweep.jpg', place: 'Marshals clear the track · Melbourne, 2026', credit: 'Photo Yu Chu Chin · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Turn_11_at_the_2026_Australian_Grand_Prix_(028A8507)_(cropped).jpg' },
  ch04Fire: { src: '/img/ch04-fire.jpg', place: 'A grass fire stops qualifying · Suzuka, 2025', credit: 'Photo Liauzh · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:2025_Japan_GP_-_Grass_Fire_-_Q2.jpg' },
  ch04Board: { src: '/img/ch04-board.jpg', place: 'Yellow flag and SC board · Indianapolis, 2005', credit: 'Photo Dan Smith · CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:F1_yellow_flag_and_SC_sign.jpg' },
  ch05: { src: '/img/ch05.jpg', place: 'Oscar Piastri · McLaren MCL40 · Suzuka, 2026', credit: 'Photo Martin Lee · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Mclaren_MCL40_-_Oscar_Piastri_enters_the_Nissin_Brake_Hairpin_at_Suzuka_during_the_2026_Japanese_GP_(55195174246).jpg' },
  ch05History1950: { src: '/img/ch05-1950.jpg', place: 'Zandvoort, 1950', credit: 'Photo Nationaal Archief · CC0', source: 'https://commons.wikimedia.org/wiki/File:START,_autoraces,_Bestanddeelnr_904-0841.jpg' },
  ch05History1978: { src: '/img/ch05-1978.jpg', place: 'Zandvoort, 1978 · Lotus 79', credit: 'Mario Andretti leads Ronnie Peterson · Photo Koen Suyk / Anefo, Nationaal Archief · CC0', source: 'https://commons.wikimedia.org/wiki/File:Grand_Prix_Zandvoort_Mario_Andretti_op_kop_met_daar_achter_Ronnie_Petterson,_Bestanddeelnr_929-8743.jpg' },
  ch05History2026: { src: '/img/ch05-2026.jpg', place: 'Suzuka, 2026 · Mercedes W17', credit: 'Kimi Antonelli · Photo Martin Lee · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Mercedes_W17_-_Kimi_Antonelli_approaches_Spoon_Curve_at_Suzuka_during_the_2026_Japanese_GP_(55194289192).jpg' },
  ch06: { src: '/img/ch06.jpg', srcSet: '/img/ch06.jpg 1400w, /img/ch06-2800.jpg 2800w', place: 'Nico Hülkenberg · Audi R26 · Shanghai, 2026', credit: 'Photo Liauzh · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Audi_-_Nico_Hulkenberg_-_Qualifying.jpg' },
  ch06MguH: { src: '/img/ch06-mguh.jpg', place: 'Honda RA621H, 2021 · Honda Racing Gallery, 2025', credit: 'Photo Liauzh · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Honda_Racing_Gallery_-_Honda_RA621H_rear.jpg' },
  ch06Y1967: { src: '/img/ch06-1967.jpg', place: 'London, 2025', credit: 'Photo Hullian111 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ford_Cosworth_DFV_Engine_at_Formula_1_Exhibition,_London.jpg' },
  ch06Y1986: { src: '/img/ch06-1986.jpg', place: 'Munich, 2014', credit: 'Photo Jiří Sedláček · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Formula_1_racing_engine_M12-13_in_BMW-Museum_in_Munich,_Bayern.JPG' },
  ch06Y2001: { src: '/img/ch06-2001.jpg', place: 'Maranello, 2013', credit: 'Photo Morio · CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Ferrari_050_engine_front_Museo_Ferrari.jpg' },
  ch06Y2014: { src: '/img/ch06-2014.jpg', place: 'Silverstone, 2019', credit: 'Photo David Merrett · CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:2016_Mercedes_PU106_Hybrid_Power_Unit_(49255122157).jpg' },
  ch07: { src: '/img/ch07.jpg', srcSet: '/img/ch07.jpg 1400w, /img/ch07-2800.jpg 2800w', place: 'Pit straight · Silverstone, 2026', credit: 'Photo Jason Puddephatt · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Lewis_Hamilton_George_Russell_F1_Cars_(55382811247).jpg' },
  ch07Podium: { src: '/img/ch07-podium.jpg', place: 'Russell, Antonelli and Leclerc on the podium · Melbourne, 2026', credit: 'Photo Yu Chu Chin · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Podium_celebration_at_the_2026_Australian_Grand_Prix_(028A8808).jpg' },
  tyres: { src: '/img/tyres.jpg', place: 'Pirelli tyres, slicks to wets', credit: 'Photo Hullian111 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Pirelli_Tyre_Sets_at_Formula_1_Exhibition,_London_02.jpg' },
  williams: { src: '/img/williams.jpg', place: 'Williams FW48 · Shanghai, 2026', credit: 'Photo Liauzh · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Williams_-_Alex_Albon_-_Qualifying.jpg' },
  brm: { src: '/img/y1973.jpg', place: 'BRM mechanics · Anderstorp, 1973', credit: 'Photo Markku Lepola · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Swedish_Grand_Prix_1973_(JOKAMAL3B08-13).tif' },
  startLights: { src: '/img/start-lights.jpg', place: 'Start lights · Melbourne, 2026 · cropped', credit: 'Photo Yu Chu Chin · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Track_Walk_at_the_2026_Australian_Grand_Prix_(028A8882).jpg' },
  recovery: { src: '/img/not-found.jpg', place: 'Recovery · Zandvoort, 2024', credit: 'Photo Steffen Prößdorf · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:2024-08-24_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3280_by_Stepro.jpg' },
  ch08Cadillac: { src: '/img/ch08-cadillac.jpg', place: 'Practice · Melbourne, 2026', credit: 'Photo Yu Chu Chin · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Cadillac_MAC-26_of_Sergio_P%C3%A9rez_(028A8062).jpg' },
  ch08Drs: { src: '/img/ch08-drs.jpg', place: 'DRS board · Silverstone, 2018', credit: 'Photo flickr.com/photos/69527563@N05 · CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:2018_British_Grand_Prix_DRS_(42837386495).jpg' },
  ch09Antonelli: { src: '/img/ch09-antonelli.jpg', place: 'Qualifying · Monza, 2025', credit: 'Photo Eustace Bagge · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Andrea_Kimi_Antonelli_2025_Italian_Grand_Prix_qualifying3.jpg' },
  ch09Wing: { src: '/img/ch09-wing.jpg', place: 'Exhibition · London, 2025', credit: 'Photo Hullian111 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Mercedes_AMG_F1_W09_EQ_Power%2B_DRS_Rear_Wing_at_Formula_1_Exhibition,_London.jpg' },
  ch09F3: { src: '/img/ch09-f3.jpg', place: 'Formula 3 · Spa-Francorchamps, 2026', credit: 'Photo Der Alf · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:F3_2026,_AIX_Racing,_DAMS,_Prema_Racing,_Spa_Francorchamps_(55425571691).jpg' },
} satisfies Record<string, Photo>

export type ChapterPath = Extract<To, `/chapters/${string}`>

export type ChapterEntry = { n: string; title: string; min: number; photo: Photo; to: ChapterPath; line: string }

export const CHAPTERS: ReadonlyArray<ChapterEntry> = [
  { n: '01', title: 'A race weekend, Friday to Sunday', min: 5, photo: PHOTOS.ch01, to: '/chapters/race-weekend', line: 'Practice, qualifying, the race, and how the points are paid.' },
  { n: '02', title: 'How overtaking works', min: 5, photo: PHOTOS.ch02, to: '/chapters/overtaking', line: 'Get within a second, use the battery, brake later.' },
  { n: '03', title: 'Tyres and strategy', min: 7, photo: PHOTOS.ch03, to: '/chapters/tyres-and-strategy', line: 'The compounds, the pit stop, and the undercut.' },
  { n: '04', title: 'Flags and what they mean', min: 4, photo: PHOTOS.ch04, to: '/chapters/flags', line: 'Every flag and light panel, and what it asks a driver to do.' },
  { n: '05', title: 'Inside the car', min: 8, photo: PHOTOS.ch05, to: '/chapters/inside-the-car', line: 'Eight parts, and the one job each part has.' },
  { n: '06', title: 'The power unit', min: 6, photo: PHOTOS.ch06, to: '/chapters/power-unit', line: 'A V6 and an electric motor, close to 50:50.' },
  { n: '07', title: 'Defending', min: 6, photo: PHOTOS.ch07, to: '/chapters/defending', line: 'One move, the switchback, and what it costs to cheat.' },
  { n: '08', title: 'The two championships', min: 6, photo: PHOTOS.ch07Podium, to: '/chapters/championships', line: 'Every point counts twice, for a driver and a team.' },
  { n: '09', title: 'DRS, 2011 to 2025', min: 5, photo: PHOTOS.ch08Drs, to: '/chapters/drs', line: 'The flap that made passing easier, until it was gone.' },
]

export const HERO = {
  lines: ['Formula 1,', 'from lights out.'],
  intro: 'A fan-made guide for anyone who just watched their first race and wants to know what happened.',
  meta: '2026 season · 22 drivers · 11 teams · 23 races',
}

export const CALLOUT_FRAME = { w: 1440, h: 548 }

export const CALLOUTS = [
  { label: 'Halo', chip: [562, 25], dot: [605, 133] },
  { label: 'Power unit', chip: [902, 25], dot: [968, 158] },
  { label: 'Rear wing · active aero', chip: [1152, 25], dot: [1305, 135] },
  { label: 'Front wing', chip: [74, 421], dot: [124, 313] },
  { label: 'Tyre', chip: [362, 421], dot: [388, 225] },
  { label: 'Sidepod', chip: [742, 421], dot: [788, 276] },
] as const

export const CHIP_H = 25

export const CAR_STATS = [
  { k: 'Power unit', v: '1.6 L V6 turbo hybrid', count: null },
  { k: 'Minimum weight', v: '768 kg', count: '' },
  { k: 'Wheelbase', v: '3,400 mm max', count: 'group' },
  { k: 'Aerodynamics', v: 'Active, two modes', count: null },
] as const

export const READ_NEXT: ReadonlyArray<{ title: string; kind: string; photo: Photo; alt: string; to: ChapterPath | null }> = [
  { title: 'Why one pit stop can win a race.', kind: 'Strategy', photo: PHOTOS.tyres, alt: 'Pirelli tyres on display, from slicks to wets.', to: '/chapters/tyres-and-strategy' },
  { title: 'Swedish Grand Prix, 1973.', kind: 'History', photo: PHOTOS.brm, alt: 'Mechanics at work on the number 20 BRM at the 1973 Swedish Grand Prix.', to: null },
]
