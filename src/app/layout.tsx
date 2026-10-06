import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenZ Living Space | Find Your Space. Live Your Way.",
  description:
    "Next-generation hostel coliving for creators, coders, and nomads. 2 exclusive boutique properties in Madhapur - HYD featuring gigabit fiber, creator pods, and vibrant community.",
  keywords: [
    "hostel in madhapur",
    "madhapur coliving",
    "hyderabad hostel",
    "genz living space",
    "student hostel hyderabad",
  ],
  openGraph: {
    title: "GenZ Living Space | Premium Boutique Hostels",
    description: "2 curated spaces built for community, speed, and freedom.",
    url: "https://genzlivingspace.com",
    siteName: "GenZ Living Space",
    images: [
      {
        url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "GenZ Living Space",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
