import 'server-only'  // Prevents this file from being imported in browser code
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Describes the shape of one scene entry in scenes.json
export type Scene = {
  id: string
  title: string
  thumb: string
  splat: string
  subtitle: string
  collisions?: string  // optional path to the .voxel.json (or .glb) collision file
}

// Build an absolute path to scenes.json at startup
const MANIFEST_PATH: string = path.join(process.cwd(), 'public', 'scenes.json')

// The required string fields every scene entry must have.
const REQUIRED_FIELDS = ['id', 'title', 'thumb', 'splat', 'subtitle'] as const

// Runtime check that an unknown value really is a Scene. scenes.json is
// hand-edited, so we can't trust its shape at compile time.
function isValidScene(value: unknown): value is Scene {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  for (const field of REQUIRED_FIELDS) {
    if (typeof candidate[field] !== 'string') return false
  }

  // collisions is optional, but if present it must be a string
  if ('collisions' in candidate && typeof candidate.collisions !== 'string') {
    return false
  }

  return true
}

// Read scenes.json from disk and return the valid scenes.
//
// Validation is hybrid: a malformed entry throws in development (so typos are
// caught immediately) but is skipped with a warning in production (so one bad
// entry never takes down the live gallery).
export function getScenes(): Scene[] {
  const fileText: string = readFileSync(MANIFEST_PATH, 'utf8')
  const parsed: unknown = JSON.parse(fileText)

  if (!Array.isArray(parsed)) {
    throw new Error('scenes.json must be a JSON array of scenes')
  }

  const validScenes: Scene[] = []
  parsed.forEach((entry: unknown, index: number) => {
    if (isValidScene(entry)) {
      validScenes.push(entry)
      return
    }

    const message = `scenes.json: entry ${index} is malformed (missing or non-string required field)`
    if (process.env.NODE_ENV === 'development') {
      throw new Error(message)
    }
    console.warn(message)
  })

  return validScenes
}

// Find and return one scene by its id, or undefined if not found
export function getSceneById(id: string): Scene | undefined {
  const allScenes: Scene[] = getScenes()

  for (let i: number = 0; i < allScenes.length; i++) {
    const scene: Scene = allScenes[i]
    if (scene.id === id) {
      return scene
    }
  }

  return undefined
}