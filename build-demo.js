// build-demo-esbuild.js
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  existsSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync
} from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const demoDir = join(rootDir, 'demo')
const examplesDir = join(rootDir, 'examples')
const assetsDir = join(demoDir, 'assets')
const distDir = join(rootDir, 'dist')

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function cleanDemo() {
  if (existsSync(demoDir)) {
    console.log('🧹 Cleaning demo directory...')
    rmSync(demoDir, { recursive: true, force: true })
  }
  ensureDir(demoDir)
  ensureDir(assetsDir)
}

function buildDemo() {
  console.log('🚀 Building demo application...')

  // Checking that the library is complete
  if (!existsSync(distDir)) {
    console.log('❌ Library not built. Please run "npm run build:lib" first.')
    process.exit(1)
  }

  // Copying the HTML file
  console.log('📄 Copying HTML...')
  copyFileSync(join(examplesDir, 'index.html'), join(demoDir, 'index.html'))

  // Copy the favicon.png file
  console.log('📄 Copying favicon...')
  copyFileSync(join(examplesDir, 'favicon.png'), join(demoDir, 'favicon.png'))

  // Copying and processing CSS
  console.log('🎨 Processing CSS...')
  let cssContent = readFileSync(join(examplesDir, 'style.css'), 'utf8')
  writeFileSync(join(assetsDir, 'style.css'), cssContent)

  // Using esbuild to compile TypeScript
  console.log('🔨 Compiling with esbuild...')
  try {
    const mainTsPath = join(examplesDir, 'main.ts')

    execSync(
      `npx esbuild "${mainTsPath}" --outfile="${join(assetsDir, 'main.js')}" --format=esm --target=es2020 --bundle --external:../../dist/index.mjs`,
      { stdio: 'inherit', cwd: rootDir }
    )

    console.log('✅ Demo build completed!')
  } catch (error) {
    console.log('❌ Demo build failed:', error.message)
    process.exit(1)
  }
}

cleanDemo()
buildDemo()
