import React from "react";

export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-2 p-2 select-none animate-pulse">
      {/* Skeleton Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <div className="h-5 w-40 bg-slate-200 rounded"></div>
        <div className="h-4 w-28 bg-slate-100 rounded"></div>
      </div>

      {/* Skeleton Filter Card */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="h-6 bg-slate-100 rounded"></div>
          <div className="h-6 bg-slate-100 rounded"></div>
          <div className="h-6 bg-slate-100 rounded"></div>
          <div className="h-6 bg-slate-100 rounded"></div>
        </div>
      </div>

      {/* Skeleton Toolbar */}
      <div className="flex items-center gap-1.5 py-0.5">
        <div className="h-6 w-28 bg-slate-200/80 rounded"></div>
        <div className="h-6 w-16 bg-slate-200/70 rounded"></div>
        <div className="h-6 w-16 bg-slate-200/70 rounded"></div>
      </div>

      {/* Skeleton Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 overflow-hidden p-2 flex flex-col gap-2">
        <div className="h-7 bg-slate-100 rounded w-full"></div>
        <div className="h-6 bg-slate-50 rounded w-full"></div>
        <div className="h-6 bg-slate-50/70 rounded w-full"></div>
        <div className="h-6 bg-slate-50/50 rounded w-full"></div>
        <div className="h-6 bg-slate-50/30 rounded w-full"></div>
      </div>
    </div>
  );
}
