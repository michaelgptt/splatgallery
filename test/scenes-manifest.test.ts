import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// lib/scenes.ts reads public/scenes.json synchronously via readFileSync. Mock the
// filesystem so we can feed getScenes() arbitrary manifest contents — including
// malformed ones we could never commit to the real file. lib/scenes.ts uses only
// readFileSync from node:fs (path stays real).
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

import { readFileSync } from 'node:fs'
import {
  getScenes,
  getSceneById,
  getSceneBySlugOrId,
  type Scene,
} from '@/lib/scenes'

const mockReadFileSync = vi.mocked(readFileSync)

// Point the next getScenes() call at this manifest. Objects are JSON-stringified;
// raw strings are passed through verbatim (so we can test invalid JSON too).
function setManifest(value: unknown): void {
  mockReadFileSync.mockReturnValue(
    (typeof value === 'string' ? value : JSON.stringify(value)) as never,
  )
}

function omit<T extends object>(obj: T, key: keyof T): Partial<T> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// A fully-populated, valid scene (every field, including the optionals).
const VALID: Scene = {
  id: '1',
  slug: 'thorv271',
  title: 'Airplane Room',
  thumb: '/fallbackthumb.jpg',
  splat: '/processed-data/airplaneroom/airplaneroom-sog/lod-meta.json',
  collisions: '/processed-data/airplaneroom/airplaneroom.voxel/airplaneroom.voxel.json',
  subtitle: 'By Biglab',
}

// Valid with only the required fields — no slug, no collisions.
const MINIMAL: Scene = {
  id: '2',
  title: 'Minimal Scene',
  thumb: '/fallbackthumb.jpg',
  splat: '/processed-data/minimal/minimal-sog/lod-meta.json',
  subtitle: '',
}

const REQUIRED_FIELDS = ['id', 'title', 'thumb', 'splat', 'subtitle'] as const

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getScenes — happy path', () => {
  it('returns every valid scene in order', () => {
    setManifest([VALID, MINIMAL])
    const scenes = getScenes()
    expect(scenes).toHaveLength(2)
    expect(scenes.map((s) => s.id)).toEqual(['1', '2'])
  })

  it('returns an empty array for an empty manifest', () => {
    setManifest([])
    expect(getScenes()).toEqual([])
  })

  it('accepts a scene with only the required fields (no slug, no collisions)', () => {
    setManifest([MINIMAL])
    expect(getScenes()).toHaveLength(1)
  })

  it('accepts an optional slug without collisions, and vice versa', () => {
    const slugOnly = { ...MINIMAL, slug: 'just-a-slug' }
    const collisionsOnly = { ...MINIMAL, id: '3', collisions: '/x.voxel.json' }
    setManifest([slugOnly, collisionsOnly])
    expect(getScenes()).toHaveLength(2)
  })

  it('preserves unknown extra fields rather than stripping them', () => {
    setManifest([{ ...VALID, author: 'BigLab', year: 2026 }])
    const [scene] = getScenes()
    expect((scene as Record<string, unknown>).author).toBe('BigLab')
  })
})

describe('getScenes — structural errors always throw (even in production)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
  })

  it('throws when the top-level JSON is an object, not an array', () => {
    setManifest({ id: '1' })
    expect(() => getScenes()).toThrow(/must be a JSON array/)
  })

  it('throws when the top-level JSON is a primitive', () => {
    setManifest('42')
    expect(() => getScenes()).toThrow(/must be a JSON array/)
  })

  it('throws on syntactically invalid JSON', () => {
    setManifest('{ not valid json,,, }')
    expect(() => getScenes()).toThrow()
  })
})

// Each of these is a single bad entry that isValidScene must reject.
const INVALID_ENTRIES: Array<[string, unknown]> = [
  ...REQUIRED_FIELDS.map(
    (field) =>
      [`missing required field "${field}"`, omit(VALID, field)] as [string, unknown],
  ),
  ['a required field is a number', { ...VALID, id: 1 }],
  ['a required field is null', { ...VALID, title: null }],
  ['a required field is an object', { ...VALID, splat: {} }],
  ['slug is present but a number', { ...VALID, slug: 5 }],
  ['slug is present but null', { ...VALID, slug: null }],
  ['collisions is present but a number', { ...VALID, collisions: 5 }],
  ['the entry is null', null],
  ['the entry is a bare string', 'not-an-object'],
  ['the entry is a number', 7],
  ['the entry is an array', ['nope']],
]

describe('getScenes — malformed entries in production (warn + skip)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
  })

  it.each(INVALID_ENTRIES)(
    'skips an entry where %s, keeping the valid ones',
    (_label, bad) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      setManifest([VALID, bad])

      const scenes = getScenes()

      expect(scenes).toHaveLength(1)
      expect(scenes[0].id).toBe('1')
      expect(warn).toHaveBeenCalledOnce()
      warn.mockRestore()
    },
  )

  it('warns with the offending entry index', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setManifest([VALID, MINIMAL, { ...VALID, id: 1 }]) // bad entry at index 2

    getScenes()

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('entry 2'))
    warn.mockRestore()
  })
})

describe('getScenes — malformed entries in development (throw fast)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })

  it.each(INVALID_ENTRIES)('throws when %s', (_label, bad) => {
    setManifest([VALID, bad])
    expect(() => getScenes()).toThrow(/malformed/)
  })
})

describe('getSceneById', () => {
  it('returns the matching scene', () => {
    setManifest([VALID, MINIMAL])
    expect(getSceneById('2')?.title).toBe('Minimal Scene')
  })

  it('returns undefined when no id matches', () => {
    setManifest([VALID])
    expect(getSceneById('does-not-exist')).toBeUndefined()
  })

  it('returns undefined for an empty manifest', () => {
    setManifest([])
    expect(getSceneById('1')).toBeUndefined()
  })

  it('matches on id only — a slug value does not resolve here', () => {
    setManifest([VALID])
    // 'thorv271' is VALID's slug, not its id, so getSceneById must miss it.
    expect(getSceneById('thorv271')).toBeUndefined()
  })
})

describe('getSceneBySlugOrId (reads the manifest)', () => {
  it('resolves by slug', () => {
    setManifest([VALID, MINIMAL])
    expect(getSceneBySlugOrId('thorv271')?.id).toBe('1')
  })

  it('resolves by id', () => {
    setManifest([VALID, MINIMAL])
    expect(getSceneBySlugOrId('2')?.title).toBe('Minimal Scene')
  })

  it('prefers a slug match over an id match on collision', () => {
    const byId = { ...MINIMAL, id: 'shared' }
    const bySlug = { ...VALID, id: '9', slug: 'shared' }
    setManifest([byId, bySlug])
    expect(getSceneBySlugOrId('shared')?.id).toBe('9')
  })

  it('returns undefined when nothing matches', () => {
    setManifest([VALID])
    expect(getSceneBySlugOrId('nope')).toBeUndefined()
  })
})
