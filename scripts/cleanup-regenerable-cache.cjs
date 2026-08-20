const fs = require("node:fs")
const path = require("node:path")

const args = new Set(process.argv.slice(2))
const mode = args.has("--ci")
  ? "ci"
  : args.has("--pre-push")
    ? "pre-push"
    : args.has("--deep")
      ? "deep"
      : "light"
const projectRoot = path.resolve(__dirname, "..")

const conservativeTargets = [
  ".cache",
  "tsconfig.app.tsbuildinfo",
  "tsconfig.node.tsbuildinfo",
  "src-tauri/target/debug/incremental",
  "src-tauri/target/release/incremental",
]

const deepTargets = [
  "dist",
  "src-tauri/target",
]

const targets = mode === "ci" || mode === "pre-push" || mode === "deep"
  ? [...conservativeTargets, ...deepTargets]
  : conservativeTargets

function assertInsideProject(target) {
  const resolvedTarget = path.resolve(projectRoot, target)
  const rootPrefix = projectRoot.endsWith(path.sep) ? projectRoot : projectRoot + path.sep

  if (resolvedTarget === projectRoot || !resolvedTarget.toLowerCase().startsWith(rootPrefix.toLowerCase())) {
    throw new Error(`Refusing to delete outside project: ${resolvedTarget}`)
  }

  return resolvedTarget
}

function getSizeBytes(target) {
  if (!fs.existsSync(target)) return 0
  const stat = fs.lstatSync(target)
  if (!stat.isDirectory()) return stat.size

  let total = 0
  for (const entry of fs.readdirSync(target)) {
    total += getSizeBytes(path.join(target, entry))
  }
  return total
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`
}

let removedBytes = 0
let removedCount = 0

for (const target of targets) {
  const resolvedTarget = assertInsideProject(target)
  if (!fs.existsSync(resolvedTarget)) continue

  const size = getSizeBytes(resolvedTarget)
  fs.rmSync(resolvedTarget, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 300,
  })

  removedBytes += size
  removedCount += 1
  console.log(`removed ${target} (${formatBytes(size)})`)
}

if (removedCount === 0) {
  console.log(`no regenerable cache found for ${mode} cleanup`)
} else {
  console.log(`cleanup complete: removed ${removedCount} item(s), freed ${formatBytes(removedBytes)}`)
}
