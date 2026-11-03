import React from "react";
import "./globals.css";

export const metadata = {
  title: "Bus Booking",
  description: "Online Bus Ticket Booking System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}