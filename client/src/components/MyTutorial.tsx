import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { getTutorial, type TutorialStep } from "@/config/tutoriales";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

interface MyTutorialProps {
  moduleId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MyTutorial({ moduleId, isOpen, onClose }: MyTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const tutorial = getTutorial(moduleId);

  if (!tutorial) {
    return null;
  }

  const { moduleName, steps } = tutorial;
  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="p-1.5 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span>Tutorial: {moduleName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              Paso {currentStep + 1} de {steps.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex justify-center gap-1 py-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep 
                  ? "bg-sky-600" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              data-testid={`tutorial-dot-${index}`}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <MyButtonStyle 
            color="gray" 
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </MyButtonStyle>
          
          <MyButtonStyle 
            color={isLastStep ? "green" : "blue"} 
            onClick={handleNext}
          >
            {isLastStep ? "Finalizar" : "Siguiente"}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </MyButtonStyle>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TutorialIcon({ moduleId, onClick }: { moduleId: string; onClick: () => void }) {
  const tutorial = getTutorial(moduleId);
  
  if (!tutorial) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="p-1 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center hover:bg-sky-500 transition-colors"
      data-testid={`button-tutorial-${moduleId}`}
    >
      <GraduationCap className="h-4 w-4 text-white" />
    </button>
  );
}
