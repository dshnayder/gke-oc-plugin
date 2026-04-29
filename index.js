const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
  id: "gke-oc-plugin",
  name: "GKE OpenClaw Plugin",
  register(api) {
    const context = api;
    const repoUrl = "https://github.com/GoogleCloudPlatform/gke-mcp.git";
    const commitFilePath = path.join(__dirname, '.gke-mcp-commit');
    let lastCommit = null;

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

        console.log("Go is available.");

        // 2. Install GKE MCP tool
        console.log("Installing GKE MCP tool...");
        execSync('go install github.com/GoogleCloudPlatform/gke-mcp@latest', { stdio: 'inherit' });

        // 3. Locate the binary
        const goBinPath = process.env.GOBIN || path.join(os.homedir(), 'go', 'bin');
        const binaryPath = path.join(goBinPath, 'gke-mcp');

        console.log(`GKE MCP tool installed at ${binaryPath}. Registering...`);

        // 4. Register the binary as an MCP server in OpenClaw
        await context.mcp.register({
          name: 'gke-mcp',
          command: binaryPath,
          args: [],
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

        // Send activation message
        try {
          await context.messaging.send({
            to: 'user:default',
            text: "🚀 GKE OpenClaw Plugin Activated!\n\nI've successfully created 'gke-ops' agent and initialized its SOUL.md file. Your GKE-MCP server is also standing by."
          });
          console.log("Activation message sent.");
        } catch (error) {
          console.error("Could not send activation message:", error);
        }

        // 7. Get initial HEAD commit or read from disk
        if (fs.existsSync(commitFilePath)) {
          lastCommit = fs.readFileSync(commitFilePath, 'utf8').trim();
          console.log(`Read last commit from disk: ${lastCommit}`);
        }

        try {
          console.log(`Fetching remote HEAD from ${repoUrl}...`);
          const { stdout } = await execAsync(`git ls-remote ${repoUrl} HEAD`);
          const currentRemoteCommit = stdout.split('\t')[0].trim();
          console.log(`Remote GKE MCP commit: ${currentRemoteCommit}`);
          
          if (!lastCommit) {
            lastCommit = currentRemoteCommit;
            fs.writeFileSync(commitFilePath, lastCommit, 'utf8');
            console.log("Stored initial commit to disk.");
          }
        } catch (error) {
          console.error("Failed to get remote commit:", error.message);
        }

        // 8. Set up background task for update checks
        console.log("Setting up background task for update checks...");
        setInterval(async () => {
          try {
            console.log("Checking for updates to gke-mcp...");
            const { stdout } = await execAsync(`git ls-remote ${repoUrl} HEAD`);
            const currentCommit = stdout.split('\t')[0].trim();
            
            if (lastCommit && currentCommit !== lastCommit) {
              console.log("A newer version of gke-mcp is available.");
              
              try {
                await context.messaging.send({
                  to: 'user:default',
                  text: "🔔 A newer version of gke-mcp is available. Please pull and rebuild."
                });
                console.log("Notification sent via SDK.");
              } catch (e) {
                console.error("Failed to send message via SDK:", e.message);
              }
              
              lastCommit = currentCommit; // Update state
              fs.writeFileSync(commitFilePath, lastCommit, 'utf8'); // Persist
              console.log("Updated commit stored to disk.");
            } else if (!lastCommit) {
              lastCommit = currentCommit;
              fs.writeFileSync(commitFilePath, lastCommit, 'utf8');
            } else {
              console.log("gke-mcp is up to date.");
            }
          } catch (error) {
            console.error("Error checking for updates:", error.message);
          }
        }, 3600000); // Check every hour

      } catch (error) {
        console.error("Failed to initialize plugin:", error.message);
        throw error;
      }
    }

    // Run the initialization logic
    initializePlugin();
  }
};
