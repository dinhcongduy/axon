"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));

// src/AxonViewProvider.ts
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var https = __toESM(require("https"));
var http = __toESM(require("http"));
var SKILLS = [
  { id: "algorithmic-art", name: "Algorithmic Art", description: "Generate algorithmic and generative art programmatically", icon: "\u{1F3A8}", url: "https://github.com/anthropics/skills/tree/main/skills/algorithmic-art" },
  { id: "brand-guidelines", name: "Brand Guidelines", description: "Create and enforce brand guidelines for projects", icon: "\u{1F4CB}", url: "https://github.com/anthropics/skills/tree/main/skills/brand-guidelines" },
  { id: "canvas-design", name: "Canvas Design", description: "Design interactive canvas-based visualizations", icon: "\u{1F58C}\uFE0F", url: "https://github.com/anthropics/skills/tree/main/skills/canvas-design" },
  { id: "claude-api", name: "Claude API", description: "Work with the Claude API across multiple languages", icon: "\u{1F916}", url: "https://github.com/anthropics/skills/tree/main/skills/claude-api" },
  { id: "doc-coauthoring", name: "Doc Coauthoring", description: "Collaborate on document writing and editing", icon: "\u{1F4DD}", url: "https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring" },
  { id: "docx", name: "DOCX", description: "Create and manipulate Word documents", icon: "\u{1F4C4}", url: "https://github.com/anthropics/skills/tree/main/skills/docx" },
  { id: "frontend-design", name: "Frontend Design", description: "Build beautiful and responsive frontend interfaces", icon: "\u{1F310}", url: "https://github.com/anthropics/skills/tree/main/skills/frontend-design" },
  { id: "internal-comms", name: "Internal Comms", description: "Draft internal communications and announcements", icon: "\u{1F4AC}", url: "https://github.com/anthropics/skills/tree/main/skills/internal-comms" },
  { id: "mcp-builder", name: "MCP Builder", description: "Build Model Context Protocol servers and tools", icon: "\u{1F527}", url: "https://github.com/anthropics/skills/tree/main/skills/mcp-builder" },
  { id: "pdf", name: "PDF", description: "Create and manipulate PDF documents", icon: "\u{1F4D1}", url: "https://github.com/anthropics/skills/tree/main/skills/pdf" },
  { id: "pptx", name: "PPTX", description: "Create and manipulate PowerPoint presentations", icon: "\u{1F4CA}", url: "https://github.com/anthropics/skills/tree/main/skills/pptx" },
  { id: "skill-creator", name: "Skill Creator", description: "Create new skills with proper structure and guidelines", icon: "\u26A1", url: "https://github.com/anthropics/skills/tree/main/skills/skill-creator" },
  { id: "slack-gif-creator", name: "Slack GIF Creator", description: "Create GIF animations for Slack communications", icon: "\u{1F3AC}", url: "https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator" },
  { id: "theme-factory", name: "Theme Factory", description: "Create and customize VS Code themes", icon: "\u{1F3AD}", url: "https://github.com/anthropics/skills/tree/main/skills/theme-factory" },
  { id: "web-artifacts-builder", name: "Web Artifacts Builder", description: "Build interactive web artifacts and components", icon: "\u{1F3D7}\uFE0F", url: "https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder" },
  { id: "webapp-testing", name: "Webapp Testing", description: "Test web applications with automated strategies", icon: "\u{1F9EA}", url: "https://github.com/anthropics/skills/tree/main/skills/webapp-testing" },
  { id: "xlsx", name: "XLSX", description: "Create and manipulate Excel spreadsheets", icon: "\u{1F4C8}", url: "https://github.com/anthropics/skills/tree/main/skills/xlsx" }
];
var AxonViewProvider = class {
  constructor(_extensionUri, _context) {
    this._extensionUri = _extensionUri;
    this._context = _context;
  }
  static viewType = "axonSidebar";
  _view;
  _previewPanels = /* @__PURE__ */ new Map();
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this._getHtmlForWebview();
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "showSkillPreview") {
          this._openSkillPreview(message.skill);
        } else if (message.command === "openLink") {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
      }
    );
  }
  _openSkillPreview(skill) {
    const existingPanel = this._previewPanels.get(skill.id);
    if (existingPanel) {
      existingPanel.webview.html = this._getSkillPreviewHtml(skill, this._isSkillInstalled(skill.id));
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "axonSkillPreview",
      `${skill.icon} ${skill.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true
      }
    );
    panel.webview.html = this._getSkillPreviewHtml(skill, this._isSkillInstalled(skill.id));
    panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "openLink") {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        } else if (message.command === "copyToClipboard") {
          vscode.env.clipboard.writeText(message.text).then(() => {
            panel.webview.postMessage({ command: "copySuccess" });
          });
        } else if (message.command === "installSkill") {
          this._installSkill(message.skill, panel);
        } else if (message.command === "uninstallSkill") {
          this._uninstallSkill(message.skill, panel);
        }
      },
      void 0,
      this._context.subscriptions
    );
    panel.onDidDispose(
      () => {
        this._previewPanels.delete(skill.id);
      },
      void 0,
      this._context.subscriptions
    );
    this._previewPanels.set(skill.id, panel);
  }
  _isSkillInstalled(skillId) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return false;
    }
    return fs.existsSync(path.join(folders[0].uri.fsPath, ".agents", "skills", skillId));
  }
  async _installSkill(skill, panel) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      panel.webview.postMessage({ command: "installError", message: "No workspace folder open." });
      return;
    }
    const targetDir = path.join(folders[0].uri.fsPath, ".agents", "skills", skill.id);
    const parts = skill.url.replace("https://github.com/", "").split("/");
    const owner = parts[0], repo = parts[1], branch = parts[3];
    const githubPath = parts.slice(4).join("/");
    panel.webview.postMessage({ command: "installProgress", message: "Connecting to GitHub..." });
    try {
      await this._downloadGithubFolder(owner, repo, branch, githubPath, targetDir, panel);
      panel.webview.postMessage({ command: "installSuccess" });
    } catch (err) {
      panel.webview.postMessage({ command: "installError", message: err instanceof Error ? err.message : String(err) });
    }
  }
  async _uninstallSkill(skill, panel) {
    const answer = await vscode.window.showWarningMessage(
      `Are you sure you want to remove the skill "${skill.name}"?`,
      { modal: true },
      "Yes",
      "No"
    );
    if (answer !== "Yes") {
      panel.webview.postMessage({ command: "uninstallCancelled" });
      return;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      panel.webview.postMessage({ command: "uninstallError", message: "No workspace folder open." });
      return;
    }
    const targetDir = path.join(folders[0].uri.fsPath, ".agents", "skills", skill.id);
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
      panel.webview.postMessage({ command: "uninstallSuccess" });
    } catch (err) {
      panel.webview.postMessage({ command: "uninstallError", message: err instanceof Error ? err.message : String(err) });
    }
  }
  async _downloadGithubFolder(owner, repo, branch, githubPath, localPath, panel) {
    fs.mkdirSync(localPath, { recursive: true });
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}?ref=${branch}`;
    const body = await this._httpGet(apiUrl);
    const items = JSON.parse(body);
    for (const item of items) {
      panel.webview.postMessage({ command: "installProgress", message: `Downloading ${item.name}...` });
      if (item.type === "file" && item.download_url) {
        const buf = await this._httpGetBuffer(item.download_url);
        fs.writeFileSync(path.join(localPath, item.name), buf);
      } else if (item.type === "dir") {
        await this._downloadGithubFolder(owner, repo, branch, item.path, path.join(localPath, item.name), panel);
      }
    }
  }
  _httpGet(url) {
    return this._httpGetBuffer(url).then((b) => b.toString("utf8"));
  }
  _httpGetBuffer(url) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith("https://") ? https : http;
      const req = mod.get(url, { headers: { "User-Agent": "AXON-VSCode-Extension/1.0" } }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          this._httpGetBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
      req.on("error", reject);
    });
  }
  _getSkillPreviewHtml(skill, isInstalled) {
    const templatePath = vscode.Uri.joinPath(this._context.extensionUri, "src", "views", "preview.html").fsPath;
    let html = fs.readFileSync(templatePath, "utf8");
    const installIcon = isInstalled ? "\u2713" : "\u2B07";
    const installLabel = isInstalled ? "Installed" : "Install";
    const installDisabled = isInstalled ? " disabled" : "";
    const uninstallDisabled = isInstalled ? "" : " disabled";
    html = html.replace(/{{SKILL_NAME}}/g, skill.name).replace(/{{SKILL_ICON}}/g, skill.icon).replace(/{{SKILL_DESC}}/g, skill.description).replace(/{{SKILL_ID}}/g, skill.id).replace(/{{SKILL_URL}}/g, skill.url).replace(/{{SKILL_JSON}}/g, JSON.stringify(skill)).replace(/{{INSTALL_ICON}}/g, installIcon).replace(/{{INSTALL_LABEL}}/g, installLabel).replace(/{{INSTALL_BTN_DISABLED}}/g, installDisabled).replace(/{{UNINSTALL_BTN_DISABLED}}/g, uninstallDisabled);
    return html;
  }
  _getHtmlForWebview() {
    const skillsJson = JSON.stringify(SKILLS);
    let cardsHtml = "";
    for (const s of SKILLS) {
      const skillData = JSON.stringify(s).replace(/"/g, "&quot;");
      cardsHtml += '<div class="skill-card" data-id="' + s.id + '" data-skill="' + skillData + '" data-url="' + s.url + '"><div class="skill-icon">' + s.icon + '</div><div class="skill-info"><div class="skill-name">' + s.name + '</div><div class="skill-description">' + s.description + "</div></div></div>";
    }
    const templatePath = vscode.Uri.joinPath(this._context.extensionUri, "src", "views", "sidebar.html").fsPath;
    let html = fs.readFileSync(templatePath, "utf8");
    html = html.replace(/{{SKILLS_COUNT}}/g, SKILLS.length.toString()).replace(/{{CARDS_HTML}}/g, cardsHtml).replace(/{{SKILLS_JSON}}/g, JSON.stringify(SKILLS));
    return html;
  }
};

// src/extension.ts
function activate(context) {
  const provider = new AxonViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode2.window.registerWebviewViewProvider(AxonViewProvider.viewType, provider)
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
