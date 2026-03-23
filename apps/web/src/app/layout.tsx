import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-barlow-condensed',
})

export const metadata: Metadata = {
  title: 'Politi-Score — La transparence politique notée',
  description: 'Notation éthique et transparente des élus politiques français sur 5 critères d\'intégrité vérifiés et sourcés.',
  openGraph: {
    title: 'Politi-Score',
    description: 'Notation éthique des élus politiques français',
    url: 'https://politi-score.fr',
    siteName: 'Politi-Score',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${barlow.variable} ${barlowCondensed.variable}`}>
        {children}
      </body>
    </html>
  )
}
