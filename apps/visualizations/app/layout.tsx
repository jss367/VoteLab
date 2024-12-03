import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Link from 'next/link';
import "./globals.css";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

const inter = Inter({ subsets: ["latin"] });

function Navigation() {
    return (
        <nav className="p-4 bg-white shadow">
            <div className="container mx-auto">
                <Link href="/" className="mr-4 hover:underline">
                    Original Visualization
                </Link>
                <Link href="/comparison" className="hover:underline">
                    Method Comparison
                </Link>
            </div>
        </nav>
    );
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Navigation />
                {children}
            </body>
        </html>
    );
}