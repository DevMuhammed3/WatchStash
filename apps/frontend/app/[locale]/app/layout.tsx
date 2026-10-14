import { RouteGuard } from "@/components/RouteGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard policy="protected">{children}</RouteGuard>
  );
}