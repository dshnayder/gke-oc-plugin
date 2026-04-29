import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    console.log("GKE OpenClaw Plugin registered.");

    // Run command to add agent
    exec('openclaw agents add gke-sre', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating agent via CLI: ${error.message}`);
        return;
      }
      if (stderr) {
        console.warn(`Agent creation stderr: ${stderr}`);
      }
      console.log(`Agent creation stdout: ${stdout}`);

      // After creation, copy the SOUL.md file
      // The documentation suggests agents are created under ~/.openclaw/agents/
      const homeDir = os.homedir();
      const targetDir = path.join(homeDir, '.openclaw', 'agents', 'gke-sre');
      const targetPath = path.join(targetDir, 'SOUL.md');
      const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');

      console.log(`Attempting to copy from ${sourcePath} to ${targetPath}`);

      try {
        if (!fs.existsSync(targetDir)) {
          console.error(`Target directory does not exist after creation command: ${targetDir}`);
          return;
        }

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`Copied SOUL.md to ${targetPath}`);
        } else {
          console.error(`Source SOUL.md not found at: ${sourcePath}`);
        }
      } catch (err) {
        console.error(`Error copying file: ${err.message}`);
      }
    });
  }
};
