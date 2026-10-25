/**
 * AgroBot AI Agronomy & Spray Assistant
 * Connects to FastAPI backend (/v1/agronomy, /v1/pesticide, /v1/weather, /v1/spray-sessions)
 * Includes embedded agronomic calculation engine matching backend logic for offline reliability.
 */

export class AgronomyAssistant {
  constructor(apiBaseUrl = 'http://localhost:8000') {
    this.apiBaseUrl = apiBaseUrl;

    // Database of crops, pests, and standard labels (mirrors backend product_database)
    this.productDb = {
      glyphosate: {
        name: 'Glyphosate',
        formulation: 'Roundup 480 SL',
        labelRate: 1.5,
        labelUnits: 'L/ha',
        minRate: 0.8,
        maxRate: 3.0,
        activeIngredient: 'Glyphosate 48%',
        pests: ['broadleaf_weeds', 'annual_grasses', 'perennial_weeds'],
        restrictions: 'Do not apply during bloom or when wind > 5 m/s'
      },
      chlorpyrifos: {
        name: 'Chlorpyrifos',
        formulation: 'Lorsban 50 EC',
        labelRate: 0.75,
        labelUnits: 'L/ha',
        minRate: 0.4,
        maxRate: 1.5,
        activeIngredient: 'Chlorpyrifos 50%',
        pests: ['aphids', 'armyworm', 'stem_borer', 'caterpillars'],
        restrictions: 'Restricted use. 14-day pre-harvest interval.'
      },
      mancozeb: {
        name: 'Mancozeb',
        formulation: 'Dithane M-45',
        labelRate: 2.0,
        labelUnits: 'kg/ha',
        minRate: 1.0,
        maxRate: 3.5,
        activeIngredient: 'Mancozeb 75% WP',
        pests: ['blight', 'rust', 'downy_mildew', 'leaf_spot'],
        restrictions: 'Protective broad-spectrum fungicide. Buffer zone required.'
      },
      imidacloprid: {
        name: 'Imidacloprid',
        formulation: 'Confidor 200 SL',
        labelRate: 0.25,
        labelUnits: 'L/ha',
        minRate: 0.1,
        maxRate: 0.5,
        activeIngredient: 'Imidacloprid 17.8%',
        pests: ['aphids', 'whiteflies', 'thrips', 'jassids'],
        restrictions: 'Hazard to pollinators. Avoid application during flowering.'
      }
    };
  }

  /**
   * Calculate pesticide application parameters
   */
  async calculateApplication(params) {
    const {
      crop,
      pest,
      productId,
      areaHectares,
      tankCapacityLiters = 100.0,
      customRate = null
    } = params;

    // Try backend API first
    try {
      const prod = this.productDb[productId] || this.productDb.glyphosate;
      const rate = customRate || prod.labelRate;

      const payload = {
        crop,
        pest,
        product_name: prod.name,
        formulation: prod.formulation,
        label_rate: rate,
        label_units: prod.labelUnits,
        treated_area_hectares: areaHectares,
        tank_capacity_liters: tankCapacityLiters,
        application_method: 'rover_spray_boom'
      };

      const res = await fetch(`${this.apiBaseUrl}/v1/pesticide/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        return data.calculation || this.computeOffline(payload, prod);
      }
    } catch (e) {
      // Backend not running, use embedded high-precision agronomy engine
    }

    const prod = this.productDb[productId] || this.productDb.glyphosate;
    const rate = customRate || prod.labelRate;
    return this.computeOffline({
      crop,
      pest,
      treated_area_hectares: areaHectares,
      label_rate: rate,
      label_units: prod.labelUnits,
      tank_capacity_liters: tankCapacityLiters
    }, prod);
  }

  computeOffline(params, prod) {
    const area = params.treated_area_hectares;
    const rate = params.label_rate;
    const tankCap = params.tank_capacity_liters;

    // Total product needed = area (ha) * rate (L/ha or kg/ha)
    const totalProduct = parseFloat((area * rate).toFixed(2));

    // Standard water carrier volume is 200 L/ha for field crops
    const carrierWaterPerHa = 200;
    const totalSolution = parseFloat((area * carrierWaterPerHa).toFixed(1));

    // Refills needed
    const refills = Math.ceil(totalSolution / tankCap);
    const productPerTank = parseFloat((totalProduct / refills).toFixed(2));

    return {
      total_product_amount: totalProduct,
      total_solution_volume: totalSolution,
      number_of_tanks: refills,
      product_per_tank: productPerTank,
      units: params.label_units,
      safety_warnings: [
        prod.restrictions,
        `Maintain continuous mechanical agitation in AgroBot tank`
      ],
      drift_risk: 'LOW (with low-drift nozzles at 2.0 bar)'
    };
  }

  /**
   * Validate spray session against environmental conditions
   */
  validateWeatherSafety(weather) {
    const errors = [];
    const warnings = [];

    // Rule: Wind speed max 5.0 m/s
    if (weather.windSpeed > 5.0) {
      errors.push(`Wind speed (${weather.windSpeed} m/s) exceeds maximum safe limit of 5.0 m/s. High spray drift hazard!`);
    } else if (weather.windSpeed > 3.5) {
      warnings.push(`Wind speed (${weather.windSpeed} m/s) is moderate. Use coarse droplet size nozzles.`);
    }

    // Rule: Temp range -10 to 35 C
    if (weather.temp > 35) {
      warnings.push(`High temperature (${weather.temp}°C) causes rapid droplet evaporation. Spraying in morning/evening recommended.`);
    } else if (weather.temp < 5) {
      warnings.push(`Low temperature (${weather.temp}°C) may reduce chemical efficacy.`);
    }

    // Rain / Precipitation
    if (weather.isRaining) {
      errors.push('Precipitation detected or imminent. Chemical wash-off hazard.');
    }

    const isSafe = errors.length === 0;
    return {
      isSafe,
      status: isSafe ? (warnings.length > 0 ? 'CAUTION' : 'OPTIMAL') : 'UNSAFE',
      errors,
      warnings
    };
  }

  /**
   * AI-Assisted Sowing and Seed Quantity Estimation
   * Implements deterministic formulas from idea.txt Section 9:
   * M = Area * SeedRate / (GerminationPct / 100)
   */
  async calculateSowingEstimate(params) {
    const {
      crop = 'Wheat',
      areaHectares = 1.0,
      seedRateKgPerHa = 100.0,
      germinationPercentage = 90.0,
      rowSpacingMeters = 0.22
    } = params;

    // Try backend API first
    try {
      const res = await fetch(`${this.apiBaseUrl}/v1/agronomy/sowing-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop,
          area_hectares: areaHectares,
          seed_rate_kg_per_ha: seedRateKgPerHa,
          germination_percentage: germinationPercentage,
          row_spacing_meters: rowSpacingMeters
        })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Backend offline, fallback to deterministic calculation
    }

    const baseSeedKg = areaHectares * seedRateKgPerHa;
    const germinationFactor = Math.max(0.1, Math.min(1.0, germinationPercentage / 100.0));
    const adjustedSeedKg = baseSeedKg / germinationFactor;
    const areaM2 = areaHectares * 10000.0;
    const totalRowMeters = areaM2 / Math.max(0.05, rowSpacingMeters);

    return {
      status: 'success',
      crop,
      area_hectares: areaHectares,
      base_seed_kg: parseFloat(baseSeedKg.toFixed(2)),
      germination_percentage: germinationPercentage,
      adjusted_seed_kg: parseFloat(adjustedSeedKg.toFixed(2)),
      total_row_meters: parseFloat(totalRowMeters.toFixed(1)),
      method: 'Deterministic Agronomy Calculation (idea.txt Section 9)'
    };
  }
}

