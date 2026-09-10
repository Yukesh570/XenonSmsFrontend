import React, { useState, useEffect, useRef } from "react";
import { 
  Home, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  Crop as CropIcon, 
  X, 
  Check, 
  ZoomIn, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import Cropper from 'react-easy-crop';

import {
  getGeneralSettingsApi,
  updateGeneralSettingsApi,
  createGeneralSettingsApi,
  getDashboardImageApi,
  putDashboardImageApi,
  type GeneralSettingsData,
} from "../../../api/settingApi/generalSettingsApi/generalSettingsApi";
// @ts-ignore
import { getCurrenciesApi } from "../../../api/settingApi/currencyApi/currencyApi";
// @ts-ignore
import { getTimezoneApi } from "../../../api/settingApi/timezoneApi/timezoneApi";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { usePagePermissions } from "../../../hooks/usePagePermissions";

interface Option {
  label: string;
  value: string;
}

const languageOptions: Option[] = [
  { label: "English (EN)", value: "en" },
  { label: "Spanish (ES)", value: "es" },
  { label: "French (FR)", value: "fr" },
  { label: "Nepali (NE)", value: "ne" },
];

const GeneralSettings: React.FC = () => {
  const { canUpdate } = usePagePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"setup" | "image">("setup");
  const [currencyOptions, setCurrencyOptions] = useState<Option[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<Option[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 }); 
  const [zoom, setZoom] = useState(1); 
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState<GeneralSettingsData>({
    companyName: "",
    defaultLanguage: "en",
    defaultTimezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    datetimeFormat: "YYYY-MM-DD HH:mm:ss",
    baseCurrency: "",
    currencyApi: "",
    apiKey: "",
  });

  const location = useLocation();
  const routeName = location.pathname.split("/").pop() || "generalSettings";
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrenciesApi("currency", 1, 1000)
      .then((res: any) => {
        const rawData = res?.results || res?.data?.results || res?.data || res;
        const list = Array.isArray(rawData) ? rawData : [];
        setCurrencyOptions(list.map((c: any) => ({ 
          label: `${c.name || "Unknown"} (${c.currencyCode || "N/A"})`, 
          value: String(c.id || "") 
        })));
      })
      .catch(console.error);

    getTimezoneApi("timezone", 1, 1000)
      .then((res: any) => {
        const rawData = res?.results || res?.data?.results || res?.data || res;
        const list = Array.isArray(rawData) ? rawData : [];
        setTimezoneOptions(list.map((t: any) => ({ label: t.name || "Unknown Timezone", value: String(t.name || "") })));
      })
      .catch(console.error);
  }, []);

  const fetchSettings = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;
    setIsLoading(true);

    try {
      const response = await getGeneralSettingsApi(routeName);
      if (newController.signal.aborted) return;
      if (response) {
        if (response.defaultTimezone) localStorage.setItem("app_timezone", response.defaultTimezone);
        setFormData({
          companyName: response.companyName || "",
          defaultLanguage: response.defaultLanguage || "en",
          defaultTimezone: response.defaultTimezone || "UTC",
          dateFormat: response.dateFormat || "YYYY-MM-DD",
          datetimeFormat: response.datetimeFormat || "YYYY-MM-DD HH:mm:ss",
          baseCurrency: response.baseCurrency ? String(response.baseCurrency) : "", 
          currencyApi: response.currencyApi || "",
          apiKey: response.apiKey || "",
        });
      }

      const imgRes = await getDashboardImageApi();
      if (imgRes && imgRes.image) {
        const imageBase = import.meta.env.VITE_IMAGE_URL || "";
        setImagePreview(`${imageBase}${imgRes.image}`);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") toast.error("Failed to fetch settings.");
    } finally {
      if (abortControllerRef.current === newController) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [routeName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSelectChange = (name: string, value: string) => setFormData({ ...formData, [name]: value });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setIsCropping(true); 
    }
  };

  const handleSaveCrop = async () => {
    if (!croppedAreaPixels || !imagePreview) return setIsCropping(false);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imagePreview;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0, 
        0, 
        canvas.width, 
        canvas.height
      );

      canvas.toBlob((blob) => {
        if (!blob) return toast.error("Canvas is empty");
        const croppedFile = new File([blob], "cropped_logo.png", { type: 'image/png' });
        setImageFile(croppedFile);
        setImagePreview(URL.createObjectURL(croppedFile));
        setIsCropping(false);
        setZoom(1);
      }, 'image/png');
    };
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdate) return toast.error("Permission denied.");
    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      baseCurrency: formData.baseCurrency ? Number(formData.baseCurrency) : null
    };

    try {
      await updateGeneralSettingsApi(payload as any, routeName);
      localStorage.setItem("app_timezone", formData.defaultTimezone);
      window.dispatchEvent(new Event("timezoneChanged"));
      localStorage.setItem("app_login_name", formData.companyName);
      window.dispatchEvent(new Event("BrandingUpdated")); 
      toast.success("Company Setup updated successfully!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      if (error?.response?.status === 404) {
         try {
            await createGeneralSettingsApi(payload as any, routeName);
            localStorage.setItem("app_timezone", formData.defaultTimezone);
            window.dispatchEvent(new Event("timezoneChanged"));
            localStorage.setItem("app_login_name", formData.companyName);
            window.dispatchEvent(new Event("BrandingUpdated")); 
            toast.success("Company Setup created successfully!");
            setTimeout(() => window.location.reload(), 1000);
         } catch (createError: any) {
            toast.error("Failed to create initial setup.");
         }
      } else {
         toast.error("Update failed. " + (error?.response?.data?.detail || ""));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSubmit = async () => {
    if (!canUpdate) return toast.error("Permission denied.");
    if (!imageFile) return toast.error("Please upload a new image to save.");
    setIsSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append("image", imageFile);
      const res = await putDashboardImageApi(uploadData);

      if (res && res.image) {
        const imageBase = import.meta.env.VITE_IMAGE_URL || "";
        const fullImageUrl = `${imageBase}${res.image}`;
        localStorage.setItem("app_login_logo", fullImageUrl);
      }

      window.dispatchEvent(new Event("BrandingUpdated")); 
      toast.success("Login Logo updated successfully!");
      setImageFile(null); 
    } catch (error: any) {
      toast.error("Image upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-white">General Settings</h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">Home</NavLink>
          <span>/</span><span className="text-text-primary dark:text-white">Settings</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-card dark:bg-gray-800">
        
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-full inline-flex relative border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 shadow-sm rounded-full transition-transform duration-300 ease-in-out"
              style={{ transform: activeTab === 'setup' ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}
            />
            <button onClick={() => setActiveTab('setup')} className={`relative z-10 flex-1 sm:flex-none px-6 sm:px-10 py-2.5 text-sm font-medium rounded-full transition-colors ${activeTab === 'setup' ? 'text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              Company Setup
            </button>
            <button onClick={() => setActiveTab('image')} className={`relative z-10 flex-1 sm:flex-none px-6 sm:px-10 py-2.5 text-sm font-medium rounded-full transition-colors ${activeTab === 'image' ? 'text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              Image Section
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading Configuration...</p>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {activeTab === "setup" && (
              <form className="space-y-6" onSubmit={handleSetupSubmit}>
                <Input label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Xenon SMS" required />
                <Select label="Base Currency" value={String(formData.baseCurrency)} onChange={(v) => handleSelectChange("baseCurrency", v)} options={currencyOptions} placeholder="Select System Currency" />
                <hr className="dark:border-gray-700" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Select label="Default Language" value={formData.defaultLanguage} onChange={(v) => handleSelectChange("defaultLanguage", v)} options={languageOptions} placeholder="Language" />
                  <Select label="Default Timezone" value={formData.defaultTimezone} onChange={(v) => handleSelectChange("defaultTimezone", v)} options={timezoneOptions} placeholder="Timezone" />
                </div>
                <hr className="dark:border-gray-700" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Date Format" name="dateFormat" value={formData.dateFormat} onChange={handleChange} placeholder="YYYY-MM-DD" required />
                  <Input label="Date Time Format" name="datetimeFormat" value={formData.datetimeFormat} onChange={handleChange} placeholder="YYYY-MM-DD HH:mm:ss" required />
                </div>
                <hr className="dark:border-gray-700" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Currency API" name="currencyApi" value={formData.currencyApi || ""} onChange={handleChange} placeholder="Enter Currency API" autoComplete="new-password" />
                  
                  {/* API Key field with aligned Show/Hide toggle button & hidden clear X button */}
                  <div className="relative [&_button:has(svg.lucide-x)]:hidden [&_.lucide-x]:hidden">
                    <Input 
                      label="API Key" 
                      name="apiKey" 
                      value={formData.apiKey || ""} 
                      onChange={handleChange} 
                      placeholder="Enter API Key" 
                      type={showApiKey ? "text" : "password"} 
                      autoComplete="new-password" 
                      // @ts-ignore
                      clearable={false}
                      // @ts-ignore
                      showClear={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      className="absolute right-3.5 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none z-10 flex items-center justify-center"
                      title={showApiKey ? "Hide API Key" : "Show API Key"}
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="pt-3 flex justify-end gap-3">
                  <Button type="submit" variant="primary" className="w-full md:w-auto text-base py-2.5 px-8" leftIcon={<Save size={18} />} disabled={isSubmitting || !canUpdate}>
                    {isSubmitting ? "Saving..." : "Save Setup"}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "image" && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    
                    <div 
                      className="w-full max-w-sm h-[150px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden mb-6 relative shadow-sm group"
                      style={{
                        backgroundColor: "#f0f0f0",
                        backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                      }}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Logo Preview" className="max-w-full max-h-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="text-center text-gray-500 bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl backdrop-blur-sm">
                          <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No Image Uploaded</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} ref={fileInputRef} />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                      <Button type="button" variant="primary" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={16} />} disabled={!canUpdate}>Upload</Button>
                      <Button type="button" variant="secondary" onClick={() => setIsCropping(true)} leftIcon={<CropIcon size={16} />} disabled={!canUpdate || !imagePreview}>Crop / Edit</Button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="primary" onClick={handleImageSubmit} className="w-full md:w-auto text-base py-2.5 px-8" leftIcon={<Save size={18} />} disabled={isSubmitting || !canUpdate || !imageFile}>
                    {isSubmitting ? "Saving..." : "Save Image"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isCropping && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Frame Logo</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Drag to pan and use the slider to zoom.</p>
                </div>
                <button onClick={() => setIsCropping(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div 
                className="relative w-full h-[40vh] sm:h-[50vh]"
                style={{
                  backgroundColor: "#f0f0f0",
                  backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                }}
              >
                <Cropper
                  image={imagePreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={400 / 150} 
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                  onZoomChange={setZoom}
                  showGrid={false}
                  style={{
                    containerStyle: {
                      backgroundColor: "transparent",
                    }
                  }}
                />
              </div>

              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
                <ZoomIn size={18} className="text-gray-500" />
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.1" 
                  value={zoom} 
                  onChange={(e) => setZoom(Number(e.target.value))} 
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-12 text-right">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800">
                <Button variant="secondary" onClick={() => setIsCropping(false)} className="px-6">Cancel</Button>
                <Button variant="primary" onClick={handleSaveCrop} leftIcon={<Check size={18} />} className="px-8">Apply Crop</Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GeneralSettings;