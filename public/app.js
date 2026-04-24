const els = {
  roomInput: document.querySelector("#roomInput"),
  nameInput: document.querySelector("#nameInput"),
  joinBtn: document.querySelector("#joinBtn"),
  roomMeta: document.querySelector("#roomMeta"),
  searchInput: document.querySelector("#searchInput"),
  filters: document.querySelector("#filters"),
  problemList: document.querySelector("#problemList"),
  problemDetail: document.querySelector("#problemDetail"),
  languageSelect: document.querySelector("#languageSelect"),
  codeInput: document.querySelector("#codeInput"),
  noteInput: document.querySelector("#noteInput"),
  judgeResults: document.querySelector("#judgeResults"),
  startBtn: document.querySelector("#startBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  runBtn: document.querySelector("#runBtn"),
  addTabs: document.querySelector("#addTabs"),
  leetcodeForm: document.querySelector("#leetcodeForm"),
  customForm: document.querySelector("#customForm"),
  catalogSelect: document.querySelector("#catalogSelect"),
  leetcodeUrl: document.querySelector("#leetcodeUrl"),
  leetcodeTitle: document.querySelector("#leetcodeTitle"),
  leetcodeDifficulty: document.querySelector("#leetcodeDifficulty"),
  leetcodeTags: document.querySelector("#leetcodeTags"),
  customTitle: document.querySelector("#customTitle"),
  customDifficulty: document.querySelector("#customDifficulty"),
  customTags: document.querySelector("#customTags"),
  customStatement: document.querySelector("#customStatement"),
  customExamples: document.querySelector("#customExamples"),
  customFunctionName: document.querySelector("#customFunctionName"),
  customTestCases: document.querySelector("#customTestCases"),
  customHiddenTestCases: document.querySelector("#customHiddenTestCases"),
  customStarterCode: document.querySelector("#customStarterCode"),
  scoreboard: document.querySelector("#scoreboard"),
  onlineCount: document.querySelector("#onlineCount"),
  activity: document.querySelector("#activity"),
  emptyTemplate: document.querySelector("#emptyTemplate")
};

const store = {
  userId: localStorage.getItem("fx_user_id") || `u_${cryptoRandom()}`,
  userName: localStorage.getItem("fx_user_name") || `同学${String(Math.floor(Math.random() * 9000) + 1000)}`,
  roomId: localStorage.getItem("fx_room_id") || new URLSearchParams(location.search).get("room") || "fx-lab-2026",
  state: null,
  catalog: [],
  selectedProblemId: localStorage.getItem("fx_selected_problem") || "",
  editorProblemId: "",
  editorLanguage: "",
  lastJudgeResult: null,
  filter: "all",
  query: "",
  source: null
};

localStorage.setItem("fx_user_id", store.userId);

function cryptoRandom() {
  const array = new Uint32Array(2);
  window.crypto.getRandomValues(array);
  return [...array].map((n) => n.toString(16)).join("");
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function codeKey(problemId) {
  return `fx_code:${store.roomId}:${store.userId}:${problemId}:${els.languageSelect?.value || "JavaScript"}`;
}

function defaultStarter(problem) {
  const language = els.languageSelect?.value || "JavaScript";
  if (typeof problem?.starterCode === "string" && language === "JavaScript") return problem.starterCode;
  if (problem?.starterCode && typeof problem.starterCode === "object" && problem.starterCode[language]) return problem.starterCode[language];
  const judge = problem?.judge;
  if (language === "Python") return pythonStarter(judge);
  if (language === "C++") return cppStarter(judge);
  if (language === "Java") return javaStarter(judge);
  if (judge?.kind === "function") {
    return `function ${judge.functionName || "solve"}() {\n  // TODO\n}\n`;
  }
  if (judge?.kind === "class") {
    return `class ${judge.className || "Solution"} {\n  constructor() {\n    // TODO\n  }\n}\n`;
  }
  return "function solve() {\n  // TODO: configure sample tests for this problem.\n}\n";
}

function sampleTests(judge) {
  return judge?.tests || [];
}

function argCount(judge) {
  return Math.max(0, ...sampleTests(judge).map((test) => (test.input || []).length));
}

function inferKind(values) {
  const first = values.flat(Infinity).find((item) => item !== null && typeof item !== "undefined");
  if (typeof first === "string") return "string";
  if (typeof first === "boolean") return "bool";
  if (typeof first === "number" && !Number.isInteger(first)) return "double";
  return "int";
}

function arrayDepth(value) {
  let depth = 0;
  let cur = value;
  while (Array.isArray(cur)) {
    depth += 1;
    cur = cur[0];
  }
  return depth;
}

function cppType(values) {
  const first = values.find((item) => Array.isArray(item));
  const depth = first ? arrayDepth(first) : 0;
  let type = inferKind(values);
  if (type === "string") type = "string";
  for (let i = 0; i < depth; i += 1) type = `vector<${type}>`;
  return type;
}

function javaType(values) {
  const first = values.find((item) => Array.isArray(item));
  const depth = first ? arrayDepth(first) : 0;
  let type = inferKind(values);
  if (type === "string") type = "String";
  if (type === "bool") type = "boolean";
  for (let i = 0; i < depth; i += 1) type += "[]";
  return type;
}

function returnValues(judge) {
  const tests = sampleTests(judge);
  if (judge?.compare === "oneOf") return tests.flatMap((test) => Array.isArray(test.expected) ? test.expected : [test.expected]);
  return tests.map((test) => test.expected);
}

function pythonStarter(judge) {
  if (judge?.kind === "class") {
    const name = judge.className || "Solution";
    const methods = [...new Set(sampleTests(judge).flatMap((test) => test.operations || []))].filter((op) => op !== name);
    return `class ${name}:\n    def __init__(self, capacity):\n        pass\n\n${methods.map((method) => `    def ${method}(self, *args):\n        pass`).join("\n\n")}\n`;
  }
  const name = judge?.functionName || "solve";
  const args = Array.from({ length: argCount(judge) || 2 }, (_, index) => `arg${index}`).join(", ");
  return `def ${name}(${args}):\n    pass\n`;
}

function cppStarter(judge) {
  if (judge?.kind === "class") {
    const name = judge.className || "Solution";
    const methods = [...new Set(sampleTests(judge).flatMap((test) => test.operations || []))].filter((op) => op !== name);
    const methodLines = methods.map((method) => `  int ${method}(int key) {\n    return -1;\n  }`).join("\n\n");
    return `class ${name} {\npublic:\n  ${name}(int capacity) {\n  }\n\n${methodLines}\n};\n`;
  }
  const name = judge?.functionName || "solve";
  const tests = sampleTests(judge);
  const args = Array.from({ length: argCount(judge) }, (_, index) => `${cppType(tests.map((test) => (test.input || [])[index]))} arg${index}`).join(", ");
  return `class Solution {\npublic:\n  ${cppType(returnValues(judge))} ${name}(${args}) {\n    // TODO\n    return {};\n  }\n};\n`;
}

function javaStarter(judge) {
  if (judge?.kind === "class") {
    const name = judge.className || "Solution";
    const methods = [...new Set(sampleTests(judge).flatMap((test) => test.operations || []))].filter((op) => op !== name);
    const methodLines = methods.map((method) => `  public int ${method}(int key) {\n    return -1;\n  }`).join("\n\n");
    return `class ${name} {\n  public ${name}(int capacity) {\n  }\n\n${methodLines}\n}\n`;
  }
  const name = judge?.functionName || "solve";
  const tests = sampleTests(judge);
  const args = Array.from({ length: argCount(judge) }, (_, index) => `${javaType(tests.map((test) => (test.input || [])[index]))} arg${index}`).join(", ");
  const ret = javaType(returnValues(judge));
  const fallback = ret === "int" || ret === "double" ? "0" : ret === "boolean" ? "false" : "null";
  return `class Solution {\n  public ${ret} ${name}(${args}) {\n    // TODO\n    return ${fallback};\n  }\n}\n`;
}

function syncEditorForProblem() {
  const problem = (store.state?.problems || []).find((item) => item.id === store.selectedProblemId);
  if (!problem || !els.codeInput) return;
  const language = els.languageSelect?.value || "JavaScript";
  if (store.editorProblemId === problem.id && store.editorLanguage === language) return;
  store.editorProblemId = problem.id;
  store.editorLanguage = language;
  store.lastJudgeResult = null;
  els.codeInput.value = localStorage.getItem(codeKey(problem.id)) || defaultStarter(problem);
  els.judgeResults.innerHTML = "";
}

function saveCurrentCode() {
  if (!store.selectedProblemId || !els.codeInput) return;
  localStorage.setItem(codeKey(store.selectedProblemId), els.codeInput.value);
}

function cleanRoom(value) {
  return String(value || "fx-lab-2026")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "fx-lab-2026";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
}

function initInputs() {
  els.roomInput.value = store.roomId;
  els.nameInput.value = store.userName;
}

async function loadCatalog() {
  const data = await api("/api/catalog");
  store.catalog = data.catalog || [];
  els.catalogSelect.innerHTML = [
    `<option value="">从常用题库选择</option>`,
    ...store.catalog.map((item) => {
      const label = `${item.number}. ${item.title} / ${item.slug}`;
      return `<option value="${htmlEscape(item.slug)}">${htmlEscape(label)}</option>`;
    })
  ].join("");
}

function connect() {
  if (store.source) store.source.close();
  store.editorProblemId = "";
  store.editorLanguage = "";
  localStorage.setItem("fx_room_id", store.roomId);
  localStorage.setItem("fx_user_name", store.userName);
  const params = new URLSearchParams({ room: store.roomId, userId: store.userId, name: store.userName });
  store.source = new EventSource(`/events?${params.toString()}`);
  store.source.addEventListener("state", (event) => {
    store.state = JSON.parse(event.data);
    if (!store.selectedProblemId && store.state.problems[0]) {
      store.selectedProblemId = store.state.problems[0].id;
    }
    render();
  });
  store.source.onerror = () => {
    els.roomMeta.textContent = "连接中断，正在重连";
  };
}

function getMyProgress(problemId) {
  return store.state?.progress?.[store.userId]?.[problemId]?.status || "todo";
}

function getProblemStats(problemId) {
  const progress = store.state?.progress || {};
  let accepted = 0;
  let working = 0;
  let review = 0;
  Object.values(progress).forEach((byProblem) => {
    const status = byProblem?.[problemId]?.status;
    if (status === "accepted") accepted += 1;
    if (status === "working") working += 1;
    if (status === "review") review += 1;
  });
  return { accepted, working, review };
}

function problemStatusIcon(status) {
  if (status === "accepted") return "AC";
  if (status === "working") return "...";
  if (status === "review") return "R";
  return "";
}

function filteredProblems() {
  const query = store.query.trim().toLowerCase();
  return (store.state?.problems || []).filter((problem) => {
    const status = getMyProgress(problem.id);
    if (store.filter !== "all" && status !== store.filter) return false;
    if (!query) return true;
    const haystack = [
      problem.number,
      problem.title,
      problem.slug,
      problem.source,
      ...(problem.tags || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function render() {
  if (!store.state) return;
  const online = (store.state.participants || []).filter((p) => p.online).length;
  els.roomMeta.textContent = `房间 ${store.state.room.id} · ${store.state.problems.length} 题 · ${online} 人在线`;
  els.onlineCount.textContent = `${online} 在线`;

  if (!store.state.problems.some((problem) => problem.id === store.selectedProblemId)) {
    store.selectedProblemId = store.state.problems[0]?.id || "";
  }
  localStorage.setItem("fx_selected_problem", store.selectedProblemId);
  syncEditorForProblem();
  renderProblemList();
  renderDetail();
  renderScoreboard();
  renderActivity();
}

function renderProblemList() {
  const problems = filteredProblems();
  if (!problems.length) {
    els.problemList.innerHTML = els.emptyTemplate.innerHTML;
    return;
  }
  els.problemList.innerHTML = problems.map((problem) => {
    const status = getMyProgress(problem.id);
    const stats = getProblemStats(problem.id);
    const active = problem.id === store.selectedProblemId ? "active" : "";
    const number = problem.number ? `${problem.number}. ` : "";
    const source = problem.source === "custom" ? "自定义" : "LeetCode";
    return `
      <button class="problem-row ${active}" data-problem-id="${htmlEscape(problem.id)}">
        <span class="status-ring ${status}">${problemStatusIcon(status)}</span>
        <span>
          <span class="problem-title">
            <strong>${htmlEscape(number + problem.title)}</strong>
            <span class="difficulty ${problem.difficulty}">${htmlEscape(problem.difficulty)}</span>
          </span>
          <span class="problem-meta">
            <span class="source-pill">${source}</span>
            ${(problem.tags || []).slice(0, 3).map((tag) => `<span>${htmlEscape(tag)}</span>`).join("<span>·</span>")}
          </span>
        </span>
        <span class="progress-stack">${stats.accepted} AC / ${stats.working} 解</span>
      </button>
    `;
  }).join("");
}

function renderDetail() {
  const problem = (store.state.problems || []).find((item) => item.id === store.selectedProblemId);
  if (!problem) {
    els.problemDetail.innerHTML = els.emptyTemplate.innerHTML;
    els.startBtn.disabled = true;
    els.reviewBtn.disabled = true;
    els.runBtn.disabled = true;
    return;
  }
  els.startBtn.disabled = false;
  els.reviewBtn.disabled = false;
  els.runBtn.disabled = !problem.judge;
  const stats = getProblemStats(problem.id);
  const mine = getMyProgress(problem.id);
  const tags = (problem.tags || []).map((tag) => `<span class="tag">${htmlEscape(tag)}</span>`).join("");
  const participants = usersOnProblem(problem.id);
  const statement = problem.source === "custom"
    ? `<div><h2>题面</h2><pre>${htmlEscape(problem.statement || "暂无题面")}</pre></div>
       <div><h2>样例</h2><pre>${htmlEscape(problem.examples || "暂无样例")}</pre></div>`
    : `<p>LeetCode 原题请打开题目链接查看完整描述。这里保留协作记录、AC 状态和复盘信息。</p>`;
  els.problemDetail.innerHTML = `
    <div class="detail-head">
      <div class="detail-title-line">
        <div>
          <h2>${htmlEscape(problem.number ? `${problem.number}. ${problem.title}` : problem.title)}</h2>
          <div class="tag-line">
            <span class="difficulty ${problem.difficulty}">${htmlEscape(problem.difficulty)}</span>
            <span class="source-pill">${problem.source === "custom" ? "自定义" : "LeetCode"}</span>
            <span class="mini-badge">我的状态：${statusLabel(mine)}</span>
          </div>
        </div>
        <div class="detail-actions">
          ${problem.url ? `<a class="link-btn" href="${htmlEscape(problem.url)}" target="_blank" rel="noreferrer">打开原题</a>` : ""}
          <button class="danger-lite" data-delete-problem="${htmlEscape(problem.id)}">移出题单</button>
        </div>
      </div>
      <div class="tag-line">${tags || `<span class="tag">未标注</span>`}</div>
    </div>
    <div class="collab-strip">
      <div class="metric"><strong>${stats.accepted}</strong><span>已 AC</span></div>
      <div class="metric"><strong>${stats.working}</strong><span>正在解</span></div>
      <div class="metric"><strong>${participants.length}</strong><span>同题在线</span></div>
    </div>
    <div class="statement">
      ${statement}
      ${renderJudgeSpec(problem)}
      ${participants.length ? `<div><h2>同题成员</h2><div class="tag-line">${participants.map((p) => `<span class="tag">${htmlEscape(p.name)}</span>`).join("")}</div></div>` : ""}
    </div>
  `;
}

function renderJudgeSpec(problem) {
  const judge = problem?.judge;
  if (!judge) {
    return `<div class="judge-spec muted-box">当前题目还没有配置网页判题样例。请选择内置样例题，或用“自定义题”填写函数名和测试样例 JSON。</div>`;
  }
  const title = judge.kind === "class"
    ? `提交类：${judge.className}`
    : `提交函数：${judge.functionName}`;
  const tests = (judge.tests || []).map((test, index) => {
    const input = judge.kind === "class" ? test.operations : test.input;
    const expected = test.expected;
    return `<pre>Case ${index + 1}
input: ${htmlEscape(JSON.stringify(input))}
expected: ${htmlEscape(JSON.stringify(expected))}</pre>`;
  }).join("");
  const hidden = judge.hiddenTestCount ? `<span class="mini-badge">隐藏测试 ${judge.hiddenTestCount} 组</span>` : "";
  return `<div class="judge-spec"><h2>${htmlEscape(title)} ${hidden}</h2>${tests}</div>`;
}

function usersOnProblem(problemId) {
  return (store.state.participants || []).filter((participant) => participant.online && participant.activeProblemId === problemId);
}

function statusLabel(status) {
  if (status === "accepted") return "AC";
  if (status === "working") return "解题中";
  if (status === "review") return "待复盘";
  return "未开始";
}

function renderScoreboard() {
  const rows = store.state.scoreboard || [];
  if (!rows.length) {
    els.scoreboard.innerHTML = `<div class="empty"><span>暂无成员</span></div>`;
    return;
  }
  els.scoreboard.innerHTML = rows.map((row, index) => {
    const activeProblem = (store.state.problems || []).find((p) => p.id === row.activeProblemId);
    return `
      <div class="score-row ${row.online ? "" : "offline"}">
        <div class="score-top">
          <span class="score-name">
            <span class="avatar">${htmlEscape(row.name.slice(0, 1).toUpperCase())}</span>
            <strong>${index + 1}. ${htmlEscape(row.name)}</strong>
          </span>
          <span class="mini-badge">${row.accepted} AC</span>
        </div>
        <div class="score-stats">
          ${row.online ? "在线" : "离线"} · ${row.working} 题进行中${activeProblem ? ` · ${htmlEscape(activeProblem.title)}` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderActivity() {
  const rows = store.state.submissions || [];
  if (!rows.length) {
    els.activity.innerHTML = `<div class="empty"><span>暂无提交</span></div>`;
    return;
  }
  els.activity.innerHTML = rows.slice(0, 12).map((row) => `
    <div class="activity-row">
      <div class="activity-top">
        <strong>${htmlEscape(row.userName)}</strong>
        <span class="activity-result">${htmlEscape(row.result)}</span>
      </div>
      <span>${htmlEscape(row.problemTitle)} · ${htmlEscape(row.language)} · ${fmtTime(row.createdAt)}</span>
      ${row.note ? `<span>${htmlEscape(row.note)}</span>` : ""}
    </div>
  `).join("");
}

function currentProblemId() {
  if (!store.selectedProblemId) {
    toast("请先选择一道题");
    return "";
  }
  return store.selectedProblemId;
}

async function updateProgress(status) {
  const problemId = currentProblemId();
  if (!problemId) return;
  await api(`/api/rooms/${encodeURIComponent(store.roomId)}/progress`, {
    method: "POST",
    body: JSON.stringify({
      userId: store.userId,
      problemId,
      status,
      language: els.languageSelect.value,
      note: els.noteInput.value
    })
  });
  toast(status === "working" ? "已进入解题中" : "已标记待复盘");
}

async function submitResult(result, judgeResult = null) {
  const problemId = currentProblemId();
  if (!problemId) return;
  const summary = judgeResult ? summarizeJudgeResult(judgeResult) : "";
  await api(`/api/rooms/${encodeURIComponent(store.roomId)}/submissions`, {
    method: "POST",
    body: JSON.stringify({
      userId: store.userId,
      problemId,
      result,
      language: els.languageSelect.value,
      note: els.noteInput.value || summary,
      testSummary: summary,
      code: els.codeInput.value
    })
  });
  if (result === "AC") els.noteInput.value = "";
  toast(result === "AC" ? "Accepted" : "已提交记录");
}

function summarizeJudgeResult(result) {
  if (!result) return "";
  if (result.error) return result.error.slice(0, 300);
  const passed = result.cases.filter((item) => item.passed).length;
  return `${passed}/${result.cases.length} samples passed`;
}

async function runAndSubmit() {
  const problem = (store.state?.problems || []).find((item) => item.id === currentProblemId());
  if (!problem) return;
  if (!problem.judge) {
    renderJudgeResult({ ok: false, result: "NOTE", error: "当前题目没有配置可运行样例。" });
    toast("当前题目没有判题样例");
    return;
  }

  saveCurrentCode();
  els.runBtn.disabled = true;
  els.runBtn.textContent = "服务器判题中";
  renderJudgeResult({ pending: true, cases: [] });

  try {
    const response = await api(`/api/rooms/${encodeURIComponent(store.roomId)}/judge`, {
      method: "POST",
      body: JSON.stringify({
        userId: store.userId,
        problemId: problem.id,
        language: els.languageSelect.value,
        code: els.codeInput.value,
        note: els.noteInput.value
      })
    });
    store.lastJudgeResult = response.judgeResult;
    renderJudgeResult(response.judgeResult);
    if (response.result === "AC") els.noteInput.value = "";
    toast(response.result === "AC" ? "Accepted" : response.result);
  } catch (error) {
    renderJudgeResult({ ok: false, result: "RE", error: error.message || "提交失败", cases: [] });
  } finally {
    els.runBtn.disabled = false;
    els.runBtn.textContent = "运行测试并提交";
  }
}

function renderJudgeResult(result) {
  if (result.pending) {
    els.judgeResults.innerHTML = `<div class="judge-row pending">正在运行样例...</div>`;
    return;
  }
  if (result.error) {
    els.judgeResults.innerHTML = `<div class="judge-row fail"><strong>${htmlEscape(result.result || "RE")}</strong><span>${htmlEscape(result.error)}</span></div>`;
    return;
  }
  const rows = (result.cases || []).map((item) => `
    <div class="judge-row ${item.passed ? "pass" : "fail"}">
      <strong>Case ${item.index + 1} · ${item.passed ? "通过" : "失败"}</strong>
      <span>期望：${htmlEscape(item.expected)}</span>
      <span>输出：${htmlEscape(item.actual)}</span>
    </div>
  `).join("");
  const header = result.ok
    ? `<div class="judge-summary pass">Accepted · 公开与隐藏测试通过</div>`
    : `<div class="judge-summary fail">${htmlEscape(result.result || "WA")} · 测试未通过</div>`;
  const hidden = result.hidden
    ? `<div class="judge-row ${result.hidden.passed === result.hidden.total ? "pass" : "fail"}"><strong>隐藏测试</strong><span>${result.hidden.passed}/${result.hidden.total} 通过</span></div>`
    : "";
  els.judgeResults.innerHTML = header + rows + hidden;
}

function runCodeInWorker(code, judge, timeoutMs) {
  return new Promise((resolve) => {
    const workerSource = `
      const stringify = (value) => {
        if (typeof value === "undefined") return "undefined";
        try { return JSON.stringify(value); } catch { return String(value); }
      };
      const clone = (value) => JSON.parse(JSON.stringify(value));
      const normalize = (value, compare) => {
        if (compare === "unorderedFlat" && Array.isArray(value)) {
          return [...value].sort((a, b) => stringify(a).localeCompare(stringify(b)));
        }
        if (compare === "unorderedDeep" && Array.isArray(value)) {
          return value.map((item) => Array.isArray(item) ? [...item].sort((a, b) => stringify(a).localeCompare(stringify(b))) : item)
            .sort((a, b) => stringify(a).localeCompare(stringify(b)));
        }
        if (compare === "unorderedRows" && Array.isArray(value)) {
          return [...value].sort((a, b) => stringify(a).localeCompare(stringify(b)));
        }
        return value;
      };
      const deepEqual = (a, b, compare) => {
        if (compare === "oneOf" && Array.isArray(b)) {
          return b.some((item) => deepEqual(a, item, "exact"));
        }
        return stringify(normalize(a, compare)) === stringify(normalize(b, compare));
      };
      const loadSymbol = (code, name) => {
        const factory = new Function('"use strict";\\n' + code + '\\n; return typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined;');
        const symbol = factory();
        if (!symbol) throw new Error("未找到提交入口：" + name);
        return symbol;
      };
      const runFunctionJudge = (code, judge) => {
        const fn = loadSymbol(code, judge.functionName);
        if (typeof fn !== "function") throw new Error(judge.functionName + " 不是函数");
        return judge.tests.map((test, index) => {
          const input = clone(test.input || []);
          const actual = fn(...input);
          const passed = deepEqual(actual, test.expected, judge.compare || "exact");
          return { index, passed, actual: stringify(actual), expected: stringify(test.expected) };
        });
      };
      const runClassJudge = (code, judge) => {
        const Cls = loadSymbol(code, judge.className);
        if (typeof Cls !== "function") throw new Error(judge.className + " 不是类");
        return judge.tests.map((test, index) => {
          let instance = null;
          const actual = [];
          for (let i = 0; i < test.operations.length; i += 1) {
            const op = test.operations[i];
            const args = clone((test.args || [])[i] || []);
            if (i === 0 || op === judge.className) {
              instance = new Cls(...args);
              actual.push(null);
            } else {
              if (!instance || typeof instance[op] !== "function") throw new Error("未找到方法：" + op);
              const value = instance[op](...args);
              actual.push(typeof value === "undefined" ? null : value);
            }
          }
          const passed = deepEqual(actual, test.expected, judge.compare || "exact");
          return { index, passed, actual: stringify(actual), expected: stringify(test.expected) };
        });
      };
      self.onmessage = (event) => {
        const { code, judge } = event.data;
        try {
          const cases = judge.kind === "class" ? runClassJudge(code, judge) : runFunctionJudge(code, judge);
          const ok = cases.every((item) => item.passed);
          self.postMessage({ ok, result: ok ? "AC" : "WA", cases });
        } catch (error) {
          self.postMessage({ ok: false, result: "RE", error: error && (error.stack || error.message) || String(error), cases: [] });
        }
      };
    `;
    const blob = new Blob([workerSource], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, result: "TLE", error: "运行超时，可能存在死循环或复杂度过高。", cases: [] });
    }, timeoutMs);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, result: "RE", error: event.message || "运行时错误", cases: [] });
    };
    worker.postMessage({ code, judge });
  });
}

function selectedCatalogItem() {
  return store.catalog.find((item) => item.slug === els.catalogSelect.value);
}

function fillFromCatalog() {
  const item = selectedCatalogItem();
  if (!item) return;
  els.leetcodeUrl.value = item.url;
  els.leetcodeTitle.value = item.title;
  els.leetcodeDifficulty.value = item.difficulty;
  els.leetcodeTags.value = item.tags.join(", ");
}

function parseCustomTests(field = els.customTestCases, required = true) {
  try {
    const parsed = JSON.parse(field.value || "[]");
    if (!Array.isArray(parsed) || (required && !parsed.length)) throw new Error("测试样例必须是非空数组");
    for (const item of parsed) {
      if (!Object.prototype.hasOwnProperty.call(item, "input") || !Object.prototype.hasOwnProperty.call(item, "expected")) {
        throw new Error("每个样例都需要 input 和 expected");
      }
      if (!Array.isArray(item.input)) throw new Error("input 必须是数组，例如 [1, 2]");
    }
    return parsed;
  } catch (error) {
    toast(error.message || "测试样例 JSON 格式错误");
    throw error;
  }
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1800);
}

function bindEvents() {
  els.joinBtn.addEventListener("click", () => {
    store.roomId = cleanRoom(els.roomInput.value);
    store.userName = els.nameInput.value.trim() || store.userName;
    store.editorProblemId = "";
    els.roomInput.value = store.roomId;
    connect();
  });

  els.nameInput.addEventListener("change", async () => {
    store.userName = els.nameInput.value.trim() || store.userName;
    localStorage.setItem("fx_user_name", store.userName);
    await api(`/api/rooms/${encodeURIComponent(store.roomId)}/presence`, {
      method: "POST",
      body: JSON.stringify({ userId: store.userId, name: store.userName, activeProblemId: store.selectedProblemId })
    });
  });

  els.searchInput.addEventListener("input", () => {
    store.query = els.searchInput.value;
    renderProblemList();
  });

  els.codeInput.addEventListener("input", saveCurrentCode);
  els.languageSelect.addEventListener("change", () => {
    store.editorLanguage = "";
    syncEditorForProblem();
  });

  els.filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    store.filter = button.dataset.filter;
    els.filters.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    renderProblemList();
  });

  els.problemList.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-problem-id]");
    if (!row) return;
    store.selectedProblemId = row.dataset.problemId;
    localStorage.setItem("fx_selected_problem", store.selectedProblemId);
    render();
    await api(`/api/rooms/${encodeURIComponent(store.roomId)}/presence`, {
      method: "POST",
      body: JSON.stringify({ userId: store.userId, name: store.userName, activeProblemId: getMyProgress(store.selectedProblemId) === "working" ? store.selectedProblemId : "" })
    });
  });

  els.problemDetail.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-problem]");
    if (!button) return;
    const problem = (store.state?.problems || []).find((item) => item.id === button.dataset.deleteProblem);
    if (!problem) return;
    if (!confirm(`移出「${problem.title}」？`)) return;
    await api(`/api/rooms/${encodeURIComponent(store.roomId)}/problems/${encodeURIComponent(problem.id)}`, {
      method: "DELETE"
    });
    store.selectedProblemId = "";
    toast("已移出题单");
  });

  els.addTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    const tab = button.dataset.tab;
    els.addTabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    els.leetcodeForm.classList.toggle("hidden", tab !== "leetcode");
    els.customForm.classList.toggle("hidden", tab !== "custom");
  });

  els.catalogSelect.addEventListener("change", fillFromCatalog);

  els.leetcodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const item = selectedCatalogItem();
    await api(`/api/rooms/${encodeURIComponent(store.roomId)}/problems`, {
      method: "POST",
      body: JSON.stringify({
        source: "leetcode",
        addedBy: store.userId,
        slug: item?.slug || "",
        url: els.leetcodeUrl.value,
        title: els.leetcodeTitle.value,
        difficulty: els.leetcodeDifficulty.value,
        tags: els.leetcodeTags.value
      })
    });
    els.leetcodeForm.reset();
    toast("已添加 LeetCode 题");
  });

  els.customForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const testCases = parseCustomTests();
    const hiddenTestCases = parseCustomTests(els.customHiddenTestCases, false);
    await api(`/api/rooms/${encodeURIComponent(store.roomId)}/problems`, {
      method: "POST",
      body: JSON.stringify({
        source: "custom",
        addedBy: store.userId,
        title: els.customTitle.value,
        difficulty: els.customDifficulty.value,
        tags: els.customTags.value,
        statement: els.customStatement.value,
        examples: els.customExamples.value,
        functionName: els.customFunctionName.value,
        testCases,
        hiddenTestCases,
        starterCode: els.customStarterCode.value
      })
    });
    els.customForm.reset();
    els.customFunctionName.value = "solve";
    els.customTestCases.value = '[\n  { "input": [1, 2], "expected": 3 }\n]';
    els.customHiddenTestCases.value = '[\n  { "input": [10, 20], "expected": 30 }\n]';
    els.customStarterCode.value = "function solve(a, b) {\n  // TODO\n}\n";
    toast("自定义题已发布");
  });

  els.startBtn.addEventListener("click", () => updateProgress("working"));
  els.reviewBtn.addEventListener("click", () => updateProgress("review"));
  els.runBtn.addEventListener("click", () => runAndSubmit());
}

async function boot() {
  initInputs();
  bindEvents();
  await loadCatalog();
  connect();
}

boot().catch((error) => {
  console.error(error);
  toast("启动失败，请查看控制台");
});
