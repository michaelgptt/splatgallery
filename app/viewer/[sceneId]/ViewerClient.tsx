'use client'

import Link from 'next/link'
import { SuperSplatViewer } from './SuperSplatViewer'

export default function ViewerClient({dataPath, collisionsPath, title}: {dataPath: string, collisionsPath?: string, title: string}) {
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
      <SuperSplatViewer contentUrl={dataPath} collisionUrl={collisionsPath} title={title} className="w-full h-screen" />
    </>
  )
}
