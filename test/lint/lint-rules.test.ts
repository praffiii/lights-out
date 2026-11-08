import { expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'lights-out-lint-'))

function lint(source: string) {
  const file = join(dir, `case-${Bun.hash(source)}.tsx`)
  writeFileSync(file, source)
  const run = Bun.spawnSync(['bunx', 'oxlint', '-c', 'oxlint.config.ts', '--format', 'unix', file])

  return run.stdout.toString()
}

const rulesHit = (source: string) => [...lint(source).matchAll(/\[\w+\/([\w-]+)\(([\w-]+)\)\]/g)].map((m) => `${m[1]}/${m[2]}`)

it.each([
  'export const a = 1',
  'export const url = "https://example.com"',
  'export const re = /\\/\\*/',
  'export const jsx = <div title="// not a comment" />',
  'export const order = [1, 2] as const',
])('accepts %s', (source) => {
  expect(rulesHit(source)).toEqual([])
})

it.each([
  '// note',
  '/* block */',
  '/** jsdoc */ export const a = 1',
  '// @ts-expect-error',
  '// oxlint-disable-next-line',
  'export const jsx = <div>{/* hidden */}</div>',
])('bans the comment in %s', (source) => {
  expect(rulesHit(source)).toContain('lights-out/no-comments')
})

it('bans type assertions', () => {
  expect(rulesHit('export const n = JSON.parse("1") as number')).toContain('typescript/consistent-type-assertions')
})

it('runs anti-slop', () => {
  expect(rulesHit('export type Bag = Record<string, unknown>')).toContain('anti-slop/no-unsafe-dictionary-type')
})

function scan(name: string, source: string) {
  const file = join(dir, name)
  writeFileSync(file, source)
  const run = Bun.spawnSync(['python3', '-I', 'tools/no_comments.py', file])

  return { ok: run.exitCode === 0, out: run.stdout.toString() }
}

it.each([
  ['clean.py', 'x = "# not a comment"\nprint(x)\n'],
  ['clean.css', 'a { background: url("a/*b.png"); content: "/* no */"; }\n'],
])('passes %s', (name, source) => {
  expect(scan(name, source)).toEqual({ ok: true, out: '' })
})

it.each([
  ['hash.py', 'x = 1\ny = 2  # why\n', 'hash.py:2'],
  ['module-doc.py', '"""About this file."""\nx = 1\n', 'module-doc.py:1'],
  ['function-doc.py', 'def f():\n    """Does f."""\n    return 1\n', 'function-doc.py:2'],
  ['block.css', 'a {\n  color: red; /* why */\n}\n', 'block.css:2'],
])('flags %s', (name, source, where) => {
  const result = scan(name, source)
  expect(result.ok).toBe(false)
  expect(result.out).toContain(where)
})
