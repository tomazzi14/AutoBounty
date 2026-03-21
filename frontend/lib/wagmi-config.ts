'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { avalancheFuji } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'AutoBounty',
  projectId: 'autobounty-hackathon', // WalletConnect project ID (placeholder for hackathon)
  chains: [avalancheFuji],
  ssr: true,
})
