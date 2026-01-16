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
    description: "Arrime Nucleo RMW tiene dos módulos: Arrime para registro de centrales y Finanza para gestión financiera. Los invitados solo acceden a Arrime.",
    icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
  },
  {
    id: 2,
    title: "Iniciar Sesión",
    description: "Primero identifícate: Invitado (solo lectura en Arrime) o Administrador (acceso completo). Los admins eligen el módulo después de autenticarse.",
    icon: <Settings className="h-8 w-8 text-primary" />,
  },
  {
    id: 3,
    title: "Seleccionar Semana",
    description: "Usa el selector de semana para filtrar los registros. Las semanas se calculan desde la fecha de inicio configurada.",
    icon: <Calendar className="h-8 w-8 text-primary" />,
    highlight: "week-filter",
  },
  {
    id: 4,
    title: "Agregar Registros",
    description: "Completa el formulario con fecha, central, cantidad y grado. Usa la calculadora para sumar valores rápidamente.",
    icon: <Database className="h-8 w-8 text-primary" />,
    highlight: "registro-form",
  },
  {
    id: 5,
    title: "Cargar Archivos Excel",
    description: "Importa datos desde Excel: 'Cargar Palmar' para central Palmar y 'Cargar Portuguesa' para Portuguesa (núcleo 1013).",
    icon: <Upload className="h-8 w-8 text-primary" />,
    highlight: "upload-buttons",
  },
  {
    id: 6,
    title: "Visualizar Gráficos",
    description: "Explora gráficos de totales, diarios, acumulados y grado promedio. Filtra por central o finca para análisis específicos.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    highlight: "charts",
  },
  {
    id: 7,
    title: "Generar PDF",
    description: "Genera reportes PDF semanales o consolidados. Incluyen resúmenes por central y gráficos.",
    icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
    highlight: "pdf-buttons",
  },
  {
    id: 8,
    title: "Módulo Finanza",
    description: "Solo para administradores: configura fincas con costos/ingresos, registra pagos, genera reportes de ingresos y estado de cuenta.",
    icon: <Database className="h-8 w-8 text-primary" />,
  },
  {
    id: 9,
    title: "Estado de Cuenta",
    description: "En Finanza, el Estado de Cuenta muestra el balance de ingresos y pagos. Con filtro Nucleo, totaliza ingresos por finca.",
    icon: <FileSpreadsheet className="h-8 w-8 text-primary" />,
  },
  {
    id: 10,
    title: "Configuración",
    description: "Gestiona centrales, tema de colores, fecha de inicio y respaldos. Usa el botón de ayuda para ver la guía completa.",
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
