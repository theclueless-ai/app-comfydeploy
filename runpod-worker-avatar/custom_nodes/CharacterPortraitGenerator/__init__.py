"""
CharacterPortraitGenerator - Custom ComfyUI Node
Generates detailed portrait prompts from character parameters.
"""

import random

# =============================================================================
# DATA CONSTANTS (from avatar-data.ts)
# =============================================================================

HUMAN_DATA = {
    "gender": ["male", "female", "androgynous"],
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
        "dark brown eyes", "warm brown eyes", "light brown eyes",
        "hazel eyes", "amber eyes", "green eyes", "blue-green eyes",
        "sky blue eyes", "steel gray eyes", "silver eyes",
        "heterochromia one blue one brown eye",
        "heterochromia one green one brown eye",
    ],
    "eye_shape": [
        "almond-shaped eyes", "large round eyes", "hooded eyes",
        "monolid eyes", "upturned cat eyes", "downturned eyes",
        "wide-set eyes", "deep-set eyes",
    ],
    "nose": [
        "small button nose", "straight refined nose", "roman nose",
        "snub upturned nose", "wide flat nose", "narrow aquiline nose",
        "slightly upturned nose", "strong prominent nose",
    ],
    "lips": [
        "full plump lips", "thin lips", "heart-shaped lips",
        "wide lips", "cupid's bow lips", "pouty lips",
        "asymmetrical lips", "naturally pale lips",
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
    "eyes": [
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

RENDER_STYLES = [
    "photorealistic", "hyperrealistic 8K",
    "ultra-detailed digital art", "dark fantasy concept art",
    "cinematic film still",
]

LIGHTINGS = [
    "dramatic cinematic lighting", "harsh side lighting with deep shadows",
    "soft beauty studio lighting", "hard rim backlighting",
    "moody low-key chiaroscuro lighting", "vibrant neon city lighting",
    "warm golden hour sunlight", "cold blue moonlight",
    "diffuse overcast lighting", "theatrical spotlight",
    "butterfly lighting", "split lighting",
]

BACKGROUNDS = [
    "white studio background", "dark black background",
    "gradient gray background", "blurred bokeh background",
    "dark moody atmospheric background", "foggy ethereal background",
    "space nebula background", "neon-lit city background blurred",
    "warm beige studio background", "concrete textured background",
    "deep forest background blurred",
]


def resolve_random(value, options, rng):
    """Resolve RANDOM values using seeded RNG."""
    if value == "RANDOM":
        return rng.choice(options)
    return value


class CharacterPortraitGenerator:
    """Generates detailed portrait prompts from character parameters."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "character_type": (["HUMAN", "NON-HUMAN"],),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xFFFFFFFFFFFFFFFF}),
                "render_style": (["RANDOM"] + RENDER_STYLES,),
                "lighting": (["RANDOM"] + LIGHTINGS,),
                "background": (["RANDOM"] + BACKGROUNDS,),
                # Human features
                "A_gender": (["RANDOM"] + HUMAN_DATA["gender"],),
                "A_ethnicity": (["RANDOM"] + HUMAN_DATA["ethnicity"],),
                "A_age_range": (["RANDOM"] + HUMAN_DATA["age_range"],),
                "A_face_aspect": (["RANDOM"] + HUMAN_DATA["face_aspect"],),
                "A_skin_tone": (["RANDOM"] + HUMAN_DATA["skin_tone"],),
                "A_face_shape": (["RANDOM"] + HUMAN_DATA["face_shape"],),
                "A_hair_color": (["RANDOM"] + HUMAN_DATA["hair_color"],),
                "A_hair_style": (["RANDOM"] + HUMAN_DATA["hair_style"],),
                "A_eye_color": (["RANDOM"] + HUMAN_DATA["eye_color"],),
                "A_eye_shape": (["RANDOM"] + HUMAN_DATA["eye_shape"],),
                "A_nose": (["RANDOM"] + HUMAN_DATA["nose"],),
                "A_lips": (["RANDOM"] + HUMAN_DATA["lips"],),
                "A_freckles": (["RANDOM"] + HUMAN_DATA["freckles"],),
                "A_expression": (["RANDOM"] + HUMAN_DATA["expression"],),
                "A_distinctive_features": (["RANDOM"] + HUMAN_DATA["distinctive_features"],),
                # Non-human features
                "B_skin_texture": (["RANDOM"] + NONHUMAN_DATA["skin_texture"],),
                "B_skin_color": (["RANDOM"] + NONHUMAN_DATA["skin_color"],),
                "B_eyes": (["RANDOM"] + NONHUMAN_DATA["eyes"],),
                "B_face_structure": (["RANDOM"] + NONHUMAN_DATA["face_structure"],),
                "B_organic_additions": (["RANDOM"] + NONHUMAN_DATA["organic_additions"],),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "generate"
    CATEGORY = "TheClueless/Portrait"

    def generate(self, character_type, seed, render_style, lighting, background,
                 A_gender, A_ethnicity, A_age_range, A_face_aspect, A_skin_tone,
                 A_face_shape, A_hair_color, A_hair_style, A_eye_color, A_eye_shape,
                 A_nose, A_lips, A_freckles, A_expression, A_distinctive_features,
                 B_skin_texture, B_skin_color, B_eyes, B_face_structure, B_organic_additions):

        rng = random.Random(seed)

        # Resolve RANDOM values
        style = resolve_random(render_style, RENDER_STYLES, rng)
        light = resolve_random(lighting, LIGHTINGS, rng)
        bg = resolve_random(background, BACKGROUNDS, rng)

        parts = [f"{style}, close-up portrait, head and shoulders"]

        if character_type == "HUMAN":
            gender = resolve_random(A_gender, HUMAN_DATA["gender"], rng)
            ethnicity = resolve_random(A_ethnicity, HUMAN_DATA["ethnicity"], rng)
            age = resolve_random(A_age_range, HUMAN_DATA["age_range"], rng)
            face_aspect = resolve_random(A_face_aspect, HUMAN_DATA["face_aspect"], rng)
            skin_tone = resolve_random(A_skin_tone, HUMAN_DATA["skin_tone"], rng)
            face_shape = resolve_random(A_face_shape, HUMAN_DATA["face_shape"], rng)
            hair_color = resolve_random(A_hair_color, HUMAN_DATA["hair_color"], rng)
            hair_style = resolve_random(A_hair_style, HUMAN_DATA["hair_style"], rng)
            eye_color = resolve_random(A_eye_color, HUMAN_DATA["eye_color"], rng)
            eye_shape = resolve_random(A_eye_shape, HUMAN_DATA["eye_shape"], rng)
            nose = resolve_random(A_nose, HUMAN_DATA["nose"], rng)
            lips = resolve_random(A_lips, HUMAN_DATA["lips"], rng)
            freckles = resolve_random(A_freckles, HUMAN_DATA["freckles"], rng)
            expression = resolve_random(A_expression, HUMAN_DATA["expression"], rng)
            distinctive = resolve_random(A_distinctive_features, HUMAN_DATA["distinctive_features"], rng)

            parts.append(f"{gender} {ethnicity} person, {age}")
            parts.append(face_aspect)
            parts.append(f"{skin_tone}, {face_shape}")
            parts.append(f"{hair_color}, {hair_style}")
            parts.append(f"{eye_color}, {eye_shape}")
            parts.append(f"{nose}, {lips}")
            if freckles != "no freckles":
                parts.append(freckles)
            parts.append(expression)
            if distinctive != "no distinctive features":
                parts.append(distinctive)
        else:
            # NON-HUMAN
            skin_texture = resolve_random(B_skin_texture, NONHUMAN_DATA["skin_texture"], rng)
            skin_color = resolve_random(B_skin_color, NONHUMAN_DATA["skin_color"], rng)
            eyes = resolve_random(B_eyes, NONHUMAN_DATA["eyes"], rng)
            face_structure = resolve_random(B_face_structure, NONHUMAN_DATA["face_structure"], rng)
            organic = resolve_random(B_organic_additions, NONHUMAN_DATA["organic_additions"], rng)

            parts.append("non-human creature portrait, otherworldly being")
            parts.append(f"{skin_color}, {skin_texture}")
            parts.append(eyes)
            parts.append(face_structure)
            if organic != "no additional organic features":
                parts.append(organic)

        parts.append(f"{light}, {bg}")
        parts.append("highly detailed, sharp focus, professional photography")

        prompt = ", ".join(parts)
        return (prompt,)


NODE_CLASS_MAPPINGS = {
    "CharacterPortraitGenerator": CharacterPortraitGenerator,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CharacterPortraitGenerator": "Character Portrait Generator",
}
