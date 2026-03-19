import { TastifyProvider } from '@tastify/react'
import '@tastify/react/styles.css'

export const metadata = {
  title: 'tastify Next.js Example',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'system-ui' }}>
        <TastifyProvider tokenUrl="/api/spotify/token">
          {children}
        </TastifyProvider>
      </body>
    </html>
  )
}
