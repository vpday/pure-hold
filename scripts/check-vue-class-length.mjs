import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_CLASS_LIMITS = {
  maxLength: 79,
  maxTokens: 5,
}

export function findStaticClassViolations(source, limits = DEFAULT_CLASS_LIMITS) {
  const templateMatch = /<template(?:\s[^>]*)?>/i.exec(source)
  if (!templateMatch) return []

  const templateStart = templateMatch.index + templateMatch[0].length
  const templateEnd = source.lastIndexOf('</template>')
  if (templateEnd < templateStart) return []

  const template = source.slice(templateStart, templateEnd)
  const searchableTemplate = template.replace(/<!--[\s\S]*?-->/g, (comment) =>
    comment.replace(/[^\r\n]/g, ' '),
  )
  const violations = []
  const classPattern = /(?<![:\w-])class\s*=\s*(["'])([\s\S]*?)\1/g

  for (const match of searchableTemplate.matchAll(classPattern)) {
    const value = match[2].trim().replace(/\s+/g, ' ')
    const tokens = value === '' ? 0 : value.split(' ').length
    const length = value.length
    if (tokens <= limits.maxTokens && length <= limits.maxLength) continue

    const offset = templateStart + match.index
    const precedingSource = source.slice(0, offset)
    violations.push({
      column: offset - precedingSource.lastIndexOf('\n'),
      length,
      line: precedingSource.split('\n').length,
      tokens,
      value,
    })
  }

  return violations
}

export async function checkVueClassLengths(targets, limits = DEFAULT_CLASS_LIMITS) {
  const files = await collectVueFiles(targets)
  const failures = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    for (const violation of findStaticClassViolations(source, limits)) {
      failures.push({ file, ...violation })
    }
  }

  return failures
}

async function collectVueFiles(targets) {
  const files = []

  for (const target of targets) {
    const targetStat = await stat(target)
    if (targetStat.isDirectory()) {
      const entries = await readdir(target, { withFileTypes: true })
      const nestedTargets = entries.map((entry) => path.join(target, entry.name))
      files.push(...(await collectVueFiles(nestedTargets)))
    } else if (target.endsWith('.vue')) {
      files.push(target)
    }
  }

  return files.sort()
}

async function main() {
  const targets = process.argv.slice(2)
  const failures = await checkVueClassLengths(targets.length > 0 ? targets : ['src'])

  if (failures.length === 0) return

  for (const failure of failures) {
    console.error(
      `${failure.file}:${failure.line}:${failure.column} Static class has ${failure.tokens} tokens and ${failure.length} characters; limits are ${DEFAULT_CLASS_LIMITS.maxTokens} tokens and ${DEFAULT_CLASS_LIMITS.maxLength} characters.`,
    )
    console.error(`  ${failure.value}`)
  }
  process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
