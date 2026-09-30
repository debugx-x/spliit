import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Split Karega',
    short_name: 'Split Karega',
    description:
      'A free, minimalist web app to split expenses with your friends. No ads, no limits.',
    start_url: '/groups',
    id: '/groups',
    display: 'standalone',
    background_color: '#FFF8EC',
    theme_color: '#08775A',
    icons: [
      {
        src: '/logo/48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/logo/64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: '/logo/128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/logo/144x144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/logo/192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo/256x256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/logo/512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/logo/512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
