#!/usr/bin/env node

/**
 * Download and extract preprocessed project files from GitHub Release
 * This script is run during Vercel build to fetch project JSON data
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RELEASE_URL = 'https://github.com/igomuni/rs_system_pipeline_marumie/releases/download/v1.0.0/projects_data.tar.gz';
const DOWNLOAD_PATH = path.join(process.cwd(), 'projects_data.tar.gz');
const PROJECTS_DIR = path.join(process.cwd(), 'public', 'data', 'projects');

console.log('Checking if projects directory exists...');

// Check if projects directory already exists
if (fs.existsSync(PROJECTS_DIR) && fs.readdirSync(PROJECTS_DIR).length > 0) {
  console.log('✓ Projects directory already exists, skipping download');
  process.exit(0);
}

console.log('Downloading data from GitHub Release...');
console.log(`URL: ${RELEASE_URL}`);

const file = fs.createWriteStream(DOWNLOAD_PATH);

https.get(RELEASE_URL, (response) => {
  // Follow redirects
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('✓ Download completed');
        extractData();
      });
    }).on('error', (err) => {
      fs.unlinkSync(DOWNLOAD_PATH);
      console.error('Error downloading file:', err.message);
      process.exit(1);
    });
  } else {
    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('✓ Download completed');
      extractData();
    });
  }
}).on('error', (err) => {
  fs.unlinkSync(DOWNLOAD_PATH);
  console.error('Error downloading file:', err.message);
  process.exit(1);
});

function extractData() {
  console.log('Extracting project files...');

  try {
    // Extract tar.gz to public/data/
    const publicDataDir = path.join(process.cwd(), 'public', 'data');
    execSync(`tar -xzf ${DOWNLOAD_PATH} -C ${publicDataDir}`, { stdio: 'inherit' });

    // Remove downloaded file
    fs.unlinkSync(DOWNLOAD_PATH);

    console.log('✓ Project files extraction completed');

    // Verify extraction
    if (fs.existsSync(PROJECTS_DIR)) {
      const projectFiles = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
      console.log(`✓ Found ${projectFiles.length} project files`);
    } else {
      console.error('Error: Projects directory not found after extraction');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error extracting data:', error.message);
    process.exit(1);
  }
}
