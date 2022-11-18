import * as core from '@actions/core'
import {join} from 'node:path'
import {AnyJson, JsonMap, parse} from '@iarna/toml'
import {readFile} from 'node:fs/promises'

async function getWranglerToml(wranglerTomlPath: string): Promise<string> {
  try {
    core.debug(`Reading wrangler configuration from ${wranglerTomlPath}`)
    return (await readFile(wranglerTomlPath)).toString()
  } catch (err) {
    core.setFailed(`Wrangler configuration not found at ${wranglerTomlPath}`)
    throw new Error((err as Error).message)
  }
}

async function getWranglerCompatibilityDate(
  wranglerToml: string
): Promise<string | undefined> {
  try {
    core.debug(`Parsing wrangler configuration`)
    const toml = parse(wranglerToml)
    core.debug(`wrangler compatibility date is ${toml.compatibility_date}`)
    return toml.compatibility_date as string | undefined
  } catch (err) {
    core.setFailed(`Failed to parse wrangler configuration`)
    throw new Error((err as Error).message)
  }
}

async function getTsconfig(tsconfigPath: string) {
  try {
    core.debug(`Reading tsconfig from ${tsconfigPath}`)
    return JSON.parse((await readFile(tsconfigPath)).toString())
  } catch (err) {
    core.setFailed(`tsconfig not found at ${tsconfigPath}`)
    throw new Error((err as Error).message)
  }
}

async function getTsconfigCompatibilityDate(tsconfig: Record<string, Record<string, unknown> | undefined>) {
  try {
    const types = tsconfig?.compilerOptions?.types
    if (!Array.isArray(types)) {
      return undefined
    }
    const entrypoint = (types.filter(type => (type as string).startsWith('@cloudflare/workers-types')) as string[]).shift()
    const date = entrypoint?.replace('@cloudflare/workers-types', '').replace(/^\//, '').replace('experimental', '')
    return date
  } catch (err) {
    core.debug((err as Error).message)
    return
  }
}

async function run(): Promise<void> {
  try {
    // Check if wrangler.toml exists and get compat date
    const wranglerTomlPath = join(
      core.getInput('basedir'),
      core.getInput('wrangler-toml')
    )
    const wranglerToml = await getWranglerToml(wranglerTomlPath)
    const wranglerCompatibilityDate = await getWranglerCompatibilityDate(
      wranglerToml
    )

    // Check if tsconfig.json exists and has workers-types included
    const tsconfigPath = join(
      core.getInput('basedir'),
      core.getInput('tsconfig-json')
    )
    const tsconfig = await getTsconfig(tsconfigPath)
    const tsconfigCompatibilityDate = await getTsconfigCompatibilityDate(
      tsconfig
    )

    if (!wranglerCompatibilityDate || !tsconfigCompatibilityDate) {
      switch (core.getInput('mode')) {
        case 'fail':
          core.setFailed(`Compatibility date is missing in ${wranglerCompatibilityDate ? 'tsconfig' : 'wrangler config'}`)
          return
          
      }
    } else {
      const wranglerDate = new Date(wranglerCompatibilityDate)
      const tsconfigDate = new Date(tsconfigCompatibilityDate)
    }

    // Check if workers-types is installed and is recent enough to contain dates
    // Get mode [fail, edit-wrangler-toml, edit-tsconfig, edit-old (default)]
    // Execute mode
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
