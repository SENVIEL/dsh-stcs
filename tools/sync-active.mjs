/**
 * Sync canonical source -> installed/vendor runtime copies.
 *
 * The desktop profile loads the copies under
 *   ~/.dsh/profiles/desktop/node_modules
 * and keeps file: dependency sources under
 *   ~/.dsh/profiles/desktop/.vendor
 * so both must receive the same code. Version bumps are still explicit release
 * metadata; the core package.json is copied only to keep its `exports` map
 * (including `dsh-pentest-v2/artex`) aligned with the source.
 *
 * Usage:
 *   node tools/sync-active.mjs
 *   node tools/sync-active.mjs --check
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = path.dirname(repoRoot)
const envProfile = process.env.DSH_PROFILE
const profile = envProfile && path.isAbsolute(envProfile) ? envProfile : path.join(os.homedir(), '.dsh', 'profiles', 'desktop')
const checkOnly = process.argv.includes('--check')
const skipped = /\.(?:bak|bad)(?:[.-]|$)|(?:^|[\\/])_goalmerge/i

function listFiles(root, predicate = () => true) {
  const out = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (skipped.test(full)) continue
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && predicate(full)) out.push(full)
    }
  }
  walk(root)
  return out
}

const copies = []
function addTree(label, sourceDir, targetDir, predicate) {
  for (const file of listFiles(sourceDir, predicate)) {
    copies.push({ label, source: file, target: path.join(targetDir, path.relative(sourceDir, file)) })
  }
}

const realpath = (value) => {
  try { return fs.realpathSync(value) } catch { return '' }
}

const coreInstalledRoot = path.join(profile, 'node_modules', 'dsh-pentest-stcs')
// STCS owns a separate package identity and is installed as a link, so a
// deploy from the original pentest-v2 repo cannot overwrite its runtime code.
const coreIsLinked = realpath(coreInstalledRoot) === realpath(repoRoot)

const roots = [
  ['core', repoRoot, coreInstalledRoot, path.join(profile, '.vendor', 'dsh-pentest-stcs')],
  ['ui', path.join(workspace, 'dsh-pentest-ui'), path.join(profile, 'node_modules', '@howmp', 'dsh-pentest'), path.join(profile, '.vendor', 'dsh-pentest')],
  ['evidence', path.join(workspace, 'dsh-pentest-evidence'), path.join(profile, 'node_modules', 'dsh-pentest-evidence'), path.join(profile, '.vendor', 'dsh-pentest-evidence')],
  ['plus', path.join(workspace, 'dsh-pentest-plus'), path.join(profile, 'node_modules', 'dsh-pentest-plus'), path.join(profile, '.vendor', 'dsh-pentest-plus')]
]

for (const [label, sourceRoot, installedRoot, vendorRoot] of roots) {
  if (label === 'core' && coreIsLinked) {
    console.log(`LINKED core: ${coreInstalledRoot} -> ${repoRoot}`)
    continue
  }
  const sourceLib = path.join(sourceRoot, 'lib')
  if (fs.existsSync(sourceLib)) {
    addTree(label, sourceLib, path.join(installedRoot, 'lib'), (file) => file.endsWith('.js'))
    addTree(label, sourceLib, path.join(vendorRoot, 'lib'), (file) => file.endsWith('.js'))
  }
  if (label === 'ui') {
    const sourcePreset = path.join(sourceRoot, 'preset')
    if (fs.existsSync(sourcePreset)) {
      addTree(label, sourcePreset, path.join(installedRoot, 'preset'), () => true)
      addTree(label, sourcePreset, path.join(vendorRoot, 'preset'), () => true)
    }
  }
  if (label === 'core') {
    const index = path.join(sourceRoot, 'index.js')
    if (fs.existsSync(index)) {
      copies.push({ label, source: index, target: path.join(installedRoot, 'index.js') })
      copies.push({ label, source: index, target: path.join(vendorRoot, 'index.js') })
    }
    // package.json carries the package `exports` map. The STCS preset mounts
    // `dsh-pentest-v2/artex`, so the installed/vendor copies must see the same
    // subpath export as the source package. Other fields are still authored
    // here (this script never bumps versions).
    const pkg = path.join(sourceRoot, 'package.json')
    if (fs.existsSync(pkg)) {
      copies.push({ label: `${label}-package`, source: pkg, target: path.join(installedRoot, 'package.json') })
      copies.push({ label: `${label}-package`, source: pkg, target: path.join(vendorRoot, 'package.json') })
    }
  }
}

// Sidecar is linked from ~/.dsh/packages, not copied into node_modules.
const sidecarSource = path.join(workspace, 'dsh-pentest-sidecar')
const sidecarTarget = process.env.DSH_SIDECAR_DIR || path.join(os.homedir(), '.dsh', 'packages', 'dsh-pentest-sidecar')
if (fs.existsSync(path.join(sidecarSource, 'lib'))) {
  addTree('sidecar', path.join(sidecarSource, 'lib'), path.join(sidecarTarget, 'lib'), (file) => file.endsWith('.js'))
}

if (process.env.DSH_SYNC_DEBUG === '1') {
  console.log('DEBUG workspace=', workspace, 'profile=', profile)
  for (const [label, sourceRoot] of roots) console.log('DEBUG root', label, sourceRoot, fs.existsSync(path.join(sourceRoot, 'lib')))
}
if (copies.length === 0) {
  console.error('no source files found')
  process.exit(1)
}

let changed = 0
let mismatched = 0
for (const copy of copies) {
  const exists = fs.existsSync(copy.target)
  const same = exists && fs.readFileSync(copy.target).equals(fs.readFileSync(copy.source))
  if (!same) {
    changed += 1
    if (checkOnly) {
      mismatched += 1
      console.error(`DIFF ${copy.label}: ${path.relative(profile, copy.target)}`)
    } else {
      fs.mkdirSync(path.dirname(copy.target), { recursive: true })
      fs.copyFileSync(copy.source, copy.target)
    }
  }
}

if (checkOnly) {
  if (mismatched > 0) {
    console.error(`CHECK FAILED: ${mismatched}/${copies.length} files differ`)
    process.exit(1)
  }
  console.log(`CHECK OK: ${copies.length} files`)
} else {
  console.log(`SYNC OK: ${copies.length} files (${changed} updated)`)
}
