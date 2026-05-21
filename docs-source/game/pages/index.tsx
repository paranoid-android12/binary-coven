import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import dynamic from "next/dynamic";
import { useUser } from "@/contexts/UserContext";

const inter = Inter({ subsets: ["latin"] });

const AppWithoutSSR = dynamic(() => import("@/App"), { ssr: false });

export default function Home() {
    const { user, isLoading, isAuthenticated } = useUser();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Binary Coven</title>
                    <meta name="description" content="A Phaser 3 Next.js project template that demonstrates Next.js with React communication and uses Vite for bundling." />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <link rel="icon" href="/favicon.png" />
                </Head>
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#000000',
                    color: '#0ec3c9',
                    fontFamily: 'BoldPixels, Arial, sans-serif',
                    fontSize: '1.5em',
                }}>
                    Loading...
                </div>
            </>
        );
    }

    // Always render the game - login modal will be shown when needed
    return (
        <>
            <Head>
                <title>Binary Coven</title>
                <meta name="description" content="A Phaser 3 Next.js project template that demonstrates Next.js with React communication and uses Vite for bundling." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.png" />
            </Head>
            <main className={`${styles.main} ${inter.className}`}>
                <AppWithoutSSR />
            </main>
        </>
    );
}
