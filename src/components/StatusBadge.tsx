'use client';

const STATUS_CONFIG = {
  potential: { label: 'Potential', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  ruled_out: { label: 'Ruled Out', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-500' },
  under_negotiation: { label: 'Under Negotiation', bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
} as const;

interface StatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} rounded-full font-medium ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
