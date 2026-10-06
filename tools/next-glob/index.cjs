'use strict'

// @next/eslint-plugin-next uses only globSync(pattern, { onlyDirectories: true })
// to resolve an explicitly configured rootDir. Keep its rules while replacing
// the unpatched fast-glob -> micromatch -> braces development dependency chain.
const { globSync, statSync } = require('node:fs')
const { resolve } = require('node:path')

exports.globSync = (pattern, options = {}) => {
  if (Object.keys(options).some(key => !['onlyDirectories', 'cwd'].includes(key))) {
    throw new Error('Unsupported Next root-directory glob option')
  }
  const cwd = options.cwd || process.cwd()
  return globSync(pattern, { cwd }).filter(path => !options.onlyDirectories || statSync(resolve(cwd, path)).isDirectory())
}
