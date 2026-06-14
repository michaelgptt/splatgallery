import Link from 'next/link'
import { getScenes } from '@/lib/scenes'

export default function GalleryPage() {
  const scenes = getScenes()

  return (
    <>
      <header className="bg-background/80 backdrop-blur-md top-0 z-50 border-b border-outline-variant fixed w-full">
        <div className="flex justify-between items-center w-full px-margin-desktop h-16 max-w-360 mx-auto">
          <div className="flex items-center gap-8">
            <span className="text-headline-md font-headline-md font-extrabold text-on-background tracking-tighter">
              3DGS Gallery
            </span>
            <nav className="hidden md:flex gap-6">
              <a
                className="text-primary-container font-bold border-b-2 border-primary-container pb-1 font-label-md text-label-md"
                href="#"
              >
                Explore
              </a>
              <a
                className="text-on-surface-variant font-medium hover:text-on-surface transition-colors font-label-md text-label-md"
                href="#"
              >
                Saved
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-margin-desktop w-full min-h-screen">
        <section className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-display-lg font-display-lg text-on-background mb-4">
            Discover 3DGS
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Explore high-fidelity 3D Gaussian Splats from our research lab.
          </p>
        </section>


        {/* One card per scene from scenes.json */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {scenes.map((scene) => (
            <Link
              key={scene.id}
              href={`/viewer/${scene.id}`}
              className="group cursor-pointer block"
            >
              <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-surface-container border border-outline-variant hover-scale">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scene.thumb}
                  alt={`${scene.title} 3D Splat preview`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 right-3 z-10 bg-surface-container-high/80 backdrop-blur-sm p-2 rounded-full border border-outline-variant text-on-surface opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    bookmark
                  </span>
                </span>
              </div>
              <div className="mt-3 flex justify-between items-center px-1">
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface group-hover:text-primary-container transition-colors">
                    {scene.title}
                  </h3>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">
                    {scene.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant py-12 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-desktop max-w-360 mx-auto">
          <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
            <span className="text-label-md font-bold text-on-surface mb-2">
              3DGS Gallery
            </span>
            <p className="text-label-sm font-label-sm text-on-surface-variant">
              © 2026 University of Saskatchewan. All rights reserved.
            </p>
          </div>
          <nav className="flex gap-8 mb-8 md:mb-0">
            <a
              className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary-container transition-colors"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary-container transition-colors"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary-container transition-colors"
              href="#"
            >
              Contact Support
            </a>
            <a
              className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary-container transition-colors"
              href="#"
            >
              About Us
            </a>
          </nav>
          <div className="flex gap-4">
            <button
              type="button"
              aria-label="Public"
              className="material-symbols-outlined text-on-surface-variant hover:text-secondary-container transition-colors"
            >
              public
            </button>
          </div>
        </div>
      </footer>
    </>
  )
}
