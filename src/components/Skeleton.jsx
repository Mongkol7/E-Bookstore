import React from 'react';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-700/50 ${className}`}></div>;
}

export function BookCardSkeleton() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-800/50">
      <Skeleton className="w-full h-40 sm:h-48 rounded-none" />
      <div className="p-4 sm:p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/5" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50">
      <div className="flex gap-3 sm:gap-4 md:gap-6">
        <Skeleton className="w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="relative block rounded-xl p-4 bg-slate-900/50 border border-slate-700/50">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export default Skeleton;
