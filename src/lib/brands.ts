export interface Brand {
  key: string;
  name: string;
  color: string;
  acronym: string;
}

export const BRANDS: Record<string, Brand> = {
  gww: { key: 'gww', name: 'Great White Wash', color: '#1E3A5F', acronym: 'GWW' },
  mnt: { key: 'mnt', name: 'Mint Smartwash', color: '#16A34A', acronym: 'MNT' },
  coop: { key: 'coop', name: 'Calgary Co-op', color: '#0033A0', acronym: 'COP' },
  bub: { key: 'bub', name: 'Bubbles Car Wash', color: '#EC4899', acronym: 'BUB' },
  mrb: { key: 'mrb', name: 'Mr. Bubbles Carwash', color: '#9333EA', acronym: 'MRB' },
  ess: { key: 'ess', name: 'Esso', color: '#1D4ED8', acronym: 'ESS' },
  pca: { key: 'pca', name: 'Petro-Canada', color: '#E31837', acronym: 'PCA' },
  shl: { key: 'shl', name: 'Shell', color: '#EAB308', acronym: 'SHL' },
  sup: { key: 'sup', name: 'Supersuds', color: '#F97316', acronym: 'SUP' },
  wav: { key: 'wav', name: 'Wave Express Wash', color: '#00AEEF', acronym: 'WAV' },
  mrx: { key: 'mrx', name: 'Mr. Express Car Wash', color: '#7C3AED', acronym: 'MRX' },
  glo: { key: 'glo', name: 'Glow Auto Wash', color: '#F59E0B', acronym: 'GLO' },
  ult: { key: 'ult', name: 'Ultra Car Wash', color: '#0EA5E9', acronym: 'ULT' },
  blu: { key: 'blu', name: 'Bluewave Car Wash', color: '#3B82F6', acronym: 'BLU' },
  ind: { key: 'ind', name: 'Independent', color: '#6B7280', acronym: 'IND' },
  oth: { key: 'oth', name: 'Other', color: '#9CA3AF', acronym: 'OTH' },
};

export const BRAND_KEYS = Object.keys(BRANDS);

export function getBrand(key: string): Brand {
  return BRANDS[key] || BRANDS.oth;
}
