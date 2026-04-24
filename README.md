# 冯欣老师课题组招生试题

仿 LeetCode 个人题单的 AC 协作网页，支持添加 LeetCode 题目、自定义题目、多人实时在线解题、AC 记录、排行榜和动态流。

## 运行

```powershell
node server.js
```

打开 `http://localhost:4173`。

同一局域网内多人使用时，让其他同学访问本机 IP 对应的地址，例如 `http://192.168.1.23:4173`，并输入相同房间码。

跨局域网使用需要部署到公网服务器或 PaaS，见 `DEPLOY.md`。

## 数据

题单、进度和提交记录会保存到 `data/state.json`。

## 在线判题

当前版本支持在网页中编写 JavaScript、Python、C++、Java 解法，点击“运行测试并提交”。系统会把代码提交到服务端判题，公开测试和隐藏测试全部通过后自动记录为 AC；失败会记录 WA / RE / TLE / CE。

自定义题需要填写：

- 函数名，例如 `solve`
- 公开测试样例 JSON，例如：

```json
[
  { "input": [1, 2], "expected": 3 }
]
```

这表示系统会调用 `solve(1, 2)`，并期望返回 `3`。

- 隐藏测试样例 JSON，格式同上；隐藏测试只保存在服务端，不会下发到前端。

## 判题运行环境

默认 `JUDGE_MODE=local`，服务端会在临时目录运行代码并设置超时。需要安装：

- Python: `python` 或设置 `PYTHON_BIN`
- C++: `g++` 或设置 `GPP_BIN`
- Java: `javac`、`java` 或设置 `JAVAC_BIN`、`JAVA_BIN`

更强隔离建议在 Linux 服务器上设置 `JUDGE_MODE=docker`，每次判题通过 Docker 容器运行，并禁用网络：

```bash
JUDGE_MODE=docker node server.js
```

可配置项：

- `JUDGE_TIMEOUT_MS=3000`
- `JUDGE_DOCKER_MEMORY=256m`
- `JUDGE_DOCKER_CPUS=0.5`
"# AC"  
