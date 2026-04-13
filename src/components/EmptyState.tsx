'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function EmptyState() {
  const [seeding, setSeeding] = useState(false);
  const [seedingCompetitors, setSeedingCompetitors] = useState(false);

  const handleSeedSites = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed sites');
      toast.success(`Seeded ${data.count} sites`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedCompetitors = async () => {
    setSeedingCompetitors(true);
    try {
      const res = await fetch('/api/seed-competitors', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed competitors');
      toast.success(`Seeded ${data.count} competitor locations`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSeedingCompetitors(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 bg-stampede-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white font-extrabold text-2xl">SW</span>
        </div>
        <h2 className="text-2xl font-bold text-stampede-black mb-2">Stampede Wash</h2>
        <p className="text-gray-500 mb-8">
          No sites added yet. Get started by seeding your initial sites or adding one manually.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleSeedSites}
            disabled={seeding}
            className="px-6 py-3 bg-stampede-red text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-md"
          >
            {seeding ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Seeding Sites...
              </span>
            ) : (
              '🌱 Seed Initial Sites'
            )}
          </button>
          <button
            onClick={handleSeedCompetitors}
            disabled={seedingCompetitors}
            className="px-6 py-3 bg-stampede-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-md"
          >
            {seedingCompetitors ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Seeding...
              </span>
            ) : (
              '🏁 Seed Competitor Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
