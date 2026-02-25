import { useSport } from "@/contexts/SportContext";
import { Construction } from "lucide-react";

export default function ComingSoon() {
  const { sportConfig } = useSport();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Construction className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">{sportConfig.name} Module</h1>
      <p className="text-muted-foreground text-center max-w-md">
        This module is under development. Check back soon for full {sportConfig.name} analytics.
      </p>
    </div>
  );
}
