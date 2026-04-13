'use client';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100 animate-pulse">
      <div className="skeleton h-5 w-3/4 mb-2" />
      <div className="skeleton h-3 w-full mb-3" />
      <div className="flex items-center gap-2">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-4 w-32" />
      </div>
    </div>
  );
}
