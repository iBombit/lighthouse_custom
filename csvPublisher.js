#!/usr/bin/env node

// Optional dotenv import - only if available (for local testing)
try {
  await import('dotenv/config');
} catch (e) {
  // dotenv not available, continue without it
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);

/**
 * CSV Publisher - Zips all files from /reports folder and publishes to Carrier platform
 */
class CSVPublisher {
  constructor(config) {
    // Use environment variables or .env values as defaults
    this.url = config.url || process.env.GALLOPER_URL || '';
    this.projectId = config.projectId || process.env.project_id || '';
    this.authToken = config.authToken || process.env.token || '';
    this.bucket = config.bucket || process.env.RESULTS_BUCKET || '';
    this.reportId = config.reportId || process.env.REPORT_ID || '';
    this.verbose = config.verbose || false;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    if (!this.url) errors.push('url (GALLOPER_URL)');
    if (!this.projectId) errors.push('project_id');
    if (!this.authToken) errors.push('auth_token (token)');
    if (!this.bucket) errors.push('bucket (RESULTS_BUCKET)');
    if (!this.reportId) errors.push('reportId (REPORT_ID)');
    
    if (errors.length > 0) {
      throw new Error(`Missing required configuration: ${errors.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Zip all files from reports folder
   */
  async zipReportsFolder() {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Validate reports folder exists
    if (!fs.existsSync(reportsDir)) {
      throw new Error(`Reports folder not found: ${reportsDir}`);
    }

    // Check if there are files in reports folder
    const files = fs.readdirSync(reportsDir).filter(file => {
      const filePath = path.join(reportsDir, file);
      return fs.statSync(filePath).isFile();
    });

    if (files.length === 0) {
      throw new Error('No files found in /reports folder to zip');
    }

    if (this.verbose) {
      console.log(`� Found ${files.length} files in /reports folder`);
      files.forEach(file => console.log(`   - ${file}`));
    }

    // Ensure reportId has .zip extension
    const zipFileName = this.reportId.endsWith('.zip') ? this.reportId : `${this.reportId}.zip`;
    const zipFilePath = path.join(process.cwd(), zipFileName);

    // Remove existing zip file if it exists
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      if (this.verbose) {
        console.log(`🗑️  Removed existing zip file: ${zipFileName}`);
      }
    }

    if (this.verbose) {
      console.log(`📦 Creating zip file: ${zipFileName}`);
    }

    try {
      // Use different zip command based on OS
      const isWindows = process.platform === 'win32';
      let zipCommand;

      if (isWindows) {
        // For Windows, use PowerShell Compress-Archive
        const reportsPath = reportsDir.replace(/\\/g, '\\\\');
        const zipPath = zipFilePath.replace(/\\/g, '\\\\');
        zipCommand = `powershell -command "Compress-Archive -Path '${reportsPath}\\*' -DestinationPath '${zipPath}' -Force"`;
      } else {
        // For Unix-like systems, use zip command
        zipCommand = `cd "${reportsDir}" && zip -r "${zipFilePath}" .`;
      }

      await execPromise(zipCommand);

      if (!fs.existsSync(zipFilePath)) {
        throw new Error('Zip file was not created');
      }

      const zipStats = fs.statSync(zipFilePath);
      if (this.verbose) {
        console.log(`✅ Zip file created successfully (${zipStats.size} bytes)`);
      }

      return zipFilePath;

    } catch (error) {
      throw new Error(`Failed to create zip file: ${error.message}`);
    }
  }

  /**
   * Publish zip file to Carrier platform
   */
  async publish() {
    try {
      this.validate();

      if (this.verbose) {
        console.log('🚀 Starting reports artifact publishing...');
        console.log(`🆔 Report ID: ${this.reportId}`);
        console.log(`🪣 Bucket: ${this.bucket}`);
        console.log(`🏢 Project ID: ${this.projectId}`);
        console.log(`🌐 URL: ${this.url}`);
      }

      // Step 1: Zip all files from reports folder
      const zipFilePath = await this.zipReportsFolder();
      const zipFileName = path.basename(zipFilePath);

      // Step 2: Upload zip file
      const fileStats = fs.statSync(zipFilePath);
      if (this.verbose) {
        console.log(`📤 Uploading: ${zipFileName} (${fileStats.size} bytes)`);
      }

      // Construct upload URL
      const uploadUrl = `${this.url.replace(/\/$/, '')}/api/v1/artifacts/artifacts/default/${this.projectId}/${this.bucket}?integration_id=1&is_local=false`;

      // Read file and create form data
      const fileBuffer = fs.readFileSync(zipFilePath);
      const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
      
      const formData = new FormData();
      formData.append('file', fileBlob, zipFileName);

      // Make upload request
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const responseBody = await response.text();

      // Step 3: Clean up - remove zip file after upload
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
        if (this.verbose) {
          console.log(`🗑️  Cleaned up temporary zip file: ${zipFileName}`);
        }
      }

      if (response.status === 200) {
        if (this.verbose) {
          console.log('✅ Zip file uploaded successfully');
          console.log(`🔗 File location: ${this.url}/api/v1/artifacts/artifact/default/${this.projectId}/${this.bucket}/${zipFileName}`);
        }
        
        return {
          success: true,
          fileName: zipFileName,
          bucket: this.bucket,
          projectId: this.projectId,
          fileUrl: `${this.url}/api/v1/artifacts/artifact/default/${this.projectId}/${this.bucket}/${zipFileName}`
        };
      } else {
        throw new Error(`Upload failed. Status: ${response.status}, Response: ${responseBody}`);
      }

    } catch (error) {
      if (this.verbose) {
        console.error(`❌ Error: ${error.message}`);
      }
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      const cleanKey = key.substring(2).toLowerCase();
      args[cleanKey] = value === 'true' ? true : value === 'false' ? false : value || true;
    }
  });
  return args;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
🚀 CSV Publisher - Zip and Publish reports folder contents

Usage: node csvPublisher.js --publishArtifacts=true/false

Options:
  --publishArtifacts=true/false   Enable/disable publishing (required)

Configuration (via environment variables):
  GALLOPER_URL        Platform URL (e.g., https://platform.getcarrier.io)
  project_id          Project identifier
  token               Authentication token
  RESULTS_BUCKET      Target bucket name
  REPORT_ID           Zip file name (e.g., 33a83cbd-9cfe-4385-87c2-37ae2762a7e3)

How it works:
  1. Zips all files from /reports folder
  2. Names the zip file using REPORT_ID value (e.g., REPORT_ID.zip)
  3. Uploads to the specified bucket
  4. Cleans up temporary zip file

For local testing:
  Create a .env file in the project root with the above variables

Examples:
  # Publish reports (using environment variables or .env)
  node csvPublisher.js --publishArtifacts=true

  # Skip publishing
  node csvPublisher.js --publishArtifacts=false

  # In Docker container (environment variables are automatically available)
  # REPORT_ID=33a83cbd-9cfe-4385-87c2-37ae2762a7e3
  node csvPublisher.js --publishArtifacts=true
  # Creates: 33a83cbd-9cfe-4385-87c2-37ae2762a7e3.zip
`);
}

/**
 * Main CLI execution function
 */
async function runCLI() {
  const args = parseArguments();

  // Show help if requested
  if (args.help || args.h) {
    showUsage();
    process.exit(0);
  }

  // Check required argument
  if (args.publishartifacts === undefined) {
    console.error('❌ Error: --publishArtifacts=true/false argument is required');
    showUsage();
    process.exit(1);
  }

  // Skip if publishArtifacts is false
  if (args.publishartifacts === false) {
    console.log('ℹ️  Reports publishing is disabled (publishArtifacts=false)');
    process.exit(0);
  }

  try {
    const config = {
      verbose: true
    };

    const publisher = new CSVPublisher(config);
    const result = await publisher.publish();

    if (result.success) {
      console.log(`\n🎉 Successfully published reports as: ${result.fileName}`);
      console.log(`🔗 Access URL: ${result.fileUrl}`);
      process.exit(0);
    } else {
      console.error(`\n❌ Publishing failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Check if this file is being run directly (not imported)
if (process.argv[1] === __filename) {
  runCLI().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { CSVPublisher };
