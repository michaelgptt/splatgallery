import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: '3DGS Gallery',
  description:
    'Explore high-fidelity 3D Gaussian Splats from the University of Saskatchewan BigLab.',
}

export default function RootLayout({
children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="fonts/material-symbols-outlined.woff2"
        />
      </head>
      <body className="min-h-full flex flex-col font-body-md text-body-md bg-background">
        {children}
      </body>
    </html>
  )
}
