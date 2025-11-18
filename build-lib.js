// build-lib.js
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  existsSync,
  readdirSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  statSync
} from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const distDir = join(rootDir, 'dist')

function runCommand(cmd, description) {
  console.log(`📦 ${description}...`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: rootDir })
    console.log(`✅ ${description} completed`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    process.exit(1)
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function cleanDist() {
  if (existsSync(distDir)) {
    console.log('🧹 Cleaning dist directory...')
    rmSync(distDir, { recursive: true, force: true })
  }
  ensureDir(distDir)
}

function fixImportsInMjsFiles() {
  console.log('🔧 Fixing imports in .mjs files...')
  const mjsFiles = readdirSync(distDir).filter(f => f.endsWith('.mjs'))

  mjsFiles.forEach(file => {
    const filePath = join(distDir, file)
    let content = readFileSync(filePath, 'utf8')

    // Fixing imports between library modules
    content = content.replace(/from '\.\/([^']+)'/g, "from './$1.mjs'")
    content = content.replace(/from "\.\/([^"]+)"/g, 'from "./$1.mjs"')
    content = content.replace(/from '\.\/([^']+)\.js'/g, "from './$1.mjs'")
    content = content.replace(/from "\.\/([^"]+)\.js"/g, 'from "./$1.mjs"')

    writeFileSync(filePath, content)
    console.log(`   ✅ Fixed imports in ${file}`)
  })
}

function buildLibrary() {
  console.log('🏗️  Building library...')

  // Compiling TypeScript
  runCommand('npx tsc', 'TypeScript compilation')

  // Creating ESM versions (.mjs)
  console.log('📦 Creating ESM modules...')
  const jsFiles = readdirSync(distDir).filter(f => f.endsWith('.js'))

  jsFiles.forEach(file => {
    const jsPath = join(distDir, file)
    const mjsPath = jsPath.replace('.js', '.mjs')

    // Renaming .js to .mjs
    if (existsSync(jsPath)) {
      renameSync(jsPath, mjsPath)
      console.log(`   📄 ${file} → ${file.replace('.js', '.mjs')}`)
    }
  })

  // Fixing imports in ESM files
  fixImportsInMjsFiles()

  // Creating CJS versions
  console.log('📦 Creating CJS modules...')
  const mjsFiles = readdirSync(distDir).filter(f => f.endsWith('.mjs'))

  mjsFiles.forEach(file => {
    const mjsPath = join(distDir, file)
    const cjsPath = mjsPath.replace('.mjs', '.cjs')

    try {
      execSync(
        `npx esbuild "${mjsPath}" --outfile="${cjsPath}" --format=cjs --target=es2020 --bundle=false`,
        { stdio: 'pipe' }
      )
      console.log(`   📄 ${file.replace('.mjs', '.cjs')}`)
    } catch (error) {
      console.log(`   ⚠️  Using fallback for: ${file}`)
      // Fallback: creating a simple proxy
      const moduleName = file.replace('.mjs', '')
      const content = `module.exports = require('./${moduleName}.mjs');\n`
      writeFileSync(cjsPath, content)
    }
  })

  console.log('✅ Library build completed!')
}

function verifyBuild() {
  console.log('🔍 Verifying library build...')

  const requiredLibFiles = [
    'index.mjs', 'index.cjs', 'index.d.ts',
    'reactivity.mjs', 'reactivity.cjs', 'reactivity.d.ts',
    'clone.mjs', 'clone.cjs', 'clone.d.ts',
    'types.mjs', 'types.cjs', 'types.d.ts'
  ]

  let missing = []

  requiredLibFiles.forEach(file => {
    const path = join(distDir, file)
    if (existsSync(path)) {
      console.log(`   ✅ ${file}`)
    } else {
      missing.push(file)
      console.log(`   ❌ ${file}`)
    }
  })

  if (missing.length > 0) {
    console.log(`\n❌ Library build verification failed: ${missing.length} files missing`)
    process.exit(1)
  } else {
    console.log('🎉 Library build verification passed!')
  }
}

async function main() {
  console.log('🏗️  Starting library build process...')

  cleanDist()
  buildLibrary()
  verifyBuild()

  console.log('✨ Library build process completed!')

  // Showing the dist structure
  if (existsSync(distDir)) {
    console.log('\n📁 Final dist structure:')
    function printStructure(dir, prefix = '') {
      const items = readdirSync(dir).sort()

      items.forEach((item, index) => {
        const path = join(dir, item)
        const isLast = index === items.length - 1
        const connector = isLast ? '└── ' : '├── '

        if (statSync(path).isDirectory()) {
          console.log(prefix + connector + item + '/')
          printStructure(path, prefix + (isLast ? '    ' : '│   '))
        } else {
          console.log(prefix + connector + item)
        }
      })
    }
    printStructure(distDir)
  }
}

main().catch(console.error)
