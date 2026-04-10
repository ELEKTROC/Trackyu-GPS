import React, { useState, useRef } from 'react';
import type { Vehicle } from '../../../../types';
import { CollapsibleSection } from './SharedBlocks';
import { Camera, Upload, X, Image, Maximize2 } from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';

interface PhotoBlockProps {
  vehicle: Vehicle;
  configMode?: boolean;
  onPhotoChange?: (vehicleId: string, photoUrl: string | null) => void;
}

export const PhotoBlock: React.FC<PhotoBlockProps> = ({ vehicle, configMode = false, onPhotoChange }) => {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(vehicle.photoUrl || null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner une image', 'warning');
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image trop volumineuse (max 5 Mo)', 'warning');
      return;
    }

    setIsUploading(true);

    try {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreviewUrl(dataUrl);
        
        // Save to localStorage for demo (in production: upload to server)
        const photos = JSON.parse(localStorage.getItem('vehicle_photos') || '{}');
        photos[vehicle.id] = dataUrl;
        localStorage.setItem('vehicle_photos', JSON.stringify(photos));
        
        onPhotoChange?.(vehicle.id, dataUrl);
        setIsUploading(false);
      };
      reader.onerror = () => {
        console.warn('Erreur lors de la lecture du fichier photo');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.warn('Erreur lors du traitement de la photo:', error);
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    const photos = JSON.parse(localStorage.getItem('vehicle_photos') || '{}');
    delete photos[vehicle.id];
    localStorage.setItem('vehicle_photos', JSON.stringify(photos));
    onPhotoChange?.(vehicle.id, null);
  };

  // Load from localStorage on mount
  React.useEffect(() => {
    if (!vehicle.photoUrl) {
      const photos = JSON.parse(localStorage.getItem('vehicle_photos') || '{}');
      if (photos[vehicle.id]) {
        setPreviewUrl(photos[vehicle.id]);
      }
    }
  }, [vehicle.id, vehicle.photoUrl]);

  return (
    <>
      <CollapsibleSection 
        title="Photo Véhicule" 
        icon={Camera} 
        defaultOpen={true}
        badge={previewUrl ? '1' : undefined}
      >
        <div className="p-3">
          {previewUrl ? (
            <div className="relative group">
              <img 
                src={previewUrl} 
                alt={vehicle.name}
                className="w-full h-40 object-cover rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setShowFullscreen(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button 
                  onClick={() => setShowFullscreen(true)}
                  className="p-2 bg-white/90 rounded-full mr-2 hover:bg-white transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-slate-700" />
                </button>
                {!configMode && (
                  <button 
                    onClick={handleRemovePhoto}
                    className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                {vehicle.name}
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-dim)]/50 dark:hover:bg-[var(--primary-dim)]/20 transition-colors"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
              ) : (
                <>
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full mb-2">
                    <Image className="w-6 h-6 text-slate-400" />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Ajouter une photo</span>
                  <span className="text-xs text-slate-400 mt-1">JPG, PNG (max 5 Mo)</span>
                </>
              )}
            </div>
          )}
          
          <input 
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {previewUrl && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-full py-2 text-xs text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Upload className="w-3 h-3" /> Changer la photo
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Fullscreen Modal */}
      {showFullscreen && previewUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button 
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={previewUrl} 
            alt={vehicle.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white rounded-lg">
            {vehicle.name} - {vehicle.client}
          </div>
        </div>
      )}
    </>
  );
};
