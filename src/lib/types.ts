export interface Site {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  google_maps_url: string | null;
  notes: string | null;
  status: 'potential' | 'ruled_out' | 'under_negotiation';
  created_at: string;
  research_data: ResearchData | null;
  research_status: 'pending' | 'running' | 'complete' | 'failed';
  last_researched_at: string | null;
}

export interface Ranking {
  id: string;
  site_id: string;
  user_name: string;
  rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  brand: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  wash_type: string | null;
  verified: boolean;
  status: 'existing' | 'new' | 'upcoming';
  notes: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface SiteTag {
  id: string;
  site_id: string;
  tag_id: string;
  created_at: string;
}

export interface ResearchData {
  property_info: {
    address: string | null;
    legal_description: string | null;
    lot_size_sqft: number | null;
    zoning_code: string | null;
    zoning_description: string | null;
    parcel_id: string | null;
    municipality: string | null;
  } | null;
  sale_history: {
    most_recent_sale_price: string | null;
    most_recent_sale_date: string | null;
    listing_status: string | null;
    listing_price: string | null;
    mls_number: string | null;
    days_on_market: number | null;
  } | null;
  traffic: {
    estimated_daily_count: number | null;
    major_nearby_roads: string | null;
    highway_access: string | null;
    ingress_egress_notes: string | null;
  } | null;
  demographics: {
    population_1km: number | null;
    population_3km: number | null;
    population_5km: number | null;
    avg_household_income: number | null;
    vehicle_ownership_rate: number | null;
    source_year: number | null;
  } | null;
  nearby_competitors: Array<{
    name: string;
    distance_km: number | null;
    type: string | null;
    brand: string | null;
    address: string | null;
  }> | null;
  news_and_notes: Array<{
    headline: string;
    date: string | null;
    summary: string | null;
    url: string | null;
  }> | null;
  flags_and_concerns: string[] | null;
}

export interface SiteWithRankings extends Site {
  rankings: Ranking[];
}
