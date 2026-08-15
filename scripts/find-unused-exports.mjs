#!/usr/bin/env node
/**
 * Find UNUSED EXPORTS inside reachable files.
 *
 * For every export in src/, count how many importers reference that exact
 * name. Exports with 0 references are flagged.
 *
 * Notes:
 *   - Default exports are skipped (can't reliably check).
 *   - Re-exports (`export { foo } from './bar'`) count as a separate check.
 *   - Index files are skipped (everything looks "unused" through them).
 *   - This is a hint, not a deletion list — many "unused" exports are
 *     public API surfaces or side-effect files.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')

const tsconfigApp = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.app.json'), 'utf8'))
const baseUrl = (tsconfigApp.compilerOptions?.baseUrl || '.').replace(/\/$/, '')
const paths = tsconfigApp.compilerOptions?.paths || {}
const aliasRe = (() => {
  const entries = Object.entries(paths)
  entries.sort((a, b) => b[0].length - a[0].length)
  const alts = entries.map(([alias, targets]) => {
    const t = (Array.isArray(targets) ? targets[0] : targets)
      .replace(/^\.\//, '')
      .replace(/\*$/, '')
    const a = alias.replace(/\*$/, '')
    return { a, t, re: new RegExp('^' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.*)$') }
  })
  return (spec) => {
    for (const { a, re, t } of alts) {
      const m = spec.match(re)
      if (m) return path.posix.normalize(t + m[1])
    }
    return null
  }
})()

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx']

function resolveImport(fromFile, spec) {
  if (aliasRe && (spec.startsWith('@/') || Object.keys(paths).some((a) => spec.startsWith(a.replace(/\*$/, ''))))) {
    const rel = aliasRe(spec)
    if (rel) return resolveFile(path.join(ROOT, baseUrl, rel))
  }
  if (spec.startsWith('.')) {
    return resolveFile(path.resolve(path.dirname(fromFile), spec))
  }
  return null
}

function resolveFile(abs) {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  for (const ext of EXTENSIONS) {
    const c = abs + ext
    if (fs.existsSync(c)) return c
  }
  return null
}

function listSrcFiles() {
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.(t|j)sx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(full)
    }
  }
  walk(SRC)
  return out
}

const IMPORT_BLOCK = /import\s+([^'"`;]+?)\s+from\s+['"`]([^'"`]+)['"`]/g
const NAMED_FROM = /import\s+\{\s*([^}]+?)\s*\}\s+from\s+['"`]([^'"`]+)['"`]/g
const STAR_FROM = /import\s+(\*\s+as\s+\w+)\s+from\s+['"`]([^'"`]+)['"`]/g

const allFiles = listSrcFiles()
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')
const byPath = new Map(allFiles.map((f) => [rel(f), f]))

const fileExports = new Map() // rel -> Set<exported names>

const EXPORT_NAMED = /^export\s+(?:const|let|var|function|class|interface|type|enum|async|abstract)\s+(\w+)/
const EXPORT_BLOCK = /^export\s+\{([^}]+)\}/
const EXPORT_DEFAULT = /^export\s+default\s+(?:function|class|const|let|var)?\s*(\w+)?/
const EXPORT_FROM = /^export\s+(?:\*|\{[^}]*\})\s+from\s+['"`]([^'"`]+)['"`]/

function extractExports(text) {
  const out = new Set()
  for (const line of text.split(/\r?\n/)) {
    const l = line.trimStart()
    let m
    if ((m = l.match(EXPORT_NAMED))) out.add(m[1])
    else if ((m = l.match(EXPORT_BLOCK))) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim()
        if (name && /^\w/.test(name)) out.add(name)
      }
    } else if ((m = l.match(EXPORT_DEFAULT))) {
      if (m[1]) out.add(`(default:${m[1]})`)
    }
  }
  // Also pick up `export const a = ...; export const b = ...;`
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/)
    if (m) out.add(m[1])
  }
  return out
}

for (const f of allFiles) {
  if (rel(f).endsWith('/index.ts') || rel(f).endsWith('/index.tsx')) {
    fileExports.set(rel(f), new Set(['__index__']))
    continue
  }
  const text = fs.readFileSync(f, 'utf8')
  fileExports.set(rel(f), extractExports(text))
}

// Track usage.
const usedNames = new Map() // importPath (rel) -> Set<names>
function mark(path, names) {
  if (!usedNames.has(path)) usedNames.set(path, new Set())
  for (const n of names) usedNames.get(path).add(n)
}

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8')
  NAMED_FROM.lastIndex = 0
  let m
  while ((m = NAMED_FROM.exec(text))) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean)
    const resolved = resolveImport(f, m[2])
    if (resolved) mark(rel(resolved), names)
  }
  // Also handle `export ... from 'x'` re-exports as references for the source.
  const EXPORT_FROM_GLOBAL = /export\s+(?:\*|\{[^}]*\})\s+from\s+['"`]([^'"`]+)['"`]/g
  EXPORT_FROM_GLOBAL.lastIndex = 0
  while ((m = EXPORT_FROM_GLOBAL.exec(text))) {
    const block = m[0]
    const resolved = resolveImport(f, m[1])
    if (!resolved) continue
    const named = block.match(/\{([^}]*)\}/)
    if (named) {
      const names = named[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean)
      mark(rel(resolved), names)
    } else {
      mark(rel(resolved), ['*'])
    }
  }
}

const rows = []
for (const f of allFiles) {
  const r = rel(f)
  if (r.endsWith('/index.ts') || r.endsWith('/index.tsx')) continue
  const exps = fileExports.get(r) || new Set()
  const used = usedNames.get(r) || new Set()
  const unused = [...exps].filter((n) => !used.has(n) && n !== '__index__')
  if (unused.length) rows.push({ rel: r, unused })
}

rows.sort((a, b) => b.unused.length - a.unused.length)

const total = rows.reduce((n, r) => n + r.unused.length, 0)
console.log(`Files with unused named exports: ${rows.length}`)
console.log(`Total unused named exports: ${total}`)

const out = [`# Files with unused named exports (Reachable files only)`]
out.push(`# Total: ${total} unused exports across ${rows.length} files`)
out.push('')
for (const { rel: r, unused } of rows) {
  out.push(`## ${r} (${unused.length})`)
  for (const n of unused) out.push(`  ${n}`)
  out.push('')
}
fs.writeFileSync(path.join(ROOT, 'unused-exports.txt'), out.join('\n'), 'utf8')
console.log('Wrote: unused-exports.txt')