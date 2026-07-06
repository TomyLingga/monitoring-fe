import "./globals.css";

export const metadata = {
  title: "CPO Supply Chain Management System",
  description: "End-to-End Tracking of Palm Oil Procurement, Production, Sales, and Financial Operations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
