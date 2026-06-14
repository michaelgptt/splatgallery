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

// Read scenes.json from disk and return all scenes as an array
export function getScenes(): Scene[] {
  const fileText: string = readFileSync(MANIFEST_PATH, 'utf8')
  const scenes: Scene[] = JSON.parse(fileText)
  return scenes
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