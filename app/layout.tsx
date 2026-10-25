import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { GlobalMouseAura } from '@/components/global-mouse-aura'
import { ArkhamLoadingScreen } from '@/components/arkham-loading-screen'
import { AuthProvider } from '@/lib/auth-context'
import PulsingHexagonBackground from '@/components/pulsing-hexagon-background'
import { BatCursor } from '@/components/BatCursor'
import { PageTransitionOverlay, PageTransitionContentWrapper } from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'Arkham MUN | Diplomacy, reimagined',
  description: 'Arkham Model United Nations — diplomacy, debate and ideas that move nations.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" style={{ background: '#0a0608' }}>
      <head>
        <meta name="theme-color" content="#0a0608" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(sessionStorage.getItem('arkham:tx')==='logout-reveal'){document.documentElement.classList.add('tx-cover');}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" style={{ background: '#0a0608' }}>
        <PulsingHexagonBackground />
        <div className="site-comic-texture" aria-hidden="true" />
        <ArkhamLoadingScreen />
        <BatCursor />
        {/* Overlay mounted OUTSIDE AuthProvider and page tree so it never unmounts on auth or route changes */}
        <PageTransitionOverlay />
        <AuthProvider>
          <PageTransitionContentWrapper>
            <GlobalMouseAura>{children}</GlobalMouseAura>
          </PageTransitionContentWrapper>
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </AuthProvider>
      </body>
    </html>
  )
}
