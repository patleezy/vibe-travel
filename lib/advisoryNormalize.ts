const ALIASES: Record<string, string> = {
  'south korea': 'korea, south',
  'north korea': 'korea, north',
  'czech republic': 'czechia',
  'ivory coast': "cote d'ivoire",
  'taiwan': 'taiwan',
  'russia': 'russia',
  'united states': 'united states of america',
  'united states of america': 'united states of america',
  'usa': 'united states of america',
  'uk': 'united kingdom',
  'britain': 'united kingdom',
  'great britain': 'united kingdom',
  'england': 'united kingdom',
  'syria': 'syria',
  'myanmar': 'burma (myanmar)',
  'burma': 'burma (myanmar)',
  'vietnam': 'vietnam',
  'viet nam': 'vietnam',
  'laos': "laos (lao people's democratic republic)",
  'cape verde': 'cabo verde',
  'swaziland': 'eswatini',
  'macedonia': 'north macedonia',
  'palestine': 'west bank and gaza',
  'gaza': 'west bank and gaza',
  'west bank': 'west bank and gaza',
  'congo': 'congo, republic of the',
  'democratic republic of the congo': 'congo, democratic republic of the',
  'drc': 'congo, democratic republic of the',
  'trinidad': 'trinidad and tobago',
  'saint kitts': 'saint kitts and nevis',
  'saint vincent': 'saint vincent and the grenadines',
  'antigua': 'antigua and barbuda',
};

export function normalizeCountry(name: string): string {
  const lower = name.toLowerCase().trim();
  return ALIASES[lower] ?? lower;
}
