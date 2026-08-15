#!/usr/bin/env node
/**
 * Build an import graph for the project and emit an orphan report.
 *
 * Inputs: src/ + the four Vite entry HTMLs and the router / app bootstrap.
 * Outputs: orphans.txt (zero-importer files), summary.txt (counts + categories).
 *
 * Resolution rules:
 *   - Relative imports (./foo, ../foo, ./foo.ts, ./foo.tsx)
 *   - Aliased imports (@/foo) resolved via tsconfig.app.json paths
 *   - Both `import x from '...'` and `export ... from '...'` count as references
 *   - `import.meta.glob` and string-literal-only references are NOT counted
 *     (we cannot prove they're loaded). Files only referenced that way are
 *     flagged "dynamic-only" instead of "orphan".
 *
 * Entry-point roots (these define what is "used"):
 *   - src/main.tsx, src/App.tsx
 *   - any file matching the patterns listed in ENTRY_PATTERNS
 *   - any file referenced from src/main.tsx, src/App.tsx, scripts/, public/,
 *     vite.config.ts, tailwind.config.ts, postcss.config.js, vitest.config.ts,
 *     components.json, tsconfig*.json (string occurrences).
 */

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')

const ENTRY_PATTERNS = [
  /^src\/main\.tsx?$/,
  /^src\/App\.tsx?$/,
]

// Files whose mere existence on disk is "used" (configs, public assets,
// scripts, supabase migrations). They are never orphans.
const ALWAYS_USED_DIRS = new Set([
  'public',
  'scripts',
  'supabase',
  '.claude',
])
const ALWAYS_USED_FILES = new Set([
  'index.html',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'eslint.config.js',
  'pwa-assets.config.ts',
  'vitest.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vercel.json',
  'package.json',
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  '.gitignore',
  '.env',
  'workbox-2d1ce4ea.js',
  'workbox-2d1ce4ea.js.map',
  'workbox-ee13fbdc.js',
  'workbox-ee13fbdc.js.map',
  'test-sw.js.map',
  'test-sw2.js.map',
])

const tsconfigApp = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tsconfig.app.json'), 'utf8'),
)
const baseUrl = (tsconfigApp.compilerOptions?.baseUrl || '.').replace(/\/$/, '')
const paths = tsconfigApp.compilerOptions?.paths || {}
// Resolve "@/*" -> "src/*" etc.
const aliasRe = (() => {
  const entries = Object.entries(paths)
  if (!entries.length) return null
  // Sort longest first to avoid prefix collisions.
  entries.sort((a, b) => b[0].length - a[0].length)
  const alts = entries
    .map(([alias, targets]) => {
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

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx']

function resolveImport(fromFile, spec) {
  // Aliased
  if (spec.startsWith('@/') || Object.keys(paths).some((a) => spec.startsWith(a.replace(/\*$/, '')))) {
    const rel = aliasRe?.(spec)
    if (rel) {
      const abs = path.join(ROOT, baseUrl, rel)
      return resolveFile(abs)
    }
  }
  // Relative
  if (spec.startsWith('.')) {
    const dir = path.dirname(fromFile)
    const abs = path.resolve(dir, spec)
    return resolveFile(abs)
  }
  // Bare specifier (npm package) — ignore.
  return null
}

function resolveFile(abs) {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  for (const ext of EXTENSIONS) {
    const candidate = abs + ext
    if (fs.existsSync(candidate)) return candidate
  }
  // directory + /index.*
  for (const ext of EXTENSIONS) {
    if (ext.startsWith('/')) {
      const candidate = abs + ext
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
}

function listSrcFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(t|j)sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
    }
  }
  walk(SRC)
  return out
}

const IMPORT_RE = /(?:^|[^\w])import\s+(?:[^'"`;]+?from\s+)?['"`]([^'"`]+)['"`]/g
const EXPORT_FROM_RE = /export\s+(?:\*|\{[^}]*\})\s+from\s+['"`]([^'"`]+)['"`]/g
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g

const allFiles = listSrcFiles()
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')
const allRel = new Set(allFiles.map(rel))

// Map: importer (rel) -> Set<imported (rel)>
// Also: imported -> Set<importer (rel)>
const importers = new Map()
const importedBy = new Map()

function addEdge(importer, imported) {
  if (!importers.has(importer)) importers.set(importer, new Set())
  importers.get(importer).add(imported)
  if (!importedBy.has(imported)) importedBy.set(imported, new Set())
  importedBy.get(imported).add(importer)
}

// Seed entry points as having been "reached".
const dynamicOnly = new Map() // rel -> Set<specs found>

for (const file of allFiles) {
  const r = rel(file)
  const text = fs.readFileSync(file, 'utf8')
  // Resolve and record
  const seen = new Set()
  const record = (m) => {
    const spec = m[1]
    if (seen.has(spec)) return
    seen.add(spec)
    const resolved = resolveImport(file, spec)
    if (resolved) addEdge(r, rel(resolved))
  }
  for (const re of [IMPORT_RE, EXPORT_FROM_RE]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text))) record(m)
  }
  // Dynamic imports: record spec but mark file as dynamic-only consumer.
  DYNAMIC_IMPORT_RE.lastIndex = 0
  let m
  while ((m = DYNAMIC_IMPORT_RE.exec(text))) {
    const spec = m[1]
    const resolved = resolveImport(file, spec)
    if (resolved) addEdge(r, rel(resolved))
    if (!dynamicOnly.has(r)) dynamicOnly.set(r, new Set())
    dynamicOnly.get(r).add(spec)
  }
}

// Compute reachable set from entry points via BFS.
const reachable = new Set()
const queue = []
for (const r of allRel) {
  if (ENTRY_PATTERNS.some((p) => p.test(r))) {
    reachable.add(r)
    queue.push(r)
  }
}
while (queue.length) {
  const cur = queue.shift()
  for (const next of importers.get(cur) || []) {
    if (!reachable.has(next)) {
      reachable.add(next)
      queue.push(next)
    }
  }
}

// Also seed from index.html (string-referenced entrypoints).
try {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  for (const m of html.matchAll(/['"`]([^'"`]*\.tsx?)['"`]/g)) {
    const candidate = path.join(ROOT, m[1])
    if (fs.existsSync(candidate)) {
      const r = rel(candidate)
      if (!reachable.has(r)) {
        reachable.add(r)
        queue.push(r)
      }
    }
  }
} catch {}

// Seed from public/, scripts/, supabase/ (string refs into src/).
const textRoots = [
  path.join(ROOT, 'public'),
  path.join(ROOT, 'scripts'),
  path.join(ROOT, 'supabase'),
  path.join(ROOT, 'vite.config.ts'),
  path.join(ROOT, 'tailwind.config.ts'),
  path.join(ROOT, 'postcss.config.js'),
  path.join(ROOT, 'components.json'),
  path.join(ROOT, 'vitest.config.ts'),
  path.join(ROOT, 'pwa-assets.config.ts'),
  path.join(ROOT, 'eslint.config.js'),
  path.join(ROOT, 'vercel.json'),
  path.join(ROOT, 'tsconfig.json'),
  path.join(ROOT, 'tsconfig.app.json'),
  path.join(ROOT, 'tsconfig.node.json'),
  path.join(ROOT, 'package.json'),
  path.join(ROOT, '.gitignore'),
  path.join(ROOT, '.env'),
]

// Build a quick lookup from basename -> [rel paths]
const byBase = new Map()
for (const r of allRel) {
  const base = path.basename(r).replace(/\.(t|j)sx?$/, '')
  if (!byBase.has(base)) byBase.set(base, [])
  byBase.get(base).push(r)
}

const textRefs = /\bsrc\/[\w./-]+\.(?:ts|tsx|js|jsx)\b/g
for (const t of textRoots) {
  if (!fs.existsSync(t)) continue
  if (fs.statSync(t).isDirectory()) {
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name)
        if (e.isDirectory()) walk(full)
        else if (/\.(t|j)sx?|json|md|html|css|js\.map|ts\.map|toml|yml|yaml|cjs|mjs|env|cjs|svg|png|jpg|jpeg|webp|ico|mp4|webm|mp3|wav|pdf|txt|log|gitignore|gql|sql|sh|bash|ps1|cmd|bat|vue|svelte|cjs|wasm|cjs|lock|lockb|gitignore|cjs|env|env\..*$/i.test(e.name)) {
          try {
            const txt = fs.readFileSync(full, 'utf8')
            for (const m of txt.matchAll(textRefs)) {
              const r = m[0].replace(/\\/g, '/')
              if (allRel.has(r) && !reachable.has(r)) {
                reachable.add(r)
                queue.push(r)
              }
            }
          } catch {}
        }
      }
    }
    walk(t)
  } else {
    try {
      const txt = fs.readFileSync(t, 'utf8')
      for (const m of txt.matchAll(textRefs)) {
        const r = m[0].replace(/\\/g, '/')
        if (allRel.has(r) && !reachable.has(r)) {
          reachable.add(r)
          queue.push(r)
        }
      }
    } catch {}
  }
}

// Re-BFS after seeding text roots.
while (queue.length) {
  const cur = queue.shift()
  for (const next of importers.get(cur) || []) {
    if (!reachable.has(next)) {
      reachable.add(next)
      queue.push(next)
    }
  }
}

// Categorize.
const orphans = []
const dynamicOnlyConsumers = []
for (const r of allRel) {
  if (reachable.has(r)) continue
  // Files that ONLY have dynamic import references but no static reachers
  // are flagged separately. For the orphans list, we list files with no
  // importers AND not reachable.
  if (importedBy.has(r) && importedBy.get(r).size > 0) {
    // Has importers but unreachable: cyclic / dead branch / only imported
    // by other orphans. We'll report these too.
    orphans.push({ rel: r, importers: [...(importedBy.get(r) || [])].sort() })
  } else {
    orphans.push({ rel: r, importers: [] })
  }
}

orphans.sort((a, b) => a.rel.localeCompare(b.rel))

// Categorize by top-level folder.
const byFolder = new Map()
for (const { rel: r } of orphans) {
  const folder = r.split('/').slice(0, -1).join('/') || '(root)'
  if (!byFolder.has(folder)) byFolder.set(folder, [])
  byFolder.get(folder).push(r)
}

// Files that contain only dynamic imports as their inbound refs.
const dynamicImported = new Set()
for (const [r, specs] of dynamicOnly.entries()) {
  // r is an importer; specs are its dynamic imports.
  // For each spec, if resolved, mark that target as dynamically imported.
  // (We resolve already in addEdge.)
}
// Already covered by addEdge; dynamicOnly map is informational only.

// Build summary.
const lines = []
lines.push(`Total src files: ${allRel.size}`)
lines.push(`Reachable: ${reachable.size}`)
lines.push(`Orphans (no static reacher): ${orphans.length}`)
lines.push('')
lines.push('Orphans by folder:')
const folders = [...byFolder.keys()].sort()
for (const f of folders) {
  lines.push(`  ${f}/  (${byFolder.get(f).length})`)
}
fs.writeFileSync(path.join(ROOT, 'orphan-summary.txt'), lines.join('\n'), 'utf8')

const orphanLines = ['# Orphan files (no static import reacher from src/main.tsx, src/App.tsx, configs, public/, scripts/, supabase/)']
orphanLines.push('# Generated by scripts/find-orphans.mjs')
orphanLines.push('')
for (const f of folders) {
  orphanLines.push(`## ${f}/`)
  for (const r of byFolder.get(f)) {
    orphanLines.push(r)
  }
  orphanLines.push('')
}
fs.writeFileSync(path.join(ROOT, 'orphans.txt'), orphanLines.join('\n'), 'utf8')

// Also write a per-folder importer count summary for the report.
const reportLines = []
reportLines.push('# Detailed reference map')
reportLines.push('')
reportLines.push(`Reachable: ${reachable.size} / ${allRel.size}`)
reportLines.push('')
// Top 20 most-imported (excluding builtins).
const top = [...importedBy.entries()]
  .map(([r, s]) => [r, s.size])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
reportLines.push('## Top 30 most-imported files')
for (const [r, n] of top) {
  reportLines.push(`${String(n).padStart(4)}  ${r}`)
}
fs.writeFileSync(path.join(ROOT, 'orphan-report.txt'), reportLines.join('\n'), 'utf8')

console.log(`Reachable: ${reachable.size} / ${allRel.size}`)
console.log(`Orphans: ${orphans.length}`)
console.log(`Wrote: orphans.txt, orphan-summary.txt, orphan-report.txt`)