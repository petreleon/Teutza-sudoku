import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teutza Sudoku - Pink Version',
  description: 'A beautiful pink Sudoku game with multiple sizes and difficulties.',
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
