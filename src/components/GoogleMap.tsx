'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { CALGARY_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { getBrand } from '@/lib/brands';
import { getUserRank } from '@/hooks/useSupabaseRealtime';
import type { Site, Ranking, Competitor } from '@/lib/types';

interface GoogleMapProps {
  sites: Site[];
  rankings: Ranking[];
  competitors: Competitor[];
  visibleBrands: Set<string>;
  showCompetitors: boolean;
  clickToAddMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onSiteClick: (site: Site) => void;
  onCompetitorClick: (competitor: Competitor) => void;
  filteredSiteIds?: Set<string> | null;
}

function getSitePinColor(site: Site, rankings: Ranking[]): string {
  if (site.status === 'ruled_out') return '#6B7280';
  if (site.status === 'under_negotiation') return '#EA580C';
  const hasRanking = rankings.some(r => r.site_id === site.id && r.rank !== null);
  return hasRanking ? '#CC0000' : '#F59E0B';
}

export default function GoogleMap({
  sites,
  rankings,
  competitors,
  visibleBrands,
  showCompetitors,
  clickToAddMode,
  onMapClick,
  onSiteClick,
  onCompetitorClick,
  filteredSiteIds,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const siteMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const competitorMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    setOptions({
      key: apiKey,
      v: 'weekly',
      libraries: ['places', 'marker', 'geocoding'],
    });

    const init = async () => {
      await importLibrary('maps');
      await importLibrary('marker');

      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: CALGARY_CENTER,
        zoom: DEFAULT_ZOOM,
        mapId: 'stampede-wash-map',
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: ['roadmap', 'hybrid'],
        },
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      setMapLoaded(true);
    };

    init();
  }, []);

  // Handle click-to-add mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (clickToAddMode) {
      map.setOptions({ draggableCursor: 'crosshair' });
      const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
      return () => google.maps.event.removeListener(listener);
    } else {
      map.setOptions({ draggableCursor: '' });
    }
  }, [clickToAddMode, onMapClick, mapLoaded]);

  // Update site markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear old markers
    siteMarkersRef.current.forEach(m => (m.map = null));
    siteMarkersRef.current = [];

    const visibleSites = filteredSiteIds
      ? sites.filter(s => filteredSiteIds.has(s.id))
      : sites;

    visibleSites.forEach(site => {
      const color = getSitePinColor(site, rankings);

      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer; transition: transform 0.2s;
      `;
      pinEl.addEventListener('mouseenter', () => { pinEl.style.transform = 'scale(1.2)'; });
      pinEl.addEventListener('mouseleave', () => { pinEl.style.transform = 'scale(1)'; });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: site.lat, lng: site.lng },
        map: mapInstanceRef.current!,
        content: pinEl,
        title: site.name,
        zIndex: 10,
      });

      marker.addListener('click', () => {
        onSiteClick(site);

        const derekRank = getUserRank(rankings, site.id, 'Derek');
        const chadRank = getUserRank(rankings, site.id, 'Chad');

        const statusLabel = site.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        infoWindowRef.current?.setContent(`
          <div style="padding: 12px; font-family: Inter, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #0A0A0A;">${site.name}</h3>
            <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280;">${site.address || 'No address'}</p>
            <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px;">
              <span><strong>Derek:</strong> ${derekRank ? '#' + derekRank : '—'}</span>
              <span><strong>Chad:</strong> ${chadRank ? '#' + chadRank : '—'}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${color}20; color: ${color};">${statusLabel}</span>
            </div>
            <a href="/site/${site.id}" style="color: #CC0000; font-size: 13px; font-weight: 600; text-decoration: none;">View Details →</a>
          </div>
        `);
        infoWindowRef.current?.open(mapInstanceRef.current!, marker);
      });

      siteMarkersRef.current.push(marker);
    });
  }, [sites, rankings, mapLoaded, filteredSiteIds, onSiteClick]);

  // Update competitor markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    competitorMarkersRef.current.forEach(m => (m.map = null));
    competitorMarkersRef.current = [];

    if (!showCompetitors) return;

    competitors
      .filter(c => c.lat && c.lng && visibleBrands.has(c.brand))
      .forEach(comp => {
        const brand = getBrand(comp.brand);

        const pinEl = document.createElement('div');
        pinEl.style.cssText = `
          width: 26px; height: 26px; border-radius: 50%;
          background: ${brand.color}; border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 0.2s;
          font-size: 7px; font-weight: 800; color: white;
          font-family: Inter, sans-serif; letter-spacing: 0.5px;
        `;
        pinEl.textContent = brand.acronym;
        pinEl.addEventListener('mouseenter', () => { pinEl.style.transform = 'scale(1.2)'; });
        pinEl.addEventListener('mouseleave', () => { pinEl.style.transform = 'scale(1)'; });

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: comp.lat!, lng: comp.lng! },
          map: mapInstanceRef.current!,
          content: pinEl,
          title: comp.name,
          zIndex: 5,
        });

        marker.addListener('click', () => {
          onCompetitorClick(comp);

          const washLabel = (comp.wash_type || 'unknown').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          infoWindowRef.current?.setContent(`
            <div style="padding: 12px; font-family: Inter, sans-serif; min-width: 180px;">
              <h3 style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #0A0A0A;">${comp.name}</h3>
              <p style="margin: 0 0 6px; font-size: 12px; color: ${brand.color}; font-weight: 600;">${brand.name}</p>
              <p style="margin: 0 0 6px; font-size: 12px; color: #6B7280;">${comp.address || 'No address'} · ${comp.city || ''}</p>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #F3F4F6; color: #374151;">${washLabel}</span>
            </div>
          `);
          infoWindowRef.current?.open(mapInstanceRef.current!, marker);
        });

        competitorMarkersRef.current.push(marker);
      });
  }, [competitors, showCompetitors, visibleBrands, mapLoaded, onCompetitorClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {clickToAddMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-stampede-red text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold z-10 animate-pulse">
          Click on the map to add a site
        </div>
      )}
    </div>
  );
}
