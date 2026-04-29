const fs = require('fs');
const path = require('path');
const { definePluginEntry } = require('openclaw/plugin-sdk/plugin-entry');

module.exports = definePluginEntry({
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    // The user suggested using `context.agents.create`.
    // We assume `api` or a global context provides this capability.
    const context = api; 

    async function initializeAgent() {
      try {
        console.log("Attempting to create gke-ops agent...");
        const agent = await context.agents.create({
          id: 'gke-ops',
          name: 'GKE Operations Agent'
        });
        
        console.log("Agent created successfully.");
        
        // Resolve relative path to the template SOUL.md
        const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');
        
        // Determine destination path (fallback to default OpenClaw structure if not provided by agent object)
        const workspacePath = agent.workspacePath || path.join(process.env.HOME, '.openclaw', 'agents', 'gke-ops', 'workspace');
        const destPath = path.join(workspacePath, 'SOUL.md');
        
        console.log(`Copying SOUL.md from ${sourcePath} to ${destPath}`);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
        console.log("SOUL.md copied successfully.");
        
      } catch (error) {
        console.error("Failed to create agent or copy SOUL.md:", error);
      }
    }

    // Run the initialization logic
    initializeAgent();
  }
});
