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
    api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.agents ??= {};
        draft.agents.list ??= [];
        if (!draft.agents.list.find(a => a.id === 'gke-sre')) {
          draft.agents.list.push({ 
            id: 'gke-sre',
            workspace: path.join(os.homedir(), '.openclaw', 'agents', 'gke-sre')
          });
          console.log("Added gke-sre agent to config draft.");
        }
      }
    }).then(async (followUp) => {
      console.log(`Config mutation completed. Follow-up:`, followUp);

      const targetDir = path.join(os.homedir(), '.openclaw', 'agents', 'gke-sre');
      const targetPath = path.join(targetDir, 'SOUL.md');
      const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');

      console.log(`Attempting to initialize workspace at ${targetDir}`);

      try {
        // Use SDK to run shell commands for file operations, avoiding direct 'fs'
        await api.runtime.system.runCommandWithTimeout('mkdir', ['-p', targetDir]);
        console.log(`Created directory ${targetDir}`);

        await api.runtime.system.runCommandWithTimeout('cp', [sourcePath, targetPath]);
        console.log(`Copied SOUL.md to ${targetPath}`);
      } catch (err) {
        console.error(`Error during file operations: ${err.message}`);
      }
    }).catch(err => {
      console.error(`Error mutating config: ${err.message}`);
    });
  }
};
