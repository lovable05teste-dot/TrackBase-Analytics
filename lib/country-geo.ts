// Países para o mapa de vendas: nome em português, centro aproximado
// (latitude, longitude) e apelidos que os gateways mandam ("Brasil", "Brazil", "BR").
type Country = { name: string; lat: number; lng: number; aliases?: string[] };

export const COUNTRIES: Record<string, Country> = {
  BR: { name: "Brasil", lat: -14.2, lng: -51.9, aliases: ["brasil", "brazil", "bra"] },
  PT: { name: "Portugal", lat: 39.4, lng: -8.2, aliases: ["portugal", "prt"] },
  US: { name: "Estados Unidos", lat: 39.8, lng: -98.6, aliases: ["estados unidos", "united states", "usa", "eua"] },
  AR: { name: "Argentina", lat: -38.4, lng: -63.6, aliases: ["argentina", "arg"] },
  MX: { name: "México", lat: 23.6, lng: -102.5, aliases: ["mexico", "mex"] },
  CO: { name: "Colômbia", lat: 4.6, lng: -74.3, aliases: ["colombia", "col"] },
  CL: { name: "Chile", lat: -35.7, lng: -71.5, aliases: ["chile", "chl"] },
  PE: { name: "Peru", lat: -9.2, lng: -75.0, aliases: ["peru", "per"] },
  UY: { name: "Uruguai", lat: -32.5, lng: -55.8, aliases: ["uruguai", "uruguay", "ury"] },
  PY: { name: "Paraguai", lat: -23.4, lng: -58.4, aliases: ["paraguai", "paraguay", "pry"] },
  BO: { name: "Bolívia", lat: -16.3, lng: -63.6, aliases: ["bolivia", "bol"] },
  EC: { name: "Equador", lat: -1.8, lng: -78.2, aliases: ["equador", "ecuador", "ecu"] },
  VE: { name: "Venezuela", lat: 6.4, lng: -66.6, aliases: ["venezuela", "ven"] },
  GY: { name: "Guiana", lat: 4.9, lng: -58.9, aliases: ["guiana", "guyana"] },
  SR: { name: "Suriname", lat: 3.9, lng: -56.0, aliases: ["suriname"] },
  ES: { name: "Espanha", lat: 40.5, lng: -3.7, aliases: ["espanha", "spain", "espana", "esp"] },
  IT: { name: "Itália", lat: 41.9, lng: 12.6, aliases: ["italia", "italy", "ita"] },
  FR: { name: "França", lat: 46.2, lng: 2.2, aliases: ["franca", "france", "fra"] },
  DE: { name: "Alemanha", lat: 51.2, lng: 10.5, aliases: ["alemanha", "germany", "deutschland", "deu"] },
  GB: { name: "Reino Unido", lat: 55.4, lng: -3.4, aliases: ["reino unido", "united kingdom", "uk", "england", "inglaterra", "gbr"] },
  IE: { name: "Irlanda", lat: 53.4, lng: -8.2, aliases: ["irlanda", "ireland", "irl"] },
  NL: { name: "Holanda", lat: 52.1, lng: 5.3, aliases: ["holanda", "paises baixos", "netherlands", "nld"] },
  BE: { name: "Bélgica", lat: 50.5, lng: 4.5, aliases: ["belgica", "belgium", "bel"] },
  CH: { name: "Suíça", lat: 46.8, lng: 8.2, aliases: ["suica", "switzerland", "che"] },
  AT: { name: "Áustria", lat: 47.5, lng: 14.6, aliases: ["austria", "aut"] },
  LU: { name: "Luxemburgo", lat: 49.8, lng: 6.1, aliases: ["luxemburgo", "luxembourg", "lux"] },
  SE: { name: "Suécia", lat: 60.1, lng: 18.6, aliases: ["suecia", "sweden", "swe"] },
  NO: { name: "Noruega", lat: 60.5, lng: 8.5, aliases: ["noruega", "norway", "nor"] },
  DK: { name: "Dinamarca", lat: 56.3, lng: 9.5, aliases: ["dinamarca", "denmark", "dnk"] },
  PL: { name: "Polônia", lat: 51.9, lng: 19.1, aliases: ["polonia", "poland", "pol"] },
  CA: { name: "Canadá", lat: 56.1, lng: -106.3, aliases: ["canada", "can"] },
  JP: { name: "Japão", lat: 36.2, lng: 138.3, aliases: ["japao", "japan", "jpn"] },
  CN: { name: "China", lat: 35.9, lng: 104.2, aliases: ["china", "chn"] },
  KR: { name: "Coreia do Sul", lat: 35.9, lng: 127.8, aliases: ["coreia do sul", "south korea", "kor"] },
  IN: { name: "Índia", lat: 20.6, lng: 79.0, aliases: ["india", "ind"] },
  AU: { name: "Austrália", lat: -25.3, lng: 133.8, aliases: ["australia", "aus"] },
  NZ: { name: "Nova Zelândia", lat: -40.9, lng: 174.9, aliases: ["nova zelandia", "new zealand", "nzl"] },
  ZA: { name: "África do Sul", lat: -30.6, lng: 22.9, aliases: ["africa do sul", "south africa", "zaf"] },
  AO: { name: "Angola", lat: -11.2, lng: 17.9, aliases: ["angola", "ago"] },
  MZ: { name: "Moçambique", lat: -18.7, lng: 35.5, aliases: ["mocambique", "mozambique", "moz"] },
  CV: { name: "Cabo Verde", lat: 16.0, lng: -24.0, aliases: ["cabo verde", "cape verde", "cpv"] },
  AE: { name: "Emirados Árabes", lat: 23.4, lng: 53.8, aliases: ["emirados arabes", "emirados arabes unidos", "united arab emirates", "uae", "are"] },
  IL: { name: "Israel", lat: 31.0, lng: 34.9, aliases: ["israel", "isr"] },
  TR: { name: "Turquia", lat: 39.0, lng: 35.2, aliases: ["turquia", "turkey", "turkiye", "tur"] },
  RU: { name: "Rússia", lat: 61.5, lng: 105.3, aliases: ["russia", "rus"] },
  PH: { name: "Filipinas", lat: 12.9, lng: 121.8, aliases: ["filipinas", "philippines", "phl"] },
  ID: { name: "Indonésia", lat: -0.8, lng: 113.9, aliases: ["indonesia", "idn"] },
  NG: { name: "Nigéria", lat: 9.1, lng: 8.7, aliases: ["nigeria", "nga"] },
  EG: { name: "Egito", lat: 26.8, lng: 30.8, aliases: ["egito", "egypt", "egy"] },
  MA: { name: "Marrocos", lat: 31.8, lng: -7.1, aliases: ["marrocos", "morocco", "mar"] },
  DO: { name: "República Dominicana", lat: 18.7, lng: -70.2, aliases: ["republica dominicana", "dominican republic", "dom"] },
  CR: { name: "Costa Rica", lat: 9.7, lng: -83.8, aliases: ["costa rica", "cri"] },
  PA: { name: "Panamá", lat: 8.5, lng: -80.8, aliases: ["panama", "pan"] },
  GT: { name: "Guatemala", lat: 15.8, lng: -90.2, aliases: ["guatemala", "gtm"] },
  PR: { name: "Porto Rico", lat: 18.2, lng: -66.6, aliases: ["porto rico", "puerto rico", "pri"] },
};

const strip = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const ALIAS = new Map<string, string>();
for (const [code, c] of Object.entries(COUNTRIES)) {
  ALIAS.set(code.toLowerCase(), code);
  ALIAS.set(strip(c.name), code);
  for (const a of c.aliases ?? []) ALIAS.set(strip(a), code);
}

// "Brasil", "brazil", "BR", "bra" → "BR". Desconhecido → null.
export function countryCode(raw: unknown): string | null {
  const v = strip(String(raw ?? ""));
  if (!v) return null;
  return ALIAS.get(v) ?? null;
}

// Bandeira em emoji a partir do código de 2 letras.
export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
