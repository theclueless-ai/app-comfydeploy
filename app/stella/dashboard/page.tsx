"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import StellaSidebar from "@/components/stella/sidebar";
import StellaStepper from "@/components/stella/stepper";
import { compressImage, formatBytes } from "@/lib/utils";
import {
  Upload,
  X,
  ImageIcon,
  ChevronDown,
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UploadedImage {
  file: File;
  preview: string;
}

interface ResultImage {
  url: string;
  filename: string;
}

/* ------------------------------------------------------------------ */
/*  Constants – workflow options                                       */
/* ------------------------------------------------------------------ */

const SIZE_OPTIONS = [
  { label: "2048×2048 — Cuadrado", value: "2048x2048 (1:1)" },
  { label: "2304×1728 — Horizontal 4:3", value: "2304x1728 (4:3)" },
  { label: "1728×2304 — Vertical 3:4", value: "1728x2304 (3:4)" },
  { label: "2560×1440 — Panorámico 16:9", value: "2560x1440 (16:9)" },
  { label: "1440×2560 — Vertical 9:16", value: "1440x2560 (9:16)" },
  { label: "2496×1664 — Horizontal 3:2", value: "2496x1664 (3:2)" },
  { label: "1664×2496 — Vertical 2:3", value: "1664x2496 (2:3)" },
  { label: "3024×1296 — Ultra panorámico", value: "3024x1296 (21:9)" },
  { label: "4096×4096 — Cuadrado grande", value: "4096x4096 (1:1)" },
];

const POSE_OPTIONS = [
  {
    label: "Plano medio frontal",
    description: "Torso de frente, brazos cruzados, mirando a cámara",
    value:
      "Plano medio, torso de frente, brazos cruzados, cuerpo ligeramente girado hacia la derecha, mirando a la cámara con expresión segura",
  },
  {
    label: "Plano entero de pie",
    description: "Postura recta, mano en la cadera, expresión relajada",
    value:
      "Plano entero, de pie, postura recta con una mano en la cadera, cabeza ligeramente inclinada, expresión relajada y confiada",
  },
];

const CATALOG_MODELS = [
  { name: "Lia", image: "/models/lia.jpg" },
  { name: "Kay", image: "/models/kay.jpg" },
  { name: "Aitana", image: "/models/aitana.jpg" },
  { name: "Olivia", image: "/models/olivia.jpg" },
];

const BACKGROUND_OPTIONS = [
  {
    label: "Estudio blanco",
    description: "Fondo blanco liso, iluminación profesional de moda",
    value:
      "Fondo blanco liso de estudio, suave sombra bajo la modelo, iluminación profesional de moda",
  },
  {
    label: "Estudio cálido",
    description: "Tonos marrones suaves, muebles vintage desenfocados",
    value:
      "Estudio interior cálido con tonos marrones suaves, muebles de estilo vintage ligeramente desenfocados en el fondo",
  },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StellaDashboard() {
  const { logout } = useAuth();
  const router = useRouter();

  /* ---- Step state ---- */
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  /* ---- Step 1: Modelo ---- */
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [modelTab, setModelTab] = useState<"upload" | "catalog">("upload");
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  /* ---- Step 2: Producto ---- */
  const [productImage, setProductImage] = useState<UploadedImage | null>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  /* ---- Step 3: Configuración ---- */
  const [sizePreset, setSizePreset] = useState(SIZE_OPTIONS[0].value);
  const [poseSelection, setPoseSelection] = useState(POSE_OPTIONS[0].value);
  const [backgroundSelection, setBackgroundSelection] = useState(
    BACKGROUND_OPTIONS[0].value
  );

  /* ---- Step 4: Generar ---- */
  const [isGenerating, setIsGenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<ResultImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ---- Preview: show the most relevant image ---- */
  const previewSrc =
    resultImages.length > 0
      ? resultImages[0].url
      : productImage?.preview ?? modelImage?.preview ?? null;

  /* ---- Summary helpers ---- */
  const selectedSize =
    SIZE_OPTIONS.find((s) => s.value === sizePreset)?.label ?? sizePreset;
  const selectedPose =
    POSE_OPTIONS.find((p) => p.value === poseSelection)?.label ?? "—";
  const selectedBackground =
    BACKGROUND_OPTIONS.find((b) => b.value === backgroundSelection)?.label ??
    "—";

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                        */
  /* ---------------------------------------------------------------- */

  const handleImageUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: (img: UploadedImage | null) => void
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Máximo 10 MB.");
        return;
      }
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      setter({ file: compressed, preview });
    },
    []
  );

  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      setter: (img: UploadedImage | null) => void
    ) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Máximo 10 MB.");
        return;
      }
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      setter({ file: compressed, preview });
    },
    []
  );

  /* Select a catalog model */
  const handleSelectCatalogModel = async (model: { name: string; image: string }) => {
    setSelectedModelName(model.name);
    try {
      const res = await fetch(model.image);
      const blob = await res.blob();
      const file = new File([blob], `${model.name.toLowerCase()}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      const preview = model.image;
      setModelImage({ file, preview });
    } catch {
      // If fetch fails, just set the preview path
      setSelectedModelName(null);
    }
  };

  /* Navigate steps */
  const markCompleted = (step: number) => {
    setCompletedSteps((prev) =>
      prev.includes(step) ? prev : [...prev, step]
    );
  };

  const goNext = () => {
    markCompleted(currentStep);
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  /* ---- Submit workflow ---- */
  const handleGenerate = async () => {
    if (!modelImage || !productImage) return;

    // Mark step 3 as completed and move to step 4 immediately
    markCompleted(3);
    setCurrentStep(4);

    setIsGenerating(true);
    setStatus("queued");
    setError(null);
    setResultImages([]);

    const formData = new FormData();
    formData.append("model_image", modelImage.file);
    formData.append("product_image", productImage.file);
    formData.append("size_preset", sizePreset);
    formData.append("pose_selection", poseSelection);
    formData.append("background_selection", backgroundSelection);

    try {
      const res = await fetch("/api/run-workflow", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al iniciar el workflow");
      }

      setRunId(data.runId);
      setStatus("running");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setIsGenerating(false);
      setStatus("failed");
    }
  };

  /* ---- Poll for results ---- */
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed") return;

    pollRef.current = setInterval(async () => {
      try {
        const webhookRes = await fetch(`/api/webhook?runId=${runId}`);
        const webhookData = await webhookRes.json();

        if (webhookData.status === "completed" && webhookData.images?.length) {
          setResultImages(webhookData.images);
          setStatus("completed");
          setIsGenerating(false);
          clearInterval(pollRef.current!);
          return;
        }

        if (webhookData.status === "failed") {
          setError(webhookData.error || "El proceso falló");
          setStatus("failed");
          setIsGenerating(false);
          clearInterval(pollRef.current!);
          return;
        }

        const statusRes = await fetch(`/api/status/${runId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed" && statusData.images?.length) {
          setResultImages(statusData.images);
          setStatus("completed");
          setIsGenerating(false);
          clearInterval(pollRef.current!);
        } else if (statusData.status === "failed") {
          setError(statusData.error || "El proceso falló");
          setStatus("failed");
          setIsGenerating(false);
          clearInterval(pollRef.current!);
        }
      } catch {
        // Network error – keep polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, status]);

  /* ---- Download helper ---- */
  const handleDownload = async (url: string, filename: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "stella-result.png";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  };

  /* ---- Logout ---- */
  const handleLogout = async () => {
    await logout();
    router.push("/stella");
  };

  /* ---------------------------------------------------------------- */
  /*  Step content renderers                                          */
  /* ---------------------------------------------------------------- */

  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Seleccionar Modelo
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Sube una imagen del modelo o selecciona del catálogo
          </p>
        </div>
        {/* Tabs: Subir / Catálogo */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => { setModelTab("upload"); setSelectedModelName(null); }}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              modelTab === "upload"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Subir
          </button>
          <button
            onClick={() => setModelTab("catalog")}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              modelTab === "catalog"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Catálogo
          </button>
        </div>
      </div>

      {modelTab === "upload" ? (
        modelImage ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={modelImage.preview}
              alt="Modelo"
              className="w-full h-64 object-contain"
            />
            <button
              onClick={() => { setModelImage(null); setSelectedModelName(null); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate">
                {modelImage.file.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatBytes(modelImage.file.size)}
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => modelInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, setModelImage)}
            className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Arrastra una imagen aquí
            </p>
            <p className="text-xs text-gray-400">o haz clic para seleccionar</p>
            <input
              ref={modelInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleImageUpload(e, setModelImage); setSelectedModelName(null); }}
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {CATALOG_MODELS.map((model) => {
            const isSelected = selectedModelName === model.name && modelTab === "catalog";
            return (
              <button
                key={model.name}
                onClick={() => handleSelectCatalogModel(model)}
                className={`relative rounded-xl overflow-hidden aspect-[3/4] group transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-gray-900 ring-offset-2"
                    : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
                }`}
              >
                {/* Model photo as background */}
                <img
                  src={model.image}
                  alt={model.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Name */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium">{model.name}</p>
                </div>
                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={goNext}
          disabled={!modelImage}
          className="px-6 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Siguiente
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Subir Producto</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Sube la imagen de la prenda o producto
        </p>
      </div>

      {productImage ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={productImage.preview}
            alt="Producto"
            className="w-full h-64 object-contain"
          />
          <button
            onClick={() => setProductImage(null)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate">
              {productImage.file.name}
            </span>
            <span className="text-xs text-gray-400">
              {formatBytes(productImage.file.size)}
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => productInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, setProductImage)}
          className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Upload className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Arrastra la imagen del producto
          </p>
          <p className="text-xs text-gray-400">o haz clic para seleccionar</p>
          <input
            ref={productInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, setProductImage)}
          />
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 px-5 py-2.5 text-gray-500 text-xs tracking-wide rounded-full hover:bg-gray-100 transition-all"
        >
          <ArrowLeft className="w-3 h-3" />
          Atrás
        </button>
        <button
          onClick={goNext}
          disabled={!productImage}
          className="px-6 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Siguiente
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">
          Configurar Ajustes
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Personaliza la configuración de la imagen de salida
        </p>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Tamaño</label>
        <div className="relative">
          <select
            value={sizePreset}
            onChange={(e) => setSizePreset(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Pose */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Pose</label>
        <div className="grid grid-cols-1 gap-2">
          {POSE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setPoseSelection(opt.value)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                poseSelection === opt.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p
                className={`font-medium text-xs ${
                  poseSelection === opt.value
                    ? "text-gray-900"
                    : "text-gray-600"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Fondo</label>
        <div className="grid grid-cols-1 gap-2">
          {BACKGROUND_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setBackgroundSelection(opt.value)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                backgroundSelection === opt.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p
                className={`font-medium text-xs ${
                  backgroundSelection === opt.value
                    ? "text-gray-900"
                    : "text-gray-600"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Summary */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em]">
          Resumen
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Modelo</span>
            <span className="text-xs text-gray-700 font-medium truncate ml-4 max-w-[180px]">
              {selectedModelName ?? modelImage?.file.name ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Producto</span>
            <span className="text-xs text-gray-700 font-medium truncate ml-4 max-w-[180px]">
              {productImage?.file.name ?? "—"}
            </span>
          </div>
          <div className="border-t border-gray-200/60" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Tamaño</span>
            <span className="text-xs text-gray-700 font-medium">
              {selectedSize}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Pose</span>
            <span className="text-xs text-gray-700 font-medium">
              {selectedPose}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Fondo</span>
            <span className="text-xs text-gray-700 font-medium">
              {selectedBackground}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-2">
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 px-5 py-2.5 text-gray-500 text-xs tracking-wide rounded-full hover:bg-gray-100 transition-all"
        >
          <ArrowLeft className="w-3 h-3" />
          Atrás
        </button>
        <button
          onClick={handleGenerate}
          disabled={!modelImage || !productImage}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generar Imagen
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Header changes based on state */}
      {isGenerating ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Generando...
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tu imagen generada con IA se está creando. Esto puede tomar unos
            momentos.
          </p>
        </div>
      ) : status === "completed" ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Imagen Generada
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tu imagen está lista. Puedes descargarla o generar una nueva.
          </p>
        </div>
      ) : status === "failed" ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Error al Generar
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Hubo un problema al generar tu imagen. Intenta de nuevo.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Generar Imagen
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Revisa el resumen y genera tu imagen
          </p>
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="flex flex-col items-center py-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-gray-900 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-gray-700 font-medium mt-5">
            Procesando tu solicitud...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Esto usualmente toma 10-15 segundos
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Result images */}
      {resultImages.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {resultImages.map((img, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden border border-gray-200"
              >
                <img
                  src={img.url}
                  alt={`Resultado ${i + 1}`}
                  className="w-full object-contain"
                />
                <button
                  onClick={() => handleDownload(img.url, img.filename)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary (shown when not generating) */}
      {!isGenerating && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Tamaño</span>
            <span className="text-xs text-gray-600">{selectedSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Pose</span>
            <span className="text-xs text-gray-600">{selectedPose}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Fondo</span>
            <span className="text-xs text-gray-600">{selectedBackground}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between pt-2">
        <button
          onClick={goPrev}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-5 py-2.5 text-gray-500 text-xs tracking-wide rounded-full hover:bg-gray-100 disabled:opacity-30 transition-all"
        >
          <ArrowLeft className="w-3 h-3" />
          Atrás
        </button>
        {!isGenerating && (
          <button
            onClick={handleGenerate}
            disabled={!modelImage || !productImage}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {resultImages.length > 0 ? "Generar de nuevo" : "Generar Imagen"}
          </button>
        )}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  const stepContent: Record<number, () => JSX.Element> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
  };

  /* Step card titles */
  const stepTitles: Record<number, string> = {
    1: "Paso 1 — Modelo",
    2: "Paso 2 — Producto",
    3: "Paso 3 — Configuración",
    4: "Paso 4 — Generar",
  };

  return (
    <div className="h-screen flex bg-[#f7f7f8] overflow-hidden">
      {/* Sidebar */}
      <StellaSidebar activeItem="generate" onLogout={handleLogout} />

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-light tracking-widest text-gray-900">
                stella<sup className="text-[8px] align-super">®</sup>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Generate professional fashion images with AI
              </p>
            </div>
          </div>

          {/* Stepper */}
          <StellaStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={setCurrentStep}
          />
        </header>

        {/* Content */}
        <div className="flex-1 px-8 pb-8 pt-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left panel – step form */}
            <div className="bg-white rounded-2xl border border-gray-200/80 flex flex-col overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
                  {stepTitles[currentStep]}
                </h3>
              </div>
              {/* Card body */}
              <div className="p-6 overflow-y-auto flex-1">
                {stepContent[currentStep]()}
              </div>
            </div>

            {/* Right panel – preview */}
            <div className="bg-white rounded-2xl border border-gray-200/80 flex flex-col overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
                  Vista previa
                </h3>
              </div>
              {/* Card body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden min-h-[300px] bg-gray-50/50">
                  {isGenerating && !resultImages.length ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                      <p className="text-xs text-gray-400">
                        {status === "queued"
                          ? "En cola..."
                          : "Generando imagen..."}
                      </p>
                    </div>
                  ) : previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Vista previa"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <ImageIcon className="w-10 h-10 text-gray-200" />
                      <p className="text-xs text-gray-300">
                        Configura los ajustes y genera
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
