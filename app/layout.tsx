import type { Metadata } from 'next';
import './globals.css';

const BASE_URL = 'https://vibetravel.space'; 

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Vibe Travel — Find your vibe, not just a destination',
    template: '%s | Vibe Travel',
  },
  description:
    'Tell us how you want to feel and we\'ll find where to go. AI-powered travel discovery with real-time safety signals, hidden gem tips, and honest destination recommendations sourced from Reddit and travel blogs.',
  keywords: [
    'travel discovery',
    'vibe-based travel',
    'AI travel recommendations',
    'hidden gem destinations',
    'travel safety alerts',
    'unique travel destinations',
    'off the beaten path travel',
    'travel planning',
  ],
  authors: [{ name: 'Vibe Travel' }],
  creator: 'Vibe Travel',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Vibe Travel',
    title: 'Vibe Travel — Find your vibe, not just a destination',
    description:
      'Tell us how you want to feel and we\'ll find where to go. AI-powered travel discovery with real-time safety signals.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vibe Travel — Find your vibe, not just a destination',
    description:
      'Tell us how you want to feel and we\'ll find where to go. AI-powered travel discovery.',
    creator: '@vibetravel', // update to your Twitter handle if you have one
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// JSON-LD structured data — helps Google understand this is a travel/software app
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Vibe Travel',
  url: BASE_URL,
  description:
    'AI-powered vibe-based travel discovery. Describe how you want to feel and get surprising destination recommendations with real-time safety signals.',
  applicationCategory: 'TravelApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'AI-powered destination recommendations',
    'Real-time safety alerts',
    'Hidden gem tips from Reddit and travel blogs',
    'Crowd level indicators',
    'Best time to visit guidance',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme: set before paint to prevent flash */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('vibe-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
