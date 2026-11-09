import type { Session } from '#/season/jolpica-schema.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { gpName, pickRace, SESSION_LABEL, SESSION_MINUTES } from '#/season/weekend.ts'

const LIMIT = 75

const encoder = new TextEncoder()

const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

const fold = (line: string) => {
  const parts: Array<string> = []
  let current = ''
  let size = 0

  for (const char of line) {
    const bytes = encoder.encode(char).length
    const room = parts.length === 0 ? LIMIT : LIMIT - 1

    if (size + bytes > room) {
      parts.push(current)
      current = ''
      size = 0
    }

    current += char
    size += bytes
  }

  return [...parts, current].join('\r\n ')
}

const stamp = (at: Date) => at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const date = (at: Date) => at.toISOString().slice(0, 10).replaceAll('-', '')

const times = (session: Session) => {
  const at = new Date(session.startsAt)

  if (!session.timeConfirmed) return [`DTSTART;VALUE=DATE:${date(at)}`, `DTEND;VALUE=DATE:${date(new Date(at.getTime() + 86_400_000))}`]

  const minutes = SESSION_MINUTES[session.name]

  return [`DTSTART:${stamp(at)}`, `DURATION:PT${Math.floor(minutes / 60)}H${minutes % 60}M`]
}

export function weekendIcs(snapshot: SeasonSnapshot, now: Date): { filename: string; body: string } | null {
  const race = pickRace(snapshot, now)?.race

  if (!race) return null

  const events = race.sessions.flatMap((session) => [
    'BEGIN:VEVENT',
    `UID:${race.season}-${race.round}-${session.name}@lights-out`,
    `DTSTAMP:${stamp(now)}`,
    ...times(session),
    `SUMMARY:${escape(`${gpName(race)} · ${SESSION_LABEL[session.name]}`)}`,
    'END:VEVENT',
  ])

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lights Out//Race weekend//EN', ...events, 'END:VCALENDAR']

  return { filename: `${race.circuit.circuitId}-${race.season}.ics`, body: `${lines.map(fold).join('\r\n')}\r\n` }
}
