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
  CheckCircle2,
  AlertCircle,
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
  "2048x2048 (1:1)",
  "2304x1728 (4:3)",
  "1728x2304 (3:4)",
  "2560x1440 (16:9)",
  "1440x2560 (9:16)",
  "2496x1664 (3:2)",
  "1664x2496 (2:3)",
  "3024x1296 (21:9)",
  "4096x4096 (1:1)",
];

const POSE_OPTIONS = [
  {
    label: "Plano medio frontal",
    value:
      "Plano medio, torso de frente, brazos cruzados, cuerpo ligeramente girado hacia la derecha, mirando a la cámara con expresión segura",
  },
  {
    label: "Plano entero de pie",
    value:
      "Plano entero, de pie, postura recta con una mano en la cadera, cabeza ligeramente inclinada, expresión relajada y confiada",
  },
];

const BACKGROUND_OPTIONS = [
  {
    label: "Estudio blanco",
    value:
      "Fondo blanco liso de estudio, suave sombra bajo la modelo, iluminación profesional de moda",
  },
  {
    label: "Estudio cálido",
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
  const modelInputRef = useRef<HTMLInputElement>(null);

  /* ---- Step 2: Producto ---- */
  const [productImage, setProductImage] = useState<UploadedImage | null>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  /* ---- Step 3: Configuración ---- */
  const [sizePreset, setSizePreset] = useState(SIZE_OPTIONS[0]);
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

  /* Navigate steps */
  const goNext = () => {
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  /* ---- Submit workflow ---- */
  const handleGenerate = async () => {
    if (!modelImage || !productImage) return;

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
        // Check webhook first
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

        // Fallback to status API
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
        <h2 className="text-sm font-semibold text-gray-900">
          Seleccionar Modelo
        </h2>
        {/* Tabs: Subir / Catálogo */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setModelTab("upload")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              modelTab === "upload"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Subir
          </button>
          <button
            onClick={() => setModelTab("catalog")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
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
        /* Upload area */
        modelImage ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={modelImage.preview}
              alt="Modelo"
              className="w-full h-64 object-contain"
            />
            <button
              onClick={() => setModelImage(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center justify-between">
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
              onChange={(e) => handleImageUpload(e, setModelImage)}
            />
          </div>
        )
      ) : (
        /* Catalog placeholder */
        <div className="border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <ImageIcon className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Catálogo de modelos</p>
          <p className="text-xs text-gray-400 mt-1">Próximamente</p>
        </div>
      )}

      {/* Next button */}
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
      <h2 className="text-sm font-semibold text-gray-900">Subir Producto</h2>

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
          <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center justify-between">
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
          className="px-6 py-2.5 text-gray-500 text-xs uppercase tracking-widest rounded-full hover:bg-gray-100 transition-all"
        >
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
      <h2 className="text-sm font-semibold text-gray-900">Configuración</h2>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-widest">
          Tamaño
        </label>
        <div className="relative">
          <select
            value={sizePreset}
            onChange={(e) => setSizePreset(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Pose */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-widest">
          Pose
        </label>
        <div className="grid grid-cols-1 gap-2">
          {POSE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setPoseSelection(opt.value)}
              className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                poseSelection === opt.value
                  ? "border-gray-900 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-widest">
          Fondo
        </label>
        <div className="grid grid-cols-1 gap-2">
          {BACKGROUND_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setBackgroundSelection(opt.value)}
              className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                backgroundSelection === opt.value
                  ? "border-gray-900 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={goPrev}
          className="px-6 py-2.5 text-gray-500 text-xs uppercase tracking-widest rounded-full hover:bg-gray-100 transition-all"
        >
          Atrás
        </button>
        <button
          onClick={goNext}
          className="px-6 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all"
        >
          Siguiente
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-gray-900">Generar Imagen</h2>

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {modelImage && (
            <img
              src={modelImage.preview}
              alt="Modelo"
              className="w-10 h-10 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700">Modelo</p>
            <p className="text-xs text-gray-400 truncate">
              {modelImage?.file.name}
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {productImage && (
            <img
              src={productImage.preview}
              alt="Producto"
              className="w-10 h-10 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700">Producto</p>
            <p className="text-xs text-gray-400 truncate">
              {productImage?.file.name}
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        </div>

        <div className="p-3 bg-gray-50 rounded-lg space-y-1">
          <p className="text-xs text-gray-400">Tamaño: {sizePreset}</p>
          <p className="text-xs text-gray-400 truncate">
            Pose:{" "}
            {POSE_OPTIONS.find((p) => p.value === poseSelection)?.label}
          </p>
          <p className="text-xs text-gray-400 truncate">
            Fondo:{" "}
            {
              BACKGROUND_OPTIONS.find(
                (b) => b.value === backgroundSelection
              )?.label
            }
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Result images */}
      {resultImages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Resultados
          </p>
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
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between pt-2">
        <button
          onClick={goPrev}
          disabled={isGenerating}
          className="px-6 py-2.5 text-gray-500 text-xs uppercase tracking-widest rounded-full hover:bg-gray-100 disabled:opacity-30 transition-all"
        >
          Atrás
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !modelImage || !productImage}
          className="px-8 py-2.5 bg-gray-900 text-white text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {status === "queued" ? "En cola..." : "Procesando..."}
            </>
          ) : resultImages.length > 0 ? (
            "Generar de nuevo"
          ) : (
            "Generar"
          )}
        </button>
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

  return (
    <div className="h-screen flex bg-[#fafafa] overflow-hidden">
      {/* Sidebar */}
      <StellaSidebar activeItem="generate" onLogout={handleLogout} />

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 pt-8 pb-6 shrink-0">
          <div className="flex items-center justify-between mb-6">
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
        <div className="flex-1 px-8 pb-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left panel – step form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-y-auto">
              {stepContent[currentStep]()}
            </div>

            {/* Right panel – preview */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
              <h2 className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-4">
                Vista previa
              </h2>
              <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden min-h-[300px]">
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
                      La vista previa aparecerá aquí
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
