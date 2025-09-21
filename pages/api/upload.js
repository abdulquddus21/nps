import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    const uploadDir = path.join(process.cwd(), 'public', 'assets');

    // Create assets directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get file info
      const fileArray = Array.isArray(file) ? file[0] : file;
      const originalName = fileArray.originalFilename;
      const fileExtension = path.extname(originalName);
      const type = fields.type;
      const username = fields.username;
      const postIndex = fields.postIndex;

      // Generate unique filename
      const timestamp = Date.now();
      let fileName;
      if (type === 'profile') {
        fileName = `profile_${username}_${timestamp}${fileExtension}`;
      } else {
        fileName = `post_${username}_${postIndex}_${timestamp}${fileExtension}`;
      }

      const newPath = path.join(uploadDir, fileName);

      // Move file to assets directory
      fs.rename(fileArray.filepath, newPath, (err) => {
        if (err) {
          console.error('File move error:', err);
          return res.status(500).json({ error: 'File save failed' });
        }

        // Return the public URL
        const publicUrl = `/assets/${fileName}`;
        res.status(200).json({ 
          success: true, 
          url: publicUrl,
          filename: fileName 
        });
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}