import { createRequire } from 'module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
function missingEnvProxy() {
  const missing = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_ANON_KEY");
  const msg = `Server misconfigured: missing env vars: ${missing.join(", ")}. Set them in the Vercel project Settings \u2192 Environment Variables, then redeploy.`;
  console.error(msg);
  return new Proxy({}, {
    get() {
      throw new Error(msg);
    }
  });
}
var url, key, supabase;
var init_supabase = __esm({
  "server/supabase.ts"() {
    "use strict";
    url = process.env.SUPABASE_URL;
    key = process.env.SUPABASE_ANON_KEY;
    supabase = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : missingEnvProxy();
  }
});

// shared/rule107.ts
function round(v, places = 2) {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
}
function ageYearsMonths(from, to) {
  const fromY = from.getUTCFullYear();
  const fromM = from.getUTCMonth() + 1;
  const toY = to.getUTCFullYear();
  const toM = to.getUTCMonth() + 1;
  let years = toY - fromY;
  let months = toM - fromM;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}
function quarterCode(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const q = Math.ceil(m / 3);
  return y * 10 + q;
}
function costFactorForYear(factors, year) {
  return factors.find((f) => f.year === year)?.factor;
}
function salvageForQuarter(rows, qc) {
  const exact = rows.find((r) => r.quarterCode === qc);
  if (exact) return { row: exact, exact: true };
  const earlier = rows.filter((r) => r.quarterCode <= qc).sort((a, b) => b.quarterCode - a.quarterCode)[0];
  return { row: earlier ?? null, exact: false };
}
function calculateDv(inputs, ref) {
  const warnings = [];
  const { years: ageY, months: ageM } = ageYearsMonths(inputs.buildDate, inputs.incidentDate);
  const ageDecimal = ageY + round(ageM / 12, 2);
  const incidentYear = inputs.incidentDate.getUTCFullYear();
  const buildYear = inputs.buildDate.getUTCFullYear();
  const priorYear = incidentYear - 1;
  const qc = quarterCode(inputs.incidentDate);
  const cfBuild = costFactorForYear(ref.costFactors, buildYear);
  const cfPrior = costFactorForYear(ref.costFactors, priorYear);
  if (cfBuild === void 0) warnings.push(`No cost factor on file for build year ${buildYear}.`);
  if (cfPrior === void 0) warnings.push(`No cost factor on file for year prior to damage (${priorYear}).`);
  const carRate = ref.carDepRates.find((r) => r.equipmentType === inputs.equipmentType);
  if (!carRate) {
    throw new Error(`No depreciation rate defined for equipment type ${inputs.equipmentType}`);
  }
  const cfBuildSafe = cfBuild ?? 1;
  const cfPriorSafe = cfPrior ?? cfBuildSafe;
  const within12Months = ageY === 0 && ageM < 12;
  const baseReproduction = within12Months ? inputs.originalCost : inputs.originalCost * cfPriorSafe / cfBuildSafe;
  if (within12Months) warnings.push("Equipment destroyed within 12 months of build/rebuild/ILS \u2014 reproduction cost set to original cost per Exhibit III Note 1.");
  const baseRateUncapped = round(ageDecimal * carRate.annualRate, 4);
  const baseRate = Math.min(carRate.maxDepreciation, Math.max(0, baseRateUncapped));
  const baseDep = baseReproduction * baseRate;
  const baseDv = baseReproduction - baseDep;
  const baseLine = {
    label: "Base Car",
    yearOrMonthBasis: `${ageDecimal.toFixed(2)} years`,
    reproductionCost: baseReproduction,
    depreciationRate: baseRate,
    depreciation: baseDep,
    depreciatedValue: baseDv
  };
  const abLines = inputs.abItems.filter((ab) => ab && ab.value > 0).map((ab) => {
    const rate = ab.rate ?? carRate.annualRate;
    const max = ab.max ?? carRate.maxDepreciation;
    const rateBasis = ab.rateBasis ?? "ANNUAL";
    const lineWarnings = [];
    const { years: abY, months: abM } = ageYearsMonths(ab.installDate, inputs.incidentDate);
    const abAgeDecimal = abY + round(abM / 12, 2);
    const totalMonths = abY * 12 + abM;
    const installYear = ab.installDate.getUTCFullYear();
    const cfInstall = costFactorForYear(ref.costFactors, installYear);
    if (cfInstall === void 0) {
      warnings.push(`[${ab.code}] No cost factor on file for install year ${installYear}.`);
      lineWarnings.push(`Missing cost factor for ${installYear}.`);
    }
    const cfInstallSafe = cfInstall ?? 1;
    const sameCalendarYear = installYear === incidentYear;
    const sameCalendarMonth = sameCalendarYear && ab.installDate.getUTCMonth() === inputs.incidentDate.getUTCMonth();
    let abRepro;
    if (rateBasis === "MONTHLY" ? sameCalendarMonth : sameCalendarYear) {
      abRepro = ab.value;
      lineWarnings.push("Damaged in same period as install \u2014 reproduction set to original cost.");
    } else {
      abRepro = ab.value * cfPriorSafe / cfInstallSafe;
    }
    let rateApplied;
    let basisDescription;
    switch (rateBasis) {
      case "MONTHLY":
        rateApplied = Math.min(max, round(totalMonths * rate, 4));
        basisDescription = `${totalMonths} months`;
        break;
      case "SAME_AS_CAR":
        rateApplied = Math.min(max, round(ageDecimal * carRate.annualRate, 4));
        basisDescription = `${ageDecimal.toFixed(2)} years (car age)`;
        break;
      case "ANNUAL":
      default:
        rateApplied = Math.min(max, round(abAgeDecimal * rate, 4));
        basisDescription = `${abAgeDecimal.toFixed(2)} years`;
        break;
    }
    rateApplied = Math.max(0, rateApplied);
    const abDep = abRepro * rateApplied;
    const abDv = abRepro - abDep;
    return {
      label: `A&B ${ab.code}`,
      yearOrMonthBasis: basisDescription,
      reproductionCost: abRepro,
      depreciationRate: rateApplied,
      depreciation: abDep,
      depreciatedValue: abDv,
      notes: lineWarnings.length ? lineWarnings : void 0
    };
  });
  const totalReproCost = baseReproduction + abLines.reduce((s, l) => s + l.reproductionCost, 0);
  const totalDv = baseDv + abLines.reduce((s, l) => s + l.depreciatedValue, 0);
  const sv = salvageForQuarter(ref.salvageQuarters, qc);
  if (!sv.row) {
    warnings.push(`No salvage rates on file for or before ${qc}.`);
  } else if (!sv.exact) {
    warnings.push(`No exact salvage rates for quarter ${qc} \u2014 using most recent prior quarter ${sv.row.quarterCode}.`);
  }
  const steelRate = sv.row?.steelPerLb ?? 0;
  const alRate = sv.row?.aluminumPerLb ?? 0;
  const ssRate = sv.row?.stainlessPerLb ?? 0;
  const daRate = sv.row?.dismantlingPerGt ?? 0;
  const ssWeight = inputs.stainlessWeightLb ?? 0;
  const steelValue = inputs.steelWeightLb * steelRate;
  const alValue = inputs.aluminumWeightLb * alRate;
  const ssValue = ssWeight * ssRate;
  const totalSalvage = steelValue + alValue + ssValue;
  const dismantling = inputs.tareWeightLb / 2240 * daRate;
  const salvagePlus20 = totalSalvage * 1.2;
  const overAgeCutoff = ageY >= carRate.ageCutoffYears;
  if (overAgeCutoff) {
    warnings.push(`Car age (${ageY}y) meets or exceeds Exhibit II cutoff of ${carRate.ageCutoffYears}y \u2014 Settlement Value is Salvage Value Only.`);
  }
  const dvForMatrix = overAgeCutoff ? totalSalvage : totalDv;
  const handlingLine = {
    dv: dvForMatrix,
    sv: totalSalvage,
    svPlus20: salvagePlus20
  };
  const ownerRepairedOffered = { ...handlingLine };
  const ownerRepairedNotOffered = { ...handlingLine };
  const ownerDismantledOffered = {
    dv: dvForMatrix - totalSalvage,
    sv: 0,
    // SV − SV = 0
    svPlus20: salvagePlus20 - totalSalvage
  };
  const ownerDismantledNotOffered = {
    dv: dvForMatrix - totalSalvage + dismantling,
    sv: 0 + dismantling,
    svPlus20: salvagePlus20 - totalSalvage + dismantling
  };
  return {
    ageYears: ageY,
    ageMonths: ageM,
    ageTotalYearsDecimal: ageDecimal,
    costFactorBuildYear: cfBuild ?? NaN,
    costFactorPriorToDamageYear: cfPrior ?? NaN,
    priorYear,
    quarterCode: qc,
    base: baseLine,
    abItems: abLines,
    totalReproductionCost: totalReproCost,
    totalDepreciatedValue: totalDv,
    salvage: {
      steelValue,
      aluminumValue: alValue,
      stainlessValue: ssValue,
      totalSalvage,
      dismantlingAllowance: dismantling,
      salvagePlus20
    },
    overAgeCutoff,
    ageCutoffYears: carRate.ageCutoffYears,
    settlementMatrix: {
      handlingLine,
      ownerRepairedOffered,
      ownerRepairedNotOffered,
      ownerDismantledOffered,
      ownerDismantledNotOffered
    },
    warnings
  };
}
var init_rule107 = __esm({
  "shared/rule107.ts"() {
    "use strict";
  }
});

// server/routes.ts
var routes_exports = {};
__export(routes_exports, {
  registerRoutes: () => registerRoutes
});
function getVisitorId(req) {
  const hdr = req.header("X-Visitor-Id");
  return hdr && hdr.length > 0 ? hdr : "anon";
}
async function loadReferenceData() {
  const [cf, sq, cr] = await Promise.all([
    supabase.from("dv_cost_factors").select("year, factor").order("year", { ascending: true }),
    supabase.from("dv_salvage_quarters").select("quarter_code, steel_per_lb, aluminum_per_lb, stainless_per_lb, dismantling_per_gt").order("quarter_code", { ascending: true }),
    supabase.from("dv_car_dep_rates").select("equipment_type, annual_rate, max_depreciation, age_cutoff_years")
  ]);
  if (cf.error) throw cf.error;
  if (sq.error) throw sq.error;
  if (cr.error) throw cr.error;
  return {
    costFactors: (cf.data || []).map((r) => ({ year: r.year, factor: r.factor })),
    salvageQuarters: (sq.data || []).map((r) => ({
      quarterCode: r.quarter_code,
      steelPerLb: Number(r.steel_per_lb),
      aluminumPerLb: Number(r.aluminum_per_lb),
      stainlessPerLb: r.stainless_per_lb == null ? null : Number(r.stainless_per_lb),
      dismantlingPerGt: Number(r.dismantling_per_gt)
    })),
    carDepRates: (cr.data || []).map((r) => ({
      equipmentType: r.equipment_type,
      annualRate: Number(r.annual_rate),
      maxDepreciation: Number(r.max_depreciation),
      ageCutoffYears: r.age_cutoff_years
    }))
  };
}
function parseInputs(body, abCodes) {
  const abItems = (body.abItems || []).map((it) => {
    const meta = abCodes.get((it.code || "").toUpperCase());
    const rateBasis = it.rateBasis || meta?.rate_basis || "ANNUAL";
    const rate = it.rate != null ? Number(it.rate) : Number(meta?.rate ?? 0);
    const maxDepreciation = it.maxDepreciation != null ? Number(it.maxDepreciation) : Number(meta?.max_depreciation ?? 0.9);
    return {
      code: String(it.code || "").toUpperCase(),
      value: Number(it.value) || 0,
      installDate: new Date(it.installDate),
      rateBasis,
      rate,
      maxDepreciation
    };
  });
  return {
    incidentDate: new Date(body.incidentDate),
    buildDate: new Date(body.buildDate),
    originalCost: Number(body.originalCost) || 0,
    tareWeightLb: Number(body.tareWeightLb) || 0,
    steelWeightLb: Number(body.steelWeightLb) || 0,
    aluminumWeightLb: Number(body.aluminumWeightLb) || 0,
    stainlessWeightLb: body.stainlessWeightLb != null ? Number(body.stainlessWeightLb) : 0,
    nonMetallicWeightLb: Number(body.nonMetallicWeightLb) || 0,
    equipmentType: body.equipmentType,
    abItems
  };
}
async function computeFreshness() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const quarterCode2 = year * 10 + q;
  const priorYear = year - 1;
  const [cfRes, sqRes] = await Promise.all([
    supabase.from("dv_cost_factors").select("year", { count: "exact", head: false }).eq("year", priorYear),
    supabase.from("dv_salvage_quarters").select("quarter_code", { count: "exact", head: false }).eq("quarter_code", quarterCode2)
  ]);
  const stale = [];
  if (!cfRes.error && (cfRes.data?.length ?? 0) === 0) stale.push("cost_factors");
  if (!sqRes.error && (sqRes.data?.length ?? 0) === 0) stale.push("salvage_quarters");
  return {
    currentYear: year,
    currentQuarter: q,
    currentQuarterCode: quarterCode2,
    currentQuarterLabel: `${year} Q${q}`,
    priorYear,
    staleTables: stale,
    isStale: stale.length > 0
  };
}
async function registerRoutes(httpServer, app) {
  app.get("/api/reference/freshness", async (_req, res, next) => {
    try {
      const result = await computeFreshness();
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/reference/cost-factors", async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("dv_cost_factors").select("*").order("year", { ascending: true }).order("publication_q", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/reference/salvage", async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("dv_salvage_quarters").select("*").order("quarter_code", { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/reference/ab-codes", async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("dv_ab_codes").select("*").order("code", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/reference/car-rates", async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("dv_car_dep_rates").select("*").order("display_name", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reference/cost-factors", async (req, res, next) => {
    try {
      const { year, factor, publication_q = 0, source = null } = req.body;
      const { data, error } = await supabase.from("dv_cost_factors").upsert({ year, factor, publication_q, source }, { onConflict: "year,publication_q" }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reference/salvage", async (req, res, next) => {
    try {
      const row = req.body;
      const { data, error } = await supabase.from("dv_salvage_quarters").upsert(row, { onConflict: "quarter_code" }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reference/ab-codes", async (req, res, next) => {
    try {
      const row = { effective_from: "1970-01-01", ...req.body };
      const { data, error } = await supabase.from("dv_ab_codes").upsert(row, { onConflict: "code,effective_from" }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reference/car-rates", async (req, res, next) => {
    try {
      const { data, error } = await supabase.from("dv_car_dep_rates").upsert(req.body, { onConflict: "equipment_type" }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/railcars", async (_req, res) => {
    res.json([]);
  });
  app.post("/api/calculate", async (req, res, next) => {
    try {
      const ref = await loadReferenceData();
      const { data: abData } = await supabase.from("dv_ab_codes").select("code, rate_basis, rate, max_depreciation");
      const abMap = /* @__PURE__ */ new Map();
      for (const r of abData || []) abMap.set(r.code, { rate_basis: r.rate_basis, rate: Number(r.rate), max_depreciation: Number(r.max_depreciation) });
      const inputs = parseInputs(req.body, abMap);
      const result = calculateDv(inputs, ref);
      res.json({ result, inputsEcho: req.body });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/calculations", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { data, error } = await supabase.from("dv_calculations").select("*, dv_calculation_ab_items(*)").eq("visitor_id", visitor).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      res.json(data || []);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/calculations/:id", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { data, error } = await supabase.from("dv_calculations").select("*, dv_calculation_ab_items(*)").eq("id", req.params.id).eq("visitor_id", visitor).single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/calculations", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const ref = await loadReferenceData();
      const { data: abData } = await supabase.from("dv_ab_codes").select("code, rate_basis, rate, max_depreciation");
      const abMap = /* @__PURE__ */ new Map();
      for (const r of abData || []) abMap.set(r.code, { rate_basis: r.rate_basis, rate: Number(r.rate), max_depreciation: Number(r.max_depreciation) });
      const inputs = parseInputs(req.body, abMap);
      const result = calculateDv(inputs, ref);
      const row = {
        visitor_id: visitor,
        railroad: req.body.railroad ?? null,
        ddct_incident_no: req.body.ddctNumber ?? null,
        incident_date: req.body.incidentDate,
        incident_location: req.body.incidentLocation ?? null,
        car_initial: req.body.carInitial ?? null,
        car_number: req.body.carNumber ?? null,
        build_date: req.body.buildDate,
        original_cost: inputs.originalCost,
        tare_weight_lb: Math.round(inputs.tareWeightLb),
        steel_weight_lb: Math.round(inputs.steelWeightLb),
        aluminum_weight_lb: Math.round(inputs.aluminumWeightLb),
        stainless_weight_lb: Math.round(inputs.stainlessWeightLb ?? 0),
        non_metallic_lb: Math.round(inputs.nonMetallicWeightLb),
        equipment_type: inputs.equipmentType,
        notes: req.body.notes ?? null,
        total_reproduction: result.totalReproductionCost,
        total_dv: result.totalDepreciatedValue,
        total_salvage: result.salvage.totalSalvage,
        salvage_plus_20: result.salvage.salvagePlus20,
        dismantling_allow: result.salvage.dismantlingAllowance,
        over_age_cutoff: result.overAgeCutoff,
        created_by: visitor,
        result_json: result
      };
      const { data: calc, error } = await supabase.from("dv_calculations").insert(row).select().single();
      if (error) throw error;
      if (inputs.abItems.length) {
        const ab = inputs.abItems.map((it, seq) => ({
          calculation_id: calc.id,
          seq: seq + 1,
          code: it.code,
          value: it.value,
          install_date: it.installDate.toISOString().slice(0, 10),
          rate_basis: it.rateBasis ?? abMap.get(it.code)?.rate_basis ?? "ANNUAL",
          rate: it.rate ?? abMap.get(it.code)?.rate ?? 0,
          max_depreciation: it.max ?? abMap.get(it.code)?.max_depreciation ?? 1
        }));
        const { error: e2 } = await supabase.from("dv_calculation_ab_items").insert(ab);
        if (e2) throw e2;
      }
      res.json({ ...calc, result });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/calculations/:id", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { error } = await supabase.from("dv_calculations").delete().eq("id", req.params.id).eq("visitor_id", visitor);
      if (error) throw error;
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  return httpServer;
}
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_supabase();
    init_rule107();
  }
});

// api/_source.ts
var appPromise = null;
var initError = null;
async function getApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const [{ default: express }, http, routesModule] = await Promise.all([
      import("express"),
      import("node:http"),
      Promise.resolve().then(() => (init_routes(), routes_exports))
    ]);
    const app = express();
    const httpServer = http.createServer(app);
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          req.rawBody = buf;
        }
      })
    );
    app.use(express.urlencoded({ extended: false }));
    await routesModule.registerRoutes(httpServer, app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("[api] error:", err);
      if (!res.headersSent) res.status(status).json({ error: message });
    });
    return app;
  })().catch((err) => {
    console.error("[api] init failed:", err);
    initError = err instanceof Error ? err : new Error(String(err));
    throw err;
  });
  return appPromise;
}
async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    const message = initError?.message || err?.message || "Unknown init error";
    const stack = initError?.stack || err?.stack || "";
    console.error("[api] handler crash:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Serverless init failed",
        message,
        stack: process.env.VERCEL_ENV === "production" ? void 0 : stack
      })
    );
  }
}
export {
  handler as default
};
