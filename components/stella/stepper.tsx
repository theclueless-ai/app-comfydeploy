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
    <div className="flex items-center gap-3">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = completedSteps.includes(step.number);
        const isClickable = isCompleted || step.number <= currentStep;

        return (
          <div key={step.number} className="flex items-center gap-3">
            <button
              onClick={() => isClickable && onStepClick?.(step.number)}
              disabled={!isClickable}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200 ${
                isActive
                  ? "bg-gray-900 text-white"
                  : isCompleted
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                  : "bg-transparent text-gray-400 cursor-default"
              }`}
            >
              {/* Step number */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                  isActive
                    ? "bg-white text-gray-900"
                    : isCompleted
                    ? "bg-gray-300 text-gray-700"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3 h-3"
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
              </span>

              {/* Step text */}
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium leading-none">
                  {step.title}
                </p>
                <p
                  className={`text-[10px] mt-0.5 leading-none ${
                    isActive
                      ? "text-white/60"
                      : isCompleted
                      ? "text-gray-500"
                      : "text-gray-300"
                  }`}
                >
                  {step.subtitle}
                </p>
              </div>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-px ${
                  completedSteps.includes(step.number)
                    ? "bg-gray-400"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
