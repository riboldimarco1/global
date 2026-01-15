import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface FinanzaProps {
  onBack: () => void;
}

export default function Finanza({ onBack }: FinanzaProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          data-testid="button-back-to-modules"
          title="Volver a módulos"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </Header>
      <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-finanza-title">
            Finanza
          </h1>
          <p className="text-muted-foreground text-center">
            Módulo en desarrollo
          </p>
        </div>
      </main>
    </div>
  );
}
