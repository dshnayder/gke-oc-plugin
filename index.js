const { Plugin } = require('@openclaw/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

class GkePlugin extends Plugin {
  async onInstall(context) {
    console.log("GkePlugin: onInstall called");

    // 1. Register the managed stdio MCP server
    try {
      await context.mcp.register({
        name: 'gke-mcp',
        command: 'gke-mcp', // Assumed to be in PATH or use absolute path
        args: [],
        env: {
          ...process.env,
          USE_GKE_GCLOUD_AUTH: "true"
        }
      });
      console.log("GkePlugin: MCP server registered.");
    } catch (error) {
      console.error("GkePlugin: Failed to register MCP server:", error.message);
    }

    // 2. Create gke-ops agent and copy SOUL.md
    try {
      console.log("GkePlugin: Creating gke-ops agent...");
      const agent = await context.agents.create({
        id: 'gke-ops',
        name: 'GKE Operations Agent',
        model: 'gpt-4'
      });

      console.log("GkePlugin: Agent created successfully.");

      const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');
      const workspacePath = agent.workspacePath || path.join(os.homedir(), '.openclaw', 'agents', 'gke-ops', 'workspace');
      const destPath = path.join(workspacePath, 'SOUL.md');

      console.log(`GkePlugin: Copying SOUL.md from ${sourcePath} to ${destPath}`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      console.log("GkePlugin: SOUL.md copied successfully.");

    } catch (error) {
      console.error("GkePlugin: Failed to create agent or copy SOUL.md:", error.message);
    }
  }

  async activate(context) {
    console.log("GkePlugin: activate called");

    // 1. Make the tools available to the gke-ops agent
    try {
      await context.agents.update('gke-ops', {
        mcpServers: ['gke-mcp']
      });
      console.log("GkePlugin: Bound gke-mcp to gke-ops agent.");
    } catch (error) {
      console.error("GkePlugin: Failed to bind MCP server to agent:", error.message);
    }
  }
}

module.exports = GkePlugin;
