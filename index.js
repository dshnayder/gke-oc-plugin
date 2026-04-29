const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { definePluginEntry } = require('openclaw/plugin-sdk/plugin-entry');

module.exports = definePluginEntry({
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    const context = api;

    async function initializePlugin() {
      try {
        // 1. Verify Go availability
        try {
          execSync('go version', { stdio: 'ignore' });
        } catch (e) {
          throw new Error(
            "Go is not available. This plugin requires Go to install the GKE MCP tool.\n" +
            "Please install Go from https://go.dev/doc/install and ensure it is in your PATH."
          );
        }

        console.log("Go is available. Installing GKE MCP tool...");

        // 2. Install GKE MCP tool
        execSync('go install github.com/GoogleCloudPlatform/gke-mcp@latest', { stdio: 'inherit' });

        // 3. Locate the binary
        const goBinPath = process.env.GOBIN || path.join(os.homedir(), 'go', 'bin');
        const binaryPath = path.join(goBinPath, 'gke-mcp');

        console.log(`GKE MCP tool installed at ${binaryPath}. Registering...`);

        // 4. Register the binary as an MCP server in OpenClaw
        await context.mcp.register({
          name: 'gke-mcp',
          command: binaryPath,
          args: [], // The GKE MCP server usually reads from gcloud config automatically
          env: {
            ...process.env,
            USE_GKE_GCLOUD_AUTH: "true" 
          }
        });

        console.log("GKE MCP tool registered successfully.");

        // 5. Create gke-ops agent
        console.log("Creating gke-ops agent...");
        const agent = await context.agents.create({
          id: 'gke-ops',
          name: 'GKE Operations Agent',
          model: 'gpt-4'
        });

        console.log("Agent created successfully.");

        // 6. Copy SOUL.md
        const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');
        const workspacePath = agent.workspacePath || path.join(os.homedir(), '.openclaw', 'agents', 'gke-ops', 'workspace');
        const destPath = path.join(workspacePath, 'SOUL.md');

        console.log(`Copying SOUL.md from ${sourcePath} to ${destPath}`);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
        console.log("SOUL.md copied successfully.");

      } catch (error) {
        console.error("Failed to initialize plugin:", error.message);
        throw error; // Rethrow to fail plugin installation/loading
      }
    }

    // Run the initialization logic
    initializePlugin();
  }
});
