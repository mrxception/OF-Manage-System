"use client";

import React, { useEffect, useState } from "react";
import KeyInsights from "./key-insights";

interface Props {
  rows: any[];
}

export default function KeyInsightsSection({ rows, onInsights  }: { rows: any[]; onInsights?: (v: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function generateInsights() {
    if (!rows || rows.length === 0) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "insights", data: rows }),
      });
      const json = await res.json();
      setInsights(Array.isArray(json?.insights) ? json.insights : []);
      onInsights?.(Array.isArray(json?.insights) ? json.insights : [])
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      setInsights(["Failed to generate insights. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (rows && rows.length > 0) generateInsights();
  }, [rows]);

  if (!rows || rows.length === 0) return null

  return (
    <div id="key-insights-section" className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="insights-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: "var(--sidebar-primary)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3>Key Insights</h3>
        </div>

        <svg
          className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </header>

      {isOpen && (
        <div id="insights-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4 space-y-4">
            <KeyInsights insights={insights} isLoading={isLoading} />
            <div className="flex justify-end">
                {/* 
              <button
                onClick={generateInsights}
                disabled={isLoading}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  isLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:opacity-90"
                }`}
                style={{
                  background: "var(--sidebar-primary)",
                  color: "var(--sidebar-primary-foreground)",
                }}
              >
                {isLoading ? "Generating..." : "Regenerate Insights"}
              </button>
              */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
