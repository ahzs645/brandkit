#!/usr/bin/env node
// Brand folders in, brand packs and a catalog out. See src/pack/cli.js, or run with --help.
// Imports only fflate and Node, so it runs without the rest of brandkit's dependencies.
import { pack } from '../src/pack/cli.js'

try {
  pack(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
