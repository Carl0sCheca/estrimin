import "@/app/globals.css";
import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="bg-gray-50 dark:bg-gray-800">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
