import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface StepConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  isOptional?: boolean;
}

interface FormStepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  /** Allow clicking on completed steps to go back */
  allowStepClick?: boolean;
  /** Validate current step before proceeding (return true if valid) */
  onValidateStep?: (stepIndex: number) => boolean | Promise<boolean>;
  /** Show step labels on mobile */
  showLabelsOnMobile?: boolean;
  /** Custom class for container */
  className?: string;
}

export const FormStepper: React.FC<FormStepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  children,
  allowStepClick = true,
  onValidateStep,
  showLabelsOnMobile = false,
  className = '',
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Mark previous steps as completed when moving forward
  useEffect(() => {
    if (currentStep > 0) {
      const newCompleted = new Set(completedSteps);
      for (let i = 0; i < currentStep; i++) {
        newCompleted.add(i);
      }
      setCompletedSteps(newCompleted);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleNext = useCallback(async () => {
    if (currentStep < steps.length - 1) {
      if (onValidateStep) {
        const isValid = await onValidateStep(currentStep);
        if (!isValid) return;
      }
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      onStepChange(currentStep + 1);
    }
  }, [currentStep, steps.length, onStepChange, onValidateStep]);

  const handleStepClick = useCallback(async (stepIndex: number) => {
    if (!allowStepClick) return;

    if (stepIndex < currentStep || completedSteps.has(stepIndex)) {
      onStepChange(stepIndex);
      return;
    }

    if (stepIndex === currentStep + 1) {
      if (onValidateStep) {
        const isValid = await onValidateStep(currentStep);
        if (!isValid) return;
      }
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      onStepChange(stepIndex);
    }
  }, [currentStep, completedSteps, allowStepClick, onStepChange, onValidateStep]);

  const isStepCompleted = (index: number) => completedSteps.has(index);
  const isStepActive   = (index: number) => index === currentStep;
  const isStepAccessible = (index: number) =>
    index <= currentStep || completedSteps.has(index) || index === currentStep + 1;

  return (
    <div className={`flex flex-col h-full ${className}`}>

      {/* ── Desktop Tabs ──────────────────────────────────────────────── */}
      <div className="hidden md:flex border-b border-[var(--border)] bg-[var(--bg-elevated)] overflow-x-auto">
        {steps.map((step, index) => {
          const active    = isStepActive(index);
          const completed = isStepCompleted(index);
          const accessible = isStepAccessible(index);

          let color: string;
          let borderBottom: string;
          if (active) {
            color = 'var(--primary)';
            borderBottom = 'var(--primary)';
          } else if (completed) {
            color = 'var(--color-success)';
            borderBottom = 'var(--color-success)';
          } else if (accessible) {
            color = 'var(--text-secondary)';
            borderBottom = 'transparent';
          } else {
            color = 'var(--text-muted)';
            borderBottom = 'transparent';
          }

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(index)}
              disabled={!allowStepClick || !accessible}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed"
              style={{ color, borderColor: borderBottom }}
            >
              {completed && !active ? (
                <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
              ) : (
                step.icon || (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-20 bg-current">
                    {index + 1}
                  </span>
                )
              )}
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Mobile Stepper Header ──────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Progress info */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {steps[currentStep].label}
            </span>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, index) => {
              const active    = isStepActive(index);
              const completed = isStepCompleted(index);
              const accessible = isStepAccessible(index);

              let bg: string;
              if (active)     bg = 'var(--primary)';
              else if (completed) bg = 'var(--color-success)';
              else            bg = 'var(--border-strong)';

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!allowStepClick || !accessible}
                  className="flex-1 h-1.5 rounded-full transition-all duration-300 disabled:cursor-default"
                  style={{ backgroundColor: bg }}
                  aria-label={`Aller à l'étape ${index + 1}: ${steps[index].label}`}
                />
              );
            })}
          </div>
        </div>

        {/* Step Labels (optional) */}
        {showLabelsOnMobile && (
          <div className="flex overflow-x-auto px-4 pb-2 gap-2 scrollbar-hide">
            {steps.map((step, index) => {
              const active    = isStepActive(index);
              const completed = isStepCompleted(index);
              const accessible = isStepAccessible(index);

              let bg: string;
              let color: string;
              if (active)     { bg = 'var(--primary-dim)'; color = 'var(--primary)'; }
              else if (completed) { bg = 'rgba(16,185,129,0.15)'; color = 'var(--color-success)'; }
              else            { bg = 'var(--bg-elevated)'; color = 'var(--text-muted)'; }

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!allowStepClick || !accessible}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                  style={{ backgroundColor: bg, color }}
                >
                  {completed && !active ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] opacity-50 bg-current">
                      {index + 1}
                    </span>
                  )}
                  {step.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Step Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>

      {/* ── Mobile Navigation Buttons ─────────────────────────────────── */}
      <div className="md:hidden sticky bottom-0 p-4 bg-[var(--bg-surface)] border-t border-[var(--border)] flex items-center gap-3 safe-area-bottom">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 0 ? 0.6 : 1,
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
};

/**
 * Hook to manage stepper state with localStorage persistence
 */
export function useFormStepper(
  formId: string,
  totalSteps: number,
  options?: { persist?: boolean }
) {
  const storageKey = `form_step_${formId}`;
  const { persist = false } = options || {};

  const [currentStep, setCurrentStep] = useState(() => {
    if (persist && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < totalSteps) {
          return parsed;
        }
      }
    }
    return 0;
  });

  useEffect(() => {
    if (persist) {
      localStorage.setItem(storageKey, String(currentStep));
    }
  }, [currentStep, storageKey, persist]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const resetSteps = useCallback(() => {
    setCurrentStep(0);
    if (persist) {
      localStorage.removeItem(storageKey);
    }
  }, [persist, storageKey]);

  const isFirstStep = currentStep === 0;
  const isLastStep  = currentStep === totalSteps - 1;
  const progress    = ((currentStep + 1) / totalSteps) * 100;

  return {
    currentStep,
    setCurrentStep: goToStep,
    nextStep,
    prevStep,
    resetSteps,
    isFirstStep,
    isLastStep,
    progress,
    totalSteps,
  };
}

export default FormStepper;
