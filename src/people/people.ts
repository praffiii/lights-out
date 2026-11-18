import type { Photo } from '#/home/content.ts'

export type Person = { driverId: string; code: string; hero: Photo }

const ROWS = [
  ['antonelli', 'ANT', '2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Qualifying.jpg', 'Kimi Antonelli, Mercedes W17 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['max_verstappen', 'VER', '2026_Chinese_GP_-_Red_Bull_-_Max_Verstappen_-_Qualifying.jpg', 'Max Verstappen, Red Bull RB22 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['russell', 'RUS', '2026_Chinese_GP_-_Mercedes_-_George_Russell_-_Qualifying.jpg', 'George Russell, Mercedes W17 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['hamilton', 'HAM', '2026_Bahrain_GP_-_Ferrari_-_Lewis_Hamilton_-_Qualifying.jpg', 'Lewis Hamilton, Ferrari SF-26 · Sepang, 2026', 'Photo Liauzh · CC BY-SA 4.0'],
  ['leclerc', 'LEC', 'FIA_F1_Austria_2026_Nr._16_Leclerc_(3).jpg', 'Charles Leclerc, Ferrari SF-26 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['norris', 'NOR', '2026_Chinese_GP_-_McLaren_-_Lando_Norris_-_Qualifying.jpg', 'Lando Norris, McLaren MCL40 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['piastri', 'PIA', 'FIA_F1_Austria_2026_Nr._81_Piastri_(3).jpg', 'Oscar Piastri, McLaren MCL40 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['hadjar', 'HAD', 'FIA_F1_Austria_2026_Nr._6_Hadjar_(3).jpg', 'Isack Hadjar, Red Bull RB22 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['lawson', 'LAW', '2026_Chinese_GP_-_Racing_Bulls_-_Liam_Lawson_-_FP1.jpg', 'Liam Lawson, Racing Bulls VCARB 03 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['gasly', 'GAS', '2026_Chinese_GP_-_Alpine_-_Pierre_Gasly_-_Qualifying.jpg', 'Pierre Gasly, Alpine A526 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['arvid_lindblad', 'LIN', '2026_Chinese_GP_-_Racing_Bulls_-_Arvid_Lindblad_-_Qualifying.jpg', 'Arvid Lindblad, Racing Bulls VCARB 03 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['colapinto', 'COL', '2026_Chinese_GP_-_Alpine_-_Franco_Colapinto_-_Qualifying.jpg', 'Franco Colapinto, Alpine A526 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['bearman', 'BEA', 'F1_2026,_TGR_Haas_F1_Team,_Haas_VF-26,_Oliver_Bearman,_Spa_Francorchamps_(55425959105).jpg', 'Oliver Bearman, Haas VF-26 · Spa, 2026', 'Photo Der Alf · CC BY 4.0'],
  ['bortoleto', 'BOR', '2026_Chinese_GP_-_Audi_-_Gabriel_Bortoleto_-_Qualifying.jpg', 'Gabriel Bortoleto, Audi R26 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['hulkenberg', 'HUL', 'FIA_F1_Austria_2026_Nr._27_Hülkenberg_(3).jpg', 'Nico Hülkenberg, Audi R26 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['ocon', 'OCO', '2026_Chinese_GP_-_Haas_-_Esteban_Ocon_-_Qualifying.jpg', 'Esteban Ocon, Haas VF-26 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['alonso', 'ALO', '2026_Chinese_GP_-_Aston_Martin_-_Fernando_Alonso_-_Qualifying.jpg', 'Fernando Alonso, Aston Martin AMR26 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['sainz', 'SAI', 'FIA_F1_Austria_2026_Nr._55_Sainz_(3).jpg', 'Carlos Sainz, Williams FW48 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['albon', 'ALB', '2026_Chinese_GP_-_Williams_-_Alex_Albon_-_Qualifying.jpg', 'Alex Albon, Williams FW48 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['stroll', 'STR', 'FIA_F1_Austria_2026_Nr._18_Stroll_(3).jpg', 'Lance Stroll, Aston Martin AMR26 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['bottas', 'BOT', '2026_Chinese_GP_-_Cadillac_-_Valtteri_Bottas_-_Qualifying.jpg', 'Valtteri Bottas, Cadillac MAC-26 · Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['perez', 'PER', 'FIA_F1_Austria_2026_Nr._11_Perez_(3).jpg', 'Sergio Pérez, Cadillac MAC-26 · Spielberg, 2026', 'Photo Lukas Raich · CC BY-SA 4.0'],
] as const

export const PEOPLE: ReadonlyArray<Person> = ROWS.map(([driverId, code, file, place, credit]) => ({
  driverId,
  code,
  hero: { src: `/img/people/${driverId}-hero.jpg`, place, credit, source: `https://commons.wikimedia.org/wiki/File:${file}` },
}))

export const personFor = (driverId: string) => PEOPLE.find((person) => person.driverId === driverId)
