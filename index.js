import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OpenClaw Plugin for GKE Operations.
 * This plugin registers the 'gke-sre' agent on installation.
 */
export default {
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  
  /**
   * Called by OpenClaw when the plugin is loaded.
   * @param {any} api The OpenClaw plugin API.
   */
  register(api) {
    console.log("GKE OpenClaw Plugin: Registering agents...");

    // Path to the agent's SOUL.md file
    const soulPath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');

    // Use the official API to register the agent.
    // In OpenClaw, 'api.agents.register' is the standard way to add new agents.
    // We provide the unique ID, a human-readable name, and the workspace path.
    api.agents.register({
      id: 'gke-sre',
      name: 'GKE SRE Expert',
      description: 'Expert Site Reliability Engineer for GKE clusters.',
      workspace: path.join(__dirname, 'agents', 'gke-ops'),
      // The soul field points to the primary personality/instruction file.
      soul: soulPath
    });

    console.log("GKE OpenClaw Plugin: 'gke-sre' agent registered successfully.");
  }
};
