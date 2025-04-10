import "./globals.css";
import { AgentContextProvider } from '@/lib/contexts/AgentContext';
import { DetectionProvider } from '@/lib/contexts/DetectionContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AgentContextProvider>
          <DetectionProvider>
            {children}
          </DetectionProvider>
        </AgentContextProvider>
      </body>
    </html>
  );
}
