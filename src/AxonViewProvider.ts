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
      existingPanel.webview.html = this._getSkillPreviewHtml(skill, this._isSkillInstalled(skill.id));
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
        retainContextWhenHidden: true,
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
    const templatePath = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'views', 'preview.html').fsPath;
    let html = fs.readFileSync(templatePath, 'utf8');

    const installIcon = isInstalled ? '✓' : '⬇';
    const installLabel = isInstalled ? 'Installed' : 'Install';
    const installDisabled = isInstalled ? ' disabled' : '';
    const uninstallDisabled = isInstalled ? '' : ' disabled';

    html = html.replace(/{{SKILL_NAME}}/g, skill.name)
               .replace(/{{SKILL_ICON}}/g, skill.icon)
               .replace(/{{SKILL_DESC}}/g, skill.description)
               .replace(/{{SKILL_ID}}/g, skill.id)
               .replace(/{{SKILL_URL}}/g, skill.url)
               .replace(/{{SKILL_JSON}}/g, JSON.stringify(skill))
               .replace(/{{INSTALL_ICON}}/g, installIcon)
               .replace(/{{INSTALL_LABEL}}/g, installLabel)
               .replace(/{{INSTALL_BTN_DISABLED}}/g, installDisabled)
               .replace(/{{UNINSTALL_BTN_DISABLED}}/g, uninstallDisabled);

    return html;
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

    const templatePath = vscode.Uri.joinPath(this._context.extensionUri, 'src', 'views', 'sidebar.html').fsPath;
    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/{{SKILLS_COUNT}}/g, SKILLS.length.toString())
               .replace(/{{CARDS_HTML}}/g, cardsHtml)
               .replace(/{{SKILLS_JSON}}/g, JSON.stringify(SKILLS));

    return html;
  }
}