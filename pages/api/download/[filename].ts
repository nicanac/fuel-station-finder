import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import os from 'os'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename required' });
    }

    // Security check - only allow .gpx files
    if (!filename.endsWith('.gpx')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, filename);

    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read file
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    // Return file with proper headers
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(fileContent);

    // Optionally delete the temp file after serving
    setTimeout(() => {
      fs.unlink(filePath, () => {});
    }, 30000); // Delete after 30 seconds

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}