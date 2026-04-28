# Axon Extension Architecture

## Mục Tiêu

Axon sẽ trở thành VS Code extension quản lý, cài đặt, chia sẻ và đánh giá skills.

Các yêu cầu chính:

- Danh sách skills trỏ về repo skills riêng.
- Người chia sẻ skill được chọn file muốn share, tương tự GitHub Desktop.
- Có database để kiểm soát lượt tải và đánh giá.
- Kiến trúc dễ mở rộng cho nhiều nguồn skill, versioning, private repo, marketplace và backend API.

---

## Kiến Trúc Tổng Quan

```text
VS Code Webview
  -> MessageRouter / Controllers
    -> SkillRegistryService
    -> SkillInstallService
    -> SkillShareService
    -> RatingService
    -> DownloadStatsService
      -> GitHubClient
      -> BackendApiClient
      -> WorkspaceFileSystem
```

Extension nên tách rõ các phần:

- `Webview`: chỉ render UI và nhận/gửi message.
- `Services`: xử lý nghiệp vụ chính.
- `Providers`: lấy dữ liệu skills từ nhiều nguồn.
- `Infrastructure`: GitHub, HTTP, file system, config.
- `Backend API`: quản lý download count, rating, review, publish request.
- `Database`: lưu metadata động.

---

## Cấu Trúc Thư Mục Extension

```text
src/
  extension.ts

  webview/
    AxonViewProvider.ts
    messageRouter.ts
    protocol.ts

  domain/
    skill.ts
    registry.ts
    rating.ts

  services/
    SkillRegistryService.ts
    SkillInstallService.ts
    SkillShareService.ts
    FileSelectionService.ts
    RatingService.ts
    DownloadStatsService.ts

  providers/
    GitHubRegistryProvider.ts
    LocalRegistryProvider.ts
    ApiRegistryProvider.ts

  infrastructure/
    GitHubClient.ts
    HttpClient.ts
    BackendApiClient.ts
    WorkspaceFileSystem.ts
    ConfigService.ts

  views/
    sidebar.html
    preview.html
    share.html
```

---

## Trách Nhiệm Chính

### `AxonViewProvider`

Chỉ nên làm:

- Khởi tạo webview.
- Load HTML template.
- Gửi dữ liệu sang webview.
- Nhận message từ webview.
- Chuyển message cho `MessageRouter`.

Không nên làm:

- Hard-code danh sách skills.
- Download folder GitHub.
- Ghi/xóa file skill.
- Quản lý rating/download count.
- Publish skill.

### `SkillRegistryService`

Chịu trách nhiệm:

- Load danh sách skills.
- Cache registry.
- Merge metadata từ backend như downloads, rating.
- Support nhiều registry source.

Ví dụ source:

```text
GitHub raw registry
Local registry
Backend API marketplace
Private organization registry
```

### `SkillInstallService`

Chịu trách nhiệm:

- Kiểm tra skill đã cài chưa.
- Download skill package.
- Verify checksum.
- Cài vào `.agents/skills/{skillId}`.
- Gỡ skill.
- Update trạng thái install.

### `SkillShareService`

Chịu trách nhiệm:

- Tạo skill mới từ file user chọn.
- Validate skill structure.
- Tạo `axon.skill.json`.
- Copy files vào staging package.
- Publish lên repo skills.
- Update `registry.json`.
- Tạo PR hoặc push trực tiếp.

### `FileSelectionService`

Chịu trách nhiệm:

- Scan workspace.
- Hiển thị file tree có checkbox.
- Nhóm file theo trạng thái Git.
- Exclude file không nên share.
- Detect secret/risky files.

Nên dùng:

```text
git status --porcelain
rg --files
VS Code workspace API
```

Exclude mặc định:

```text
.git/
node_modules/
dist/
out/
.env
.env.*
*.pem
*.key
*.p12
*.log
package-lock.json nếu không cần
```

### `RatingService`

Chịu trách nhiệm:

- Submit rating.
- Update rating của user.
- Load rating summary.
- Prevent duplicate rating theo user/machine hash.

### `DownloadStatsService`

Chịu trách nhiệm:

- Gửi event download thành công.
- Load download count.
- De-dupe download spam ở backend.

---

## Repo Skills Riêng

Tạo repo mới, ví dụ:

```text
axon-skills/
  registry.json

  skills/
    frontend-design/
      axon.skill.json
      SKILL.md
      assets/
      scripts/

    skill-creator/
      axon.skill.json
      SKILL.md
```

---

## `registry.json`

File này là index nhẹ để extension load nhanh.

```json
{
  "version": 1,
  "updatedAt": "2026-04-28T00:00:00Z",
  "skills": [
    {
      "id": "frontend-design",
      "name": "Frontend Design",
      "description": "Build responsive frontend interfaces",
      "icon": "layout",
      "manifestUrl": "https://raw.githubusercontent.com/your-org/axon-skills/main/skills/frontend-design/axon.skill.json"
    }
  ]
}
```

---

## `axon.skill.json`

Manifest đầy đủ của từng skill.

```json
{
  "schemaVersion": 1,
  "id": "frontend-design",
  "name": "Frontend Design",
  "version": "1.0.0",
  "description": "Build responsive frontend interfaces",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-user"
  },
  "icon": "layout",
  "tags": ["frontend", "ui", "design"],
  "source": {
    "type": "github",
    "owner": "your-org",
    "repo": "axon-skills",
    "branch": "main",
    "path": "skills/frontend-design"
  },
  "files": [
    "SKILL.md",
    "assets/example.png",
    "scripts/setup.ts"
  ],
  "entrypoint": "SKILL.md",
  "checksum": "sha256:TODO"
}
```

---

## Settings Của Extension

Thêm vào `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Axon",
      "properties": {
        "axon.registryUrl": {
          "type": "string",
          "default": "https://raw.githubusercontent.com/your-org/axon-skills/main/registry.json",
          "description": "Registry URL for Axon skills."
        },
        "axon.apiBaseUrl": {
          "type": "string",
          "default": "https://api.your-domain.com",
          "description": "Backend API base URL for ratings and downloads."
        },
        "axon.installPath": {
          "type": "string",
          "default": ".agents/skills",
          "description": "Relative workspace path where skills are installed."
        }
      }
    }
  }
}
```

---

## Luồng Cài Skill

```text
User click Install
  -> Webview postMessage installSkill
  -> MessageRouter
  -> SkillInstallService.install(skillId)
  -> SkillRegistryService.getSkill(skillId)
  -> GitHubClient.downloadFolder()
  -> verify files/checksum
  -> write to .agents/skills/{skillId}
  -> DownloadStatsService.trackDownload(skillId, version)
  -> Webview update installed state
```

---

## Luồng Share Skill

```text
User click Share Skill
  -> FileSelectionService.scanWorkspace()
  -> Webview hiển thị selectable file tree
  -> User chọn files
  -> SkillShareService.validateSelection()
  -> SkillShareService.createManifest()
  -> SkillShareService.stagePackage()
  -> GitHubClient.publishToRepo()
  -> update registry.json
  -> tạo Pull Request hoặc push trực tiếp
```

UI nên có các nhóm:

```text
Changed Files
New Files
Untracked Files
Ignored / Risky Files
```

Mỗi file có checkbox giống GitHub Desktop.

---

## Backend API

Extension không nên kết nối database trực tiếp. Cần backend API trung gian.

```text
Extension -> Backend API -> Database
```

API tối thiểu:

```text
GET  /skills
GET  /skills/:id
GET  /skills/:id/stats
POST /skills/:id/downloads
GET  /skills/:id/ratings/summary
POST /skills/:id/ratings
POST /publish/request
```

---

## Database Schema

Ví dụ PostgreSQL:

```sql
create table skills (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  description text,
  repo_url text,
  manifest_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table skill_versions (
  id uuid primary key,
  skill_id uuid not null references skills(id),
  version text not null,
  git_sha text,
  checksum text,
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  unique(skill_id, version)
);

create table downloads (
  id uuid primary key,
  skill_id uuid not null references skills(id),
  version_id uuid references skill_versions(id),
  user_hash text,
  machine_hash text,
  created_at timestamptz not null default now()
);

create table ratings (
  id uuid primary key,
  skill_id uuid not null references skills(id),
  user_hash text not null,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(skill_id, user_hash)
);
```

---

## Metadata Trả Về Cho Extension

Backend nên trả summary như sau:

```json
{
  "skillId": "frontend-design",
  "downloads": 1240,
  "rating": {
    "average": 4.7,
    "count": 38
  },
  "userRating": 5
}
```

---

## Provider Interface

```ts
export interface SkillRegistryProvider {
  listSkills(): Promise<SkillSummary[]>;
  getSkill(id: string): Promise<SkillManifest>;
}
```

Implementations:

```text
GitHubRegistryProvider
LocalRegistryProvider
ApiRegistryProvider
```

---

## Domain Types

```ts
export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  icon?: string;
  manifestUrl: string;
  downloads?: number;
  ratingAverage?: number;
  ratingCount?: number;
}

export interface SkillManifest extends SkillSummary {
  version: string;
  author?: {
    name: string;
    url?: string;
  };
  tags?: string[];
  source: SkillSource;
  files: string[];
  entrypoint: string;
  checksum?: string;
}

export type SkillSource =
  | {
      type: "github";
      owner: string;
      repo: string;
      branch: string;
      path: string;
    }
  | {
      type: "zip";
      url: string;
    }
  | {
      type: "local";
      path: string;
    };
```

---

## Message Protocol

```ts
export type WebviewToExtensionMessage =
  | { command: "skills.refresh" }
  | { command: "skills.preview"; skillId: string }
  | { command: "skills.install"; skillId: string }
  | { command: "skills.uninstall"; skillId: string }
  | { command: "skills.rate"; skillId: string; rating: number; review?: string }
  | { command: "share.open" }
  | { command: "share.scanFiles" }
  | { command: "share.publish"; files: string[]; metadata: ShareMetadata };

export type ExtensionToWebviewMessage =
  | { command: "skills.loaded"; skills: SkillSummary[] }
  | { command: "skills.installProgress"; skillId: string; message: string }
  | { command: "skills.installSuccess"; skillId: string }
  | { command: "skills.installError"; skillId: string; message: string }
  | { command: "share.filesLoaded"; files: ShareableFile[] }
  | { command: "share.publishSuccess"; url: string }
  | { command: "share.publishError"; message: string };
```

---

## Security Và Chất Lượng

Bắt buộc nên có:

- Không hard-code token trong extension.
- Không kết nối DB trực tiếp từ extension.
- Validate file path để tránh path traversal.
- Exclude secret files khi share.
- Verify checksum khi install.
- Không ghi đè skill đã cài nếu chưa xác nhận.
- Cache registry để extension vẫn dùng được khi offline.
- Có versioning cho skill.
- Có moderation/status cho skill: `draft`, `active`, `deprecated`, `blocked`.

---

## Lộ Trình MVP

### Phase 1: Refactor nội bộ

- Tách `AxonViewProvider` thành webview-only.
- Tạo `SkillRegistryService`.
- Tạo `SkillInstallService`.
- Tạo `GitHubClient`.
- Giữ nguyên UI hiện tại để giảm rủi ro.

Kết quả:

```text
Extension vẫn hoạt động như hiện tại nhưng code đã dễ mở rộng.
```

### Phase 2: Repo skills riêng

- Tạo repo `axon-skills`.
- Tạo `registry.json`.
- Chuyển danh sách hard-code sang registry.
- Extension fetch registry từ `axon.registryUrl`.
- Thêm cache fallback khi registry fetch fail.

Kết quả:

```text
Muốn thêm skill mới chỉ cần update repo, không cần release extension.
```

### Phase 3: Install theo manifest

- Mỗi skill có `axon.skill.json`.
- Install dựa trên `source` và `files`.
- Chỉ tải file nằm trong manifest.
- Thêm version và checksum.

Kết quả:

```text
Skill package rõ ràng, có version, có kiểm soát file.
```

### Phase 4: Share skill với chọn file

- Thêm màn hình `share.html`.
- Scan workspace files.
- Hiển thị checkbox tree.
- User chọn file cần share.
- Tạo `axon.skill.json`.
- Publish vào repo skills.
- Tạo PR hoặc commit trực tiếp.

Kết quả:

```text
Người dùng có thể chia sẻ skill có chọn lọc file giống GitHub Desktop.
```

### Phase 5: Backend API + Database

- Tạo backend API.
- Tạo database schema.
- Track download sau khi install thành công.
- Cho phép rating/review.
- Hiển thị download count và rating thật trong sidebar/preview.

Kết quả:

```text
Marketplace có dữ liệu động: lượt tải, đánh giá, review.
```

### Phase 6: Marketplace nâng cao

- Search/filter theo tag.
- Sort theo rating/download/newest.
- Verified authors.
- Private organization registry.
- Skill deprecation.
- Version rollback.
- Report skill.
- Moderation workflow.

Kết quả:

```text
Axon có thể scale thành marketplace skills hoàn chỉnh.
```

---

## Ưu Tiên Thực Thi

Thứ tự nên làm:

1. Refactor service-based architecture.
2. Tạo repo skills riêng và registry JSON.
3. Implement registry fetch + cache.
4. Implement manifest-based install.
5. Implement share flow chọn file.
6. Implement backend download/rating.
7. Mở rộng marketplace.

---

## Kết Luận

Thiết kế này giữ extension nhẹ, backend chịu trách nhiệm dữ liệu động, còn repo skills là source of truth cho nội dung skill.

Lợi ích chính:

- Không cần release extension khi thêm skill mới.
- Có thể support nhiều registry.
- Share skill kiểm soát được file.
- Download/rating có dữ liệu thật.
- Dễ mở rộng sang marketplace, private repo và version management.
