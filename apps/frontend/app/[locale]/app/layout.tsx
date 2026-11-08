import { RouteGuard } from "@/components/RouteGuard";
import { MobileGate } from "@/components/MobileGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard policy="protected">
      <MobileGate />
      {children}
    </RouteGuard>
  );
}