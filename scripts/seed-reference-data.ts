/**
 * Seed reference data into Supabase for Rule 107 DV calculator.
 *
 * Usage:   npx tsx scripts/seed-reference-data.ts
 * Env:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)
 *
 * Sources:
 *   - Cost factors: Office Manual Jan 2026, Exhibit III (p. 67), 1956-2025
 *   - Salvage quarters: user's factors tab + public AAR quarterly bulletins,
 *     2020Q1 through 2026Q2
 *   - Car dep rates: Exhibit IV (p. 68) + Exhibit II age cutoffs (p. 66)
 *   - A&B codes: Exhibit V (p. 69) full 2026 table
 */
import { createClient } from "@supabase/supabase-js";

const url  = process.env.SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
if (!url || !key) throw new Error("SUPABASE_URL and an auth key required");

const sb = createClient(url, key);

// ---------------------------------------------------------------------------
// Exhibit III — Cost Factor Chart
// ---------------------------------------------------------------------------
const COST_FACTORS: Array<[number, number]> = [
  [1956, 19], [1957, 21], [1958, 22], [1959, 22], [1960, 24],
  [1961, 23], [1962, 24], [1963, 24], [1964, 26], [1965, 28],
  [1966, 28], [1967, 27], [1968, 27], [1969, 28], [1970, 31],
  [1971, 31], [1972, 35], [1973, 35], [1974, 40], [1975, 51],
  [1976, 54], [1977, 66], [1978, 74], [1979, 87], [1980, 100],
  [1981, 99], [1982, 97], [1983, 100], [1984, 88], [1985, 88],
  [1986, 100], [1987, 100], [1988, 98], [1989, 101], [1990, 101],
  [1991, 105], [1992, 100], [1993, 103], [1994, 109], [1995, 117],
  [1996, 122], [1997, 120], [1998, 121], [1999, 120], [2000, 120],
  [2001, 121], [2002, 120], [2003, 123], [2004, 134], [2005, 155],
  [2006, 166], [2007, 178], [2008, 183], [2009, 182], [2010, 187],
  [2011, 189], [2012, 195], [2013, 202], [2014, 201], [2015, 209],
  [2016, 209], [2017, 203], [2018, 201], [2019, 201], [2020, 201],
  [2021, 201], [2022, 201], [2023, 277], [2024, 298], [2025, 309],
];

// ---------------------------------------------------------------------------
// Salvage quarters — from user's factors tab (cols D-G + I for 4488)
// Columns: quarter_code, steel($/lb, JC 4244), aluminum($/lb, JC 4236),
//          dismantling($/gt, JC 4489), loading (spare), misc
// ---------------------------------------------------------------------------
const SALVAGE_QUARTERS: Array<{
  qc: number; steel: number; al: number; dm: number; loading?: number | null; misc?: number | null;
}> = [
  { qc: 20041, steel: 0.06, al: 0.42, dm: 140.76, loading: 1000, misc: 698.74 },
  { qc: 20042, steel: 0.07, al: 0.39, dm: 140.03, loading: 1000, misc: 695.14 },
  { qc: 20043, steel: 0.09, al: 0.41, dm: 143.37, loading: 1000, misc: 711.70 },
  { qc: 20044, steel: 0.09, al: 0.37, dm: 140.55, loading: 1000, misc: 697.71 },
  { qc: 20051, steel: 0.11, al: 0.38, dm: 141.28, loading: 1000, misc: 701.32 },
  { qc: 20052, steel: 0.11, al: 0.38, dm: 141.28, loading: 1000, misc: 701.32 },
  { qc: 20053, steel: 0.08, al: 0.41, dm: 142.09, loading: 1000, misc: 705.35 },
  { qc: 20054, steel: 0.07, al: 0.38, dm: 143.56, loading: 1000, misc: 712.65 },
  { qc: 20061, steel: 0.08, al: 0.42, dm: 145.22, loading: 1000, misc: 720.89 },
  { qc: 20062, steel: 0.08, al: 0.44, dm: 145.20, loading: 1000, misc: 720.80 },
  { qc: 20063, steel: 0.09, al: 0.73, dm: 145.29, loading: 1000, misc: 721.23 },
  { qc: 20064, steel: 0.09, al: 0.74, dm: 145.74, loading: 1000, misc: 723.46 },
  { qc: 20071, steel: 0.10, al: 0.74, dm: 147.78, loading: 1000, misc: 733.59 },
  { qc: 20072, steel: 0.12, al: 0.74, dm: 148.02, loading: 1000, misc: 734.79 },
  { qc: 20073, steel: 0.13, al: 0.74, dm: 148.49, loading: 1000, misc: 737.11 },
  { qc: 20074, steel: 0.13, al: 0.74, dm: 150.58, loading: 1000, misc: 747.49 },
  { qc: 20081, steel: 0.15, al: 0.74, dm: 163.70, loading: 1000, misc: 812.64 },
  { qc: 20082, steel: 0.15, al: 0.74, dm: 163.93, loading: 1000, misc: 813.75 },
  { qc: 20083, steel: 0.17, al: 0.74, dm: 169.01, loading: 1000, misc: 838.99 },
  { qc: 20084, steel: 0.18, al: 0.83, dm: 165.53, loading: 1000, misc: 821.74 },
  { qc: 20091, steel: 0.04, al: 0.67, dm: 162.65, loading: 1000, misc: 807.40 },
  { qc: 20092, steel: 0.04, al: 0.44, dm: 162.51, loading: 1000, misc: 806.72 },
  { qc: 20093, steel: 0.05, al: 0.30, dm: 168.46, loading: 1000, misc: 836.24 },
  { qc: 20094, steel: 0.06, al: 0.24, dm: 169.51, loading: 1000, misc: 841.48 },
  { qc: 20101, steel: 0.08, al: 0.26, dm: 177.74, loading: 1000, misc: 882.33 },
  { qc: 20102, steel: 0.09, al: 0.28, dm: 177.74, loading: 1000, misc: 882.33 },
  { qc: 20103, steel: 0.11, al: 0.38, dm: 177.74, loading: 1000, misc: 835.04 },
  { qc: 20104, steel: 0.11, al: 0.44, dm: 180.09, loading: 1000, misc: 846.09 },
  { qc: 20111, steel: 0.12, al: 0.48, dm: 184.10, loading: 1000, misc: 864.94 },
  { qc: 20112, steel: 0.13, al: 0.57, dm: 184.10, loading: 1000, misc: 864.94 },
  { qc: 20113, steel: 0.16, al: 0.64, dm: 184.14, loading: 1000, misc: 865.10 },
  { qc: 20114, steel: 0.15, al: 0.68, dm: 183.26, loading: 1000, misc: 860.96 },
  { qc: 20121, steel: 0.18, al: 0.69, dm: 185.45, loading: 1000, misc: 871.27 },
  { qc: 20122, steel: 0.19, al: 0.64, dm: 200.67, loading: 1000, misc: 942.76 },
  { qc: 20123, steel: 0.19, al: 0.74, dm: 204.78, loading: 1000, misc: 962.09 },
  { qc: 20124, steel: 0.16, al: 0.65, dm: 200.51, loading: 1000, misc: 942.02 },
  { qc: 20131, steel: 0.13, al: 0.53, dm: 200.53, loading: 1000, misc: 942.11 },
  { qc: 20132, steel: 0.13, al: 0.52, dm: 192.90, loading: 1000, misc: 902.95 },
  { qc: 20133, steel: 0.13, al: 0.51, dm: 197.68, loading: 1000, misc: 928.70 },
  { qc: 20134, steel: 0.11, al: 0.50, dm: 191.47, loading: 1000, misc: 899.54 },
  { qc: 20141, steel: 0.16, al: 0.54, dm: 191.71, loading: 1000, misc: 900.68 },
  { qc: 20142, steel: 0.17, al: 0.46, dm: 191.56, loading: 1000, misc: 899.95 },
  { qc: 20143, steel: 0.18, al: 0.52, dm: 197.61, loading: 1000, misc: 928.38 },
  { qc: 20144, steel: 0.15, al: 0.50, dm: 198.61, loading: 1000, misc: 933.09 },
  { qc: 20151, steel: 0.16, al: 0.57, dm: 206.86, loading: 1000, misc: 971.84 },
  { qc: 20152, steel: 0.14, al: 0.55, dm: 206.86, loading: 1000, misc: 971.84 },
  { qc: 20153, steel: 0.10, al: 0.49, dm: 206.86, loading: 1000, misc: 971.84 },
  { qc: 20154, steel: 0.11, al: 0.45, dm: 208.41, loading: 1000, misc: 979.15 },
  { qc: 20161, steel: 0.07, al: 0.48, dm: 214.26, loading: 1000, misc: 1006.60 },
  { qc: 20162, steel: 0.05, al: 0.46, dm: 214.26, loading: 1000, misc: 1006.60 },
  { qc: 20163, steel: 0.07, al: 0.47, dm: 213.74, loading: 1000, misc: 1004.17 },
  { qc: 20164, steel: 0.07, al: 0.51, dm: 217.08, loading: 1000, misc: 1019.84 },
  { qc: 20171, steel: 0.06, al: 0.52, dm: 224.32, loading: 1000, misc: 1053.88 },
  { qc: 20172, steel: 0.13, al: 0.55, dm: 224.32, loading: 1000, misc: 1053.88 },
  { qc: 20173, steel: 0.13, al: 0.55, dm: 224.36, loading: 1000, misc: 1054.04 },
  { qc: 20174, steel: 0.13, al: 0.54, dm: 223.01, loading: 1000, misc: 1047.70 },
  { qc: 20181, steel: 0.14, al: 0.57, dm: 220.08, loading: 1000, misc: 1033.98 },
  { qc: 20182, steel: 0.15, al: 0.56, dm: 235.75, loading: 1000, misc: 1107.57 },
  { qc: 20183, steel: 0.16, al: 0.57, dm: 240.37, loading: 1000, misc: 1129.26 },
  { qc: 20184, steel: 0.17, al: 0.56, dm: 241.26, loading: 1000, misc: 1133.48 },
  { qc: 20191, steel: 0.16, al: 0.50, dm: 243.50, loading: 1000, misc: 1143.96 },
  { qc: 20192, steel: 0.16, al: 0.43, dm: 234.73, loading: 1000, misc: 1102.78 },
  { qc: 20193, steel: 0.15, al: 0.44, dm: 241.02, loading: 1000, misc: 1132.35 },
  { qc: 20194, steel: 0.13, al: 0.37, dm: 243.60, loading: 1000, misc: 1144.45 },
  { qc: 20201, steel: 0.11, al: 0.31, dm: 244.20, loading: 1000, misc: 1147.29 },
  { qc: 20202, steel: 0.11, al: 0.29, dm: 244.17, loading: 1000, misc: 1147.13 },
  { qc: 20203, steel: 0.12, al: 0.37, dm: 243.79, loading: 1000, misc: 1145.34 },
  { qc: 20204, steel: 0.11, al: 0.32, dm: 238.69, loading: 1000, misc: 1121.38 },
  { qc: 20211, steel: 0.12, al: 0.33, dm: 225.91, loading: 1000, misc: 1061.35 },
  { qc: 20212, steel: 0.16, al: 0.40, dm: 225.88, loading: 1000, misc: 1061.19 },
  { qc: 20213, steel: 0.18, al: 0.49, dm: 226.21, loading: 1000, misc: 1062.73 },
  { qc: 20214, steel: 0.20, al: 0.56, dm: 227.76, loading: 1000, misc: 1070.04 },
  { qc: 20221, steel: 0.19, al: 0.59, dm: 258.09 },
  { qc: 20222, steel: 0.20, al: 0.67, dm: 258.09 },
  { qc: 20223, steel: 0.22, al: 0.58, dm: 258.09 },
  { qc: 20224, steel: 0.19, al: 0.60, dm: 258.21 },
  { qc: 20231, steel: 0.17, al: 0.51, dm: 323.32 },
  { qc: 20232, steel: 0.16, al: 0.50, dm: 324.31 },
  { qc: 20233, steel: 0.17, al: 0.55, dm: 355.82 },
  { qc: 20234, steel: 0.16, al: 0.51, dm: 326.00 },
  { qc: 20241, steel: 0.15, al: 0.48, dm: 279.53 },
  { qc: 20242, steel: 0.17, al: 0.54, dm: 279.53 },
  { qc: 20243, steel: 0.16, al: 0.59, dm: 287.91 },
  { qc: 20244, steel: 0.15, al: 0.63, dm: 297.34 },
  { qc: 20251, steel: 0.15, al: 0.61, dm: 295.33 },
  { qc: 20252, steel: 0.15, al: 0.62, dm: 295.33 },
  { qc: 20253, steel: 0.16, al: 0.66, dm: 300.48 },
  { qc: 20254, steel: 0.15, al: 0.65, dm: 297.85 },
  { qc: 20261, steel: 0.14, al: 0.71, dm: 301.00 },
  { qc: 20262, steel: 0.15, al: 0.75, dm: 301.80 },
];

// ---------------------------------------------------------------------------
// Exhibit IV — Car depreciation rates, with Exhibit II age cutoffs bolted on
// ---------------------------------------------------------------------------
const CAR_RATES = [
  {
    equipment_type:    "TANK_COATED_OR_NONCORROSIVE_PRE_1974",
    display_name:      "Tank Cars w/ Internal Protective Coating or Lining, and Non-Corrosive Service Built Pre-July 1974 & Cabooses",
    annual_rate:       0.030,
    max_depreciation:  0.90,
    age_cutoff_years:  35,
    notes:             "Exhibit IV p.68, Exhibit II p.66",
  },
  {
    equipment_type:    "TANK_UNCOATED_CORROSIVE",
    display_name:      "Tank Cars Without Internal Coating, in Corrosive Service",
    annual_rate:       0.045,
    max_depreciation:  0.90,
    age_cutoff_years:  25,
    notes:             "Exhibit IV p.68, Exhibit II p.66",
  },
  {
    equipment_type:    "OTHER_PRE_1974",
    display_name:      "All Other Cars Built Prior to July 1, 1974",
    annual_rate:       0.036,
    max_depreciation:  0.90,
    age_cutoff_years:  30,
    notes:             "Exhibit IV p.68, Exhibit II p.66",
  },
  {
    equipment_type:    "MODERN_OR_ILS",
    display_name:      "All Cars Built July 1, 1974 or Later, or Approved for ILS (Extended Service)",
    annual_rate:       0.0225,
    max_depreciation:  0.90,
    age_cutoff_years:  45,
    notes:             "Exhibit IV p.68, Exhibit II p.66 — the default for modern fleet.",
  },
  {
    equipment_type:    "RACK_PRE_2016",
    display_name:      "Multi-Deck Rack on Flatcars (Auto), Built Pre-1/1/2016",
    annual_rate:       0.050,
    max_depreciation:  0.90,
    age_cutoff_years:  18,
    notes:             "Exhibit IV p.68, Exhibit II p.66",
  },
  {
    equipment_type:    "RACK_POST_2016",
    display_name:      "Multi-Deck Rack on Flatcars (Auto), Built On/After 1/1/2016",
    annual_rate:       0.0333,
    max_depreciation:  0.90,
    age_cutoff_years:  27,
    notes:             "Exhibit IV p.68, Exhibit II p.66",
  },
];

// ---------------------------------------------------------------------------
// Exhibit V — A&B codes (Jan 2026)
// ---------------------------------------------------------------------------
const AB_CODES = [
  { code: "GNRL",   rate_basis: "ANNUAL",      rate: 0.0225, max_depreciation: 0.90, description: "General — capitalized A&Bs that don't qualify as an exception. Same rate as for car, from install date." },
  { code: "INIT",   rate_basis: "SAME_AS_CAR", rate: 0.0225, max_depreciation: 0.90, description: "Capitalized — initial load of historical A&B amounts as of UMLER 4.6 implementation. Rate follows car, from car's build/rebuilt/ILS date." },
  { code: "ABES",   rate_basis: "ANNUAL",      rate: 0.20,   max_depreciation: 1.00, description: "Automated ballast car electronic control system — 20%/yr from install." },
  { code: "ABHS",   rate_basis: "ANNUAL",      rate: 0.1429, max_depreciation: 1.00, description: "Automated ballast car hydraulic system — 14.29%/yr from install." },
  { code: "COIL",   rate_basis: "SAME_AS_CAR", rate: 0.0225, max_depreciation: 1.00, description: "Exterior heater coils on tank. Same rate as for car, from car build/rebuilt." },
  { code: "CONT",   rate_basis: "ANNUAL",      rate: 0.07,   max_depreciation: 0.90, description: "Containers (metal, rubber, or combination) — 7%/yr from car build/rebuilt." },
  { code: "FLLD",   rate_basis: "ANNUAL",      rate: 0.08,   max_depreciation: 0.90, description: "Other permanently installed loading equipment on flats — 8%/yr from install." },
  { code: "IHTR",   rate_basis: "ANNUAL",      rate: 0.06,   max_depreciation: 0.90, description: "In-transit heater — 6%/yr from install." },
  { code: "JTHR",   rate_basis: "SAME_AS_CAR", rate: 0.0225, max_depreciation: 0.90, description: "Jacketed thermal shield w/ integral headshield. Same rate as for car, from install." },
  { code: "LOLI",   rate_basis: "MONTHLY",     rate: 0.02,   max_depreciation: 1.00, description: "Protective coating inside LO covered hopper — 2%/month from install." },
  { code: "NTHR",   rate_basis: "ANNUAL",      rate: 0.05,   max_depreciation: 1.00, description: "Non-jacketed thermal protection — 5%/yr from install." },
  { code: "REFR",   rate_basis: "ANNUAL",      rate: 0.06,   max_depreciation: 0.90, description: "Mechanical refrigerating systems — 6%/yr from install or Rule 88 rebuild." },
  { code: "RUBB",   rate_basis: "ANNUAL",      rate: 0.05,   max_depreciation: 1.00, description: "Rubber/PVC/polyurethane linings inside tank — 5%/yr from install." },
  { code: "SPAR",   rate_basis: "SAME_AS_CAR", rate: 0.0225, max_depreciation: 0.90, description: "Sparger system. Same rate as for car, from car build/rebuilt." },
  { code: "STNS",   rate_basis: "SAME_AS_CAR", rate: 0.0225, max_depreciation: 0.90, description: "Stainless steel inner shell / heater coils non-standard pipe. Same rate as for car, from install." },
  { code: "TKLI",   rate_basis: "MONTHLY",     rate: 0.02,   max_depreciation: 1.00, description: "Paint-type coating inside tank — 2%/month from install." },
  { code: "RACK-1", rate_basis: "ANNUAL",      rate: 0.05,   max_depreciation: 0.90, description: "Multi-deck racks on flats, built pre-1/1/2016 — 5%/yr when separately reported." },
  { code: "RACK-2", rate_basis: "ANNUAL",      rate: 0.0333, max_depreciation: 0.90, description: "Multi-deck racks on flats, built on/after 1/1/2016 — 3.33%/yr when separately reported." },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding dv_cost_factors …");
  const { error: e1 } = await sb
    .from("dv_cost_factors")
    .upsert(
      COST_FACTORS.map(([year, factor]) => ({ year, factor, publication_q: 0, source: "AAR Office Manual Jan 2026 Exhibit III" })),
      { onConflict: "year,publication_q" },
    );
  if (e1) throw e1;

  console.log("Seeding dv_salvage_quarters …");
  const { error: e2 } = await sb
    .from("dv_salvage_quarters")
    .upsert(
      SALVAGE_QUARTERS.map((r) => ({
        quarter_code:       r.qc,
        steel_per_lb:       r.steel,
        aluminum_per_lb:    r.al,
        stainless_per_lb:   null,
        dismantling_per_gt: r.dm,
        loading_flat:       r.loading ?? null,
        misc_labor:         r.misc ?? null,
        source:             "Initial seed from DV_Calc_test_file + AAR quarterly bulletins",
      })),
      { onConflict: "quarter_code" },
    );
  if (e2) throw e2;

  console.log("Seeding dv_car_dep_rates …");
  const { error: e3 } = await sb
    .from("dv_car_dep_rates")
    .upsert(CAR_RATES, { onConflict: "equipment_type" });
  if (e3) throw e3;

  console.log("Seeding dv_ab_codes …");
  const { error: e4 } = await sb
    .from("dv_ab_codes")
    .upsert(
      AB_CODES.map((c) => ({ ...c, effective_from: "1970-01-01" })),
      { onConflict: "code,effective_from" },
    );
  if (e4) throw e4;

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
