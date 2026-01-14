import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, CheckCircle2, Calendar, Database, FileSpreadsheet, BarChart3, Settings, Upload } from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Bienvenido al Sistema",
    description: "Este tutorial te guiará por las funciones principales de la aplicación para registrar y gestionar datos de centrales azucareras.",
    icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
  },
  {
    id: 2,
    title: "Seleccionar Semana",
    description: "Usa el selector de semana en la parte superior para filtrar los registros por semana. La semana actual se selecciona automáticamente.",
    icon: <Calendar className="h-8 w-8 text-primary" />,
    highlight: "week-filter",
  },
  {
    id: 3,
    title: "Agregar Registros",
    description: "Completa el formulario con la fecha, central, cantidad y grado para agregar nuevos registros. El campo finca se auto-completa con valores existentes.",
    icon: <Database className="h-8 w-8 text-primary" />,
    highlight: "registro-form",
  },
  {
    id: 4,
    title: "Ver y Editar Registros",
    description: "La tabla muestra todos los registros de la semana seleccionada. Puedes editar o eliminar registros usando los botones de acción.",
    icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
    highlight: "registros-grid",
  },
  {
    id: 5,
    title: "Cargar Archivos Excel",
    description: "Usa los botones 'Cargar Palmar' y 'Cargar Portuguesa' para importar datos desde archivos Excel automáticamente.",
    icon: <Upload className="h-8 w-8 text-primary" />,
    highlight: "upload-buttons",
  },
  {
    id: 6,
    title: "Visualizar Gráficos",
    description: "Los gráficos muestran totales por central, acumulados, diarios y por grado. Usa las pestañas para cambiar entre vistas.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    highlight: "charts",
  },
  {
    id: 7,
    title: "Generar PDF",
    description: "Genera reportes PDF semanales o de todas las semanas usando los botones de PDF. Los reportes incluyen resúmenes y gráficos.",
    icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
    highlight: "pdf-buttons",
  },
  {
    id: 8,
    title: "Configuración",
    description: "Accede a la configuración para gestionar centrales, cambiar tema de colores, y más opciones del sistema.",
    icon: <Settings className="h-8 w-8 text-primary" />,
    highlight: "settings",
  },
];

interface InteractiveTutorialProps {
  onClose: () => void;
  isOpen: boolean;
}

export function InteractiveTutorial({ onClose, isOpen }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("tutorial_completed");
    if (seen) {
      setHasSeenTutorial(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("tutorial_completed", "true");
    setHasSeenTutorial(true);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("tutorial_completed", "true");
    onClose();
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-2 py-0.5">
                {currentStep + 1} / {tutorialSteps.length}
              </Badge>
              <span className="text-sm text-muted-foreground">Tutorial</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              data-testid="button-close-tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              {step.icon}
            </div>
            <CardTitle className="text-xl">{step.title}</CardTitle>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
          <div className="flex justify-center gap-1 mt-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            data-testid="button-tutorial-previous"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {isLastStep ? (
            <Button onClick={handleComplete} data-testid="button-tutorial-complete">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Completar
            </Button>
          ) : (
            <Button onClick={handleNext} data-testid="button-tutorial-next">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem("tutorial_completed");
    if (!seen) {
      setHasSeenTutorial(false);
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, []);

  const openTutorial = () => setShowTutorial(true);
  const closeTutorial = () => setShowTutorial(false);

  return {
    showTutorial,
    hasSeenTutorial,
    openTutorial,
    closeTutorial,
  };
}
