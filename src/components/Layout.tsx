import { useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopNavbar } from "./TopNavbar";
import { api } from "@/lib/api";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [threatDetected, setThreatDetected] = useState(false);

  useEffect(() => {
    api.stats()
      .then((data) => setThreatDetected((data.threats_detected ?? 0) > 0))
      .catch(() => setThreatDetected(false));
  }, []);

  return (
    <div className="h-screen w-full flex overflow-hidden dark relative z-10">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopNavbar threatDetected={threatDetected} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-cyber">
          {children}
        </main>
      </div>
    </div>
  );
}

