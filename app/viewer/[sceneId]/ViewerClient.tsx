'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SuperSplatViewer } from './SuperSplatViewer'

export default function ViewerClient({dataPath, collisionsPath, title}: {dataPath: string, collisionsPath?: string, title: string}) {
  // Note: the iframe's onLoad fires when the viewer *document* loads, not when
  // the 3D splat has finished decoding. This overlay therefore covers the common
  // failure (the viewer page / its assets not loading), not splat-decode status.
  // Precise decode signaling would need the viewer to postMessage us (future work).
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <>
      <Link href="/gallery" className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container/80 backdrop-blur-md border border-outline-variant text-on-surface hover:text-primary-container hover:border-primary-container transition-colors text-label-md font-label-md">
        <span className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Gallery
      </Link>
      <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full bg-surface-container/80 backdrop-blur-md border border-outline-variant text-on-surface-variant text-label-sm font-label-sm">
        {title}
      </div>

      {hasError ? (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background text-on-surface-variant px-6 text-center">
          <span className="material-symbols-outlined text-[48px] text-error">
            error
          </span>
          <p className="text-body-lg font-body-lg text-on-surface">
            Couldn&apos;t load this scene.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-on-surface hover:text-primary-container hover:border-primary-container transition-colors text-label-md font-label-md"
          >
            Back to gallery
          </Link>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background text-on-surface-variant pointer-events-none">
              <span className="material-symbols-outlined text-[40px] animate-spin">
                progress_activity
              </span>
              <p className="text-label-md font-label-md">Loading {title}…</p>
            </div>
          )}
          <SuperSplatViewer
            contentUrl={dataPath}
            collisionUrl={collisionsPath}
            title={title}
            className="w-full h-screen"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        </>
      )}
    </>
  )
}
