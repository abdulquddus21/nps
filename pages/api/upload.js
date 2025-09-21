import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

// Fayl o'lchamini tekshirish (50MB limit)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 5, // Maksimum 5 ta fayl
      allowEmptyFiles: false,
      minFileSize: 1, // Minimum 1 byte
    });

    const uploadDir = path.join(process.cwd(), 'public', 'assets');
    
    // Assets papkasini yaratish
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        
        // Xatolik turini aniqlash
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: 'Fayl hajmi juda katta (maksimum 50MB)' 
          });
        }
        
        return res.status(500).json({ error: 'Yuklashda xatolik yuz berdi' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'Hech qanday fayl yuklanmadi' });
      }

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
          error: 'Fayl hajmi juda katta (maksimum 50MB)' 
        });
      }

      // Maydonlardan ma'lumotlarni olish
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
      const postIndex = Array.isArray(fields.postIndex) ? fields.postIndex[0] : fields.postIndex;

      // Fayl nomini xavfsiz qilish
      const safeOriginalName = sanitizeFilename(originalName);
      const fileExtension = path.extname(safeOriginalName);
      const baseName = path.basename(safeOriginalName, fileExtension);

      // Noyob fayl nomi yaratish
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      
      let fileName;
      if (type === 'profile') {
        fileName = `profile_${username}_${timestamp}_${randomString}${fileExtension}`;
      } else {
        fileName = `post_${username}_${postIndex}_${timestamp}_${randomString}${fileExtension}`;
      }

      const newPath = path.join(uploadDir, fileName);

      // Faylni ko'chirish
      fs.rename(fileArray.filepath, newPath, (err) => {
        if (err) {
          console.error('File move error:', err);
          return res.status(500).json({ error: 'Faylni saqlashda xatolik' });
        }

        // Fayl ruxsatlarini o'rnatish (ixtiyoriy)
        fs.chmod(newPath, 0o644, (chmodErr) => {
          if (chmodErr) {
            console.warn('Chmod warning:', chmodErr);
          }
        });

        // Javobni qaytarish
        const publicUrl = `/assets/${fileName}`;
        res.status(200).json({ 
          success: true, 
          url: publicUrl,
          filename: fileName,
          originalName: originalName,
          fileSize: fileSize,
          mimeType: mimetype
        });
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ichki server xatoligi' });
  }
}