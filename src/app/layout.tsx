import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LegenTech — Sistema Comercial & Fábrica de Software Autônoma',
  description: 'Plataforma autônoma de prospecção, qualificação SPIN, auditoria BI/CRM e entrega sob medida.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
