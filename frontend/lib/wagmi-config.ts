'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { avalancheFuji, avalanche } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'AutoBounty',
  projectId: 'autobounty-hackathon', // WalletConnect project ID (placeholder for hackathon)
  chains: [avalancheFuji, avalanche],
  ssr: true,
})
