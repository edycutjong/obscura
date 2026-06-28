import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Obscura — Confidential B2B Settlement Engine',
  description:
    'Secure invoice tokenization, ZK range-proof checking, and Poseidon2 double-spending prevention on Stellar.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Obscura — Confidential B2B Settlement Engine',
    description:
      'Secure invoice tokenization, ZK range-proof checking, and Poseidon2 double-spending prevention on Stellar.',
    url: 'https://obscura.edycu.dev',
    siteName: 'Obscura',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Obscura',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Obscura — Confidential B2B Settlement Engine',
    description:
      'Secure invoice tokenization, ZK range-proof checking, and Poseidon2 double-spending prevention on Stellar.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} h-full antialiased`}
      style={{
        // Bridge Next.js font variables to the token variables
        display: 'block',
      }}
    >
      <body className="min-h-full flex flex-col">
        <div className="bg-mesh"></div>
        <div className="bg-grid"></div>
        <div className="bg-noise"></div>
        {/* OBSCURA animated background */}
        <div className="obscura-radar"></div>
        <div className="obscura-datastream"></div>
        <div className="obscura-scanline"></div>
        {children}
      </body>
    </html>
  );
}
