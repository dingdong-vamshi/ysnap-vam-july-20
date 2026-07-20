import {
  checkRateLimit,
  formatError,
  formatResponse,
  generateMultimodalResult,
  handleCors,
  logUsageEvent,
  safeParseAIJson,
  verifyUser,
} from "../shared/index.ts";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type DetectionStatus =
  | "FOOD_DETECTED"
  | "DRINK_DETECTED"
  | "FOOD_AND_DRINK_DETECTED"
  | "NO_EDIBLE_ITEM_DETECTED"
  | "LOW_CONFIDENCE";

type FoodItem = {
  name: string;
  category: "food" | "drink";
  portion: string;
  estimatedGrams: number;
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fibreGrams: number;
  confidence: number;
};

type FoodAnalysisResult = {
  status: DetectionStatus;
  items: FoodItem[];
  totals: {
    calories: number;
    proteinGrams: number;
    carbohydrateGrams: number;
    fatGrams: number;
    fibreGrams: number;
  };
  warnings?: string[];
  needsUserReview?: boolean;
  message: string;
};

const DETECTION_STATUSES = new Set<DetectionStatus>([
  "FOOD_DETECTED",
  "DRINK_DETECTED",
  "FOOD_AND_DRINK_DETECTED",
  "NO_EDIBLE_ITEM_DETECTED",
  "LOW_CONFIDENCE",
]);

const ZERO_TOTALS = {
  calories: 0,
  proteinGrams: 0,
  carbohydrateGrams: 0,
  fatGrams: 0,
  fibreGrams: 0,
};

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStatus(value: unknown): DetectionStatus {
  const status = String(value || "").trim().toUpperCase() as DetectionStatus;
  return DETECTION_STATUSES.has(status) ? status : "LOW_CONFIDENCE";
}

function normalizeFoodAnalysis(raw: any): FoodAnalysisResult {
  if (!raw || !Array.isArray(raw.items)) {
    throw new Error("Invalid food analysis response");
  }

  let status = normalizeStatus(raw.status);
  const items = raw.items
    .filter((item: any) => item && typeof item.name === "string")
    .map((item: any): FoodItem => ({
      name: String(item.name).trim(),
      category: item.category === "drink" ? "drink" : "food",
      portion: String(item.portion || item.servingSize || item.serving_size || "1 serving").trim(),
      estimatedGrams: Math.max(0, toNumber(item.estimatedGrams ?? item.estimated_grams)),
      calories: Math.max(0, toNumber(item.calories)),
      proteinGrams: Math.max(0, toNumber(item.proteinGrams ?? item.protein_grams ?? item.protein)),
      carbohydrateGrams: Math.max(0, toNumber(item.carbohydrateGrams ?? item.carbohydrate_grams ?? item.carbs ?? item.carbohydrates)),
      fatGrams: Math.max(0, toNumber(item.fatGrams ?? item.fat_grams ?? item.fat)),
      fibreGrams: Math.max(0, toNumber(item.fibreGrams ?? item.fiberGrams ?? item.fibre_grams ?? item.fiber_grams ?? item.fibre ?? item.fiber)),
      confidence: Math.min(1, Math.max(0, toNumber(item.confidence, 0.5))),
    }))
    .filter((item: FoodItem) => item.name.length > 0);

  if (!items.length && (status === "FOOD_DETECTED" || status === "DRINK_DETECTED" || status === "FOOD_AND_DRINK_DETECTED")) {
    status = "LOW_CONFIDENCE";
  }

  const totalsFromItems = items.reduce(
    (
      acc: {
        calories: number;
        proteinGrams: number;
        carbohydrateGrams: number;
        fatGrams: number;
        fibreGrams: number;
      },
      item: FoodItem,
    ) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbohydrateGrams: acc.carbohydrateGrams + item.carbohydrateGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
      fibreGrams: acc.fibreGrams + item.fibreGrams,
    }),
    { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fibreGrams: 0 },
  );

  const totals = {
    calories: Math.max(0, toNumber(raw.totals?.calories, totalsFromItems.calories)),
    proteinGrams: Math.max(0, toNumber(raw.totals?.proteinGrams ?? raw.totals?.protein_grams, totalsFromItems.proteinGrams)),
    carbohydrateGrams: Math.max(0, toNumber(raw.totals?.carbohydrateGrams ?? raw.totals?.carbohydrate_grams ?? raw.totals?.carbs, totalsFromItems.carbohydrateGrams)),
    fatGrams: Math.max(0, toNumber(raw.totals?.fatGrams ?? raw.totals?.fat_grams, totalsFromItems.fatGrams)),
    fibreGrams: Math.max(0, toNumber(raw.totals?.fibreGrams ?? raw.totals?.fiberGrams ?? raw.totals?.fibre_grams ?? raw.totals?.fiber_grams, totalsFromItems.fibreGrams)),
  };

  if (status === "NO_EDIBLE_ITEM_DETECTED" || status === "LOW_CONFIDENCE") {
    return {
      status,
      items: [],
      totals: ZERO_TOTALS,
      warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).slice(0, 6) : [],
      needsUserReview: false,
      message: String(
        raw.message ||
          (status === "NO_EDIBLE_ITEM_DETECTED"
            ? "No food or drink detected."
            : "We couldn’t confidently identify the food in this image."),
      ),
    };
  }

  return {
    status,
    items,
    totals,
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).slice(0, 6) : [],
    needsUserReview: raw.needsUserReview !== false,
    message: String(raw.message || "Detected visible food or drink."),
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await verifyUser(req);
    checkRateLimit(userId, 20, 60_000);

    if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      return formatError("Invalid Content-Type. Must be multipart/form-data");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const mealType = formData.get("meal_type")?.toString().trim() || "meal";
    const localDate = formData.get("local_date")?.toString().trim() || "";
    const timezone = formData.get("timezone")?.toString().trim() || "local";
    const portionHints = formData.get("portion_hints")?.toString().trim() || "";
    const userContext = formData.get("context")?.toString().trim() || "";

    if (!(file instanceof File)) return formatError("Missing parameter: 'file' is required");
    if (!file.type.startsWith("image/")) return formatError(`Unsupported image type: ${file.type}`);
    if (file.size === 0) return formatError("The selected image is empty");
    if (file.size > MAX_IMAGE_BYTES) return formatError("Image exceeds the 10MB limit");

    const systemInstruction = `You are YSnap's food and drink image analysis service.
Return one valid JSON object only. Do not use markdown.
Use a two-stage pipeline inside this single response:
1. First decide whether the image contains edible food, drink, both, no edible item, or is too unclear.
2. Only estimate nutrition when visible edible food or drink is actually detected.

Never hallucinate invisible food. Never invent unrelated dishes.
Estimate nutrition from visible edible items only. Nutrition values are approximate, not exact.
Do not use restrictive dieting language, body comparison, or aggressive calorie goals.
If the image is unclear, return LOW_CONFIDENCE with zero items.
If no edible food or drink is visible, return NO_EDIBLE_ITEM_DETECTED with zero items.
Important: packaged drinks and drink containers count as edible/drink items even when sealed or unopened.
If the image shows a water bottle, Bisleri bottle, bottled water, drinking water glass, mineral water bottle, or packaged plain water, return DRINK_DETECTED and identify it as bottled water/water with 0 calories and do not add food items.
If the image shows a packaged beverage and label nutrition is not visible, identify the beverage and flag uncertainty instead of inventing precise facts.

Required JSON shape:
{
  "status": "FOOD_DETECTED | DRINK_DETECTED | FOOD_AND_DRINK_DETECTED | NO_EDIBLE_ITEM_DETECTED | LOW_CONFIDENCE",
  "items": [
    {
      "name": "Food name",
      "category": "food | drink",
      "portion": "visible portion estimate",
      "estimatedGrams": 0,
      "calories": 0,
      "proteinGrams": 0,
      "carbohydrateGrams": 0,
      "fatGrams": 0,
      "fibreGrams": 0,
      "confidence": 0.0
    }
  ],
  "totals": {
    "calories": 0,
    "proteinGrams": 0,
    "carbohydrateGrams": 0,
    "fatGrams": 0,
    "fibreGrams": 0
  },
  "warnings": [],
  "needsUserReview": true,
  "message": "Short user-facing result summary"
}`;

    const prompt = `Analyse this meal image for the YSnap Calorie Tracker.
Meal type: ${mealType}
Local date: ${localDate}
Timezone: ${timezone}
User context: ${userContext || "none"}
Portion hints: ${portionHints || "none"}

Return structured JSON only.
Stage 1 detection rules:
- Food visible: FOOD_DETECTED.
- Drink visible, including bottled water or sealed drink packaging: DRINK_DETECTED.
- Food and drink visible: FOOD_AND_DRINK_DETECTED.
- No edible food or drink visible: NO_EDIBLE_ITEM_DETECTED, items: [].
- Blurry/unclear/insufficient evidence: LOW_CONFIDENCE, items: [].

Stage 2 nutrition rules:
- Only list visible edible items.
- If multiple visible foods/drinks are present, list each separately and calculate combined totals.
- Always include calories, proteinGrams, carbohydrateGrams, fatGrams, and fibreGrams.
- Plain water/bottled water/Bisleri/mineral water must be DRINK_DETECTED with 0 calories, 0 macros, category "drink".
- Do not guess biryani, dal, rice, curry, or any dish unless it is clearly visible.`;

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const generated = await generateMultimodalResult(
      imageBytes,
      file.type,
      prompt,
      systemInstruction,
      true,
    );

    const parsed = safeParseAIJson<FoodAnalysisResult>(generated.text, {
      status: "any",
      items: "any",
      totals: "any",
      warnings: "array",
      needsUserReview: "any",
      message: "string",
    });

    const normalized = normalizeFoodAnalysis(parsed);

    await logUsageEvent(userId, "image_analysis", 1, "image", {
      feature: "calorie_tracker",
      meal_type: mealType,
      local_date: localDate,
      timezone,
      model: generated.model,
      item_count: normalized.items.length,
    });

    return formatResponse({
      ...normalized,
      analysis_model: generated.model,
    });
  } catch (error) {
    return formatError(error);
  }
});
