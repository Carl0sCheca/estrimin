import "@/app/globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="bg-gray-50 dark:bg-gray-800">
        <ThemeProvider attribute="class" defaultTheme="system">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
