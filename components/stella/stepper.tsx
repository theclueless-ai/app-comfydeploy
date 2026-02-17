"use client";

interface Step {
  number: number;
  title: string;
  subtitle: string;
}

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

const steps: Step[] = [
  { number: 1, title: "Modelo", subtitle: "Seleccionar modelo" },
  { number: 2, title: "Producto", subtitle: "Subir producto" },
  { number: 3, title: "Configuración", subtitle: "Configurar" },
  { number: 4, title: "Generar", subtitle: "Ver resultado" },
];

export default function StellaStepper({
  currentStep,
  onStepClick,
  completedSteps = [],
}: StepperProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-8 py-5">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = completedSteps.includes(step.number);
          const isClickable = isCompleted || step.number <= currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + text */}
              <button
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 group ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : isCompleted
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                {/* Text */}
                <div className="text-center">
                  <p
                    className={`text-xs font-medium leading-none ${
                      isActive || isCompleted
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-[10px] mt-1 leading-none ${
                      isActive
                        ? "text-gray-500"
                        : isCompleted
                        ? "text-gray-400"
                        : "text-gray-300"
                    }`}
                  >
                    {step.subtitle}
                  </p>
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 mt-[-24px]">
                  <div
                    className={`h-0.5 rounded-full transition-colors duration-200 ${
                      isCompleted ? "bg-gray-900" : "bg-gray-100"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
