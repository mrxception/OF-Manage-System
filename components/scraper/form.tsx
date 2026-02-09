"use client"
import React, { useState } from "react"
import { ComboBox, ComboBoxContent, ComboBoxItem, ComboBoxTrigger, ComboBoxValue } from "@/components/ui/combobox2"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

type ModelOption = { id: string; name: string; username: string }
type ManagerOption = { id: string; name: string; models: ModelOption[] }

interface FormProps {
  onSubmit: (e: React.FormEvent) => void
  progRef: React.RefObject<HTMLElement | null>
  status: string
  busy: boolean

  managers: ManagerOption[]
  managerId: string
  setManagerId: (v: string) => void
  modelId: string
  setModelId: (v: string) => void

  compareEnabled: boolean
  setCompareEnabled: (v: boolean) => void
  managerId2: string
  setManagerId2: (v: string) => void
  modelId2: string
  setModelId2: (v: string) => void

  s: { [key: string]: string }
}

const steps = [
  { id: 1, name: "Select Model" },
  { id: 2, name: "Compare" },
  { id: 3, name: "Review" },
]

export default function Form(props: FormProps) {
  const {
    onSubmit,
    progRef,
    status,
    busy,
    managers,
    managerId,
    setManagerId,
    modelId,
    setModelId,
    compareEnabled,
    setCompareEnabled,
    managerId2,
    setManagerId2,
    modelId2,
    setModelId2,
    s,
  } = props

  const [currentStep, setCurrentStep] = useState(1)

  const mgrA = managers.find(m => m.id === managerId) || null
  const modelsA = mgrA?.models || []

  const mgrB = managers.find(m => m.id === managerId2) || null
  const modelsB = mgrB?.models || []

  const addCompare = () => setCompareEnabled(true)
  const removeCompare = () => {
    setManagerId2("")
    setModelId2("")
    setCompareEnabled(false)
  }

  const canProgressFromStep1 = managerId && modelId
  const canProgressFromStep2 = !compareEnabled || (managerId2 && modelId2)

  const handleNext = () => {
    if (currentStep === 1 && canProgressFromStep1) setCurrentStep(2)
    if (currentStep === 2 && canProgressFromStep2) setCurrentStep(3)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const selectedModelA = modelsA.find(m => m.id === modelId)
  const selectedModelB = modelsB.find(m => m.id === modelId2)

  return (
    <form onSubmit={onSubmit}>
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between gap-2">
          {steps.map((step, index) => {
            const isComplete = step.id < currentStep
            const isActive = step.id === currentStep

            return (
              <li key={step.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div className="flex-1 h-0.5 mx-2">
                        <div
                          className={[
                            "h-full rounded-full transition-colors duration-300",
                            isComplete || isActive ? "bg-primary/80" : "bg-border/60",
                          ].join(" ")}
                        />
                      </div>
                    )}

                    <div
                      className={[
                        "relative flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all duration-300",
                        "border",
                        isComplete
                          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                          : isActive
                            ? "bg-primary/10 text-primary border-primary/60 ring-2 ring-primary/15"
                            : "bg-transparent text-muted-foreground border-border/60",
                      ].join(" ")}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : <span className="text-sm font-semibold">{step.id}</span>}
                    </div>

                    {index < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2">
                        <div
                          className={[
                            "h-full rounded-full transition-colors duration-300",
                            isComplete ? "bg-primary/80" : "bg-border/60",
                          ].join(" ")}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-center">
                    <p
                      className={[
                        "text-sm font-medium transition-colors",
                        isActive ? "text-foreground" : isComplete ? "text-primary/90" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="bg-card/80 backdrop-blur rounded-xl border border-border/60 shadow-lg shadow-black/20 overflow-visible w-full lg:mx-auto mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Select Model</h3>
                  <p className="text-sm text-muted-foreground mb-4">Choose a manager and model for analysis</p>
                </div>

                <div>
                  <label htmlFor="managerA" className="block text-sm font-semibold text-foreground mb-2">
                    Manager
                  </label>
                  <ComboBox value={managerId} onValueChange={setManagerId}>
                    <ComboBoxTrigger
                      id="managerA"
                      className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                    >
                      <ComboBoxValue placeholder="Select manager" />
                    </ComboBoxTrigger>
                    <ComboBoxContent>
                      {managers.map(m => (
                        <ComboBoxItem key={m.id} value={m.id}>
                          {m.name}
                        </ComboBoxItem>
                      ))}
                    </ComboBoxContent>
                  </ComboBox>
                </div>

                <div>
                  <label htmlFor="modelA" className="block text-sm font-semibold text-foreground mb-2">
                    Model
                  </label>
                  <ComboBox value={modelId} onValueChange={setModelId} disabled={!managerId}>
                    <ComboBoxTrigger
                      id="modelA"
                      className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                    >
                      <ComboBoxValue placeholder={managerId ? "Select model" : "Select manager first"} />
                    </ComboBoxTrigger>
                    <ComboBoxContent>
                      {modelsA.map(m => (
                        <ComboBoxItem key={m.id} value={m.id}>
                          {m.name}
                        </ComboBoxItem>
                      ))}
                    </ComboBoxContent>
                  </ComboBox>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Compare Models</h3>
                  <p className="text-sm text-muted-foreground mb-4">Optionally compare against another model</p>
                </div>

                {!compareEnabled ? (
                  <div className="border border-dashed border-border/60 bg-muted/20 rounded-xl p-8 text-center">
                    <p className="text-muted-foreground mb-4">Add a second model to compare results side by side</p>
                    <button type="button" className={s.btn2} onClick={addCompare}>
                      Add Comparison
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Comparison Model</span>
                      <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-foreground"
                        onClick={removeCompare}
                      >
                        Remove
                      </button>
                    </div>

                    <div>
                      <label htmlFor="managerB" className="block text-sm font-semibold text-foreground mb-2">
                        Manager
                      </label>
                      <ComboBox value={managerId2} onValueChange={setManagerId2}>
                        <ComboBoxTrigger
                          id="managerB"
                          className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                        >
                          <ComboBoxValue placeholder="Select manager" />
                        </ComboBoxTrigger>
                        <ComboBoxContent>
                          {managers.map(m => (
                            <ComboBoxItem key={m.id} value={m.id}>
                              {m.name}
                            </ComboBoxItem>
                          ))}
                        </ComboBoxContent>
                      </ComboBox>
                    </div>

                    <div>
                      <label htmlFor="modelB" className="block text-sm font-semibold text-foreground mb-2">
                        Model
                      </label>
                      <ComboBox value={modelId2} onValueChange={setModelId2} disabled={!managerId2}>
                        <ComboBoxTrigger
                          id="modelB"
                          className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                        >
                          <ComboBoxValue placeholder={managerId2 ? "Select model" : "Select manager first"} />
                        </ComboBoxTrigger>
                        <ComboBoxContent>
                          {modelsB.map(m => (
                            <ComboBoxItem key={m.id} value={m.id}>
                              {m.name}
                            </ComboBoxItem>
                          ))}
                        </ComboBoxContent>
                      </ComboBox>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Review & Run</h3>
                  <p className="text-sm text-muted-foreground mb-4">Confirm your selections and run the analysis</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Primary Model</p>
                    <p className="text-foreground font-medium">
                      {mgrA?.name} → {selectedModelA?.name}
                    </p>
                  </div>

                  {compareEnabled && managerId2 && modelId2 ? (
                    <div className="bg-muted/30 border border-border/60 rounded-xl p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Comparison Model</p>
                      <p className="text-foreground font-medium">
                        {mgrB?.name} → {selectedModelB?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted/20 border border-dashed border-border/60 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground italic">No comparison model selected</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="px-6 py-4 bg-muted/30 border-t border-border/60 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button type="button" className={s.btn2} onClick={handleBack} disabled={busy}>
                Back
              </button>
            )}
          </div>

          <div>
            {currentStep < 3 ? (
              <button
                type="button"
                className={s.btn}
                onClick={handleNext}
                disabled={
                  busy ||
                  (currentStep === 1 && !canProgressFromStep1) ||
                  (currentStep === 2 && !canProgressFromStep2)
                }
              >
                {currentStep === 2 && !compareEnabled ? "Skip & Continue" : "Next"}
              </button>
            ) : (
              <button className={s.btn} type="submit" disabled={busy}>
                {busy ? "Preparing…" : "Run Analysis"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={s.bar} aria-hidden="true">
        <i id="progress" ref={progRef} />
      </div>
      <div id="status" className={`${s.hint} flex justify-center`}>
        <span>{status}</span>
      </div>
    </form>
  )
}
