import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import { UserProvider } from "@/contexts/UserContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-family-admin",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <div className={poppins.variable}>
        <Component {...pageProps} />
      </div>
    </UserProvider>
  );
}
