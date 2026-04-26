import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
}

const SKILLS: Skill[] = [
  { id: 'algorithmic-art', name: 'Algorithmic Art', description: 'Generate algorithmic and generative art programmatically', icon: '🎨', url: 'https://github.com/anthropics/skills/tree/main/skills/algorithmic-art' },
  { id: 'brand-guidelines', name: 'Brand Guidelines', description: 'Create and enforce brand guidelines for projects', icon: '📋', url: 'https://github.com/anthropics/skills/tree/main/skills/brand-guidelines' },
  { id: 'canvas-design', name: 'Canvas Design', description: 'Design interactive canvas-based visualizations', icon: '🖌️', url: 'https://github.com/anthropics/skills/tree/main/skills/canvas-design' },
  { id: 'claude-api', name: 'Claude API', description: 'Work with the Claude API across multiple languages', icon: '🤖', url: 'https://github.com/anthropics/skills/tree/main/skills/claude-api' },
  { id: 'doc-coauthoring', name: 'Doc Coauthoring', description: 'Collaborate on document writing and editing', icon: '📝', url: 'https://github.com/anthropics/skills/tree/main/skills/doc-coauthoring' },
  { id: 'docx', name: 'DOCX', description: 'Create and manipulate Word documents', icon: '📄', url: 'https://github.com/anthropics/skills/tree/main/skills/docx' },
  { id: 'frontend-design', name: 'Frontend Design', description: 'Build beautiful and responsive frontend interfaces', icon: '🌐', url: 'https://github.com/anthropics/skills/tree/main/skills/frontend-design' },
  { id: 'internal-comms', name: 'Internal Comms', description: 'Draft internal communications and announcements', icon: '💬', url: 'https://github.com/anthropics/skills/tree/main/skills/internal-comms' },
  { id: 'mcp-builder', name: 'MCP Builder', description: 'Build Model Context Protocol servers and tools', icon: '🔧', url: 'https://github.com/anthropics/skills/tree/main/skills/mcp-builder' },
  { id: 'pdf', name: 'PDF', description: 'Create and manipulate PDF documents', icon: '📑', url: 'https://github.com/anthropics/skills/tree/main/skills/pdf' },
  { id: 'pptx', name: 'PPTX', description: 'Create and manipulate PowerPoint presentations', icon: '📊', url: 'https://github.com/anthropics/skills/tree/main/skills/pptx' },
  { id: 'skill-creator', name: 'Skill Creator', description: 'Create new skills with proper structure and guidelines', icon: '⚡', url: 'https://github.com/anthropics/skills/tree/main/skills/skill-creator' },
  { id: 'slack-gif-creator', name: 'Slack GIF Creator', description: 'Create GIF animations for Slack communications', icon: '🎬', url: 'https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator' },
  { id: 'theme-factory', name: 'Theme Factory', description: 'Create and customize VS Code themes', icon: '🎭', url: 'https://github.com/anthropics/skills/tree/main/skills/theme-factory' },
  { id: 'web-artifacts-builder', name: 'Web Artifacts Builder', description: 'Build interactive web artifacts and components', icon: '🏗️', url: 'https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder' },
  { id: 'webapp-testing', name: 'Webapp Testing', description: 'Test web applications with automated strategies', icon: '🧪', url: 'https://github.com/anthropics/skills/tree/main/skills/webapp-testing' },
  { id: 'xlsx', name: 'XLSX', description: 'Create and manipulate Excel spreadsheets', icon: '📈', url: 'https://github.com/anthropics/skills/tree/main/skills/xlsx' },
];

export class AxonViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'axonSidebar';
  private _view?: vscode.WebviewView;
  private _previewPanels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === 'showSkillPreview') {
          this._openSkillPreview(message.skill as Skill);
        } else if (message.command === 'openLink') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
      }
    );
  }

  private _openSkillPreview(skill: Skill): void {
    const existingPanel = this._previewPanels.get(skill.id);
    if (existingPanel) {
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'axonSkillPreview',
      `${skill.icon} ${skill.name}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      }
    );

    panel.webview.html = this._getSkillPreviewHtml(skill, this._isSkillInstalled(skill.id));

    panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === 'openLink') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        } else if (message.command === 'copyToClipboard') {
          vscode.env.clipboard.writeText(message.text).then(() => {
            panel.webview.postMessage({ command: 'copySuccess' });
          });
        } else if (message.command === 'installSkill') {
          this._installSkill(message.skill as Skill, panel);
        } else if (message.command === 'uninstallSkill') {
          this._uninstallSkill(message.skill as Skill, panel);
        }
      },
      undefined,
      this._context.subscriptions
    );

    panel.onDidDispose(
      () => { this._previewPanels.delete(skill.id); },
      undefined,
      this._context.subscriptions
    );

    this._previewPanels.set(skill.id, panel);
  }

  private _isSkillInstalled(skillId: string): boolean {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return false; }
    return fs.existsSync(path.join(folders[0].uri.fsPath, '.agents', 'skills', skillId));
  }

  private async _installSkill(skill: Skill, panel: vscode.WebviewPanel): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      panel.webview.postMessage({ command: 'installError', message: 'No workspace folder open.' });
      return;
    }
    const targetDir = path.join(folders[0].uri.fsPath, '.agents', 'skills', skill.id);
    // Parse: https://github.com/{owner}/{repo}/tree/{branch}/{...skillPath}
    const parts = skill.url.replace('https://github.com/', '').split('/');
    const owner = parts[0], repo = parts[1], branch = parts[3];
    const githubPath = parts.slice(4).join('/');
    panel.webview.postMessage({ command: 'installProgress', message: 'Connecting to GitHub...' });
    try {
      await this._downloadGithubFolder(owner, repo, branch, githubPath, targetDir, panel);
      panel.webview.postMessage({ command: 'installSuccess' });
    } catch (err: unknown) {
      panel.webview.postMessage({ command: 'installError', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private async _uninstallSkill(skill: Skill, panel: vscode.WebviewPanel): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      `Are you sure you want to remove the skill "${skill.name}"?`,
      { modal: true },
      'Yes',
      'No'
    );

    if (answer !== 'Yes') {
      panel.webview.postMessage({ command: 'uninstallCancelled' });
      return;
    }

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      panel.webview.postMessage({ command: 'uninstallError', message: 'No workspace folder open.' });
      return;
    }
    const targetDir = path.join(folders[0].uri.fsPath, '.agents', 'skills', skill.id);
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
      panel.webview.postMessage({ command: 'uninstallSuccess' });
    } catch (err: unknown) {
      panel.webview.postMessage({ command: 'uninstallError', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private async _downloadGithubFolder(
    owner: string, repo: string, branch: string,
    githubPath: string, localPath: string, panel: vscode.WebviewPanel
  ): Promise<void> {
    fs.mkdirSync(localPath, { recursive: true });
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}?ref=${branch}`;
    const body = await this._httpGet(apiUrl);
    const items: Array<{ name: string; type: string; path: string; download_url: string | null }> = JSON.parse(body);
    for (const item of items) {
      panel.webview.postMessage({ command: 'installProgress', message: `Downloading ${item.name}...` });
      if (item.type === 'file' && item.download_url) {
        const buf = await this._httpGetBuffer(item.download_url);
        fs.writeFileSync(path.join(localPath, item.name), buf);
      } else if (item.type === 'dir') {
        await this._downloadGithubFolder(owner, repo, branch, item.path, path.join(localPath, item.name), panel);
      }
    }
  }

  private _httpGet(url: string): Promise<string> {
    return this._httpGetBuffer(url).then(b => b.toString('utf8'));
  }

  private _httpGetBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https://') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': 'AXON-VSCode-Extension/1.0' } } as any, (res: any) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          this._httpGetBuffer(res.headers.location).then(resolve).catch(reject); return;
        }
        if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.on('error', reject);
    });
  }

  private _getSkillPreviewHtml(skill: Skill, isInstalled: boolean): string {
    const skillJson = JSON.stringify(skill);
    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\';">',
      '<title>' + skill.name + ' – Skill Preview</title>',
      '<style>',
      '@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\');',
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      'body { font-family: var(--vscode-font-family, "Inter", -apple-system, BlinkMacSystemFont, sans-serif); background: var(--vscode-editor-background, #1e1e2e); color: var(--vscode-foreground, #cdd6f4); min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 40px 24px; }',
      '.preview-card { width: 100%; max-width: 640px; background: var(--vscode-editorWidget-background, rgba(255,255,255,0.04)); border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1)); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }',
      '.card-header { padding: 32px 32px 24px; background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%); border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); display: flex; align-items: center; gap: 20px; }',
      '.hero-icon { width: 72px; height: 72px; font-size: 40px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3)); border-radius: 18px; border: 1px solid rgba(99,102,241,0.3); flex-shrink: 0; box-shadow: 0 4px 16px rgba(99,102,241,0.2); }',
      '.header-text { flex: 1; min-width: 0; }',
      '.skill-title { font-size: 22px; font-weight: 700; color: var(--vscode-foreground, #e2e8f0); line-height: 1.2; margin-bottom: 6px; }',
      '.skill-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35); border-radius: 20px; font-size: 11px; font-weight: 500; color: #a5b4fc; letter-spacing: 0.3px; }',
      '.card-body { padding: 28px 32px; display: flex; flex-direction: column; gap: 20px; }',
      '.field { display: flex; flex-direction: column; gap: 6px; }',
      '.field-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4)); }',
      '.field-value { font-size: 14px; color: var(--vscode-foreground, #cdd6f4); line-height: 1.6; padding: 10px 14px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06)); word-break: break-all; }',
      '.field-value.mono { font-family: var(--vscode-editor-font-family, "Courier New", monospace); font-size: 12px; color: #94e2d5; }',
      '.field-value.description { line-height: 1.7; font-size: 13px; }',
      '.url-row { display: flex; align-items: stretch; gap: 8px; }',
      '.url-link { flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); text-decoration: none; color: #818cf8; font-size: 12px; font-family: var(--vscode-editor-font-family, "Courier New", monospace); word-break: break-all; transition: all 0.15s ease; cursor: pointer; min-width: 0; }',
      '.url-link:hover { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }',
      '.url-icon { flex-shrink: 0; font-size: 14px; }',
      '.copy-btn { flex-shrink: 0; display: flex; align-items: center; gap: 5px; padding: 0 14px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); border-radius: 8px; color: #a5b4fc; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; font-family: inherit; }',
      '.copy-btn:hover { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #c4b5fd; }',
      '.copy-btn:active { transform: scale(0.96); }',
      '.copy-btn.copied { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.4); color: #6ee7b7; }',
      '.copy-icon { font-size: 13px; }',
      '.copy-label { letter-spacing: 0.2px; }',
      '.divider { height: 1px; background: var(--vscode-panel-border, rgba(255,255,255,0.06)); }',
      '.card-footer { padding: 16px 32px; background: rgba(0,0,0,0.15); border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06)); }',
      '.footer-btns { display: flex; gap: 10px; }',
      '.install-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }',
      '.install-btn:hover:not([disabled]) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(16,185,129,0.4); }',
      '.install-btn:active:not([disabled]) { transform: translateY(0); }',
      '.install-btn[disabled] { opacity: 0.55; cursor: not-allowed; }',
      '.install-btn.loading { background: linear-gradient(135deg, #6366f1, #8b5cf6); }',
      '.install-btn.error { background: linear-gradient(135deg, #ef4444, #dc2626); }',
      '.install-status { margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground, rgba(255,255,255,0.5)); min-height: 16px; text-align: center; }',
      '.uninstall-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }',
      '.uninstall-btn:hover:not([disabled]) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(239,68,68,0.4); }',
      '.uninstall-btn:active:not([disabled]) { transform: translateY(0); }',
      '.uninstall-btn[disabled] { opacity: 0.3; cursor: not-allowed; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="preview-card">',
      '  <div class="card-header">',
      '    <div class="hero-icon">' + skill.icon + '</div>',
      '    <div class="header-text">',
      '      <div class="skill-title">' + skill.name + '</div>',
      '      <span class="skill-badge">⚡ Skill</span>',
      '    </div>',
      '  </div>',
      '  <div class="card-body">',
      '    <div class="field">',
      '      <div class="field-label">Description</div>',
      '      <div class="field-value description">' + skill.description + '</div>',
      '    </div>',
      '    <div class="divider"></div>',
      '    <div class="field">',
      '      <div class="field-label">Skill ID</div>',
      '      <div class="field-value mono">' + skill.id + '</div>',
      '    </div>',
      '    <div class="field">',
      '      <div class="field-label">Repository URL</div>',
      '      <div class="url-row">',
      '        <a class="url-link" id="urlLink"><span class="url-icon">🔗</span><span>' + skill.url + '</span></a>',
      '        <button class="copy-btn" id="copyBtn"><span class="copy-icon">⎘</span><span class="copy-label">Copy</span></button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="card-footer">',
      '    <div class="footer-btns">',
      '      <button class="install-btn" id="installBtn"' + (isInstalled ? ' disabled' : '') + '>',
      '        <span>' + (isInstalled ? '\u2713' : '\u2b07') + '</span>',
      '        <span class="install-label">' + (isInstalled ? 'Installed' : 'Install') + '</span>',
      '      </button>',
      '      <button class="uninstall-btn" id="uninstallBtn"' + (isInstalled ? '' : ' disabled') + '>',
      '        <span>🗑️</span>',
      '        <span class="uninstall-label">Uninstall</span>',
      '      </button>',
      '    </div>',
      '    <div class="install-status" id="installStatus"></div>',
      '  </div>',
      '</div>',
      '<script>',
      'var vscodeApi = acquireVsCodeApi();',
      'var skill = ' + skillJson + ';',
      'document.getElementById("urlLink").addEventListener("click", function() {',
      '  vscodeApi.postMessage({ command: "openLink", url: skill.url });',
      '});',
      'document.getElementById("copyBtn").addEventListener("click", function() {',
      '  vscodeApi.postMessage({ command: "copyToClipboard", text: skill.url });',
      '});',
      'document.getElementById("installBtn").addEventListener("click", function() {',
      '  if (this.disabled) { return; }',
      '  this.disabled = true;',
      '  this.classList.add("loading");',
      '  this.querySelector(".install-label").textContent = "Installing...";',
      '  document.getElementById("installStatus").textContent = "";',
      '  vscodeApi.postMessage({ command: "installSkill", skill: skill });',
      '});',
      'document.getElementById("uninstallBtn").addEventListener("click", function() {',
      '  if (this.disabled) { return; }',
      '  this.disabled = true;',
      '  this.querySelector(".uninstall-label").textContent = "Removing...";',
      '  document.getElementById("installStatus").textContent = "";',
      '  vscodeApi.postMessage({ command: "uninstallSkill", skill: skill });',
      '});',
      'window.addEventListener("message", function(e) {',
      '  var d = e.data; if (!d) return;',
      '  var installBtn = document.getElementById("installBtn");',
      '  var uninstallBtn = document.getElementById("uninstallBtn");',
      '  var status = document.getElementById("installStatus");',
      '  if (d.command === "copySuccess") {',
      '    var btn = document.getElementById("copyBtn");',
      '    btn.classList.add("copied");',
      '    btn.querySelector(".copy-icon").textContent = "\u2713";',
      '    btn.querySelector(".copy-label").textContent = "Copied!";',
      '    setTimeout(function() {',
      '      btn.classList.remove("copied");',
      '      btn.querySelector(".copy-icon").textContent = "\u2358";',
      '      btn.querySelector(".copy-label").textContent = "Copy";',
      '    }, 2000);',
      '  } else if (d.command === "installProgress") {',
      '    status.textContent = d.message;',
      '  } else if (d.command === "installSuccess") {',
      '    installBtn.classList.remove("loading", "error");',
      '    installBtn.disabled = true;',
      '    installBtn.querySelector("span").textContent = "\u2713";',
      '    installBtn.querySelector(".install-label").textContent = "Installed";',
      '    uninstallBtn.disabled = false;',
      '    status.textContent = "Skill installed to .agents/skills/.";',
      '  } else if (d.command === "installError") {',
      '    installBtn.classList.remove("loading");',
      '    installBtn.classList.add("error");',
      '    installBtn.disabled = false;',
      '    installBtn.querySelector("span").textContent = "\u2715";',
      '    installBtn.querySelector(".install-label").textContent = "Retry";',
      '    status.textContent = "Install error: " + d.message;',
      '  } else if (d.command === "uninstallSuccess") {',
      '    installBtn.classList.remove("loading", "error");',
      '    installBtn.disabled = false;',
      '    installBtn.querySelector("span").textContent = "\u2b07";',
      '    installBtn.querySelector(".install-label").textContent = "Install";',
      '    uninstallBtn.disabled = true;',
      '    uninstallBtn.querySelector(".uninstall-label").textContent = "Uninstall";',
      '    status.textContent = "Skill removed.";',
      '  } else if (d.command === "uninstallError") {',
      '    uninstallBtn.disabled = false;',
      '    uninstallBtn.querySelector(".uninstall-label").textContent = "Uninstall";',
      '    status.textContent = "Uninstall error: " + d.message;',
      '  } else if (d.command === "uninstallCancelled") {',
      '    uninstallBtn.disabled = false;',
      '    uninstallBtn.querySelector(".uninstall-label").textContent = "Uninstall";',
      '  }',
      '});',
      '</script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  private _getHtmlForWebview(): string {
    const skillsJson = JSON.stringify(SKILLS);

    // Build skill cards HTML – include data-id and full skill JSON for preview
    let cardsHtml = '';
    for (const s of SKILLS) {
      const skillData = JSON.stringify(s).replace(/"/g, '&quot;');
      cardsHtml += '<div class="skill-card" data-id="' + s.id + '" data-skill="' + skillData + '" data-url="' + s.url + '">'
        + '<div class="skill-icon">' + s.icon + '</div>'
        + '<div class="skill-info">'
        + '<div class="skill-name">' + s.name + '</div>'
        + '<div class="skill-description">' + s.description + '</div>'
        + '</div></div>';
    }

    const htmlParts = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\';">',
      '<title>Axon</title>',
      '<style>',
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      'body { font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif); font-size: var(--vscode-font-size, 13px); color: var(--vscode-foreground); background-color: var(--vscode-sideBar-background); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }',
      '.tab-bar { display: flex; border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1)); flex-shrink: 0; }',
      '.tab { flex: 1; padding: 8px 0; text-align: center; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--vscode-tab-inactiveForeground, rgba(255,255,255,0.5)); border-bottom: 2px solid transparent; transition: all 0.15s ease; user-select: none; }',
      '.tab:hover { color: var(--vscode-tab-activeForeground, rgba(255,255,255,0.8)); }',
      '.tab.active { color: var(--vscode-tab-activeForeground, #ffffff); border-bottom-color: var(--vscode-focusBorder, #007acc); }',
      '.content-area { flex: 1; overflow-y: auto; display: none; }',
      '.content-area.active { display: flex; flex-direction: column; }',
      '.search-bar { padding: 8px 12px; flex-shrink: 0; }',
      '.search-input { width: 100%; padding: 6px 8px; font-size: 12px; border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.15)); background-color: var(--vscode-input-background, rgba(255,255,255,0.05)); color: var(--vscode-input-foreground, #cccccc); border-radius: 3px; outline: none; font-family: inherit; }',
      '.search-input:focus { border-color: var(--vscode-focusBorder, #007acc); }',
      '.search-input::placeholder { color: var(--vscode-input-placeholderForeground, rgba(255,255,255,0.3)); }',
      '.skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 4px 12px 12px; }',
      '.skill-card { background-color: var(--vscode-editorWidget-background, rgba(255,255,255,0.04)); border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); border-radius: 6px; padding: 12px 8px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }',
      '.skill-card:hover { background-color: var(--vscode-list-hoverBackground, rgba(255,255,255,0.08)); border-color: var(--vscode-focusBorder, #007acc); }',
      '.skill-card.hidden { display: none; }',
      '.skill-icon { font-size: 24px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background-color: var(--vscode-editor-background, rgba(0,0,0,0.2)); border-radius: 8px; }',
      '.skill-info { width: 100%; min-width: 0; }',
      '.skill-name { font-size: 11px; font-weight: 600; color: var(--vscode-foreground, #e0e0e0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.skill-description { font-size: 9px; color: var(--vscode-descriptionForeground, rgba(255,255,255,0.5)); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px; }',
      '.no-results { text-align: center; padding: 32px 12px; color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4)); font-size: 12px; display: none; }',
      '.skills-count { font-size: 10px; color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4)); padding: 4px 12px; }',
      '.placeholder { color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4)); text-align: center; padding: 32px 12px; font-size: 12px; line-height: 1.8; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }',
      '.placeholder-icon { font-size: 36px; margin-bottom: 8px; opacity: 0.5; }',
      '.placeholder-title { font-size: 14px; font-weight: 600; color: var(--vscode-foreground, rgba(255,255,255,0.8)); margin-bottom: 4px; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="tab-bar">',
      '<div class="tab active" data-tab="skills">Skills</div>',
      '<div class="tab" data-tab="agents">Agents</div>',
      '</div>',
      '<div id="skills-content" class="content-area active">',
      '<div class="search-bar">',
      '<input type="text" class="search-input" id="searchInput" placeholder="Search skills..." />',
      '</div>',
      '<div class="skills-count" id="skillsCount">17 skills available</div>',
      '<div class="skills-grid" id="skillsGrid">',
      cardsHtml,
      '</div>',
      '<div class="no-results" id="noResults">No skills found matching your search.</div>',
      '</div>',
      '<div id="agents-content" class="content-area">',
      '<div class="placeholder">',
      '<div class="placeholder-icon">&#x1F916;</div>',
      '<div class="placeholder-title">No agents yet</div>',
      '<div>Agents will appear here when available.</div>',
      '</div>',
      '</div>',
      '<script>',
      'var vscodeApi = acquireVsCodeApi();',
      'var allSkills = ' + skillsJson + ';',
      'var skillsGrid = document.getElementById("skillsGrid");',
      'var searchInput = document.getElementById("searchInput");',
      'var skillsCount = document.getElementById("skillsCount");',
      'var noResults = document.getElementById("noResults");',
      'var allTabs = document.querySelectorAll(".tab");',
      'var allContents = document.querySelectorAll(".content-area");',
      'for (var i = 0; i < allTabs.length; i++) {',
      '  allTabs[i].addEventListener("click", function() {',
      '    var target = this.getAttribute("data-tab");',
      '    for (var j = 0; j < allTabs.length; j++) { allTabs[j].classList.remove("active"); }',
      '    for (var j = 0; j < allContents.length; j++) { allContents[j].classList.remove("active"); }',
      '    this.classList.add("active");',
      '    var el = document.getElementById(target + "-content");',
      '    if (el) { el.classList.add("active"); }',
      '  });',
      '}',
      'searchInput.addEventListener("input", function() {',
      '  var filter = this.value.toLowerCase();',
      '  var cards = skillsGrid.querySelectorAll(".skill-card");',
      '  var visible = 0;',
      '  for (var i = 0; i < cards.length; i++) {',
      '    var name = allSkills[i].name.toLowerCase();',
      '    var desc = allSkills[i].description.toLowerCase();',
      '    if (name.indexOf(filter) !== -1 || desc.indexOf(filter) !== -1) {',
      '      cards[i].classList.remove("hidden"); visible++;',
      '    } else { cards[i].classList.add("hidden"); }',
      '  }',
      '  skillsCount.textContent = visible + " skill" + (visible !== 1 ? "s" : "") + (filter ? " found" : " available");',
      '  noResults.style.display = visible === 0 ? "block" : "none";',
      '  skillsGrid.style.display = visible === 0 ? "none" : "grid";',
      '});',
      'var cards = skillsGrid.querySelectorAll(".skill-card");',
      'for (var i = 0; i < cards.length; i++) {',
      '  cards[i].addEventListener("click", function() {',
      '    var raw = this.getAttribute("data-skill");',
      '    if (raw) {',
      '      var skill = JSON.parse(raw.replace(/&quot;/g, \'"\'));',
      '      vscodeApi.postMessage({ command: "showSkillPreview", skill: skill });',
      '    }',
      '  });',
      '}',
      '</script>',
      '</body>',
      '</html>'
    ];

    return htmlParts.join('\n');
  }
}