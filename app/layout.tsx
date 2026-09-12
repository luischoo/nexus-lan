import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexus LAN Solutions | Infraestructura de Red Empresarial',
  description: 'Diseño y despliegue de infraestructura LAN de nivel empresarial en Villahermosa, Tabasco.',
  generator: 'Nexus LAN Solutions',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#090d16',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
