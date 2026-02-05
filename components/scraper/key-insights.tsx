"use client";

import React from "react";

interface KeyInsightsProps {
  insights: string[];
  isLoading: boolean;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2" aria-live="polite">
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)" }} />
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)", animationDelay: "0.2s" }} />
    <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: "var(--sidebar-primary)", animationDelay: "0.4s" }} />
    <span className="ml-2 text-muted-foreground">Generating AI Insights...</span>
  </div>
);

const KeyInsights: React.FC<KeyInsightsProps> = ({ insights, isLoading }) => {
  if (isLoading) return <LoadingSpinner />;

  const items = Array.isArray(insights) ? insights.filter(Boolean) : [];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No insights yet.</p>;
  }

  return (
    <ul className="space-y-3 list-disc list-inside text-foreground/90 pb-2">
      {items.map((insight, idx) => (
        <li key={idx} className="pl-2" dangerouslySetInnerHTML={{ __html: insight }} />
      ))}
    </ul>
  );
};

export default KeyInsights;
