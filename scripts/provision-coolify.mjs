const apiBase = (process.env.COOLIFY_API_BASE_URL ?? "https://coolify.fs0ciety.org/api/v1").replace(/\/$/, "");
const apiKey = process.env.COOLIFY_API_KEY;
const serverUuid = process.env.COOLIFY_SERVER_UUID?.trim();
const projectName = "INIT Startpage";
const appName = "init-startpage";
const repository = "fs0ciety7000/start-x";
const repositoryUrl = `https://github.com/${repository}`;
const branch = "codex/startpage";
const publicUrl = "https://init.fs0ciety.org";
const appDomain = `${publicUrl}:3000`;

if (!apiKey) throw new Error("Missing GitHub repository secret COOLIFY_API_KEY.");

function scrub(text) {
  return text.replaceAll(apiKey, "[redacted]").replace(/\b[0-9a-f]{32,}\b/gi, "[redacted]");
}

async function api(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Coolify ${method} ${path} returned HTTP ${response.status}. ${scrub(text).slice(0, 800)}`);
  if (response.status === 204 || text.length === 0) return null;
  return JSON.parse(text);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function isCoolifyHost(server) {
  const description = String(server.description ?? "");
  return server.ip === "host.docker.internal" || description.includes("where Coolify is running");
}

function sameRepository(value) {
  if (!value) return true;
  const normalized = String(value).replace(/\.git$/, "").replace(/^https:\/\/github\.com\//, "");
  return normalized === repository;
}

const servers = asArray(await api("GET", "/servers"));
const usable = servers.filter((server) => server.settings?.is_usable !== false && server.settings?.is_reachable !== false && server.settings?.server_role !== "build" && server.settings?.is_build_server !== true);
const coolifyHosts = usable.filter(isCoolifyHost);
const server = serverUuid ? usable.find((item) => item.uuid === serverUuid) : coolifyHosts.length === 1 ? coolifyHosts[0] : usable.length === 1 ? usable[0] : null;
if (!server) {
  const names = (serverUuid ? usable : coolifyHosts).map((item) => item.name).join(", ") || "none";
  throw new Error(serverUuid ? "COOLIFY_SERVER_UUID does not identify a usable deployment server." : `Could not identify the Coolify host (candidates: ${names}). Set the repository variable COOLIFY_SERVER_UUID to choose one.`);
}
console.log(`Using Coolify server ${server.name}.`);

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
if (app && !sameRepository(app.git_repository)) {
  throw new Error("An application named init-startpage already exists for a different repository.");
}

const applicationConfig = {
  project_uuid: project.uuid,
  server_uuid: server.uuid,
  environment_name: environment.name,
  environment_uuid: environmentUuid,
  git_repository: repositoryUrl,
  git_branch: branch,
  build_pack: "dockercompose",
  docker_compose_location: "docker-compose.yml",
  docker_compose_domains: [{ name: "app", domain: appDomain }],
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
  console.log(`Created Coolify application ${appName}.`);
} else {
  const update = { ...applicationConfig };
  for (const key of ["project_uuid", "server_uuid", "environment_name", "environment_uuid", "instant_deploy"]) delete update[key];
  await api("PATCH", `/applications/${encodeURIComponent(app.uuid)}`, update);
  console.log(`Updated Coolify application ${appName}.`);
}

const plainEnvironment = [
  { key: "POSTGRES_DB", value: "init", is_literal: true, is_runtime: true, is_buildtime: true },
  { key: "POSTGRES_USER", value: "init", is_literal: true, is_runtime: true, is_buildtime: true },
  { key: "BETTER_AUTH_URL", value: publicUrl, is_literal: true, is_runtime: true, is_buildtime: true },
  { key: "RAIL_API_BASE_URL", value: "https://reseau.fs0ciety.org", is_literal: true, is_runtime: true, is_buildtime: true },
];
await api("PATCH", `/applications/${encodeURIComponent(app.uuid)}/envs/bulk`, { data: plainEnvironment });
console.log("Recorded non-secret application environment variables.");

const deployment = await api("POST", `/applications/${encodeURIComponent(app.uuid)}/start`);
const deploymentUuid = deployment?.deployment_uuid;
if (!deploymentUuid) throw new Error("Coolify accepted the resource but did not return a deployment UUID.");
console.log(`Queued Coolify deployment ${deploymentUuid}.`);

const terminalSuccess = new Set(["finished", "success", "succeeded"]);
const terminalFailure = new Set(["failed", "cancelled", "canceled", "error"]);
const deadline = Date.now() + 20 * 60_000;
let status = "queued";
let result = null;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  result = await api("GET", `/deployments/${encodeURIComponent(deploymentUuid)}`);
  status = String(result?.status ?? "unknown").toLowerCase();
  console.log(`Deployment ${deploymentUuid} status: ${status}.`);
  if (terminalSuccess.has(status) || terminalFailure.has(status)) break;
}
if (terminalFailure.has(status)) {
  const logs = typeof result?.logs === "string" ? result.logs : "";
  const tail = scrub(logs)
    .split("\n")
    .filter((line) => !/PASSWORD|SECRET|TOKEN|SERVICE_HEX|SERVICE_PASSWORD|DATABASE_URL|Bearer /i.test(line))
    .slice(-40)
    .join("\n");
  throw new Error(`Coolify deployment ${deploymentUuid} ended with status ${status}.\n${tail}`);
}
if (!terminalSuccess.has(status)) throw new Error(`Coolify deployment ${deploymentUuid} did not finish within 20 minutes (last status: ${status}).`);

if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `application_uuid=${app.uuid}\ndeployment_uuid=${deploymentUuid}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## INIT Startpage deployed\n\n- URL: ${publicUrl}\n- Coolify project: ${projectName}\n- Application: ${appName}\n- Deployment: ${deploymentUuid}\n- Status: ${status}\n\nCoolify generates and persists the Compose secrets. Copy SERVICE_HEX_64_SETUP from the resource environment to create the first admin at ${publicUrl}/setup.\n`);
}
console.log(`Coolify deployment ${deploymentUuid} finished successfully at ${publicUrl}.`);
