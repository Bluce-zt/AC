# 上线部署

这个项目需要运行 Node 后端，不能只放到 GitHub Pages 这类静态托管上。多人实时状态使用 SSE，题单和提交记录默认保存在 `state.json`。

## 方案 A：Render

适合想直接得到公网 HTTPS 地址的场景。

1. 把本目录上传到 GitHub 仓库。
2. 到 Render 创建 Web Service，连接该仓库。
3. 使用以下配置：
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile`
   - Health Check Path: `/api/health`
4. 设置环境变量：
   - `DATA_DIR=/var/data`
5. 添加 Persistent Disk：
   - Mount Path: `/var/data`
   - Size: `1 GB`
6. 部署完成后，Render 会给一个 `https://...onrender.com` 地址。所有人打开这个地址，输入同一个房间码即可一起解题。

仓库里的 `render.yaml` 已经写好这些配置。如果你使用 Render Blueprint，可以直接按它创建服务。

Render 方案会在应用容器内本地运行 Python/C++/Java 判题，支持隐藏测试，但不是每次提交单独起 Docker 沙箱。强隔离沙箱建议使用 VPS 方案并设置 `JUDGE_MODE=docker`。

## 方案 B：VPS / 云服务器 / 学校服务器

适合你有一台公网服务器的场景。

```bash
git clone <your-repo-url>
cd <repo>
npm install
PORT=4173 DATA_DIR=/var/lib/fx-lab-ac JUDGE_MODE=docker node server.js
```

服务器需要安装 Docker。判题容器默认禁用网络，并限制内存和 CPU。然后在服务器防火墙和云厂商安全组里开放 `4173` 端口，访问：

```text
http://服务器公网IP:4173
```

生产环境建议再用 Nginx 反向代理到 HTTPS 域名。

## 方案 C：Docker

```bash
docker build -t fx-lab-ac-board .
docker run -d --name fx-lab-ac-board \
  -p 4173:4173 \
  -e PORT=4173 \
  -e DATA_DIR=/data \
  -e JUDGE_MODE=local \
  -v fx-lab-ac-data:/data \
  fx-lab-ac-board
```

上面的 Docker 方式会在应用容器内本地判题。若要让应用容器再启动独立判题容器，需要额外挂载 Docker socket，并承担相应安全风险；更推荐直接在 Linux 主机上运行 Node 服务并设置 `JUDGE_MODE=docker`。

访问：

```text
http://服务器公网IP:4173
```

## 临时方案：Cloudflare Tunnel

如果不想买服务器，也可以把你电脑上的 `http://localhost:4173` 映射到公网域名。不要用 TryCloudflare 的 quick tunnel 做正式入口，因为当前项目的实时同步依赖 SSE，而 quick tunnel 不支持 SSE；如果走 Cloudflare Tunnel，请使用正式的 remotely-managed tunnel。缺点是你的电脑必须一直开机，网络断开后网页也会不可用。

## 注意

- 不要多实例横向扩容当前版本。当前版本用单个 `state.json` 保存状态，多实例会导致数据不同步。
- 如果不配置持久化磁盘，云平台重启或重新部署后题单和 AC 记录可能丢失。
- 真正公开招生使用前，建议再加管理员口令、题目删除权限控制、提交限流和定期备份。
