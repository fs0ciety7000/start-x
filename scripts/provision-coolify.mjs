const apiBase = (process.env.COOLIFY_API_BASE_URL ?? "https://coolify.fs0ciety.org/api/v1").replace(/\/$/, "");
const apiKey = process.env.COOLIFY_API_KEY;
const serverUuid = process.env.COOLIFY_SERVER_UUID?.trim();
const projectName = "INIT Startpage";
const appName = "init-startpage";
const repository = "https://github.com/fs0ciety7000/start-x";
const branch = "codex/startpage";
const domain = "https://init.fs0ciety.org";

if (!apiKey) throw new Error("Missing GitHub repository secret COOLIFY_API_KEY.");

async function api(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Coolify ${method} ${path} returned HTTP ${response.status}.`);
  if (response.status === 204) return null;
  return response.json();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

const servers = asArray(await api("GET", "/servers"));
const usable = servers.filter((server) => server.settings?.is_usable !== false && server.settings?.is_reachable !== false && server.settings?.server_role !== "build");
const server = serverUuid ? usable.find((item) => item.uuid === serverUuid) : usable.length === 1 ? usable[0] : null;
if (!server) throw new Error(serverUuid ? "COOLIFY_SERVER_UUID does not identify a usable Coolify server." : `Expected one usable Coolify server, found ${usable.length}. Set the repository variable COOLIFY_SERVER_UUID to choose one.`);

const projects = asArray(await api("GET", "/projects"));
let project = projects.find((item) => item.name === projectName);
if (!project) project = await api("POST", "/projects", { name: projectName, description: "Personal startpage and Belgian rail dashboard" });
if (!project?.uuid) throw new Error("Coolify did not return a project UUID.");

let environments = asArray(await api("GET", `/projects/${encodeURIComponent(project.uuid)}/environments`));
let environment = environments.find((item) => item.name.toLowerCase() === "production");
if (!environment) environment = await api("POST", `/projects/${encodeURIComponent(project.uuid)}/environments`, { name: "production" });
const environmentUuid = environment?.uuid;
if (!environmentUuid && !environment?.name) throw new Error("Coolify did not return the production environment.");

const applications = asArray(await api("GET", "/applications"));
const matches = applications.filter((item) => item.name === appName);
if (matches.length > 1) throw new Error("More than one Coolify application uses the INIT Startpage name; refusing to pick one.");
let app = matches[0];
if (app && app.git_repository && app.git_repository.replace(/\.git$/, "") !== repository) {
  throw new Error("An application named init-startpage already exists for a different repository.");
}

const applicationConfig = {
  project_uuid: project.uuid,
  server_uuid: server.uuid,
  environment_name: environment.name,
  environment_uuid: environmentUuid,
  git_repository: repository,
  git_branch: branch,
  build_pack: "dockercompose",
  docker_compose_location: "docker-compose.yml",
  docker_compose_domains: [{ name: "app", domain }],
  name: appName,
  description: "Private personal startpage",
  is_auto_deploy_enabled: true,
  is_force_https_enabled: true,
  autogenerate_domain: false,
  instant_deploy: false,
};

if (!app) {
  app = await api("POST", "/applications/public", applicationConfig);
  if (!app?.uuid) throw new Error("Coolify did not return an application UUID.");
} else {
  await api("PATCH", `/applications/${encodeURIComponent(app.uuid)}`, applicationConfig);
}

const deployment = await api("POST", `/applications/${encodeURIComponent(app.uuid)}/start`);
const deploymentUuid = deployment?.deployment_uuid;
if (!deploymentUuid) throw new Error("Coolify accepted the resource but did not return a deployment UUID.");

const terminalSuccess = new Set(["finished", "success", "succeeded"]);
const terminalFailure = new Set(["failed", "cancelled", "canceled", "error"]);
const deadline = Date.now() + 20 * 60_000;
let status = "queued";
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  const result = await api("GET", `/deployments/${encodeURIComponent(deploymentUuid)}`);
  status = String(result?.status ?? "unknown").toLowerCase();
  if (terminalSuccess.has(status)) break;
  if (terminalFailure.has(status)) throw new Error(`Coolify deployment ${deploymentUuid} ended with status ${status}. Inspect its logs in Coolify.`);
}
if (!terminalSuccess.has(status)) throw new Error(`Coolify deployment ${deploymentUuid} did not finish within 20 minutes (last status: ${status}).`);

if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `application_uuid=${app.uuid}\ndeployment_uuid=${deploymentUuid}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## INIT Startpage deployed\n\n- URL: ${domain}\n- Coolify project: ${projectName}\n- Application: ${appName}\n- Deployment: ${deploymentUuid}\n- Status: ${status}\n\nCoolify generates and persists the Compose secrets. Copy SERVICE_HEX_64_SETUP from the resource environment to create the first admin at ${domain}/setup.\n`);
}
console.log(`Coolify deployment ${deploymentUuid} finished successfully at ${domain}.`);
