import React from 'react';

function ProcessingOverlay({
  show,
  title = 'Processing your order',
  message = 'Please wait while we confirm payment and finalize your purchase.',
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-300/40 border-t-emerald-400" />
        </div>
        <h3 className="text-center text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-center text-sm text-slate-300">{message}</p>
        <div className="mt-5 grid gap-2 text-xs text-slate-400">
          <div className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2">
            Securing checkout session
          </div>
          <div className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2">
            Creating order and reservation
          </div>
          <div className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2">
            Finalizing confirmation
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingOverlay;

