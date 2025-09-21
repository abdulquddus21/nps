import { IncomingForm } from 'formidable';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Supabase konfiguratsiyasi
const supabaseUrl = "https://xzbwfoacsnrmgjmildcr.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Yndmb2Fjc25ybWdqbWlsZGNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODE5OTE3NSwiZXhwIjoyMDczNzc1MTc1fQ.t0u8Uy7D7N3KWgNthFTijhCucN4VcFc39QAPAwDYXfo"; // Service role key ishlatish kerak
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket nomi
const BUCKET_NAME = 'uploads'; // Supabase da bucket yaratish kerak

// Ruxsat berilgan file turlari
const ALLOWED_FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
  videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.flac'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz']
};

// MIME type tekshiruvi
const ALLOWED_MIME_TYPES = [
  // Rasm fayllari
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 
  'image/bmp', 'image/tiff',
  
  // Video fayllar
  'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
  'video/x-ms-wmv', 'video/x-flv', 'video/webm',
  
  // Hujjat fayllari
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/rtf',
  
  // Audio fayllar
  'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac',
  
  // Arxiv fayllari
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/x-tar', 'application/gzip'
];

// Fayl o'lchamini tekshirish (10MB limit - Supabase uchun)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Xavfli fayllarni tekshirish
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.jar'];

function isFileTypeAllowed(filename, mimetype) {
  const extension = path.extname(filename).toLowerCase();
  
  // Xavfli fayllarni rad etish
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // Ruxsat berilgan kengaytmalarni tekshirish
  const allAllowedExtensions = Object.values(ALLOWED_FILE_TYPES).flat();
  const isExtensionAllowed = allAllowedExtensions.includes(extension);
  
  // MIME type tekshiruvi
  const isMimeTypeAllowed = ALLOWED_MIME_TYPES.includes(mimetype);
  
  return isExtensionAllowed && isMimeTypeAllowed;
}

function sanitizeFilename(filename) {
  // Xavfli belgilarni olib tashlash
  return filename.replace(/[^a-zA-Z0-9\-_\.]/g, '_');
}

// Supabase bucket yaratish (agar mavjud bo'lmasa)
async function ensureBucketExists() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Bucket list error:', error);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Public qilish uchun
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        fileSizeLimit: MAX_FILE_SIZE
      });
      
      if (createError) {
        console.error('Bucket create error:', createError);
        return false;
      }
      
      console.log(`Bucket "${BUCKET_NAME}" yaratildi`);
    }
    
    return true;
  } catch (error) {
    console.error('Bucket ensure error:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Bucket mavjudligini tekshirish
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      return res.status(500).json({ error: 'Storage bucket tayyorlanmadi' });
    }

    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 5,
      allowEmptyFiles: false,
      minFileSize: 1,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: 'Fayl hajmi juda katta (maksimum 10MB)' 
          });
        }
        
        return res.status(500).json({ error: 'Yuklashda xatolik yuz berdi' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'Hech qanday fayl yuklanmadi' });
      }

      try {
        // Fayl massivdan birinchisini olish
        const fileArray = Array.isArray(file) ? file[0] : file;
        const originalName = fileArray.originalFilename || 'unknown';
        const mimetype = fileArray.mimetype;
        const fileSize = fileArray.size;

        // Fayl turini tekshirish
        if (!isFileTypeAllowed(originalName, mimetype)) {
          // Vaqtinchalik faylni o'chirish
          fs.unlinkSync(fileArray.filepath);
          return res.status(400).json({ 
            error: 'Ushbu fayl turi ruxsat berilmagan',
            allowedTypes: 'Rasm, video, hujjat, audio va arxiv fayllari'
          });
        }

        // Fayl o'lchamini qo'shimcha tekshirish
        if (fileSize > MAX_FILE_SIZE) {
          fs.unlinkSync(fileArray.filepath);
          return res.status(413).json({ 
            error: 'Fayl hajmi juda katta (maksimum 10MB)' 
          });
        }

        // Maydonlardan ma'lumotlarni olish
        const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
        const username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
        const postIndex = Array.isArray(fields.postIndex) ? fields.postIndex[0] : fields.postIndex;

        // Fayl nomini xavfsiz qilish
        const safeOriginalName = sanitizeFilename(originalName);
        const fileExtension = path.extname(safeOriginalName);

        // Noyob fayl nomi yaratish
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        
        let fileName;
        let folderPath;
        
        if (type === 'profile') {
          folderPath = 'profiles';
          fileName = `${username}_${timestamp}_${randomString}${fileExtension}`;
        } else {
          folderPath = 'posts';
          fileName = `${username}_${postIndex}_${timestamp}_${randomString}${fileExtension}`;
        }

        // To'liq fayl yo'li
        const filePath = `${folderPath}/${fileName}`;

        // Faylni o'qish
        const fileBuffer = fs.readFileSync(fileArray.filepath);

        // Supabase Storage ga yuklash
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileBuffer, {
            contentType: mimetype,
            upsert: false, // Mavjud faylni qayta yozmaslik
          });

        // Vaqtinchalik faylni o'chirish
        fs.unlinkSync(fileArray.filepath);

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          return res.status(500).json({ 
            error: 'Faylni saqlashda xatolik',
            details: uploadError.message 
          });
        }

        // Public URL olish
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Javobni qaytarish
        res.status(200).json({ 
          success: true, 
          url: publicUrl,
          filename: fileName,
          originalName: originalName,
          fileSize: fileSize,
          mimeType: mimetype,
          path: filePath,
          bucket: BUCKET_NAME
        });

      } catch (fileError) {
        console.error('File processing error:', fileError);
        
        // Vaqtinchalik faylni o'chirish (agar mavjud bo'lsa)
        try {
          const fileArray = Array.isArray(file) ? file[0] : file;
          if (fs.existsSync(fileArray.filepath)) {
            fs.unlinkSync(fileArray.filepath);
          }
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
        
        res.status(500).json({ error: 'Faylni qayta ishlashda xatolik' });
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ichki server xatoligi' });
  }
}
