"use client"
import React, { useMemo, useState } from "react"
import { ComboBox, ComboBoxContent, ComboBoxItem, ComboBoxTrigger, ComboBoxValue } from "@/components/ui/combobox2"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

type ModelOption = { id: string; name: string; username: string }
type ManagerOption = { id: string; name: string; models: ModelOption[] }
type CompareSlot = { managerId: string; modelId: string }

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

  comparisons: CompareSlot[]
  setComparisons: (v: CompareSlot[] | ((prev: CompareSlot[]) => CompareSlot[])) => void

  s: { [key: string]: string }
}

const steps = [
  { id: 1, name: "Select Model" },
  { id: 2, name: "Compare" },
  { id: 3, name: "Review" },
]

const MAX_COMPARISONS = 5

const usernameForSelection = (mgrs: ManagerOption[], mgrId: string, mdlId: string) => {
  if (!mgrId || !mdlId) return ""
  const mgr = mgrs.find(m => m.id === mgrId)
  const mdl = mgr?.models?.find(mm => mm.id === mdlId)
  return (mdl?.username || "").trim()
}

const buildTakenUsernames = (mgrs: ManagerOption[], primaryMgrId: string, primaryModelId: string, comps: CompareSlot[]) => {
  const set = new Set<string>()
  const u1 = usernameForSelection(mgrs, primaryMgrId, primaryModelId)
  if (u1) set.add(u1)
  for (const c of comps) {
    const u = usernameForSelection(mgrs, c.managerId, c.modelId)
    if (u) set.add(u)
  }
  return set
}

export default function Form(props: FormProps) {
  const { onSubmit, progRef, status, busy, managers, managerId, setManagerId, modelId, setModelId, comparisons, setComparisons, s } = props

  const [currentStep, setCurrentStep] = useState(1)

  const mgrA = managers.find(m => m.id === managerId) || null
  const modelsA = mgrA?.models || []
  const selectedModelA = modelsA.find(m => m.id === modelId)

  const addComparison = () => {
    setComparisons((prev) => {
      if (prev.length >= MAX_COMPARISONS) return prev
      return [...prev, { managerId: "", modelId: "" }]
    })
  }

  const removeComparison = (idx: number) => {
    setComparisons((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateComparison = (idx: number, patch: Partial<CompareSlot>) => {
    setComparisons((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c
        return { ...c, ...patch }
      })
    )
  }

  const modelsFor = useMemo(() => {
    const map = new Map<string, ModelOption[]>()
    for (const m of managers) map.set(m.id, m.models || [])
    return map
  }, [managers])

  const takenUsernames = useMemo(
    () => buildTakenUsernames(managers, managerId, modelId, comparisons),
    [managers, managerId, modelId, comparisons]
  )

  const canProgressFromStep1 = !!managerId && !!modelId
  const canProgressFromStep2 = comparisons.length === 0 || comparisons.every(c => !!c.managerId && !!c.modelId)

  const handleNext = () => {
    if (currentStep === 1 && canProgressFromStep1) setCurrentStep(2)
    if (currentStep === 2 && canProgressFromStep2) setCurrentStep(3)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleReset = () => {
    if (typeof window !== "undefined") window.location.reload()
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
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
                      {modelsA
                        .filter(m => {
                          const u = (m.username || "").trim()
                          const selectedU = usernameForSelection(managers, managerId, modelId)
                          if (!u) return true
                          if (u === selectedU) return true
                          return !takenUsernames.has(u)
                        })
                        .map(m => (
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
                  <p className="text-sm text-muted-foreground mb-4">Add up to {MAX_COMPARISONS} comparison models</p>
                </div>

                {comparisons.length === 0 ? (
                  <div className="border border-dashed border-border/60 bg-muted/20 rounded-xl p-8 text-center">
                    <p className="text-muted-foreground mb-4">Add comparison models to view results side by side</p>
                    <button type="button" className={s.btn2} onClick={addComparison} disabled={comparisons.length >= MAX_COMPARISONS}>
                      Add Comparison
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comparisons.map((c, idx) => {
                      const mgr = managers.find(m => m.id === c.managerId) || null
                      const models = c.managerId ? (modelsFor.get(c.managerId) || []) : []
                      return (
                        <div key={idx} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Comparison {idx + 1}</span>
                            <button
                              type="button"
                              className="text-sm text-destructive hover:text-red-500 transition-colors"
                              onClick={() => removeComparison(idx)}
                            >
                              Remove
                            </button>
                          </div>

                          <div>
                            <label htmlFor={`managerB_${idx}`} className="block text-sm font-semibold text-foreground mb-2">
                              Manager
                            </label>
                            <ComboBox
                              value={c.managerId}
                              onValueChange={(v) => {
                                updateComparison(idx, { managerId: v, modelId: "" })
                              }}
                            >
                              <ComboBoxTrigger
                                id={`managerB_${idx}`}
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
                            <label htmlFor={`modelB_${idx}`} className="block text-sm font-semibold text-foreground mb-2">
                              Model
                            </label>
                            <ComboBox
                              value={c.modelId}
                              onValueChange={(v) => updateComparison(idx, { modelId: v })}
                              disabled={!c.managerId}
                            >
                              <ComboBoxTrigger
                                id={`modelB_${idx}`}
                                className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                              >
                                <ComboBoxValue placeholder={c.managerId ? "Select model" : "Select manager first"} />
                              </ComboBoxTrigger>
                              <ComboBoxContent>
                                {models
                                  .filter(m => {
                                    const u = (m.username || "").trim()
                                    const thisSelectedU = usernameForSelection(managers, c.managerId, c.modelId)
                                    if (!u) return true
                                    if (u === thisSelectedU) return true
                                    return !takenUsernames.has(u)
                                  })
                                  .map(m => (
                                    <ComboBoxItem key={m.id} value={m.id}>
                                      {m.name}
                                    </ComboBoxItem>
                                  ))}
                              </ComboBoxContent>
                            </ComboBox>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Selected: {mgr?.name || "—"} → {models.find(m => m.id === c.modelId)?.name || "—"}
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex items-center justify-between pt-2">
                      <button type="button" className={s.btn2} onClick={addComparison} disabled={comparisons.length >= MAX_COMPARISONS}>
                        Add Another
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {comparisons.length}/{MAX_COMPARISONS} comparisons
                      </span>
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

                  {comparisons.length > 0 ? (
                    <div className="space-y-3">
                      {comparisons.map((c, idx) => {
                        const mgr = managers.find(m => m.id === c.managerId)
                        const mdl = mgr?.models?.find(mm => mm.id === c.modelId)
                        return (
                          <div key={idx} className="bg-muted/30 border border-border/60 rounded-xl p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Comparison {idx + 1}</p>
                            <p className="text-foreground font-medium">
                              {mgr?.name || "—"} → {mdl?.name || "—"}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-muted/20 border border-dashed border-border/60 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground italic">No comparison models selected</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="px-6 py-4 bg-muted/30 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button type="button" className={s.btn2} onClick={handleBack} disabled={busy}>
                Back
              </button>
            )}

            <button type="button" className={s.btn3} onClick={handleReset} disabled={busy}>
              Reset
            </button>
          </div>

          <div>
            {currentStep < 3 ? (
              <button
                type="button"
                className={s.btn}
                onClick={handleNext}
                disabled={busy || (currentStep === 1 && !canProgressFromStep1) || (currentStep === 2 && !canProgressFromStep2)}
              >
                {currentStep === 2 && comparisons.length === 0 ? "Skip & Continue" : "Next"}
              </button>
            ) : (
              <button
                className={s.btn}
                type="button"
                disabled={busy}
                onClick={() => onSubmit({ preventDefault() {} } as any)}
              >
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
