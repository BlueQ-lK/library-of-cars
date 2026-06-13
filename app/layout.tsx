import type { Metadata } from "next";
import "./globals.css";
import CarDataProvider from "./components/CarDataProvider";

export const metadata: Metadata = {
  title: "Tele-Car",
  description: "Automotive Encyclopedia & Performance Lab",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CarDataProvider>{children}</CarDataProvider>
      </body>
    </html>
  );
}
