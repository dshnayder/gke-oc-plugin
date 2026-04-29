const { Plugin } = require('@openclaw/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

class GkeOcPlugin extends Plugin {
  async onInstall(context) {
    console.log("GkeOcPlugin: onInstall called");

    // 1. Register the managed stdio MCP server
    try {
      await context.mcp.register({
        name: 'gke-mcp',
        command: 'gke-mcp', // Assumed to be in PATH
        args: [],
        env: {
          ...process.env,
          USE_GKE_GCLOUD_AUTH: "true"
        }
      });
      console.log("GkeOcPlugin: MCP server registered.");
    } catch (error) {
      console.error("GkeOcPlugin: Failed to register MCP server:", error.message);
    }

    // 2. Create gke-ops agent and copy SOUL.md
    try {
      console.log("GkeOcPlugin: Creating gke-ops agent...");
      const agent = await context.agents.create({
        id: 'gke-ops',
        name: 'GKE Operations Agent',
        model: 'gpt-4'
      });

      console.log("GkeOcPlugin: Agent created successfully.");

      const sourcePath = path.join(__dirname, 'agents', 'gke-ops', 'SOUL.md');
      const workspacePath = agent.workspacePath || path.join(os.homedir(), '.openclaw', 'agents', 'gke-ops', 'workspace');
      const destPath = path.join(workspacePath, 'SOUL.md');

      console.log(`GkeOcPlugin: Copying SOUL.md from ${sourcePath} to ${destPath}`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      console.log("GkeOcPlugin: SOUL.md copied successfully.");

    } catch (error) {
      console.error("GkeOcPlugin: Failed to create agent or copy SOUL.md:", error.message);
    }
  }

  async activate(context) {
    console.log("GkeOcPlugin: activate called");

    // 1. Make the tools available to the gke-ops agent
    try {
      await context.agents.update('gke-ops', {
        mcpServers: ['gke-mcp']
      });
      console.log("GkeOcPlugin: Bound gke-mcp to gke-ops agent.");
    } catch (error) {
      console.error("GkeOcPlugin: Failed to bind MCP server to agent:", error.message);
    }

    // 2. Send activation message
    try {
      await context.messaging.send({
        to: 'user:default',
        text: "🚀 GKE OpenClaw Plugin Activated!\n\nI've successfully registered 'gke-mcp' and bound it to 'gke-ops' agent."
      });
      console.log("GkeOcPlugin: Activation message sent.");
    } catch (error) {
      console.error("GkeOcPlugin: Could not send activation message:", error.message);
    }

    // 3. Set up background task for update checks (using GitHub API)
    const repoUrl = "https://api.github.com/repos/GoogleCloudPlatform/gke-mcp/commits/main";
    const commitFilePath = path.join(__dirname, '.gke-mcp-commit');
    let lastCommit = null;

    if (fs.existsSync(commitFilePath)) {
      lastCommit = fs.readFileSync(commitFilePath, 'utf8').trim();
      console.log(`GkeOcPlugin: Read last commit from disk: ${lastCommit}`);
    }

    function checkUpdates() {
      console.log("GkeOcPlugin: Checking for updates to gke-mcp...");
      
      const req = https.get(repoUrl, { headers: { 'User-Agent': 'OpenClaw-Plugin' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error(`GkeOcPlugin: GitHub API returned status ${res.statusCode}`);
              return;
            }
            
            const json = JSON.parse(data);
            const currentCommit = json.sha;
            
            if (lastCommit && currentCommit !== lastCommit) {
              console.log("GkeOcPlugin: A newer version of gke-mcp is available.");
              
              context.messaging.send({
                to: 'user:default',
                text: "🔔 A newer version of gke-mcp is available. Please pull and rebuild."
              });
              
              lastCommit = currentCommit;
              fs.writeFileSync(commitFilePath, lastCommit, 'utf8');
              console.log("GkeOcPlugin: Updated commit stored to disk.");
            } else if (!lastCommit) {
              lastCommit = currentCommit;
              fs.writeFileSync(commitFilePath, lastCommit, 'utf8');
              console.log("GkeOcPlugin: Stored initial commit to disk.");
            } else {
              console.log("GkeOcPlugin: gke-mcp is up to date.");
            }
          } catch (e) {
            console.error("GkeOcPlugin: Failed to parse GitHub API response:", e.message);
          }
        });
      });
      
      req.on('error', (e) => {
        console.error("GkeOcPlugin: Failed to check for updates:", e.message);
      });
      
      req.end();
    }

    // Check every hour
    setInterval(checkUpdates, 3600000);
    // Initial check
    checkUpdates();
  }
}

module.exports = GkeOcPlugin;
