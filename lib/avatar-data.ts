/**
 * Character data constants for Avatar Generator
 * Extracted from ComfyUI CharacterPortraitGenerator node
 */

export function withRandom(options: readonly string[]): string[] {
  return ["RANDOM", ...options];
}

// ══════════════════════════════════════════════════════════════════════════════
//  HUMAN DATA
// ══════════════════════════════════════════════════════════════════════════════

export const HUMAN_DATA = {
  gender: ["male", "female", "androgynous"] as const,
  ethnicity: [
    "Caucasian", "East Asian", "Southeast Asian", "South Asian",
    "Middle Eastern", "North African", "Sub-Saharan African",
    "Latino", "Indigenous", "Mixed ethnicity",
  ] as const,
  age_range: [
    "early 20s young adult", "mid 20s young adult", "late 20s adult",
    "early 30s adult", "mid 30s adult", "40s adult", "mature 50s adult",
  ] as const,
  skin_tone: [
    "very fair porcelain skin", "fair skin", "light skin",
    "light-medium skin", "medium skin", "olive skin",
    "tan skin", "brown skin", "dark brown skin", "deep dark skin",
  ] as const,
  face_shape: [
    "oval face shape", "round face shape", "square jaw face",
    "heart-shaped face", "diamond face shape", "long narrow face", "wide face",
  ] as const,
  hair_color: [
    "jet black hair", "dark brown hair", "chestnut brown hair",
    "warm brown hair", "dirty blonde hair", "golden blonde hair",
    "platinum blonde hair", "strawberry blonde hair", "auburn hair",
    "vibrant red hair", "silver gray hair", "pure white hair",
    "electric blue hair", "deep purple hair", "pastel pink hair",
    "emerald green hair", "bright teal hair", "vivid orange hair",
    "multicolored dyed hair",
  ] as const,
  hair_style: [
    "long straight hair", "long wavy hair", "long curly hair",
    "medium-length hair", "short pixie cut", "sleek bob cut",
    "high ponytail", "messy bun", "twin braids", "french braid",
    "dreadlocks", "undercut fade", "buzz cut", "shaved head",
    "wild windswept hair", "side-swept bangs", "mohawk",
  ] as const,
  eye_color: [
    "dark brown eyes", "warm brown eyes", "light brown eyes",
    "hazel eyes", "amber eyes", "green eyes", "blue-green eyes",
    "sky blue eyes", "steel gray eyes", "silver eyes",
    "heterochromia one blue one brown eye",
    "heterochromia one green one brown eye",
  ] as const,
  eye_shape: [
    "almond-shaped eyes", "large round eyes", "hooded eyes",
    "monolid eyes", "upturned cat eyes", "downturned eyes",
    "wide-set eyes", "deep-set eyes",
  ] as const,
  nose: [
    "small button nose", "straight refined nose", "roman nose",
    "snub upturned nose", "wide flat nose", "narrow aquiline nose",
    "slightly upturned nose", "strong prominent nose",
  ] as const,
  lips: [
    "full plump lips", "thin lips", "heart-shaped lips",
    "wide lips", "cupid's bow lips", "pouty lips",
    "asymmetrical lips", "naturally pale lips",
  ] as const,
  freckles: [
    "no freckles", "very light freckles",
    "light freckles across nose", "heavy freckles all over face",
  ] as const,
  expression: [
    "neutral calm expression", "subtle confident smile",
    "serious intense expression", "mysterious enigmatic expression",
    "melancholic sad expression", "fierce determined expression",
    "gentle warm expression", "cold emotionless expression",
    "surprised expression", "smirking expression",
  ] as const,
  distinctive_features: [
    "no distinctive features", "thin facial scar on cheek",
    "small facial tattoo", "large birthmark on face",
    "subtle dimples", "nose ring piercing", "eyebrow piercing",
    "multiple face piercings", "beauty mark above lip",
    "strong defined jawline", "high sharp cheekbones",
    "very prominent ears", "extremely symmetrical features",
  ] as const,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
//  NON-HUMAN DATA
// ══════════════════════════════════════════════════════════════════════════════

export const NONHUMAN_DATA = {
  skin_texture: [
    "smooth matte latex-like skin",
    "high-gloss wet rubber skin",
    "fine reptile scales covering entire face",
    "micro snake scales on cheeks and forehead",
    "cracked dry porcelain skin with fine hairline fractures",
    "melted wax dripping texture on skin",
    "deeply wrinkled ancient bark-like skin",
    "smooth featureless mannequin skin, no pores",
    "translucent skin with dark veins clearly visible underneath",
    "skin covered in irregular raised bumps and nodules",
    "black and white cow-pattern pigmentation patches",
    "pale skin with dark branching vein network across face",
    "skin surface that looks carved or sculpted from clay",
    "deep red raw flesh texture, like exposed dermis",
    "skin with organic mesh-like lattice structure grown over it",
    "scattered dark pigment spots on near-white base skin",
  ] as const,
  skin_color: [
    "chalk white almost luminous skin",
    "pale gray desaturated skin",
    "very pale beige skin, almost colorless",
    "dark charcoal gray skin",
    "deep matte black skin",
    "dusty rose tinted pale skin",
    "cold blue-gray skin",
    "warm sand beige skin with visible pallor",
    "deep dark brown skin with cool undertones",
    "iridescent skin shifting between pink and blue tones",
    "deep red skin like raw exposed muscle",
    "mottled pale skin with irregular darker patches",
  ] as const,
  eyes: [
    "completely black eyes, no whites, no iris visible",
    "solid white blind eyes with no pupil",
    "milky clouded cataract eyes",
    "large oversized eyes with no eyelids",
    "vertical slit reptile pupils in amber iris",
    "vertical slit reptile pupils in bright green iris",
    "huge eyes with fully dilated black pupils",
    "eyes fused shut with smooth skin grown over them",
    "yellow-green predator eyes with narrow slit pupils",
    "eyes placed asymmetrically on the face",
    "deep red irises filling the entire visible eye",
    "no visible eyes at all, just smooth flat skin",
    "pale gray eyes with no distinguishable pupil or iris",
    "dark almond eyes with multiple small reflective pupils",
  ] as const,
  face_structure: [
    "extremely elongated narrow skull, alien proportions",
    "very wide flat face with compressed features",
    "no visible nose, just two small vertical breathing slits",
    "nose partially absorbed into face surface, nearly flat",
    "no visible ears, perfectly smooth skin on sides of head",
    "lips extremely thin, almost non-existent line",
    "mouth stretched unnaturally wide for the face",
    "deeply sunken eye sockets with protruding brow ridge",
    "forehead extends far back in long elongated dome",
    "jaw merges seamlessly into neck, no defined chin",
    "perfectly symmetrical uncanny valley smooth face",
    "vertical bone ridge running down center of forehead",
    "cheekbones so sharp and prominent they cast deep shadows",
    "lower face hollowed inward, mouth recessed deeply",
  ] as const,
  organic_additions: [
    "no additional organic features",
    "sharp bone spikes emerging from forehead and cheekbones",
    "small blunt horns growing organically from skull",
    "thin delicate antler branches growing from temples",
    "dark thorny spines along jawline and cheekbones",
    "wet dark organic tendrils hanging from chin",
    "dark veins raised above skin surface like roots",
    "small translucent crystalline growths embedded in skin",
    "clusters of dark organic spikes on crown of head",
    "flat cartilage ridge fins along top of skull",
    "chains and piercings embedded directly into facial skin",
    "hair replaced entirely by wet dark organic fiber strands",
    "hair replaced by white rigid biomechanical wire strands",
    "dark floral organic growths emerging from one side of head",
    "loose organic tissue folds hanging from cheeks",
    "dark moss-like organic texture growing on one side of face",
  ] as const,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
//  PORTRAIT SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

export const PORTRAIT_SETTINGS = {
  render_style: [
    "photorealistic", "hyperrealistic 8K",
    "ultra-detailed digital art", "dark fantasy concept art",
    "cinematic film still",
  ] as const,
  lighting: [
    "dramatic cinematic lighting", "harsh side lighting with deep shadows",
    "soft beauty studio lighting", "hard rim backlighting",
    "moody low-key chiaroscuro lighting", "vibrant neon city lighting",
    "warm golden hour sunlight", "cold blue moonlight",
    "diffuse overcast lighting", "theatrical spotlight",
    "butterfly lighting", "split lighting",
  ] as const,
  background: [
    "white studio background",
    "RANDOM",
    "dark black background",
    "gradient gray background",
    "blurred bokeh background",
    "dark moody atmospheric background",
    "foggy ethereal background",
    "space nebula background",
    "neon-lit city background blurred",
    "warm beige studio background",
    "concrete textured background",
    "deep forest background blurred",
  ] as const,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
//  COLOR GRADING DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

export const COLOR_GRADING = {
  temperature: { default: 0, min: -100, max: 100, step: 1 },
  hue:         { default: 0, min: -90,  max: 90,  step: 1 },
  brightness:  { default: 0, min: -100, max: 100, step: 1 },
  contrast:    { default: 0, min: -100, max: 100, step: 1 },
  saturation:  { default: 0, min: -100, max: 100, step: 1 },
  gamma:       { default: 1, min: 0.2,  max: 2.2, step: 0.1 },
} as const;
