import { describe, it, expect } from 'vitest'
import type { Scene } from '@/lib/scenes'
// NOTE (TDD): these helpers do not exist yet — these tests define the contract
// for the slug-URL feature and are expected to fail until lib/scenes.ts is
// implemented. Imported via the namespace so a missing export fails per-test
// (TypeError) rather than aborting the whole file at import time.
import * as scenes from '@/lib/scenes'

const { getSceneSlug, findSceneBySlugOrId } = scenes

// Minimal scene fixtures. `thorv271` has a slug; `no-slug` does not.
const SCENES: Scene[] = [
  {
    id: '1',
    slug: 'thorv271',
    title: 'Airplane Room',
    thumb: '/fallbackthumb.jpg',
    splat: '/processed-data/airplaneroom/airplaneroom-sog/lod-meta.json',
    subtitle: 'By Biglab',
  },
  {
    id: '2',
    title: 'No Slug Scene',
    thumb: '/fallbackthumb.jpg',
    splat: '/processed-data/noslug/noslug-sog/lod-meta.json',
    subtitle: 'By Biglab',
  },
]

describe('getSceneSlug', () => {
  it('returns the slug when the scene has one', () => {
    expect(getSceneSlug(SCENES[0])).toBe('thorv271')
  })

  it('falls back to the numeric id when the scene has no slug', () => {
    expect(getSceneSlug(SCENES[1])).toBe('2')
  })
})

describe('findSceneBySlugOrId', () => {
  it('resolves a scene by its slug', () => {
    expect(findSceneBySlugOrId(SCENES, 'thorv271')?.id).toBe('1')
  })

  it('resolves a scene by its numeric id', () => {
    expect(findSceneBySlugOrId(SCENES, '1')?.slug).toBe('thorv271')
  })

  it('resolves a slugless scene by its id', () => {
    expect(findSceneBySlugOrId(SCENES, '2')?.title).toBe('No Slug Scene')
  })

  it('returns undefined for an unknown value', () => {
    expect(findSceneBySlugOrId(SCENES, 'does-not-exist')).toBeUndefined()
  })

  it('prefers a slug match over an id match when the two collide', () => {
    const colliding: Scene[] = [
      { id: '1', title: 'Matched by id', thumb: '/t.jpg', splat: '/a.json', subtitle: '' },
      { id: '99', slug: '1', title: 'Matched by slug', thumb: '/t.jpg', splat: '/b.json', subtitle: '' },
    ]
    expect(findSceneBySlugOrId(colliding, '1')?.title).toBe('Matched by slug')
  })
})

// The redirect contract: the viewer route canonicalizes URLs to the scene's slug.
// These assertions express what /viewer/1 -> /viewer/thorv271 relies on, without
// pulling in Next's redirect() machinery.
describe('canonical slug (redirect contract)', () => {
  it('a scene reached by numeric id has a different canonical slug, so the viewer should redirect', () => {
    const scene = findSceneBySlugOrId(SCENES, '1')
    expect(scene).toBeDefined()
    expect(getSceneSlug(scene!)).toBe('thorv271')
    expect(getSceneSlug(scene!)).not.toBe('1')
  })

  it('a slugless scene reached by id is already canonical, so no redirect is needed', () => {
    const scene = findSceneBySlugOrId(SCENES, '2')
    expect(scene).toBeDefined()
    expect(getSceneSlug(scene!)).toBe('2')
  })
})
