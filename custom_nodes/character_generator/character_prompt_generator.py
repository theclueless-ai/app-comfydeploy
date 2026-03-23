"""
ComfyUI Character Prompt Generator — PORTRAIT ONLY
====================================================
Dos nodos en un solo archivo:

  🎭 CharacterPortraitGenerator  → prompts de RETRATO (cara/busto, sin ropa)
  👗 OutfitPromptGenerator       → prompts de OUTFIT (ropa, accesorios)

Flujo recomendado:
  [CharacterPortraitGenerator] → Flux/SDXL → genera retrato base
  [OutfitPromptGenerator]      → Flux Fill/Edit → añade ropa encima
"""

import random
import json


# ══════════════════════════════════════════════════════════════════════════════
#  BASE DE DATOS — PERSONAJES
# ══════════════════════════════════════════════════════════════════════════════

HUMAN_DATA = {
    "gender":    ["male", "female", "androgynous"],
    "ethnicity": [
        "Caucasian", "East Asian", "Southeast Asian", "South Asian",
        "Middle Eastern", "North African", "Sub-Saharan African",
        "Latino", "Indigenous", "Mixed ethnicity",
    ],
    "age_range": [
        "5 year old child", "10 year old child", "15 year old teenager",
        "early 20s young adult", "mid 20s young adult", "late 20s adult",
        "early 30s adult", "mid 30s adult", "40s adult", "mature 50s adult",
        "60s senior adult", "70s elderly adult", "75 year old elderly", "80 year old elderly",
    ],
    "face_aspect": [
        "unattractive portrait, facial asymmetry, dull skin",
        "attractive portrait, balanced features, clear skin",
        "beautiful portrait, symmetrical face, bright eyes",
        "stunning gorgeous model portrait, perfect symmetry, flawless skin, intense gaze",
    ],
    "body_type": [
        "slim thin build", "average build", "athletic muscular build",
        "stocky robust build", "heavyset large build", "petite small frame",
        "tall lanky build", "curvy voluptuous build", "broad-shouldered build",
        "wiry lean build",
    ],
    "skin_tone": [
        "very fair porcelain skin", "fair skin", "light skin",
        "light-medium skin", "medium skin", "olive skin",
        "tan skin", "brown skin", "dark brown skin", "deep dark skin",
    ],
    "face_shape": [
        "oval face shape", "round face shape", "square jaw face",
        "heart-shaped face", "diamond face shape", "long narrow face", "wide face",
    ],
    "hair_color": [
        "jet black hair", "dark brown hair", "chestnut brown hair",
        "warm brown hair", "dirty blonde hair", "golden blonde hair",
        "platinum blonde hair", "strawberry blonde hair", "auburn hair",
        "vibrant red hair", "silver gray hair", "pure white hair",
        "electric blue hair", "deep purple hair", "pastel pink hair",
        "emerald green hair", "bright teal hair", "vivid orange hair",
        "multicolored dyed hair",
    ],
    "hair_style": [
        "long straight hair", "long wavy hair", "long curly hair",
        "medium-length hair", "short pixie cut", "sleek bob cut",
        "high ponytail", "messy bun", "twin braids", "french braid",
        "dreadlocks", "undercut fade", "buzz cut", "shaved head",
        "wild windswept hair", "side-swept bangs", "mohawk",
    ],
    "eye_color": [
        "REMOVE",
        "dark brown eyes", "warm brown eyes", "light brown eyes",
        "hazel eyes", "amber eyes", "green eyes", "blue-green eyes",
        "sky blue eyes", "steel gray eyes", "silver eyes",
        "heterochromia one blue one brown eye",
        "heterochromia one green one brown eye",
    ],
    "eye_shape": [
        "REMOVE",
        "almond-shaped eyes", "large round eyes", "hooded eyes",
        "monolid eyes", "upturned cat eyes", "downturned eyes",
        "wide-set eyes", "deep-set eyes",
    ],
    "eyebrows": [
        "natural eyebrows", "thick bushy eyebrows", "thin arched eyebrows",
        "straight flat eyebrows", "high arched eyebrows", "rounded soft eyebrows",
        "angular sharp eyebrows", "unibrow", "very sparse light eyebrows",
        "feathered natural eyebrows", "dark bold eyebrows",
    ],
    "eyelashes": [
        "natural eyelashes", "long thick eyelashes", "short sparse eyelashes",
        "very long dramatic eyelashes", "curled upward eyelashes",
        "straight downward eyelashes", "wispy delicate eyelashes",
        "bold dark eyelashes", "barely visible light eyelashes",
    ],
    "nose": [
        "REMOVE",
        "small button nose", "straight refined nose", "roman nose",
        "snub upturned nose", "wide flat nose", "narrow aquiline nose",
        "slightly upturned nose", "strong prominent nose",
    ],
    "lips": [
        "REMOVE",
        "full plump lips", "thin lips", "heart-shaped lips",
        "wide lips", "cupid's bow lips", "pouty lips",
        "asymmetrical lips", "naturally pale lips",
    ],
    "ears": [
        "normal ears", "REMOVE", "small ears", "large prominent ears",
        "pointed elf-like ears", "low-set ears", "protruding ears",
        "ears with attached lobes", "ears with detached lobes",
    ],
    "freckles": [
        "no freckles", "very light freckles",
        "light freckles across nose", "heavy freckles all over face",
    ],
    "expression": [
        "neutral calm expression", "subtle confident smile",
        "serious intense expression", "mysterious enigmatic expression",
        "melancholic sad expression", "fierce determined expression",
        "gentle warm expression", "cold emotionless expression",
        "surprised expression", "smirking expression",
    ],
    "distinctive_features": [
        "no distinctive features", "thin facial scar on cheek",
        "small facial tattoo", "large birthmark on face",
        "subtle dimples", "nose ring piercing", "eyebrow piercing",
        "multiple face piercings", "beauty mark above lip",
        "strong defined jawline", "high sharp cheekbones",
        "very prominent ears", "extremely symmetrical features",
    ],
}

NONHUMAN_DATA = {

    # ── PELO (nuevo para Non-Human) ──────────────────────────────────────────
    "hair_color": [
        "REMOVE", "jet black hair", "dark brown hair", "pure white hair",
        "silver gray hair", "blood red hair", "deep purple hair",
        "toxic green hair", "electric blue hair", "pale translucent hair",
        "dark iridescent hair", "bone white hair", "ash gray hair",
        "midnight blue hair", "rust orange hair",
    ],
    "hair_style": [
        "REMOVE", "long straight hair", "long wild tangled hair",
        "slicked back hair", "floating weightless hair",
        "matted clumped hair", "wire-like rigid strands",
        "tentacle-like hair strands", "spiky upright hair",
        "hair fused to skull surface", "very short cropped hair",
        "asymmetric long on one side only", "braided tight to skull",
    ],

    # ── TEXTURA DE PIEL ───────────────────────────────────────────────────────
    "skin_texture": [
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
    ],

    # ── COLOR DE PIEL ─────────────────────────────────────────────────────────
    "skin_color": [
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
    ],

    # ── OJOS ──────────────────────────────────────────────────────────────────
    "eyes": [
        "REMOVE",
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
    ],

    # ── ESTRUCTURA FACIAL ─────────────────────────────────────────────────────
    "face_structure": [
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
    ],

    # ── ELEMENTOS ORGÁNICOS ───────────────────────────────────────────────────
    "organic_additions": [
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
    ],
}

PORTRAIT_SETTINGS = {
    "lighting": [
        "dramatic cinematic lighting", "harsh side lighting with deep shadows",
        "soft beauty studio lighting", "hard rim backlighting",
        "moody low-key chiaroscuro lighting", "vibrant neon city lighting",
        "warm golden hour sunlight", "cold blue moonlight",
        "diffuse overcast lighting", "theatrical spotlight",
        "butterfly lighting", "split lighting",
    ],
    "render_style": [
        "photorealistic", "hyperrealistic 8K",
        "ultra-detailed digital art", "dark fantasy concept art",
        "cinematic film still",
    ],
    "background": [
        "white studio background",  # ← default
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
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
#  BASE DE DATOS — ROPA
# ══════════════════════════════════════════════════════════════════════════════

OUTFIT_DATA = {
    "style_era": [
        "modern contemporary", "futuristic sci-fi", "cyberpunk",
        "dark fantasy medieval", "gothic Victorian", "high fashion couture",
        "streetwear urban", "military tactical", "traditional Japanese",
        "traditional Chinese", "traditional Korean", "ancient Greek",
        "post-apocalyptic", "steampunk", "elegant formal", "casual everyday",
        "bohemian", "punk rock", "art nouveau",
    ],
    "top": [
        "tailored white shirt with tie", "fitted black turtleneck",
        "ornate embroidered jacket", "sleeveless crop top",
        "oversized leather jacket", "structured military coat",
        "flowing open kimono top", "armored chest plate",
        "sheer silk blouse", "ripped band T-shirt",
        "elegant corseted bodice", "hooded cloak",
        "lab coat", "school uniform blazer",
        "traditional hanbok jacket", "qipao dress collar and top",
        "chainmail top", "ornate dragon-embroidered robe",
    ],
    "bottom": [
        "pleated mini skirt", "high-waist wide-leg trousers",
        "flowing maxi skirt", "tight leather pants",
        "armored battle skirt", "ripped distressed jeans",
        "structured pencil skirt", "shorts with suspenders",
        "long academic robe", "asymmetrical hem skirt",
        "no bottom visible — waist-up portrait only",
    ],
    "footwear": [
        "black knee-high spiked boots", "stiletto heels",
        "heavy combat boots", "platform chunky boots",
        "elegant pointed flats", "strappy sandals",
        "armored sabatons", "no footwear visible",
    ],
    "accessories": [
        "no accessories", "choker necklace", "layered silver chains",
        "statement earrings", "fingerless gloves",
        "leather fingerless gauntlets", "neck corset collar",
        "shoulder pauldrons armor", "cape flowing behind",
        "bandage wrappings on arms", "tactical belt and holsters",
        "wide brim hat", "flower crown", "circlet headband",
        "cat ears headband", "futuristic visor glasses",
        "ornate collar necklace", "crystal pendant",
    ],
    "fabric_texture": [
        "smooth silk fabric", "distressed worn leather",
        "heavy brocade embroidered fabric", "sheer translucent fabric",
        "rough linen fabric", "metallic shimmering fabric",
        "matte black latex", "soft velvet", "chain mail",
        "layered tulle", "raw denim", "knitted wool",
        "iridescent holographic fabric",
    ],
    "color_palette": [
        "all black monochrome", "black and white", "deep red and black",
        "navy blue and gold", "pure white and silver",
        "earthy tones brown and green", "pastel pink and lavender",
        "neon green and black", "purple and dark violet",
        "crimson and dark gold", "gray and steel blue",
        "cream and dusty rose", "multicolored vibrant",
        "dark teal and copper", "white and electric blue",
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
#  UTILITARIOS
# ══════════════════════════════════════════════════════════════════════════════

def pick(options: list, value: str) -> str:
    return random.choice(options) if value == "RANDOM" else value

def with_random(options: list) -> list:
    return ["RANDOM"] + list(options)


# ══════════════════════════════════════════════════════════════════════════════
#  NODO 1 — CHARACTER PORTRAIT GENERATOR
# ══════════════════════════════════════════════════════════════════════════════

class CharacterPortraitGenerator:
    """Genera prompts de RETRATO (cara/busto). Sin ropa ni cuerpo."""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {

            # Global
            "character_type": (["HUMAN", "NON-HUMAN"],),
            "seed":           ("INT", {"default": 0, "min": 0, "max": 0xFFFFFFFF, "step": 1, "display": "number"}),
            "render_style":   (with_random(PORTRAIT_SETTINGS["render_style"]),),
            "lighting":       (with_random(PORTRAIT_SETTINGS["lighting"]),),
            "background":     (PORTRAIT_SETTINGS["background"],),

            # ── Sección A: Humanos ──────────────────────────────────────────
            "A_gender":               (HUMAN_DATA["gender"],),
            "A_ethnicity":            (with_random(HUMAN_DATA["ethnicity"]),),
            "A_age_range":            (with_random(HUMAN_DATA["age_range"]),),
            "A_face_aspect":          (with_random(HUMAN_DATA["face_aspect"]),),
            "A_body_type":            (with_random(HUMAN_DATA["body_type"]),),
            "A_skin_tone":            (with_random(HUMAN_DATA["skin_tone"]),),
            "A_face_shape":           (with_random(HUMAN_DATA["face_shape"]),),
            "A_hair_color":           (with_random(HUMAN_DATA["hair_color"]),),
            "A_hair_style":           (with_random(HUMAN_DATA["hair_style"]),),
            "A_eye_color":            (with_random(HUMAN_DATA["eye_color"]),),
            "A_eye_shape":            (with_random(HUMAN_DATA["eye_shape"]),),
            "A_eyebrows":             (with_random(HUMAN_DATA["eyebrows"]),),
            "A_eyelashes":            (with_random(HUMAN_DATA["eyelashes"]),),
            "A_nose":                 (with_random(HUMAN_DATA["nose"]),),
            "A_lips":                 (with_random(HUMAN_DATA["lips"]),),
            "A_ears":                 (HUMAN_DATA["ears"],),
            "A_freckles":             (HUMAN_DATA["freckles"],),
            "A_expression":           (with_random(HUMAN_DATA["expression"]),),
            # distinctive_features es STRING libre para permitir multi-selección
            "A_distinctive_features": ("STRING", {
                "default": "no distinctive features",
                "multiline": False,
                "placeholder": "comma-separated: thin facial scar on cheek, subtle dimples",
            }),

            # ── Sección B: No-Humanos ───────────────────────────────────────
            "B_hair_color":        (with_random(NONHUMAN_DATA["hair_color"]),),
            "B_hair_style":        (with_random(NONHUMAN_DATA["hair_style"]),),
            "B_skin_texture":      (with_random(NONHUMAN_DATA["skin_texture"]),),
            "B_skin_color":        (with_random(NONHUMAN_DATA["skin_color"]),),
            "B_eyes":              (with_random(NONHUMAN_DATA["eyes"]),),
            "B_face_structure":    (with_random(NONHUMAN_DATA["face_structure"]),),
            "B_organic_additions": (with_random(NONHUMAN_DATA["organic_additions"]),),

            # ── Campo libre para parámetros adicionales ─────────────────────
            "extra_details": ("STRING", {
                "default": "",
                "multiline": True,
                "placeholder": "Custom details: 'face tattoo of a dragon', 'glowing eyes', 'cybernetic implant on left cheek'...",
            }),
        }}

    RETURN_TYPES  = ("STRING", "STRING", "STRING")
    RETURN_NAMES  = ("PORTRAIT_PROMPT", "JSON_METADATA", "NEGATIVE_PROMPT")
    FUNCTION      = "generate"
    CATEGORY      = "🎭 Character Generator"

    def generate(
        self,
        character_type, seed, render_style, lighting, background,
        A_gender, A_ethnicity, A_age_range, A_face_aspect, A_body_type, A_skin_tone, A_face_shape,
        A_hair_color, A_hair_style, A_eye_color, A_eye_shape,
        A_eyebrows, A_eyelashes,
        A_nose, A_lips, A_ears, A_freckles, A_expression, A_distinctive_features,
        B_hair_color, B_hair_style,
        B_skin_texture, B_skin_color, B_eyes, B_face_structure, B_organic_additions,
        extra_details,
    ):
        if seed == 0:
            seed = random.randint(1, 0xFFFFFFFF)
        random.seed(seed)

        r_render = pick(PORTRAIT_SETTINGS["render_style"], render_style)
        r_light  = pick(PORTRAIT_SETTINGS["lighting"],     lighting)
        r_bg     = pick(PORTRAIT_SETTINGS["background"],   background)

        meta  = {"seed": seed, "character_type": character_type,
                 "render_style": r_render, "lighting": r_light, "background": r_bg}
        parts = []

        # Helper: REMOVE means the feature is absent from the prompt
        def resolve(data_key, value, data_dict=HUMAN_DATA):
            """Resolve a value: REMOVE → None, RANDOM → pick, else identity."""
            if value == "REMOVE":
                return None
            return pick(data_dict[data_key], value)

        if character_type == "HUMAN":
            r = {
                "g":   A_gender,
                "eth": pick(HUMAN_DATA["ethnicity"],   A_ethnicity),
                "age": pick(HUMAN_DATA["age_range"],   A_age_range),
                "fa":  pick(HUMAN_DATA["face_aspect"], A_face_aspect),
                "bt":  pick(HUMAN_DATA["body_type"],   A_body_type),
                "sk":  pick(HUMAN_DATA["skin_tone"],   A_skin_tone),
                "fs":  pick(HUMAN_DATA["face_shape"],  A_face_shape),
                "hc":  pick(HUMAN_DATA["hair_color"],  A_hair_color),
                "hs":  pick(HUMAN_DATA["hair_style"],  A_hair_style),
                "ec":  resolve("eye_color",  A_eye_color),
                "es":  resolve("eye_shape",  A_eye_shape),
                "eb":  pick(HUMAN_DATA["eyebrows"],    A_eyebrows),
                "el":  pick(HUMAN_DATA["eyelashes"],   A_eyelashes),
                "no":  resolve("nose",       A_nose),
                "li":  resolve("lips",       A_lips),
                "ea":  A_ears,
                "fr":  A_freckles,
                "ex":  pick(HUMAN_DATA["expression"],  A_expression),
                "df":  A_distinctive_features,  # now a free-form STRING
            }
            meta.update({
                "gender": r["g"], "ethnicity": r["eth"], "age_range": r["age"],
                "face_aspect": r["fa"], "body_type": r["bt"],
                "skin_tone": r["sk"], "face_shape": r["fs"],
                "hair_color": r["hc"], "hair_style": r["hs"],
                "eye_color": r["ec"] or "REMOVE", "eye_shape": r["es"] or "REMOVE",
                "eyebrows": r["eb"], "eyelashes": r["el"],
                "nose": r["no"] or "REMOVE", "lips": r["li"] or "REMOVE",
                "ears": r["ea"], "freckles": r["fr"],
                "expression": r["ex"], "distinctive_features": r["df"],
            })
            parts = [
                r_render,
                f"portrait of a {r['age']} {r['eth']} {r['g']}, {r['bt']}",
                r["fa"],
                r["sk"], r["fs"],
            ]

            # ── REMOVE features go FIRST for maximum weight ──────────────
            # Collect removal descriptions early so they appear near the
            # beginning of the prompt where diffusion models pay more attention.
            eyes_removed  = r["ec"] is None and r["es"] is None
            nose_removed  = r["no"] is None
            lips_removed  = r["li"] is None
            ears_removed  = r["ea"] == "REMOVE"

            if eyes_removed:
                parts.append("eyeless face, smooth continuous skin covering the eye area, flat featureless surface where eyes would be, mannequin-like blank eye area")
            if nose_removed:
                parts.append("noseless face, completely flat smooth skin between eyes and mouth, no nasal features at all")
            if lips_removed:
                parts.append("mouthless face, smooth unbroken skin below the nose, no mouth opening, no lip line")
            if ears_removed:
                parts.append("earless head, smooth rounded sides of skull with no ear features")

            # ── Hair ─────────────────────────────────────────────────────
            parts.append(f"{r['hc']}, {r['hs']}")

            # ── Eyes (only if not removed) ───────────────────────────────
            if not eyes_removed:
                if r["ec"]:
                    parts.append(r["ec"])
                if r["es"]:
                    parts.append(r["es"])

            # Eyebrows and eyelashes
            parts.append(r["eb"])
            parts.append(r["el"])

            # ── Nose (only if not removed) ───────────────────────────────
            if not nose_removed:
                parts.append(r["no"])

            # ── Lips/mouth (only if not removed) ─────────────────────────
            if not lips_removed:
                parts.append(r["li"])

            # ── Ears (only if not removed) ───────────────────────────────
            if not ears_removed:
                if r["ea"] != "normal ears":
                    parts.append(r["ea"])

            parts.append(r["fr"])

            # If eyes are removed, force a compatible expression
            if eyes_removed:
                parts.append("neutral calm expression")
            else:
                parts.append(r["ex"])

            # Distinctive features (multi-select, comma-separated string)
            if r["df"] and r["df"].strip() and r["df"] != "no distinctive features":
                parts.append(r["df"])

        else:
            # Non-human — now with optional hair and removable eyes
            r_hcol = resolve("hair_color", B_hair_color, NONHUMAN_DATA)
            r_hsty = resolve("hair_style", B_hair_style, NONHUMAN_DATA)
            r_stex = pick(NONHUMAN_DATA["skin_texture"],      B_skin_texture)
            r_scol = pick(NONHUMAN_DATA["skin_color"],        B_skin_color)
            r_eyes = resolve("eyes",                           B_eyes, NONHUMAN_DATA)
            r_face = pick(NONHUMAN_DATA["face_structure"],    B_face_structure)
            r_org  = pick(NONHUMAN_DATA["organic_additions"], B_organic_additions)

            nh_eyes_removed = r_eyes is None

            meta.update({
                "hair_color": r_hcol or "REMOVE", "hair_style": r_hsty or "REMOVE",
                "skin_texture": r_stex, "skin_color": r_scol,
                "eyes": r_eyes or "REMOVE", "face_structure": r_face,
                "organic_additions": r_org,
            })

            parts = [
                r_render,
                "portrait of a surreal non-human being",
            ]

            # REMOVE descriptions go first for maximum weight
            if nh_eyes_removed:
                parts.append("eyeless creature, smooth flat skin where eyes would be, no eye sockets, no eye openings, featureless eye area")

            parts += [r_scol, r_stex, r_face]

            # Eyes (only if not removed)
            if not nh_eyes_removed:
                parts.append(r_eyes)

            # Hair
            if r_hcol:
                parts.append(r_hcol)
            if r_hsty:
                parts.append(r_hsty)
            if r_hcol is None and r_hsty is None:
                parts.append("completely bald, no hair")
            if "no additional" not in r_org:
                parts.append(r_org)

        # Extra custom details (free text field)
        if extra_details and extra_details.strip():
            parts.append(extra_details.strip())
            meta["extra_details"] = extra_details.strip()

        # Use "detailed skin texture" instead of "detailed face" when features
        # are removed — "detailed face" encourages the model to add all features.
        has_removals = False
        if character_type == "HUMAN":
            has_removals = eyes_removed or nose_removed or lips_removed or ears_removed
        else:
            has_removals = (r_hcol is None and r_hsty is None) or nh_eyes_removed

        detail_tag = "detailed skin texture" if has_removals else "detailed face"
        parts += [r_light, r_bg, "face portrait only", "no clothing visible", detail_tag, "sharp focus", "high quality", "masterpiece"]
        parts  = [p.strip() for p in parts if p and p.strip()]
        prompt = ", ".join(parts)

        # ── Build dynamic NEGATIVE PROMPT ──────────────────────────────
        neg_parts = ["blurry image, low quality, bad quality, watermark"]

        if character_type == "HUMAN":
            # Aggressively negate removed features
            if r["ec"] is None and r["es"] is None:
                neg_parts.append("(eyes:1.5), eyeballs, iris, pupils, eye sockets, eye reflections, eye highlights, gaze, staring")
            if r["no"] is None:
                neg_parts.append("(nose:1.5), nostrils, nose bridge, nose tip, nose shadow, nasal")
            if r["li"] is None:
                neg_parts.append("(mouth:1.5), (lips:1.5), teeth, tongue, smile, grin, lip color, lip gloss, open mouth")
            if r["ea"] == "REMOVE":
                neg_parts.append("(ears:1.5), ear lobes, ear canal, ear piercings")
        else:
            # NON-HUMAN: negate human-like features + removed features
            neg_parts.append("realistic human face, normal human skin, natural human eyes, photograph of a real person")
            if nh_eyes_removed:
                neg_parts.append("(eyes:1.5), eyeballs, iris, pupils, eye sockets, eye reflections, eye highlights, gaze, staring")
            if r_hcol is None and r_hsty is None:
                neg_parts.append("(hair:1.5), flowing hair, hair strands, hair on head")

        negative_prompt = ", ".join(neg_parts)

        return (prompt, json.dumps(meta, indent=2, ensure_ascii=False), negative_prompt)


# ══════════════════════════════════════════════════════════════════════════════
#  REGISTRO
# ══════════════════════════════════════════════════════════════════════════════

NODE_CLASS_MAPPINGS = {
    "CharacterPortraitGenerator": CharacterPortraitGenerator,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterPortraitGenerator": "🎭 Character Portrait Generator",
}
