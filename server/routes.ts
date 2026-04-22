import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { supabase } from "./supabase";
import {
  calculateDv,
  type DvInputs,
  type DvReferenceData,
  type EquipmentType,
  type AbRateBasis,
  type AbItemInput,
} from "../shared/rule107";

/* ---------------------------------------------------------------- helpers */

function getVisitorId(req: Request): string {
  const hdr = req.header("X-Visitor-Id");
  return hdr && hdr.length > 0 ? hdr : "anon";
}

/** Pull + memoize the full reference data set needed by the engine. */
async function loadReferenceData(): Promise<DvReferenceData> {
  const [cf, sq, cr] = await Promise.all([
    supabase.from("dv_cost_factors").select("year, factor").order("year", { ascending: true }),
    supabase.from("dv_salvage_quarters").select("quarter_code, steel_per_lb, aluminum_per_lb, stainless_per_lb, dismantling_per_gt").order("quarter_code", { ascending: true }),
    supabase.from("dv_car_dep_rates").select("equipment_type, annual_rate, max_depreciation, age_cutoff_years"),
  ]);
  if (cf.error) throw cf.error;
  if (sq.error) throw sq.error;
  if (cr.error) throw cr.error;

  return {
    costFactors: (cf.data || []).map((r: any) => ({ year: r.year, factor: r.factor })),
    salvageQuarters: (sq.data || []).map((r: any) => ({
      quarterCode: r.quarter_code,
      steelPerLb: Number(r.steel_per_lb),
      aluminumPerLb: Number(r.aluminum_per_lb),
      stainlessPerLb: r.stainless_per_lb == null ? null : Number(r.stainless_per_lb),
      dismantlingPerGt: Number(r.dismantling_per_gt),
    })),
    carDepRates: (cr.data || []).map((r: any) => ({
      equipmentType: r.equipment_type as EquipmentType,
      annualRate: Number(r.annual_rate),
      maxDepreciation: Number(r.max_depreciation),
      ageCutoffYears: r.age_cutoff_years,
    })),
  };
}

/** Parse raw JSON body coming from the frontend into engine-ready DvInputs. */
function parseInputs(body: any, abCodes: Map<string, { rate_basis: AbRateBasis; rate: number; max_depreciation: number }>): DvInputs {
  const abItems: AbItemInput[] = (body.abItems || []).map((it: any) => {
    const meta = abCodes.get((it.code || "").toUpperCase());
    const rateBasis: AbRateBasis = (it.rateBasis as AbRateBasis) || meta?.rate_basis || "ANNUAL";
    const rate = it.rate != null ? Number(it.rate) : Number(meta?.rate ?? 0);
    const maxDepreciation = it.maxDepreciation != null ? Number(it.maxDepreciation) : Number(meta?.max_depreciation ?? 0.9);
    return {
      code: String(it.code || "").toUpperCase(),
      value: Number(it.value) || 0,
      installDate: new Date(it.installDate),
      rateBasis,
      rate,
      maxDepreciation,
    };
  });

  return {
    incidentDate:       new Date(body.incidentDate),
    buildDate:          new Date(body.buildDate),
    originalCost:       Number(body.originalCost) || 0,
    tareWeightLb:       Number(body.tareWeightLb) || 0,
    steelWeightLb:      Number(body.steelWeightLb) || 0,
    aluminumWeightLb:   Number(body.aluminumWeightLb) || 0,
    stainlessWeightLb:  body.stainlessWeightLb != null ? Number(body.stainlessWeightLb) : 0,
    nonMetallicWeightLb: Number(body.nonMetallicWeightLb) || 0,
    equipmentType:      body.equipmentType as EquipmentType,
    abItems,
  };
}

/* ----------------------------------------------------------------- routes */

/* ------------------------------------------------------------- freshness */
/**
 * Returns which AAR reference tables are stale for the CURRENT calendar
 * quarter/year — so the UI can show an amber "update quarterly pricing"
 * banner that self-subsides once the rows are added.
 *
 * Logic (per AAR Office Manual Rule 107.E):
 *  • Cost Factors are annual. Rule 107.E.2 uses the factor for the year PRIOR
 *    to the incident year (e.g. a 2026 incident uses the 2025 factor). Treat
 *    cost_factors as stale only if the prior-year row is missing.
 *  • Salvage Quarters are quarterly — a row with quarter_code `YYYY*10 + Q` must
 *    exist for the current quarter.
 *  • A&B Codes are reference-only and only change when AAR revises Exhibit V.
 *    They are NOT published on a fixed quarterly cadence, so they are never
 *    flagged as stale automatically.
 */
async function computeFreshness() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const quarterCode = year * 10 + q;
  const priorYear = year - 1;

  const [cfRes, sqRes] = await Promise.all([
    supabase.from("dv_cost_factors").select("year", { count: "exact", head: false }).eq("year", priorYear),
    supabase.from("dv_salvage_quarters").select("quarter_code", { count: "exact", head: false }).eq("quarter_code", quarterCode),
  ]);

  const stale: string[] = [];
  if (!cfRes.error && (cfRes.data?.length ?? 0) === 0) stale.push("cost_factors");
  if (!sqRes.error && (sqRes.data?.length ?? 0) === 0) stale.push("salvage_quarters");

  return {
    currentYear: year,
    currentQuarter: q,
    currentQuarterCode: quarterCode,
    currentQuarterLabel: `${year} Q${q}`,
    priorYear,
    staleTables: stale,
    isStale: stale.length > 0,
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Freshness check — tells the UI whether current-quarter AAR data is loaded.
  app.get("/api/reference/freshness", async (_req, res, next) => {
    try {
      const result = await computeFreshness();
      // Short-cache so the banner updates within a minute of adding data
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch (e) { next(e); }
  });

  // Reference data reads (public within the app — no user filtering needed)
  app.get("/api/reference/cost-factors", async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from("dv_cost_factors")
        .select("*")
        .order("year", { ascending: true })
        .order("publication_q", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.get("/api/reference/salvage", async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from("dv_salvage_quarters")
        .select("*")
        .order("quarter_code", { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.get("/api/reference/ab-codes", async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from("dv_ab_codes")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.get("/api/reference/car-rates", async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from("dv_car_dep_rates")
        .select("*")
        .order("display_name", { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  // Reference data writes (quarter-new rows)
  app.post("/api/reference/cost-factors", async (req, res, next) => {
    try {
      const { year, factor, publication_q = 0, source = null } = req.body;
      const { data, error } = await supabase
        .from("dv_cost_factors")
        .upsert({ year, factor, publication_q, source }, { onConflict: "year,publication_q" })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.post("/api/reference/salvage", async (req, res, next) => {
    try {
      const row = req.body;
      const { data, error } = await supabase
        .from("dv_salvage_quarters")
        .upsert(row, { onConflict: "quarter_code" })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.post("/api/reference/ab-codes", async (req, res, next) => {
    try {
      const row = { effective_from: "1970-01-01", ...req.body };
      const { data, error } = await supabase
        .from("dv_ab_codes")
        .upsert(row, { onConflict: "code,effective_from" })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.post("/api/reference/car-rates", async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from("dv_car_dep_rates")
        .upsert(req.body, { onConflict: "equipment_type" })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  // Railcar lookup — disabled on public standalone (no railcars table).
  // Endpoint preserved and returns [] so any stale frontend call is a harmless no-op.
  app.get("/api/railcars", async (_req, res) => {
    res.json([]);
  });

  // Calculate — pure engine run, no persistence
  app.post("/api/calculate", async (req, res, next) => {
    try {
      const ref = await loadReferenceData();
      const { data: abData } = await supabase.from("dv_ab_codes").select("code, rate_basis, rate, max_depreciation");
      const abMap = new Map<string, { rate_basis: AbRateBasis; rate: number; max_depreciation: number }>();
      for (const r of abData || []) abMap.set(r.code, { rate_basis: r.rate_basis, rate: Number(r.rate), max_depreciation: Number(r.max_depreciation) });
      const inputs = parseInputs(req.body, abMap);
      const result = calculateDv(inputs, ref);
      res.json({ result, inputsEcho: req.body });
    } catch (e) { next(e); }
  });

  // Calculations persistence
  app.get("/api/calculations", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { data, error } = await supabase
        .from("dv_calculations")
        .select("*, dv_calculation_ab_items(*)")
        .eq("visitor_id", visitor)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      res.json(data || []);
    } catch (e) { next(e); }
  });

  app.get("/api/calculations/:id", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { data, error } = await supabase
        .from("dv_calculations")
        .select("*, dv_calculation_ab_items(*)")
        .eq("id", req.params.id)
        .eq("visitor_id", visitor)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) { next(e); }
  });

  app.post("/api/calculations", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const ref = await loadReferenceData();
      const { data: abData } = await supabase.from("dv_ab_codes").select("code, rate_basis, rate, max_depreciation");
      const abMap = new Map<string, { rate_basis: AbRateBasis; rate: number; max_depreciation: number }>();
      for (const r of abData || []) abMap.set(r.code, { rate_basis: r.rate_basis, rate: Number(r.rate), max_depreciation: Number(r.max_depreciation) });
      const inputs = parseInputs(req.body, abMap);
      const result = calculateDv(inputs, ref);

      const row = {
        visitor_id:           visitor,
        railroad:             req.body.railroad ?? null,
        ddct_incident_no:     req.body.ddctNumber ?? null,
        incident_date:        req.body.incidentDate,
        incident_location:    req.body.incidentLocation ?? null,
        car_initial:          req.body.carInitial ?? null,
        car_number:           req.body.carNumber ?? null,
        build_date:           req.body.buildDate,
        original_cost:        inputs.originalCost,
        tare_weight_lb:       Math.round(inputs.tareWeightLb),
        steel_weight_lb:      Math.round(inputs.steelWeightLb),
        aluminum_weight_lb:   Math.round(inputs.aluminumWeightLb),
        stainless_weight_lb:  Math.round(inputs.stainlessWeightLb ?? 0),
        non_metallic_lb:      Math.round(inputs.nonMetallicWeightLb),
        equipment_type:       inputs.equipmentType,
        notes:                req.body.notes ?? null,
        total_reproduction:   result.totalReproductionCost,
        total_dv:             result.totalDepreciatedValue,
        total_salvage:        result.salvage.totalSalvage,
        salvage_plus_20:      result.salvage.salvagePlus20,
        dismantling_allow:    result.salvage.dismantlingAllowance,
        over_age_cutoff:      result.overAgeCutoff,
        created_by:           visitor,
        result_json:          result,
      };

      const { data: calc, error } = await supabase
        .from("dv_calculations")
        .insert(row)
        .select()
        .single();
      if (error) throw error;

      // Persist A&B items
      if (inputs.abItems.length) {
        const ab = inputs.abItems.map((it, seq) => ({
          calculation_id:   calc.id,
          seq:              seq + 1,
          code:             it.code,
          value:            it.value,
          install_date:     it.installDate.toISOString().slice(0, 10),
          rate_basis:       it.rateBasis,
          rate:             it.rate,
          max_depreciation: it.maxDepreciation,
        }));
        const { error: e2 } = await supabase.from("dv_calculation_ab_items").insert(ab);
        if (e2) throw e2;
      }

      res.json({ ...calc, result });
    } catch (e) { next(e); }
  });

  app.delete("/api/calculations/:id", async (req, res, next) => {
    try {
      const visitor = getVisitorId(req);
      const { error } = await supabase
        .from("dv_calculations")
        .delete()
        .eq("id", req.params.id)
        .eq("visitor_id", visitor);
      if (error) throw error;
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return httpServer;
}
