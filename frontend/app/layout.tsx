import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoBounty — Automated Bounties for Open Source',
  description:
    'AI agents verify GitHub contributions and release payments instantly through onchain escrow on Avalanche-.',
  keywords: ['open source', 'bounty', 'AI', 'blockchain', 'Avalanche', 'GitHub', 'smart contract', 'Web3'],
  authors: [{ name: 'AutoBounty' }],
  openGraph: {
    title: 'AutoBounty — Automated Bounties for Open Source',
    description:
      'AI agents verify GitHub contributions and release payments instantly through onchain escrow.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
