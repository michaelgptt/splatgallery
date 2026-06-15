import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSceneBySlugOrId, getSceneSlug } from '@/lib/scenes'
import ViewerClient from './ViewerClient'

type Params = { sceneId: string}

type GenerateMetadataArgs = {
  params: Promise<Params>
}

// This function sets the browser tab title for the viewer page.
// Next.js calls it automatically before rendering — we just return an object with a title.
// The argument "params" is a Promise because Next.js 16 passes route params asynchronously.
export async function generateMetadata(args: GenerateMetadataArgs): Promise<Metadata> {
  const resolvedParams = await args.params       // wait for the route params to be ready
  const sceneId = resolvedParams.sceneId         // pull out the scene ID from the URL

  const scene = getSceneBySlugOrId(sceneId)      // look up the scene by slug or id

  // If the scene exists, show its title; otherwise show a fallback
  let pageTitle: string
  if (scene) {
    pageTitle = 'Viewing: ' + scene.title
  } else {
    pageTitle = 'Scene not found'
  }

  return {
    title: pageTitle,
  }
}

export default async function ViewerPage({params,}: {params: Promise<Params>}) {
  const resolvedParams: Params = await params
  const sceneId: string = resolvedParams.sceneId
  const scene = getSceneBySlugOrId(sceneId)
  if (!scene) notFound() //throws a 404 page if the scene isn't found.

  // Canonicalize to the nice slug URL: if the visitor arrived via the numeric id
  // (or any non-canonical alias), redirect to /viewer/<slug>. 307 (temporary) so
  // a future slug change isn't hard-cached by browsers.
  const canonicalSlug = getSceneSlug(scene)
  if (sceneId !== canonicalSlug) {
    redirect(`/viewer/${canonicalSlug}`)
  }

  return (
    <div className="fixed inset-0 bg-background">
      <ViewerClient dataPath={scene.splat} collisionsPath={scene.collisions} title={scene.title} />
    </div>
  )
}
