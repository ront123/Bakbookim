import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rubik',
})

export const metadata: Metadata = {
  title: 'Bakbokim – ניהול הזמנות יין',
  description: 'מערכת חכמה לניהול הזמנות יין ושליחת הודעות WhatsApp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${rubik.variable} font-rubik antialiased`}>
        {children}
      </body>
    </html>
  )
}
