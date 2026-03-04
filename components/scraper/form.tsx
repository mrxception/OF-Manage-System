"use client"
import React, { useMemo, useState } from "react"
import { ComboBox, ComboBoxContent, ComboBoxItem, ComboBoxTrigger, ComboBoxValue } from "@/components/ui/combobox2"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

type UsernameOption = { id: string; name: string; username: string }
type ManagerOption = { id: string; name: string; usernames: UsernameOption[] }
type CompareSlot = { baseId: string; managerId: string; usernameId: string }

interface FormProps {
  onSubmit: (e: React.FormEvent) => void
  progRef: React.RefObject<HTMLElement | null>
  status: string
  busy: boolean

  baseConfigs: { id: string; name: string }[]
  baseId: string
  setBaseId: (v: string) => void

  managersMap: Record<string, ManagerOption[]>
  managers: ManagerOption[]
  managerId: string
  setManagerId: (v: string) => void
  usernameId: string
  setUsernameId: (v: string) => void

  comparisons: CompareSlot[]
  setComparisons: (v: CompareSlot[] | ((prev: CompareSlot[]) => CompareSlot[])) => void

  s: { [key: string]: string }
}

const steps = [
  { id: 1, name: "Select Username" },
  { id: 2, name: "Compare" },
  { id: 3, name: "Review" },
]

const MAX_COMPARISONS = 5

const usernameForSelection = (mgrsMap: Record<string, ManagerOption[]>, bId: string, mgrId: string, usrId: string) => {
  if (!bId || !mgrId || !usrId) return ""
  const mgr = (mgrsMap[bId] || []).find(m => m.id === mgrId)
  const usr = mgr?.usernames?.find(u => u.id === usrId)
  return (usr?.username || "").trim()
}

const buildTakenUsernames = (mgrsMap: Record<string, ManagerOption[]>, primaryBaseId: string, primaryMgrId: string, primaryUsernameId: string, comps: CompareSlot[]) => {
  const set = new Set<string>()
  const u1 = usernameForSelection(mgrsMap, primaryBaseId, primaryMgrId, primaryUsernameId)
  if (u1) set.add(u1)
  for (const c of comps) {
    const u = usernameForSelection(mgrsMap, c.baseId, c.managerId, c.usernameId)
    if (u) set.add(u)
  }
  return set
}

export default function Form(props: FormProps) {
  const { onSubmit, progRef, status, busy, baseConfigs, baseId, setBaseId, managersMap, managers, managerId, setManagerId, usernameId, setUsernameId, comparisons, setComparisons, s } = props

  const [currentStep, setCurrentStep] = useState(1)

  const mgrA = managers.find(m => m.id === managerId) || null
  const usernamesA = mgrA?.usernames || []
  const selectedUsernameA = usernamesA.find(u => u.id === usernameId)
  const primaryBaseObj = baseConfigs.find(b => b.id === baseId)

  const addComparison = () => {
    setComparisons((prev) => {
      if (prev.length >= MAX_COMPARISONS) return prev
      return [...prev, { baseId: "", managerId: "", usernameId: "" }]
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

  const takenUsernames = useMemo(
    () => buildTakenUsernames(managersMap, baseId, managerId, usernameId, comparisons),
    [managersMap, baseId, managerId, usernameId, comparisons]
  )

  const canProgressFromStep1 = !!baseId && !!managerId && !!usernameId
  const canProgressFromStep2 = comparisons.length === 0 || comparisons.every(c => !!c.baseId && !!c.managerId && !!c.usernameId)

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
                  <h3 className="text-lg font-semibold mb-1">Select Username</h3>
                  <p className="text-sm text-muted-foreground mb-4">Choose a model (base), manager, and username for analysis</p>
                </div>

                <div>
                  <label htmlFor="baseSelect" className="block text-sm font-semibold text-foreground mb-2">
                    Model (Base)
                  </label>
                  <ComboBox value={baseId} onValueChange={setBaseId}>
                    <ComboBoxTrigger
                      id="baseSelect"
                      className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                    >
                      <ComboBoxValue placeholder="Select Model (Base)" />
                    </ComboBoxTrigger>
                    <ComboBoxContent>
                      {baseConfigs.map(b => (
                        <ComboBoxItem key={b.id} value={b.id}>
                          {b.name}
                        </ComboBoxItem>
                      ))}
                    </ComboBoxContent>
                  </ComboBox>
                </div>

                <div>
                  <label htmlFor="managerA" className="block text-sm font-semibold text-foreground mb-2">
                    Manager
                  </label>
                  <ComboBox value={managerId} onValueChange={setManagerId} disabled={!baseId}>
                    <ComboBoxTrigger
                      id="managerA"
                      className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                    >
                      <ComboBoxValue placeholder={baseId ? "Select manager" : "Select model first"} />
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
                  <label htmlFor="usernameA" className="block text-sm font-semibold text-foreground mb-2">
                    Username
                  </label>
                  <ComboBox value={usernameId} onValueChange={setUsernameId} disabled={!managerId}>
                    <ComboBoxTrigger
                      id="usernameA"
                      className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                    >
                      <ComboBoxValue placeholder={managerId ? "Select username" : "Select manager first"} />
                    </ComboBoxTrigger>
                    <ComboBoxContent>
                      {usernamesA
                        .filter(u => {
                          const nameStr = (u.username || "").trim()
                          const selectedU = usernameForSelection(managersMap, baseId, managerId, usernameId)
                          if (!nameStr) return true
                          if (nameStr === selectedU) return true
                          return !takenUsernames.has(nameStr)
                        })
                        .map(u => (
                          <ComboBoxItem key={u.id} value={u.id}>
                            {u.name}
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
                  <h3 className="text-lg font-semibold mb-1">Compare Usernames</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add up to {MAX_COMPARISONS} comparison usernames from any base</p>
                </div>

                {comparisons.length === 0 ? (
                  <div className="border border-dashed border-border/60 bg-muted/20 rounded-xl p-8 text-center">
                    <p className="text-muted-foreground mb-4">Add comparison usernames to view results side by side</p>
                    <button type="button" className={s.btn2} onClick={addComparison} disabled={comparisons.length >= MAX_COMPARISONS}>
                      Add Comparison
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comparisons.map((c, idx) => {
                      const mgrsForComparison = c.baseId ? (managersMap[c.baseId] || []) : []
                      const mgr = mgrsForComparison.find(m => m.id === c.managerId) || null
                      const usernames = c.managerId ? (mgr?.usernames || []) : []

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
                            <label htmlFor={`baseB_${idx}`} className="block text-sm font-semibold text-foreground mb-2">
                              Model (Base)
                            </label>
                            <ComboBox
                              value={c.baseId}
                              onValueChange={(v) => {
                                updateComparison(idx, { baseId: v, managerId: "", usernameId: "" })
                              }}
                            >
                              <ComboBoxTrigger
                                id={`baseB_${idx}`}
                                className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                              >
                                <ComboBoxValue placeholder="Select Model (Base)" />
                              </ComboBoxTrigger>
                              <ComboBoxContent>
                                {baseConfigs.map(b => (
                                  <ComboBoxItem key={b.id} value={b.id}>
                                    {b.name}
                                  </ComboBoxItem>
                                ))}
                              </ComboBoxContent>
                            </ComboBox>
                          </div>

                          <div>
                            <label htmlFor={`managerB_${idx}`} className="block text-sm font-semibold text-foreground mb-2">
                              Manager
                            </label>
                            <ComboBox
                              value={c.managerId}
                              onValueChange={(v) => {
                                updateComparison(idx, { managerId: v, usernameId: "" })
                              }}
                              disabled={!c.baseId}
                            >
                              <ComboBoxTrigger
                                id={`managerB_${idx}`}
                                className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                              >
                                <ComboBoxValue placeholder={c.baseId ? "Select manager" : "Select base first"} />
                              </ComboBoxTrigger>
                              <ComboBoxContent>
                                {mgrsForComparison.map(m => (
                                  <ComboBoxItem key={m.id} value={m.id}>
                                    {m.name}
                                  </ComboBoxItem>
                                ))}
                              </ComboBoxContent>
                            </ComboBox>
                          </div>

                          <div>
                            <label htmlFor={`usernameB_${idx}`} className="block text-sm font-semibold text-foreground mb-2">
                              Username
                            </label>
                            <ComboBox
                              value={c.usernameId}
                              onValueChange={(v) => updateComparison(idx, { usernameId: v })}
                              disabled={!c.managerId}
                            >
                              <ComboBoxTrigger
                                id={`usernameB_${idx}`}
                                className={`${s.csvinput} bg-background/40 border-border/60 focus:ring-2 focus:ring-primary/20`}
                              >
                                <ComboBoxValue placeholder={c.managerId ? "Select username" : "Select manager first"} />
                              </ComboBoxTrigger>
                              <ComboBoxContent>
                                {usernames
                                  .filter(u => {
                                    const nameStr = (u.username || "").trim()
                                    const thisSelectedU = usernameForSelection(managersMap, c.baseId, c.managerId, c.usernameId)
                                    if (!nameStr) return true
                                    if (nameStr === thisSelectedU) return true
                                    return !takenUsernames.has(nameStr)
                                  })
                                  .map(u => (
                                    <ComboBoxItem key={u.id} value={u.id}>
                                      {u.name}
                                    </ComboBoxItem>
                                  ))}
                              </ComboBoxContent>
                            </ComboBox>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Selected: {baseConfigs.find(b => b.id === c.baseId)?.name || "—"} → {mgr?.name || "—"} → {usernames.find(u => u.id === c.usernameId)?.name || "—"}
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
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Primary Username</p>
                    <p className="text-foreground font-medium">
                      {primaryBaseObj?.name || "—"} → {mgrA?.name || "—"} → {selectedUsernameA?.name || "—"}
                    </p>
                  </div>

                  {comparisons.length > 0 ? (
                    <div className="space-y-3">
                      {comparisons.map((c, idx) => {
                        const cBase = baseConfigs.find(b => b.id === c.baseId)
                        const cMgr = managersMap[c.baseId]?.find(m => m.id === c.managerId)
                        const cUsr = cMgr?.usernames?.find(u => u.id === c.usernameId)
                        return (
                          <div key={idx} className="bg-muted/30 border border-border/60 rounded-xl p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Comparison {idx + 1}</p>
                            <p className="text-foreground font-medium">
                              {cBase?.name || "—"} → {cMgr?.name || "—"} → {cUsr?.name || "—"}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-muted/20 border border-dashed border-border/60 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground italic">No comparison usernames selected</p>
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