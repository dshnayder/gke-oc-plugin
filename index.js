const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

module.exports = {
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    const context = api; 

    async function initializePlugin() {
      try {
        // 1. Verify curl availability
        try {
          execSync('curl --version', { stdio: 'ignore' });
        } catch (e) {
          throw new Error("curl is not available. This plugin requires curl to install the GKE MCP tool.");
        }

        console.log("curl is available. Installing GKE MCP tool using script...");

        // 2. Install GKE MCP tool using curl script
        try {
          execSync('curl -sSL https://raw.githubusercontent.com/GoogleCloudPlatform/gke-mcp/main/install.sh | bash', { stdio: 'inherit' });
        } catch (e) {
          console.warn("Install script encountered an error, but proceeding to check if binary exists.");
        }

        // 3. Locate the binary
        let binaryPath = '';
        try {
          binaryPath = execSync('which gke-mcp').toString().trim();
        } catch (e) {
          // Fallback if not in PATH
          const goBinPath = process.env.GOBIN || path.join(os.homedir(), 'go', 'bin');
          binaryPath = path.join(goBinPath, 'gke-mcp');
          
          if (!fs.existsSync(binaryPath)) {
            const localBinPath = path.join(os.homedir(), '.local', 'bin', 'gke-mcp');
            if (fs.existsSync(localBinPath)) {
              binaryPath = localBinPath;
            } else {
              console.warn("Could not locate gke-mcp binary automatically. Assuming default path.");
            }
          }
        }

        console.log(`GKE MCP tool path: ${binaryPath}. Registering...`);

        // 4. Register the binary as an MCP server in OpenClaw
        const mcpConfig = {
          name: 'gke-mcp',
          command: binaryPath,
          args: [],
          env: {
            ...process.env,
            USE_GKE_GCLOUD_AUTH: "true"
          }
        };

        try {
          if (typeof context.registerMcpServer === 'function') {
            console.log("Using context.registerMcpServer...");
            await context.registerMcpServer(mcpConfig);
          } else if (context.mcp && typeof context.mcp.register === 'function') {
            console.log("Using context.mcp.register...");
            await context.mcp.register(mcpConfig);
          } else {
            console.warn("No SDK method found for MCP registration on context object.");
          }
        } catch (sdkError) {
          console.error("Failed to register MCP server via SDK:", sdkError.message);
        }

        // 5. Create gke-ops agent
        console.log("Attempting to create gke-ops agent...");
        const agent = await context.agents.create({
          id: 'gke-ops',
          name: 'GKE Operations Agent'
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
        throw error;
      }
    }

    // Run the initialization logic
    initializePlugin();
  }
};
