"use client";

import { useState } from "react";
import { SelectInput } from "./select-input";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
import {
  HUMAN_DATA,
  NONHUMAN_DATA,
  PORTRAIT_SETTINGS,
  COLOR_GRADING,
  withRandom,
} from "@/lib/avatar-data";

interface AvatarFormProps {
  onSubmit: (inputs: Record<string, string | number>) => Promise<void>;
  isLoading: boolean;
}

type CharacterType = "HUMAN" | "NON-HUMAN";

interface ColorGradingValues {
  temperature: number;
  hue: number;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-[rgb(var(--border))]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
        {title}
      </span>
      <div className="h-px flex-1 bg-[rgb(var(--border))]" />
    </div>
  );
}

function ColorGradingSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          {label}
        </label>
        <span className="text-xs font-semibold text-brand-pink tabular-nums">
          {step < 1 ? value.toFixed(1) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer",
          "focus:outline-none",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-3.5",
          "[&::-webkit-slider-thumb]:h-3.5",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-brand-pink",
          "[&::-webkit-slider-thumb]:shadow-sm",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:w-3.5",
          "[&::-moz-range-thumb]:h-3.5",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-brand-pink",
          "[&::-moz-range-thumb]:border-none",
          "[&::-moz-range-thumb]:cursor-pointer"
        )}
        style={{
          background: `linear-gradient(to right, #ff9ce0 0%, #ff9ce0 ${percentage}%, rgb(var(--border)) ${percentage}%, rgb(var(--border)) 100%)`,
        }}
      />
    </div>
  );
}

export function AvatarForm({ onSubmit, isLoading }: AvatarFormProps) {
  // Character type
  const [characterType, setCharacterType] = useState<CharacterType>("HUMAN");

  // Portrait settings
  const [renderStyle, setRenderStyle] = useState("RANDOM");
  const [lighting, setLighting] = useState("RANDOM");
  const [background, setBackground] = useState("white studio background");
  const [seed, setSeed] = useState("0");

  // Human features
  const [gender, setGender] = useState("female");
  const [ethnicity, setEthnicity] = useState("RANDOM");
  const [ageRange, setAgeRange] = useState("RANDOM");
  const [skinTone, setSkinTone] = useState("RANDOM");
  const [faceShape, setFaceShape] = useState("RANDOM");
  const [hairColor, setHairColor] = useState("RANDOM");
  const [hairStyle, setHairStyle] = useState("RANDOM");
  const [eyeColor, setEyeColor] = useState("RANDOM");
  const [eyeShape, setEyeShape] = useState("RANDOM");
  const [nose, setNose] = useState("RANDOM");
  const [lips, setLips] = useState("RANDOM");
  const [freckles, setFreckles] = useState("no freckles");
  const [expression, setExpression] = useState("RANDOM");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState("RANDOM");

  // Non-human features
  const [skinTexture, setSkinTexture] = useState("RANDOM");
  const [skinColor, setSkinColor] = useState("RANDOM");
  const [eyes, setEyes] = useState("RANDOM");
  const [faceStructure, setFaceStructure] = useState("RANDOM");
  const [organicAdditions, setOrganicAdditions] = useState("RANDOM");

  // Color grading
  const [showColorGrading, setShowColorGrading] = useState(false);
  const [colorGrading, setColorGrading] = useState<ColorGradingValues>({
    temperature: COLOR_GRADING.temperature.default,
    hue: COLOR_GRADING.hue.default,
    brightness: COLOR_GRADING.brightness.default,
    contrast: COLOR_GRADING.contrast.default,
    saturation: COLOR_GRADING.saturation.default,
    gamma: COLOR_GRADING.gamma.default,
  });

  const updateColorGrading = (field: keyof ColorGradingValues, value: number) => {
    setColorGrading((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputs: Record<string, string | number> = {
      // Character type & settings
      character_type: characterType,
      seed: parseInt(seed) || 0,
      render_style: renderStyle,
      lighting: lighting,
      background: background,

      // Human features
      A_gender: gender,
      A_ethnicity: ethnicity,
      A_age_range: ageRange,
      A_skin_tone: skinTone,
      A_face_shape: faceShape,
      A_hair_color: hairColor,
      A_hair_style: hairStyle,
      A_eye_color: eyeColor,
      A_eye_shape: eyeShape,
      A_nose: nose,
      A_lips: lips,
      A_freckles: freckles,
      A_expression: expression,
      A_distinctive_features: distinctiveFeatures,

      // Non-human features
      B_skin_texture: skinTexture,
      B_skin_color: skinColor,
      B_eyes: eyes,
      B_face_structure: faceStructure,
      B_organic_additions: organicAdditions,

      // Color grading
      temperature: colorGrading.temperature,
      hue: colorGrading.hue,
      brightness: colorGrading.brightness,
      contrast: colorGrading.contrast,
      saturation: colorGrading.saturation,
      gamma: colorGrading.gamma,
    };

    await onSubmit(inputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Character Type Toggle */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          Character Type
        </label>
        <div className="flex gap-1 p-0.5 rounded-md bg-[rgb(var(--background))] border border-[rgb(var(--border))]">
          {(["HUMAN", "NON-HUMAN"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCharacterType(type)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all",
                characterType === type
                  ? "bg-brand-pink text-gray-900 shadow-sm"
                  : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
              )}
            >
              {type === "HUMAN" ? "Human" : "Non-Human"}
            </button>
          ))}
        </div>
      </div>

      {/* Portrait Settings */}
      <SectionHeader title="Portrait Settings" />
      <SelectInput
        label="Render Style"
        value={renderStyle}
        onChange={setRenderStyle}
        options={withRandom([...PORTRAIT_SETTINGS.render_style])}
      />
      <SelectInput
        label="Lighting"
        value={lighting}
        onChange={setLighting}
        options={withRandom([...PORTRAIT_SETTINGS.lighting])}
      />
      <SelectInput
        label="Background"
        value={background}
        onChange={setBackground}
        options={[...PORTRAIT_SETTINGS.background]}
      />
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          Seed <span className="text-[rgb(var(--muted-foreground))]/60">(0 = random)</span>
        </label>
        <input
          type="number"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          min={0}
          max={4294967295}
          className={cn(
            "w-full px-3 py-2",
            "bg-[rgb(var(--input))] border border-[rgb(var(--border-input))] rounded-md",
            "text-[rgb(var(--muted-foreground))] text-xs",
            "focus:outline-none focus:ring-1 focus:ring-brand-pink focus:border-transparent",
            "transition-all duration-200",
            "hover:border-brand-pink/50"
          )}
        />
      </div>

      {/* Human Features */}
      {characterType === "HUMAN" && (
        <>
          <SectionHeader title="Human Features" />
          <SelectInput
            label="Gender"
            value={gender}
            onChange={setGender}
            options={[...HUMAN_DATA.gender]}
          />
          <SelectInput
            label="Ethnicity"
            value={ethnicity}
            onChange={setEthnicity}
            options={withRandom([...HUMAN_DATA.ethnicity])}
          />
          <SelectInput
            label="Age Range"
            value={ageRange}
            onChange={setAgeRange}
            options={withRandom([...HUMAN_DATA.age_range])}
          />
          <SelectInput
            label="Skin Tone"
            value={skinTone}
            onChange={setSkinTone}
            options={withRandom([...HUMAN_DATA.skin_tone])}
          />
          <SelectInput
            label="Face Shape"
            value={faceShape}
            onChange={setFaceShape}
            options={withRandom([...HUMAN_DATA.face_shape])}
          />
          <SelectInput
            label="Hair Color"
            value={hairColor}
            onChange={setHairColor}
            options={withRandom([...HUMAN_DATA.hair_color])}
          />
          <SelectInput
            label="Hair Style"
            value={hairStyle}
            onChange={setHairStyle}
            options={withRandom([...HUMAN_DATA.hair_style])}
          />
          <SelectInput
            label="Eye Color"
            value={eyeColor}
            onChange={setEyeColor}
            options={withRandom([...HUMAN_DATA.eye_color])}
          />
          <SelectInput
            label="Eye Shape"
            value={eyeShape}
            onChange={setEyeShape}
            options={withRandom([...HUMAN_DATA.eye_shape])}
          />
          <SelectInput
            label="Nose"
            value={nose}
            onChange={setNose}
            options={withRandom([...HUMAN_DATA.nose])}
          />
          <SelectInput
            label="Lips"
            value={lips}
            onChange={setLips}
            options={withRandom([...HUMAN_DATA.lips])}
          />
          <SelectInput
            label="Freckles"
            value={freckles}
            onChange={setFreckles}
            options={[...HUMAN_DATA.freckles]}
          />
          <SelectInput
            label="Expression"
            value={expression}
            onChange={setExpression}
            options={withRandom([...HUMAN_DATA.expression])}
          />
          <SelectInput
            label="Distinctive Features"
            value={distinctiveFeatures}
            onChange={setDistinctiveFeatures}
            options={withRandom([...HUMAN_DATA.distinctive_features])}
          />
        </>
      )}

      {/* Non-Human Features */}
      {characterType === "NON-HUMAN" && (
        <>
          <SectionHeader title="Non-Human Features" />
          <SelectInput
            label="Skin Texture"
            value={skinTexture}
            onChange={setSkinTexture}
            options={withRandom([...NONHUMAN_DATA.skin_texture])}
          />
          <SelectInput
            label="Skin Color"
            value={skinColor}
            onChange={setSkinColor}
            options={withRandom([...NONHUMAN_DATA.skin_color])}
          />
          <SelectInput
            label="Eyes"
            value={eyes}
            onChange={setEyes}
            options={withRandom([...NONHUMAN_DATA.eyes])}
          />
          <SelectInput
            label="Face Structure"
            value={faceStructure}
            onChange={setFaceStructure}
            options={withRandom([...NONHUMAN_DATA.face_structure])}
          />
          <SelectInput
            label="Organic Additions"
            value={organicAdditions}
            onChange={setOrganicAdditions}
            options={withRandom([...NONHUMAN_DATA.organic_additions])}
          />
        </>
      )}

      {/* Color Grading (collapsible) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowColorGrading(!showColorGrading)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium",
            "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
            "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]",
            "transition-all duration-200 hover:border-brand-pink/50"
          )}
        >
          <span>Color Grading</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              showColorGrading && "rotate-180"
            )}
          />
        </button>

        {showColorGrading && (
          <div className="mt-2 space-y-3 px-1">
            <ColorGradingSlider
              label="Temperature"
              value={colorGrading.temperature}
              onChange={(v) => updateColorGrading("temperature", v)}
              {...COLOR_GRADING.temperature}
            />
            <ColorGradingSlider
              label="Hue"
              value={colorGrading.hue}
              onChange={(v) => updateColorGrading("hue", v)}
              {...COLOR_GRADING.hue}
            />
            <ColorGradingSlider
              label="Brightness"
              value={colorGrading.brightness}
              onChange={(v) => updateColorGrading("brightness", v)}
              {...COLOR_GRADING.brightness}
            />
            <ColorGradingSlider
              label="Contrast"
              value={colorGrading.contrast}
              onChange={(v) => updateColorGrading("contrast", v)}
              {...COLOR_GRADING.contrast}
            />
            <ColorGradingSlider
              label="Saturation"
              value={colorGrading.saturation}
              onChange={(v) => updateColorGrading("saturation", v)}
              {...COLOR_GRADING.saturation}
            />
            <ColorGradingSlider
              label="Gamma"
              value={colorGrading.gamma}
              onChange={(v) => updateColorGrading("gamma", v)}
              {...COLOR_GRADING.gamma}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full py-2.5 px-4 rounded-md font-medium transition-all text-sm",
          "bg-brand-pink hover:bg-brand-pink-dark text-gray-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2",
          "shadow-lg hover:shadow-xl hover:shadow-brand-pink/20"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Avatar
          </>
        )}
      </button>
    </form>
  );
}
