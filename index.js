const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    const context = api; 

    async function initializePlugin() {
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
        const workspacePath = agent.workspacePath || path.join(os.homedir(), '.openclaw', 'agents', 'gke-ops', 'workspace');
        const destPath = path.join(workspacePath, 'SOUL.md');
        
        console.log(`Copying SOUL.md from ${sourcePath} to ${destPath}`);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
        console.log("SOUL.md copied successfully.");
        
        // Register MCP server
        console.log("Registering MCP server...");
        const mcpConfig = {
          name: 'gke-mcp',
          command: 'gke-mcp', // Assumed to be in PATH or absolute path
          args: [],
          env: {
            ...process.env,
            USE_GKE_GCLOUD_AUTH: "true"
          }
        };

        try {
          if (context.mcp && typeof context.mcp.register === 'function') {
            console.log("Using context.mcp.register...");
            await context.mcp.register(mcpConfig);
          } else if (typeof context.registerMcpServer === 'function') {
            console.log("Using context.registerMcpServer...");
            await context.registerMcpServer(mcpConfig);
          } else {
            console.warn("No SDK method found for MCP registration on context object.");
          }
        } catch (sdkError) {
          console.error("Failed to register MCP server via SDK:", sdkError.message);
        }
        
      } catch (error) {
        console.error("Failed to initialize plugin:", error);
      }
    }

    // Run the initialization logic
    initializePlugin();
  }
};
