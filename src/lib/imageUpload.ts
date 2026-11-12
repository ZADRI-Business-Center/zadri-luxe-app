import { supabase } from './supabase';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface UploadedImage {
  url: string;
  publicId: string;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && uploadPreset);
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier sélectionné doit être une image.');
  }

  const image = await loadImage(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Impossible de préparer la photo.');
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Impossible de compresser la photo.')),
      'image/jpeg',
      0.8,
    );
  });
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary n’est pas configuré. Ajoutez les variables VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const compressed = await compressImage(file);
  const body = new FormData();
  body.append('file', compressed, `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`);
  body.append('upload_preset', uploadPreset);
  body.append('folder', 'zadri-luxe');

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    });
  } catch {
    throw new Error('Impossible d’envoyer la photo. Vérifiez votre connexion.');
  }

  const payload = await response.json() as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message || 'L’envoi de la photo a échoué.');
  }

  return { url: payload.secure_url, publicId: payload.public_id };
}

export function getCloudinaryThumbnail(url: string | null | undefined, width = 600): string | null {
  if (!url || !url.includes('/upload/')) return url ?? null;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width},h_${width}/`);
}

export async function ensureOnline(): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Connexion internet requise pour enregistrer cette opération.');
  }

  const { error } = await supabase.auth.getSession();
  if (error) throw new Error('Impossible de vérifier votre session. Réessayez.');
}
