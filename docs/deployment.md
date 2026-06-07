# 部署指南

本文档介绍元器件库存管理系统的多种部署方式。

## 目录

- [环境变量](#环境变量)
- [方式一：本地运行](#方式一本地运行)
- [方式二：Docker 部署](#方式二docker-部署)
- [方式三：EdgeOne Pages](#方式三edgeone-pages)
- [方式四：Vercel](#方式四vercel)

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `STORAGE_MODE` | 否 | `local` | 存储模式：`local`(SQLite) / `cloud`(Redis) |
| `UPSTASH_REDIS_REST_URL` | cloud 模式 | - | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | cloud 模式 | - | Upstash Redis REST Token |
| `AUTH_USERNAME` | 否 | `admin` | 登录用户名 |
| `AUTH_PASSWORD` | 否 | `admin123` | 登录密码 |
| `SQLITE_DB_PATH` | 否 | `data/inventory.db` | SQLite 数据库路径（仅 local 模式） |

### Upstash Redis 配置

1. 访问 [Upstash](https://upstash.com/) 创建免费 Redis 数据库
2. 在控制台获取 REST URL 和 Token
3. 设置环境变量：

```bash
STORAGE_MODE=cloud
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

---

## 方式一：本地运行

适用于个人电脑、内网服务器。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
STORAGE_MODE=local
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
```

### 3. 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

访问 http://localhost:3000

---

## 方式二：Docker 部署

适用于服务器部署，推荐使用。

### 首次部署

1. 登录 GitHub Container Registry

```bash
docker login ghcr.io -u YOUR_USERNAME -p YOUR_TOKEN
```

2. 拉取镜像并启动

```bash
docker pull ghcr.io/dusklane/inventory-system:latest
docker-compose -f docker-compose.prod.yml up -d
```

### 更新部署

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 使用指定版本

```bash
# 修改 docker-compose.prod.yml 中的镜像标签
# 从 latest 改为指定版本，如 v1.0.0
image: ghcr.io/dusklane/inventory-system:v1.0.0

# 然后拉取并重启
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 本地构建

```bash
docker-compose up -d --build
```

### 访问地址

- 本机：http://localhost:3000
- 局域网：http://你的IP:3000

### GitHub Actions 自动构建

推送到 main 分支的代码会自动构建并推送到 ghcr.io。

手动触发可指定版本号：
1. 进入 Actions 页面
2. 选择 "Docker Build and Push"
3. 点击 "Run workflow"
4. 输入版本号（如 v1.0.0）

---

## 方式三：EdgeOne Pages

适用于腾讯云 EdgeOne Pages 部署。

### 前置条件

- EdgeOne Pages 账号
- Upstash Redis 数据库（免费即可）

### 配置步骤

1. **设置存储模式为 cloud**

在 EdgeOne Pages 控制台的环境变量中设置：

```
STORAGE_MODE=cloud
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
AUTH_USERNAME=admin
AUTH_PASSWORD=你的密码
```

2. **确认 edgeone.json 配置**

项目根目录已包含 `edgeone.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "nodeVersion": "18"
}
```

3. **部署**

将代码推送到 Git 仓库，EdgeOne Pages 会自动构建部署。

### 注意事项

- EdgeOne Pages 不支持 `better-sqlite3` 原生模块，必须使用 `STORAGE_MODE=cloud`
- `serverExternalPackages` 配置已添加，确保 `better-sqlite3` 不会被打包
- 首次部署后，数据存储在 Upstash Redis 中，无需额外配置

---

## 方式四：Vercel

适用于 Vercel 平台部署。

### 前置条件

- Vercel 账号
- Upstash Redis 数据库

### 配置步骤

1. **导入 Git 仓库到 Vercel**

2. **设置环境变量**

```
STORAGE_MODE=cloud
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
AUTH_USERNAME=admin
AUTH_PASSWORD=你的密码
```

3. **部署**

Vercel 会自动构建并部署。

### 注意事项

- Vercel Serverless Functions 不支持原生模块，必须使用 `STORAGE_MODE=cloud`
- 可在 Vercel 控制台绑定自定义域名

---

## 存储模式对比

| 特性 | local (SQLite) | cloud (Redis) |
|------|---------------|---------------|
| 数据持久化 | 本地文件 | Upstash 云存储 |
| 部署限制 | 需要文件系统支持 | 无限制 |
| 性能 | 本地读写，速度快 | 网络请求，略有延迟 |
| 适用场景 | 本地/Docker | Serverless 平台 |
| 数据备份 | 复制 db 文件 | Upstash 自动备份 |
| 图片存储 | 本地文件 | URL 代理 |

---

## 常见问题

### Q: 如何从 local 迁移到 cloud？

目前没有自动迁移工具。建议：
1. 使用 CSV 导出功能导出数据
2. 切换到 cloud 模式
3. 使用 CSV 导入功能导入数据

### Q: Docker 部署时如何持久化数据？

`docker-compose.prod.yml` 已配置 volume 挂载 `data/` 目录，数据库和图片会持久化保存。

### Q: 如何修改登录密码？

修改环境变量 `AUTH_PASSWORD`，重启服务生效。

### Q: EdgeOne Pages 部署后页面无法加载？

检查：
1. 环境变量 `STORAGE_MODE` 是否设置为 `cloud`
2. Upstash Redis 凭据是否正确
3. 构建日志是否有错误
