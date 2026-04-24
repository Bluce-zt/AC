const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const STATE_FILE = process.env.STATE_FILE ? path.resolve(process.env.STATE_FILE) : path.join(DATA_DIR, "state.json");
const JUDGE_TIMEOUT_MS = Number(process.env.JUDGE_TIMEOUT_MS || 3000);
const JUDGE_MAX_OUTPUT = Number(process.env.JUDGE_MAX_OUTPUT || 200000);
const JUDGE_MODE = String(process.env.JUDGE_MODE || "local").toLowerCase();
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const GPP_BIN = process.env.GPP_BIN || "g++";
const JAVAC_BIN = process.env.JAVAC_BIN || "javac";
const JAVA_BIN = process.env.JAVA_BIN || "java";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const JUDGE_FIXTURES = {
  "two-sum": {
    judge: {
      kind: "function",
      functionName: "twoSum",
      compare: "unorderedFlat",
      tests: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { input: [[3, 2, 4], 6], expected: [1, 2] },
        { input: [[3, 3], 6], expected: [0, 1] }
      ],
      hiddenTests: [
        { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
        { input: [[0, 4, 3, 0], 0], expected: [0, 3] }
      ]
    },
    starterCode: "function twoSum(nums, target) {\n  // TODO: return indices of the two numbers.\n}\n"
  },
  "longest-substring-without-repeating-characters": {
    judge: {
      kind: "function",
      functionName: "lengthOfLongestSubstring",
      tests: [
        { input: ["abcabcbb"], expected: 3 },
        { input: ["bbbbb"], expected: 1 },
        { input: ["pwwkew"], expected: 3 }
      ],
      hiddenTests: [
        { input: [""], expected: 0 },
        { input: ["dvdf"], expected: 3 }
      ]
    },
    starterCode: "function lengthOfLongestSubstring(s) {\n  // TODO\n}\n"
  },
  "longest-palindromic-substring": {
    judge: {
      kind: "function",
      functionName: "longestPalindrome",
      compare: "oneOf",
      tests: [
        { input: ["babad"], expected: ["bab", "aba"] },
        { input: ["cbbd"], expected: ["bb"] },
        { input: ["a"], expected: ["a"] }
      ],
      hiddenTests: [
        { input: ["aaaa"], expected: ["aaaa"] },
        { input: ["ac"], expected: ["a", "c"] }
      ]
    },
    starterCode: "function longestPalindrome(s) {\n  // TODO\n}\n"
  },
  "3sum": {
    judge: {
      kind: "function",
      functionName: "threeSum",
      compare: "unorderedDeep",
      tests: [
        { input: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
        { input: [[0, 1, 1]], expected: [] },
        { input: [[0, 0, 0]], expected: [[0, 0, 0]] }
      ],
      hiddenTests: [
        { input: [[-2, 0, 0, 2, 2]], expected: [[-2, 0, 2]] },
        { input: [[-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]], expected: [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]] }
      ]
    },
    starterCode: "function threeSum(nums) {\n  // TODO\n}\n"
  },
  "valid-parentheses": {
    judge: {
      kind: "function",
      functionName: "isValid",
      tests: [
        { input: ["()"], expected: true },
        { input: ["()[]{}"], expected: true },
        { input: ["(]"], expected: false }
      ],
      hiddenTests: [
        { input: ["([)]"], expected: false },
        { input: ["{[]}"], expected: true }
      ]
    },
    starterCode: "function isValid(s) {\n  // TODO\n}\n"
  },
  "permutations": {
    judge: {
      kind: "function",
      functionName: "permute",
      compare: "unorderedRows",
      tests: [
        { input: [[1, 2, 3]], expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]] },
        { input: [[0, 1]], expected: [[0, 1], [1, 0]] }
      ],
      hiddenTests: [
        { input: [[1]], expected: [[1]] }
      ]
    },
    starterCode: "function permute(nums) {\n  // TODO\n}\n"
  },
  "maximum-subarray": {
    judge: {
      kind: "function",
      functionName: "maxSubArray",
      tests: [
        { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
        { input: [[1]], expected: 1 },
        { input: [[5, 4, -1, 7, 8]], expected: 23 }
      ],
      hiddenTests: [
        { input: [[-1]], expected: -1 },
        { input: [[-2, -1]], expected: -1 }
      ]
    },
    starterCode: "function maxSubArray(nums) {\n  // TODO\n}\n"
  },
  "climbing-stairs": {
    judge: {
      kind: "function",
      functionName: "climbStairs",
      tests: [
        { input: [2], expected: 2 },
        { input: [3], expected: 3 },
        { input: [5], expected: 8 }
      ],
      hiddenTests: [
        { input: [1], expected: 1 },
        { input: [10], expected: 89 }
      ]
    },
    starterCode: "function climbStairs(n) {\n  // TODO\n}\n"
  },
  "best-time-to-buy-and-sell-stock": {
    judge: {
      kind: "function",
      functionName: "maxProfit",
      tests: [
        { input: [[7, 1, 5, 3, 6, 4]], expected: 5 },
        { input: [[7, 6, 4, 3, 1]], expected: 0 }
      ],
      hiddenTests: [
        { input: [[2, 4, 1]], expected: 2 },
        { input: [[1, 2]], expected: 1 }
      ]
    },
    starterCode: "function maxProfit(prices) {\n  // TODO\n}\n"
  },
  "lru-cache": {
    judge: {
      kind: "class",
      className: "LRUCache",
      tests: [
        {
          operations: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
          args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
          expected: [null, null, null, 1, null, -1, null, -1, 3, 4]
        }
      ],
      hiddenTests: [
        {
          operations: ["LRUCache", "put", "get", "put", "get", "get"],
          args: [[1], [2, 1], [2], [3, 2], [2], [3]],
          expected: [null, null, 1, null, -1, 2]
        }
      ]
    },
    starterCode: "class LRUCache {\n  constructor(capacity) {\n    // TODO\n  }\n\n  get(key) {\n    // TODO\n  }\n\n  put(key, value) {\n    // TODO\n  }\n}\n"
  },
  "number-of-islands": {
    judge: {
      kind: "function",
      functionName: "numIslands",
      tests: [
        { input: [[["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]]], expected: 1 },
        { input: [[["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]]], expected: 3 }
      ],
      hiddenTests: [
        { input: [[["1"]]], expected: 1 },
        { input: [[["0"]]], expected: 0 }
      ]
    },
    starterCode: "function numIslands(grid) {\n  // TODO\n}\n"
  },
  "kth-largest-element-in-an-array": {
    judge: {
      kind: "function",
      functionName: "findKthLargest",
      tests: [
        { input: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
        { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 }
      ],
      hiddenTests: [
        { input: [[1], 1], expected: 1 },
        { input: [[2, 1], 2], expected: 1 }
      ]
    },
    starterCode: "function findKthLargest(nums, k) {\n  // TODO\n}\n"
  },
  "longest-increasing-subsequence": {
    judge: {
      kind: "function",
      functionName: "lengthOfLIS",
      tests: [
        { input: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
        { input: [[0, 1, 0, 3, 2, 3]], expected: 4 },
        { input: [[7, 7, 7, 7, 7, 7, 7]], expected: 1 }
      ],
      hiddenTests: [
        { input: [[4, 10, 4, 3, 8, 9]], expected: 3 },
        { input: [[1, 3, 6, 7, 9, 4, 10, 5, 6]], expected: 6 }
      ]
    },
    starterCode: "function lengthOfLIS(nums) {\n  // TODO\n}\n"
  },
  "coin-change": {
    judge: {
      kind: "function",
      functionName: "coinChange",
      tests: [
        { input: [[1, 2, 5], 11], expected: 3 },
        { input: [[2], 3], expected: -1 },
        { input: [[1], 0], expected: 0 }
      ],
      hiddenTests: [
        { input: [[1], 2], expected: 2 },
        { input: [[186, 419, 83, 408], 6249], expected: 20 }
      ]
    },
    starterCode: "function coinChange(coins, amount) {\n  // TODO\n}\n"
  },
  "subarray-sum-equals-k": {
    judge: {
      kind: "function",
      functionName: "subarraySum",
      tests: [
        { input: [[1, 1, 1], 2], expected: 2 },
        { input: [[1, 2, 3], 3], expected: 2 }
      ],
      hiddenTests: [
        { input: [[1], 0], expected: 0 },
        { input: [[-1, -1, 1], 0], expected: 1 }
      ]
    },
    starterCode: "function subarraySum(nums, k) {\n  // TODO\n}\n"
  }
};

const catalog = [
  problemSeed(1, "two-sum", "两数之和", "Easy", ["数组", "哈希表"]),
  problemSeed(2, "add-two-numbers", "两数相加", "Medium", ["链表", "数学"]),
  problemSeed(3, "longest-substring-without-repeating-characters", "无重复字符的最长子串", "Medium", ["哈希表", "滑动窗口"]),
  problemSeed(5, "longest-palindromic-substring", "最长回文子串", "Medium", ["字符串", "动态规划"]),
  problemSeed(15, "3sum", "三数之和", "Medium", ["数组", "双指针"]),
  problemSeed(20, "valid-parentheses", "有效的括号", "Easy", ["栈", "字符串"]),
  problemSeed(21, "merge-two-sorted-lists", "合并两个有序链表", "Easy", ["链表", "递归"]),
  problemSeed(46, "permutations", "全排列", "Medium", ["回溯", "数组"]),
  problemSeed(53, "maximum-subarray", "最大子数组和", "Medium", ["动态规划", "分治"]),
  problemSeed(70, "climbing-stairs", "爬楼梯", "Easy", ["动态规划", "数学"]),
  problemSeed(102, "binary-tree-level-order-traversal", "二叉树的层序遍历", "Medium", ["树", "BFS"]),
  problemSeed(121, "best-time-to-buy-and-sell-stock", "买卖股票的最佳时机", "Easy", ["数组", "动态规划"]),
  problemSeed(146, "lru-cache", "LRU 缓存", "Medium", ["设计", "哈希表", "链表"]),
  problemSeed(200, "number-of-islands", "岛屿数量", "Medium", ["DFS", "BFS", "并查集"]),
  problemSeed(206, "reverse-linked-list", "反转链表", "Easy", ["链表", "递归"]),
  problemSeed(215, "kth-largest-element-in-an-array", "数组中的第 K 个最大元素", "Medium", ["堆", "快速选择"]),
  problemSeed(236, "lowest-common-ancestor-of-a-binary-tree", "二叉树的最近公共祖先", "Medium", ["树", "DFS"]),
  problemSeed(300, "longest-increasing-subsequence", "最长递增子序列", "Medium", ["动态规划", "二分查找"]),
  problemSeed(322, "coin-change", "零钱兑换", "Medium", ["动态规划", "BFS"]),
  problemSeed(560, "subarray-sum-equals-k", "和为 K 的子数组", "Medium", ["数组", "前缀和", "哈希表"])
];

function problemSeed(number, slug, title, difficulty, tags) {
  const fixture = JUDGE_FIXTURES[slug] || {};
  return {
    number,
    slug,
    title,
    difficulty,
    tags,
    url: `https://leetcode.cn/problems/${slug}/`,
    judge: fixture.judge || null,
    starterCode: fixture.starterCode || defaultStarterCode(slug)
  };
}

function defaultStarterCode(slug) {
  const name = String(slug || "solve")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[^a-zA-Z_$]+/, "") || "solve";
  const functionName = name.charAt(0).toLowerCase() + name.slice(1);
  return `function ${functionName}() {\n  // TODO: add tests for this problem first.\n}\n`;
}

function now() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaultState() {
  return {
    rooms: {
      "fx-lab-2026": {
        id: "fx-lab-2026",
        title: "冯欣老师课题组招生试题",
        createdAt: now(),
        updatedAt: now(),
        participants: {},
        problems: [
          toRoomProblem(catalog[0], "seed"),
          toRoomProblem(catalog[12], "seed"),
          toRoomProblem(catalog[17], "seed")
        ],
        progress: {},
        submissions: [],
        code: {}
      }
    }
  };
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    const fresh = defaultState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(fresh, null, 2), "utf8");
    return fresh;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (!parsed.rooms) return defaultState();
    for (const room of Object.values(parsed.rooms)) {
      if (!room.code) room.code = {};
      room.problems = (room.problems || []).map(hydrateProblem);
      for (const participant of Object.values(room.participants || {})) {
        participant.online = false;
        participant.activeProblemId = "";
      }
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

let state = loadState();
const sseClients = new Map();
const userConnections = new Map();
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ensureDataDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  }, 120);
}

function getRoom(roomId) {
  const id = cleanRoomId(roomId);
  if (!state.rooms[id]) {
    state.rooms[id] = {
      id,
      title: "冯欣老师课题组招生试题",
      createdAt: now(),
      updatedAt: now(),
      participants: {},
      problems: [],
      progress: {},
      submissions: [],
      code: {}
    };
    scheduleSave();
  }
  return state.rooms[id];
}

function cleanRoomId(value) {
  const raw = String(value || "fx-lab-2026").trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "fx-lab-2026";
}

function safeText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function safeIdentifier(value, fallback = "solve") {
  const text = safeText(value, 80);
  return /^[A-Za-z_$][\w$]*$/.test(text) ? text : fallback;
}

function normalizeDifficulty(value) {
  const normalized = safeText(value, 20).toLowerCase();
  if (["easy", "简单"].includes(normalized)) return "Easy";
  if (["medium", "中等"].includes(normalized)) return "Medium";
  if (["hard", "困难"].includes(normalized)) return "Hard";
  return "Medium";
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((item) => safeText(item, 18)).filter(Boolean).slice(0, 8);
  return safeText(value, 160)
    .split(/[,\s，、/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function jsonSafe(value, max = 12000) {
  const text = JSON.stringify(value);
  if (text.length > max) return null;
  return JSON.parse(text);
}

function normalizeTestCases(value) {
  if (!value) return [];
  let parsed = value;
  if (typeof value === "string") {
    const text = safeText(value, 12000);
    if (!text) return [];
    parsed = JSON.parse(text);
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 30).map((item) => {
    const input = Array.isArray(item.input) ? item.input : [item.input];
    return jsonSafe({ input, expected: item.expected }, 12000);
  }).filter(Boolean);
}

function normalizeJudge(body) {
  const tests = normalizeTestCases(body.testCases);
  if (!tests.length) return null;
  const hiddenTests = normalizeTestCases(body.hiddenTestCases);
  return {
    kind: "function",
    functionName: safeIdentifier(body.functionName, "solve"),
    compare: "exact",
    tests,
    hiddenTests
  };
}

function hydrateProblem(problem) {
  if (!problem || problem.source !== "leetcode") return problem;
  const selected = catalog.find((item) => item.slug === problem.slug || Number(item.number) === Number(problem.number));
  if (!selected) return problem;
  if (!problem.judge && selected.judge) problem.judge = selected.judge;
  if (problem.judge && selected.judge && selected.judge.hiddenTests && !problem.judge.hiddenTests) {
    problem.judge.hiddenTests = selected.judge.hiddenTests;
  }
  if (!problem.starterCode && selected.starterCode) problem.starterCode = selected.starterCode;
  return problem;
}

function publicJudge(judge) {
  if (!judge) return null;
  return {
    ...judge,
    tests: judge.tests || [],
    hiddenTests: undefined,
    hiddenTestCount: (judge.hiddenTests || []).length
  };
}

function publicProblem(problem) {
  return {
    ...problem,
    judge: publicJudge(problem.judge)
  };
}

function toRoomProblem(source, addedBy) {
  return {
    id: uid("p"),
    source: "leetcode",
    title: source.title,
    difficulty: source.difficulty,
    url: source.url,
    number: source.number,
    slug: source.slug,
    tags: source.tags || [],
    statement: "",
    examples: "",
    judge: source.judge || null,
    starterCode: source.starterCode || defaultStarterCode(source.slug),
    addedBy,
    createdAt: now()
  };
}

function parseLeetCodeUrl(input) {
  const text = safeText(input, 300);
  const match = text.match(/leetcode\.(?:cn|com)\/problems\/([^/?#]+)/i);
  if (!match) return {};
  const slug = match[1].toLowerCase();
  return { slug, url: `https://leetcode.cn/problems/${slug}/` };
}

function roomView(room) {
  const participants = Object.values(room.participants || {}).sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), "zh-Hans-CN");
  });
  const problems = [...(room.problems || [])]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(publicProblem);
  const scoreboard = participants.map((participant) => {
    const entries = Object.values((room.progress || {})[participant.id] || {});
    const accepted = entries.filter((entry) => entry.status === "accepted").length;
    const working = entries.filter((entry) => entry.status === "working").length;
    return {
      id: participant.id,
      name: participant.name,
      online: Boolean(participant.online),
      activeProblemId: participant.activeProblemId || "",
      accepted,
      working,
      updatedAt: participant.lastSeen || participant.joinedAt
    };
  }).sort((a, b) => b.accepted - a.accepted || b.working - a.working || a.name.localeCompare(b.name, "zh-Hans-CN"));

  return {
    room: {
      id: room.id,
      title: room.title,
      updatedAt: room.updatedAt
    },
    participants,
    problems,
    progress: room.progress || {},
    submissions: (room.submissions || []).slice(-40).reverse(),
    scoreboard
  };
}

function broadcast(roomId) {
  const room = getRoom(roomId);
  const payload = JSON.stringify(roomView(room));
  for (const client of sseClients.values()) {
    if (client.roomId === room.id) {
      client.res.write(`event: state\n`);
      client.res.write(`data: ${payload}\n\n`);
    }
  }
}

function connectionKey(roomId, userId) {
  return `${roomId}:${userId}`;
}

function attachParticipant(room, userId, name) {
  const displayName = safeText(name, 24) || "匿名同学";
  const existing = room.participants[userId] || {};
  room.participants[userId] = {
    id: userId,
    name: displayName,
    online: true,
    joinedAt: existing.joinedAt || now(),
    lastSeen: now(),
    activeProblemId: existing.activeProblemId || ""
  };
  room.updatedAt = now();
}

function detachParticipant(roomId, userId) {
  const room = getRoom(roomId);
  const key = connectionKey(roomId, userId);
  const count = (userConnections.get(key) || 1) - 1;
  if (count > 0) {
    userConnections.set(key, count);
    return;
  }
  userConnections.delete(key);
  if (room.participants[userId]) {
    room.participants[userId].online = false;
    room.participants[userId].lastSeen = now();
    room.updatedAt = now();
    scheduleSave();
    broadcast(roomId);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function recordSubmission(room, payload) {
  const userId = safeText(payload.userId, 80);
  const problemId = safeText(payload.problemId, 80);
  const result = safeText(payload.result, 20).toUpperCase();
  const participant = room.participants[userId] || { id: userId, name: "匿名同学" };
  const problem = room.problems.find((item) => item.id === problemId);
  const submission = {
    id: uid("s"),
    userId,
    userName: participant.name,
    problemId,
    problemTitle: problem ? problem.title : "未知题目",
    result,
    language: safeText(payload.language, 30) || "JavaScript",
    note: safeText(payload.note, 400),
    testSummary: safeText(payload.testSummary, 1000),
    judgeResult: payload.judgeResult || null,
    code: safeText(payload.code, 100000),
    createdAt: now()
  };
  room.submissions.push(submission);
  if (room.submissions.length > 300) room.submissions = room.submissions.slice(-300);
  if (submission.code) {
    if (!room.code) room.code = {};
    if (!room.code[userId]) room.code[userId] = {};
    room.code[userId][problemId] = submission.code;
  }
  if (!room.progress[userId]) room.progress[userId] = {};
  room.progress[userId][problemId] = {
    problemId,
    status: result === "AC" ? "accepted" : "review",
    language: submission.language,
    note: submission.note || submission.testSummary,
    updatedAt: now()
  };
  if (room.participants[userId]) {
    room.participants[userId].activeProblemId = "";
    room.participants[userId].lastSeen = now();
  }
  room.updatedAt = now();
  return submission;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeLanguage(value) {
  const raw = safeText(value, 30).toLowerCase();
  if (["python", "py", "python3"].includes(raw)) return "python";
  if (["c++", "cpp", "g++"].includes(raw)) return "cpp";
  if (["java", "jave"].includes(raw)) return "java";
  if (["javascript", "js", "node"].includes(raw)) return "javascript";
  return "";
}

function displayLanguage(language) {
  return {
    python: "Python",
    cpp: "C++",
    java: "Java",
    javascript: "JavaScript"
  }[language] || language;
}

function allJudgeTests(judge) {
  return [
    ...(judge.tests || []).map((test) => ({ ...test, hidden: false })),
    ...(judge.hiddenTests || []).map((test) => ({ ...test, hidden: true }))
  ];
}

function summarizeJudge(judgeResult) {
  const publicPassed = judgeResult.cases.filter((item) => item.passed).length;
  const publicTotal = judgeResult.cases.length;
  const hiddenPassed = judgeResult.hidden?.passed || 0;
  const hiddenTotal = judgeResult.hidden?.total || 0;
  return `${publicPassed}/${publicTotal} public, ${hiddenPassed}/${hiddenTotal} hidden`;
}

function limitText(value, max = 4000) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputOverflow = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      shell: false
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs || JUDGE_TIMEOUT_MS);
    const collect = (chunk, target) => {
      const text = chunk.toString();
      if (target === "stdout") stdout += text;
      else stderr += text;
      if (stdout.length + stderr.length > JUDGE_MAX_OUTPUT) {
        outputOverflow = true;
        child.kill("SIGKILL");
      }
    };
    child.stdout.on("data", (chunk) => collect(chunk, "stdout"));
    child.stderr.on("data", (chunk) => collect(chunk, "stderr"));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: error.message, timedOut, outputOverflow, durationMs: Date.now() - started });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, outputOverflow, durationMs: Date.now() - started });
    });
  });
}

async function writeFile(file, content) {
  await fs.promises.writeFile(file, content, "utf8");
}

async function cleanupDir(dir) {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup. Windows may keep files locked briefly after killing a process.
  }
}

async function runDocker(tmpDir, image, command, timeoutMs) {
  const args = [
    "run", "--rm", "--network", "none",
    "--memory", process.env.JUDGE_DOCKER_MEMORY || "256m",
    "--cpus", process.env.JUDGE_DOCKER_CPUS || "0.5",
    "-v", `${tmpDir}:/work`,
    "-w", "/work",
    image,
    "sh", "-lc", command
  ];
  return runCommand(process.env.DOCKER_BIN || "docker", args, { cwd: tmpDir, timeoutMs });
}

async function executeJudgeFiles(language, tmpDir) {
  const timeoutMs = JUDGE_TIMEOUT_MS;
  if (JUDGE_MODE === "docker") {
    if (language === "python") {
      return runDocker(tmpDir, process.env.JUDGE_PYTHON_IMAGE || "python:3.12-alpine", "python3 Main.py", timeoutMs);
    }
    if (language === "javascript") {
      return runDocker(tmpDir, process.env.JUDGE_NODE_IMAGE || "node:24-alpine", "node Main.js", timeoutMs);
    }
    if (language === "cpp") {
      const compileAndRun = "g++ -std=c++17 -O2 -pipe -static -s Main.cpp -o Main && ./Main";
      return runDocker(tmpDir, process.env.JUDGE_CPP_IMAGE || "gcc:13", compileAndRun, timeoutMs + 5000);
    }
    if (language === "java") {
      return runDocker(tmpDir, process.env.JUDGE_JAVA_IMAGE || "eclipse-temurin:21-jdk-alpine", "javac *.java && java Main", timeoutMs + 5000);
    }
  }

  if (language === "python") return runCommand(PYTHON_BIN, ["Main.py"], { cwd: tmpDir, timeoutMs });
  if (language === "javascript") return runCommand(process.execPath, ["Main.js"], { cwd: tmpDir, timeoutMs });
  if (language === "cpp") {
    const exe = process.platform === "win32" ? "Main.exe" : "Main";
    const compile = await runCommand(GPP_BIN, ["-std=c++17", "-O2", "-pipe", "Main.cpp", "-o", exe], { cwd: tmpDir, timeoutMs: timeoutMs + 5000 });
    if (compile.code !== 0 || compile.timedOut || compile.outputOverflow) return { ...compile, compileError: true };
    return runCommand(path.join(tmpDir, exe), [], { cwd: tmpDir, timeoutMs });
  }
  if (language === "java") {
    const files = (await fs.promises.readdir(tmpDir)).filter((file) => file.endsWith(".java"));
    const compile = await runCommand(JAVAC_BIN, files, { cwd: tmpDir, timeoutMs: timeoutMs + 5000 });
    if (compile.code !== 0 || compile.timedOut || compile.outputOverflow) return { ...compile, compileError: true };
    return runCommand(JAVA_BIN, ["-cp", tmpDir, "Main"], { cwd: tmpDir, timeoutMs });
  }
  return { code: -1, stderr: `Unsupported language: ${language}` };
}

async function runServerJudge(problem, language, code) {
  const judge = problem.judge;
  if (!judge) return { ok: false, result: "NOTE", error: "当前题目没有判题配置。", cases: [], hidden: { passed: 0, total: 0 } };
  const tests = allJudgeTests(judge);
  if (!tests.length) return { ok: false, result: "NOTE", error: "当前题目没有测试点。", cases: [], hidden: { passed: 0, total: 0 } };

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fx-judge-"));
  try {
    await writeJudgeFiles(tmpDir, language, code, judge, tests);
    const executed = await executeJudgeFiles(language, tmpDir);
    if (executed.compileError) {
      return {
        ok: false,
        result: "CE",
        error: limitText(executed.stderr || executed.stdout || "Compile Error"),
        cases: [],
        hidden: { passed: 0, total: (judge.hiddenTests || []).length },
        durationMs: executed.durationMs
      };
    }
    if (executed.timedOut) {
      return { ok: false, result: "TLE", error: "运行超时。", cases: [], hidden: { passed: 0, total: (judge.hiddenTests || []).length }, durationMs: executed.durationMs };
    }
    if (executed.outputOverflow) {
      return { ok: false, result: "RE", error: "输出过大，进程已终止。", cases: [], hidden: { passed: 0, total: (judge.hiddenTests || []).length }, durationMs: executed.durationMs };
    }
    const resultFile = path.join(tmpDir, "judge-result.json");
    if (!fs.existsSync(resultFile)) {
      return {
        ok: false,
        result: executed.code === 0 ? "RE" : "RE",
        error: limitText(executed.stderr || executed.stdout || "运行结束但没有产生判题结果。"),
        cases: [],
        hidden: { passed: 0, total: (judge.hiddenTests || []).length },
        durationMs: executed.durationMs
      };
    }
    const raw = JSON.parse(await fs.promises.readFile(resultFile, "utf8"));
    const publicCases = (raw.cases || []).filter((item) => !item.hidden).map((item) => ({
      index: item.index,
      passed: Boolean(item.passed),
      actual: limitText(item.actual, 800),
      expected: limitText(item.expected, 800)
    }));
    const hiddenCases = (raw.cases || []).filter((item) => item.hidden);
    const publicOk = publicCases.every((item) => item.passed);
    const hiddenOk = hiddenCases.every((item) => item.passed);
    const ok = publicOk && hiddenOk;
    return {
      ok,
      result: ok ? "AC" : "WA",
      cases: publicCases,
      hidden: {
        passed: hiddenCases.filter((item) => item.passed).length,
        total: hiddenCases.length
      },
      durationMs: executed.durationMs
    };
  } catch (error) {
    return { ok: false, result: "RE", error: limitText(error && (error.stack || error.message) || String(error)), cases: [], hidden: { passed: 0, total: (judge.hiddenTests || []).length } };
  } finally {
    await cleanupDir(tmpDir);
  }
}

async function writeJudgeFiles(tmpDir, language, code, judge, tests) {
  if (language === "python") {
    await writeFile(path.join(tmpDir, "Main.py"), buildPythonHarness(code, judge, tests));
    return;
  }
  if (language === "javascript") {
    await writeFile(path.join(tmpDir, "Main.js"), buildJavaScriptHarness(code, judge, tests));
    return;
  }
  if (language === "cpp") {
    await writeFile(path.join(tmpDir, "Main.cpp"), buildCppHarness(code, judge, tests));
    return;
  }
  if (language === "java") {
    const entry = judge.kind === "class" ? safeIdentifier(judge.className, "Solution") : "Solution";
    await writeFile(path.join(tmpDir, `${entry}.java`), code);
    await writeFile(path.join(tmpDir, "Main.java"), buildJavaHarness(judge, tests));
    return;
  }
  throw new Error(`不支持的语言：${language}`);
}

function buildPythonHarness(code, judge, tests) {
  const testsLiteral = JSON.stringify(JSON.stringify(tests));
  const entry = judge.kind === "class" ? safeIdentifier(judge.className, "Solution") : safeIdentifier(judge.functionName, "solve");
  return `${code}

import copy as __copy
import json as __json
import traceback as __traceback

__TESTS = __json.loads(${testsLiteral})
__COMPARE = ${JSON.stringify(judge.compare || "exact")}
__ENTRY = ${JSON.stringify(entry)}

def __norm(value, compare):
    if compare == "unorderedFlat" and isinstance(value, list):
        return sorted(value, key=lambda item: __json.dumps(item, sort_keys=True, ensure_ascii=False))
    if compare in ("unorderedDeep", "unorderedRows") and isinstance(value, list):
        rows = []
        for row in value:
            if compare == "unorderedDeep" and isinstance(row, list):
                rows.append(sorted(row, key=lambda item: __json.dumps(item, sort_keys=True, ensure_ascii=False)))
            else:
                rows.append(row)
        return sorted(rows, key=lambda item: __json.dumps(item, sort_keys=True, ensure_ascii=False))
    return value

def __same(actual, expected, compare):
    if compare == "oneOf" and isinstance(expected, list):
        return any(__same(actual, option, "exact") for option in expected)
    return __norm(actual, compare) == __norm(expected, compare)

def __dump(value):
    return __json.dumps(value, ensure_ascii=False, sort_keys=True)

def __run_function():
    fn = globals().get(__ENTRY)
    if not callable(fn):
        raise Exception("未找到提交函数：" + __ENTRY)
    cases = []
    for index, test in enumerate(__TESTS):
        try:
            actual = fn(*__copy.deepcopy(test.get("input", [])))
            passed = __same(actual, test.get("expected"), __COMPARE)
            cases.append({"index": index, "hidden": bool(test.get("hidden")), "passed": bool(passed), "actual": __dump(actual), "expected": __dump(test.get("expected"))})
        except Exception:
            cases.append({"index": index, "hidden": bool(test.get("hidden")), "passed": False, "actual": __traceback.format_exc(), "expected": __dump(test.get("expected"))})
    return cases

def __run_class():
    cls = globals().get(__ENTRY)
    if not callable(cls):
        raise Exception("未找到提交类：" + __ENTRY)
    cases = []
    for index, test in enumerate(__TESTS):
        try:
            obj = None
            actual = []
            for op, args, expected in zip(test.get("operations", []), test.get("args", []), test.get("expected", [])):
                if op == __ENTRY:
                    obj = cls(*__copy.deepcopy(args))
                    actual.append(None)
                elif expected is None:
                    getattr(obj, op)(*__copy.deepcopy(args))
                    actual.append(None)
                else:
                    actual.append(getattr(obj, op)(*__copy.deepcopy(args)))
            passed = __same(actual, test.get("expected"), __COMPARE)
            cases.append({"index": index, "hidden": bool(test.get("hidden")), "passed": bool(passed), "actual": __dump(actual), "expected": __dump(test.get("expected"))})
        except Exception:
            cases.append({"index": index, "hidden": bool(test.get("hidden")), "passed": False, "actual": __traceback.format_exc(), "expected": __dump(test.get("expected"))})
    return cases

__cases = __run_class() if ${JSON.stringify(judge.kind)} == "class" else __run_function()
open("judge-result.json", "w", encoding="utf-8").write(__json.dumps({"cases": __cases}, ensure_ascii=False))
`;
}

function buildJavaScriptHarness(code, judge, tests) {
  const entry = judge.kind === "class" ? safeIdentifier(judge.className, "Solution") : safeIdentifier(judge.functionName, "solve");
  return `${code}

const fs = require("fs");
const __tests = ${JSON.stringify(tests)};
const __compare = ${JSON.stringify(judge.compare || "exact")};
const __entry = ${JSON.stringify(entry)};
const __stringify = (value) => {
  if (typeof value === "undefined") return "undefined";
  try { return JSON.stringify(value); } catch { return String(value); }
};
const __clone = (value) => JSON.parse(JSON.stringify(value));
const __norm = (value, compare) => {
  if (compare === "unorderedFlat" && Array.isArray(value)) return [...value].sort((a, b) => __stringify(a).localeCompare(__stringify(b)));
  if ((compare === "unorderedDeep" || compare === "unorderedRows") && Array.isArray(value)) {
    return value.map((row) => compare === "unorderedDeep" && Array.isArray(row) ? [...row].sort((a, b) => __stringify(a).localeCompare(__stringify(b))) : row)
      .sort((a, b) => __stringify(a).localeCompare(__stringify(b)));
  }
  return value;
};
const __same = (actual, expected, compare) => {
  if (compare === "oneOf" && Array.isArray(expected)) return expected.some((item) => __same(actual, item, "exact"));
  return __stringify(__norm(actual, compare)) === __stringify(__norm(expected, compare));
};
const __load = (name) => {
  try { return eval(name); } catch { return undefined; }
};
const __runFunction = () => {
  const fn = __load(__entry);
  if (typeof fn !== "function") throw new Error("未找到提交函数：" + __entry);
  return __tests.map((test, index) => {
    try {
      const actual = fn(...__clone(test.input || []));
      return { index, hidden: Boolean(test.hidden), passed: __same(actual, test.expected, __compare), actual: __stringify(actual), expected: __stringify(test.expected) };
    } catch (error) {
      return { index, hidden: Boolean(test.hidden), passed: false, actual: error && (error.stack || error.message) || String(error), expected: __stringify(test.expected) };
    }
  });
};
const __runClass = () => {
  const Cls = __load(__entry);
  if (typeof Cls !== "function") throw new Error("未找到提交类：" + __entry);
  return __tests.map((test, index) => {
    try {
      let obj = null;
      const actual = [];
      for (let i = 0; i < test.operations.length; i += 1) {
        const op = test.operations[i];
        const args = __clone((test.args || [])[i] || []);
        const expected = (test.expected || [])[i];
        if (op === __entry) {
          obj = new Cls(...args);
          actual.push(null);
        } else if (expected === null) {
          obj[op](...args);
          actual.push(null);
        } else {
          actual.push(obj[op](...args));
        }
      }
      return { index, hidden: Boolean(test.hidden), passed: __same(actual, test.expected, __compare), actual: __stringify(actual), expected: __stringify(test.expected) };
    } catch (error) {
      return { index, hidden: Boolean(test.hidden), passed: false, actual: error && (error.stack || error.message) || String(error), expected: __stringify(test.expected) };
    }
  });
};
fs.writeFileSync("judge-result.json", JSON.stringify({ cases: ${JSON.stringify(judge.kind)} === "class" ? __runClass() : __runFunction() }));
`;
}

function isArrayType(type) {
  return /^vector<.+>$/.test(type);
}

function innerCppType(type) {
  return type.slice(7, -1);
}

function inferCppTypeFromValues(values) {
  const flat = values.filter((value) => value !== null && typeof value !== "undefined");
  const first = flat[0];
  if (Array.isArray(first)) {
    const children = flat.flatMap((value) => Array.isArray(value) ? value : []);
    return `vector<${inferCppTypeFromValues(children.length ? children : [0])}>`;
  }
  if (typeof first === "string") return "string";
  if (typeof first === "boolean") return "bool";
  if (typeof first === "number" && !Number.isInteger(first)) return "double";
  return "int";
}

function inferJavaTypeFromValues(values) {
  const flat = values.filter((value) => value !== null && typeof value !== "undefined");
  const first = flat[0];
  if (Array.isArray(first)) {
    const children = flat.flatMap((value) => Array.isArray(value) ? value : []);
    return `${inferJavaTypeFromValues(children.length ? children : [0])}[]`;
  }
  if (typeof first === "string") return "String";
  if (typeof first === "boolean") return "boolean";
  if (typeof first === "number" && !Number.isInteger(first)) return "double";
  return "int";
}

function functionArgValues(tests, index) {
  return tests.map((test) => (test.input || [])[index]);
}

function returnValuesForInference(judge, tests) {
  if (judge.compare === "oneOf") return tests.flatMap((test) => Array.isArray(test.expected) ? test.expected : [test.expected]);
  return tests.map((test) => test.expected);
}

function cppString(value) {
  return JSON.stringify(String(value));
}

function cppLiteral(value, type) {
  if (isArrayType(type)) {
    const inner = innerCppType(type);
    const values = Array.isArray(value) ? value : [];
    return `{${values.map((item) => cppLiteral(item, inner)).join(", ")}}`;
  }
  if (type === "string") return cppString(value);
  if (type === "bool") return value ? "true" : "false";
  if (type === "double") return Number(value || 0).toString();
  return String(Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0);
}

function javaString(value) {
  return JSON.stringify(String(value));
}

function javaArrayBase(type) {
  return type.endsWith("[]") ? type.slice(0, -2) : "";
}

function javaLiteral(value, type) {
  if (type.endsWith("[]")) {
    const inner = javaArrayBase(type);
    const values = Array.isArray(value) ? value : [];
    return `new ${type}{${values.map((item) => javaLiteral(item, inner)).join(", ")}}`;
  }
  if (type === "String") return javaString(value);
  if (type === "boolean") return value ? "true" : "false";
  if (type === "double") return Number(value || 0).toString();
  return String(Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0);
}

function buildCppHarness(code, judge, tests) {
  const compare = judge.compare || "exact";
  const publicAndHidden = tests;
  const method = safeIdentifier(judge.functionName, "solve");
  const className = safeIdentifier(judge.className, "Solution");
  const argCount = judge.kind === "function" ? Math.max(0, ...(publicAndHidden.map((test) => (test.input || []).length))) : 0;
  const argTypes = Array.from({ length: argCount }, (_, index) => inferCppTypeFromValues(functionArgValues(publicAndHidden, index)));
  const returnType = inferCppTypeFromValues(returnValuesForInference(judge, publicAndHidden));
  const cases = judge.kind === "class"
    ? buildCppClassCases(className, publicAndHidden)
    : buildCppFunctionCases(method, argTypes, returnType, compare, publicAndHidden);
  return `#include <bits/stdc++.h>
using namespace std;

${code}

static string __escapeJson(const string& s) {
  string out = "\\"";
  for (char c : s) {
    if (c == '\\\\') out += "\\\\\\\\";
    else if (c == '"') out += "\\\\\\"";
    else if (c == '\\n') out += "\\\\n";
    else if (c == '\\r') out += "\\\\r";
    else if (c == '\\t') out += "\\\\t";
    else out += c;
  }
  out += "\\"";
  return out;
}
static string __toJson(const string& v) { return __escapeJson(v); }
static string __toJson(const char* v) { return __escapeJson(string(v)); }
static string __toJson(bool v) { return v ? "true" : "false"; }
static string __toJson(int v) { return to_string(v); }
static string __toJson(long long v) { return to_string(v); }
static string __toJson(double v) { ostringstream os; os << v; return os.str(); }
template <class T> static string __toJson(const vector<T>& v) {
  string out = "[";
  for (size_t i = 0; i < v.size(); ++i) {
    if (i) out += ",";
    out += __toJson(v[i]);
  }
  out += "]";
  return out;
}
template <class T> static void __sortFlat(vector<T>& v) { sort(v.begin(), v.end()); }
template <class T> static void __sortRows(vector<vector<T>>& v) { sort(v.begin(), v.end()); }
template <class T> static void __sortDeep(vector<vector<T>>& v) { for (auto& row : v) sort(row.begin(), row.end()); sort(v.begin(), v.end()); }
static void __appendCase(vector<string>& rows, int index, bool hidden, bool passed, const string& actual, const string& expected) {
  rows.push_back("{\\"index\\":" + to_string(index) + ",\\"hidden\\":" + string(hidden ? "true" : "false") + ",\\"passed\\":" + string(passed ? "true" : "false") + ",\\"actual\\":" + __escapeJson(actual) + ",\\"expected\\":" + __escapeJson(expected) + "}");
}
int main() {
  vector<string> __rows;
  try {
${cases}
  } catch (const exception& e) {
    __appendCase(__rows, 0, false, false, string("Runtime Error: ") + e.what(), "");
  } catch (...) {
    __appendCase(__rows, 0, false, false, "Runtime Error", "");
  }
  ofstream out("judge-result.json");
  out << "{\\"cases\\":[";
  for (size_t i = 0; i < __rows.size(); ++i) { if (i) out << ","; out << __rows[i]; }
  out << "]}";
}
`;
}

function buildCppFunctionCases(method, argTypes, returnType, compare, tests) {
  return tests.map((test, index) => {
    const args = argTypes.map((type, argIndex) => `${type} __a${index}_${argIndex} = ${cppLiteral((test.input || [])[argIndex], type)};`).join("\n    ");
    const callArgs = argTypes.map((_, argIndex) => `__a${index}_${argIndex}`).join(", ");
    if (compare === "oneOf") {
      const optionsType = `vector<${returnType}>`;
      return `    {
    Solution __sol;
    ${args}
    auto __actual = __sol.${method}(${callArgs});
    ${optionsType} __expectedOptions = ${cppLiteral(test.expected, optionsType)};
    bool __passed = false;
    string __actualJson = __toJson(__actual);
    string __expectedJson = __toJson(__expectedOptions);
    for (auto __option : __expectedOptions) if (__toJson(__option) == __actualJson) __passed = true;
    __appendCase(__rows, ${index}, ${test.hidden ? "true" : "false"}, __passed, __actualJson, __expectedJson);
  }`;
    }
    const normalize = compare === "unorderedFlat"
      ? "__sortFlat(__actual); __sortFlat(__expected);"
      : compare === "unorderedDeep"
        ? "__sortDeep(__actual); __sortDeep(__expected);"
        : compare === "unorderedRows"
          ? "__sortRows(__actual); __sortRows(__expected);"
          : "";
    return `    {
    Solution __sol;
    ${args}
    auto __actual = __sol.${method}(${callArgs});
    ${returnType} __expected = ${cppLiteral(test.expected, returnType)};
    ${normalize}
    bool __passed = __toJson(__actual) == __toJson(__expected);
    __appendCase(__rows, ${index}, ${test.hidden ? "true" : "false"}, __passed, __toJson(__actual), __toJson(__expected));
  }`;
  }).join("\n");
}

function buildCppClassCases(className, tests) {
  return tests.map((test, index) => {
    const steps = (test.operations || []).map((op, stepIndex) => {
      const args = (test.args || [])[stepIndex] || [];
      const expected = (test.expected || [])[stepIndex];
      const argTypes = args.map((arg) => inferCppTypeFromValues([arg]));
      const argDecls = argTypes.map((type, argIndex) => `${type} __c${index}_${stepIndex}_${argIndex} = ${cppLiteral(args[argIndex], type)};`).join("\n      ");
      const callArgs = argTypes.map((_, argIndex) => `__c${index}_${stepIndex}_${argIndex}`).join(", ");
      if (op === className) {
        return `${argDecls}
      __obj.reset(new ${className}(${callArgs}));
      __actualParts.push_back("null");`;
      }
      if (expected === null) {
        return `${argDecls}
      __obj->${op}(${callArgs});
      __actualParts.push_back("null");`;
      }
      return `${argDecls}
      __actualParts.push_back(__toJson(__obj->${op}(${callArgs})));`;
    }).join("\n");
    return `    {
    unique_ptr<${className}> __obj;
    vector<string> __actualParts;
${steps}
    string __actual = "[";
    for (size_t i = 0; i < __actualParts.size(); ++i) { if (i) __actual += ","; __actual += __actualParts[i]; }
    __actual += "]";
    string __expected = ${cppString(JSON.stringify(test.expected))};
    __appendCase(__rows, ${index}, ${test.hidden ? "true" : "false"}, __actual == __expected, __actual, __expected);
  }`;
  }).join("\n");
}

function buildJavaHarness(judge, tests) {
  const compare = judge.compare || "exact";
  const method = safeIdentifier(judge.functionName, "solve");
  const className = safeIdentifier(judge.className, "Solution");
  const argCount = judge.kind === "function" ? Math.max(0, ...(tests.map((test) => (test.input || []).length))) : 0;
  const argTypes = Array.from({ length: argCount }, (_, index) => inferJavaTypeFromValues(functionArgValues(tests, index)));
  const returnType = inferJavaTypeFromValues(returnValuesForInference(judge, tests));
  const cases = judge.kind === "class"
    ? buildJavaClassCases(className, tests)
    : buildJavaFunctionCases(method, argTypes, returnType, compare, tests);
  return `import java.util.*;
import java.lang.reflect.*;
import java.nio.file.*;

class Main {
  static String esc(String s) {
    StringBuilder out = new StringBuilder("\\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '\\\\') out.append("\\\\\\\\");
      else if (c == '"') out.append("\\\\\\"");
      else if (c == '\\n') out.append("\\\\n");
      else if (c == '\\r') out.append("\\\\r");
      else if (c == '\\t') out.append("\\\\t");
      else out.append(c);
    }
    return out.append("\\"").toString();
  }
  static Object plain(Object value) {
    if (value == null) return null;
    Class<?> cls = value.getClass();
    if (cls.isArray()) {
      int n = Array.getLength(value);
      List<Object> out = new ArrayList<>();
      for (int i = 0; i < n; i++) out.add(plain(Array.get(value, i)));
      return out;
    }
    if (value instanceof Collection<?>) {
      List<Object> out = new ArrayList<>();
      for (Object item : (Collection<?>) value) out.add(plain(item));
      return out;
    }
    return value;
  }
  static String json(Object value) {
    value = plain(value);
    if (value == null) return "null";
    if (value instanceof String) return esc((String) value);
    if (value instanceof Boolean || value instanceof Number) return String.valueOf(value);
    if (value instanceof List<?>) {
      StringBuilder out = new StringBuilder("[");
      List<?> list = (List<?>) value;
      for (int i = 0; i < list.size(); i++) {
        if (i > 0) out.append(",");
        out.append(json(list.get(i)));
      }
      return out.append("]").toString();
    }
    return esc(String.valueOf(value));
  }
  static Object norm(Object value, String compare) {
    Object plain = plain(value);
    if ("unorderedFlat".equals(compare) && plain instanceof List<?>) {
      List<Object> out = new ArrayList<>((List<Object>) plain);
      out.sort(Comparator.comparing(Main::json));
      return out;
    }
    if (("unorderedDeep".equals(compare) || "unorderedRows".equals(compare)) && plain instanceof List<?>) {
      List<Object> rows = new ArrayList<>();
      for (Object row : (List<?>) plain) {
        if ("unorderedDeep".equals(compare) && row instanceof List<?>) {
          List<Object> sortedRow = new ArrayList<>((List<Object>) row);
          sortedRow.sort(Comparator.comparing(Main::json));
          rows.add(sortedRow);
        } else {
          rows.add(row);
        }
      }
      rows.sort(Comparator.comparing(Main::json));
      return rows;
    }
    return plain;
  }
  static boolean same(Object actual, Object expected, String compare) {
    if ("oneOf".equals(compare)) {
      Object options = plain(expected);
      if (options instanceof List<?>) {
        for (Object option : (List<?>) options) if (same(actual, option, "exact")) return true;
      }
      return false;
    }
    return json(norm(actual, compare)).equals(json(norm(expected, compare)));
  }
  static void add(List<String> rows, int index, boolean hidden, boolean passed, String actual, String expected) {
    rows.add("{\\"index\\":" + index + ",\\"hidden\\":" + hidden + ",\\"passed\\":" + passed + ",\\"actual\\":" + esc(actual) + ",\\"expected\\":" + esc(expected) + "}");
  }
  public static void main(String[] args) throws Exception {
    List<String> rows = new ArrayList<>();
${cases}
    Files.writeString(Path.of("judge-result.json"), "{\\"cases\\":[" + String.join(",", rows) + "]}");
  }
}
`;
}

function buildJavaFunctionCases(method, argTypes, returnType, compare, tests) {
  return tests.map((test, index) => {
    const args = argTypes.map((type, argIndex) => `${type} a${index}_${argIndex} = ${javaLiteral((test.input || [])[argIndex], type)};`).join("\n    ");
    const callArgs = argTypes.map((_, argIndex) => `a${index}_${argIndex}`).join(", ");
    if (compare === "oneOf") {
      const expectedType = `${returnType}[]`;
      return `    {
    Solution sol = new Solution();
    ${args}
    Object actual = sol.${method}(${callArgs});
    Object expected = ${javaLiteral(test.expected, expectedType)};
    add(rows, ${index}, ${test.hidden ? "true" : "false"}, same(actual, expected, ${JSON.stringify(compare)}), json(actual), json(expected));
  }`;
    }
    return `    {
    Solution sol = new Solution();
    ${args}
    Object actual = sol.${method}(${callArgs});
    Object expected = ${javaLiteral(test.expected, returnType)};
    add(rows, ${index}, ${test.hidden ? "true" : "false"}, same(actual, expected, ${JSON.stringify(compare)}), json(actual), json(expected));
  }`;
  }).join("\n");
}

function buildJavaClassCases(className, tests) {
  return tests.map((test, index) => {
    const steps = (test.operations || []).map((op, stepIndex) => {
      const args = (test.args || [])[stepIndex] || [];
      const expected = (test.expected || [])[stepIndex];
      const argTypes = args.map((arg) => inferJavaTypeFromValues([arg]));
      const argDecls = argTypes.map((type, argIndex) => `${type} c${index}_${stepIndex}_${argIndex} = ${javaLiteral(args[argIndex], type)};`).join("\n      ");
      const callArgs = argTypes.map((_, argIndex) => `c${index}_${stepIndex}_${argIndex}`).join(", ");
      if (op === className) {
        return `${argDecls}
      obj = new ${className}(${callArgs});
      actual.add(null);`;
      }
      if (expected === null) {
        return `${argDecls}
      obj.${op}(${callArgs});
      actual.add(null);`;
      }
      return `${argDecls}
      actual.add(obj.${op}(${callArgs}));`;
    }).join("\n");
    return `    {
    ${className} obj = null;
    List<Object> actual = new ArrayList<>();
${steps}
    String expected = ${javaString(JSON.stringify(test.expected))};
    add(rows, ${index}, ${test.hidden ? "true" : "false"}, json(actual).equals(expected), json(actual), expected);
  }`;
  }).join("\n");
}

function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      service: "fx-lab-ac-board",
      uptimeSeconds: Math.round(process.uptime()),
      rooms: Object.keys(state.rooms || {}).length,
      time: now()
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/catalog") {
    sendJson(res, 200, { catalog: catalog.map(publicProblem) });
    return true;
  }

  if (url.pathname === "/events") {
    const roomId = cleanRoomId(url.searchParams.get("room"));
    const userId = safeText(url.searchParams.get("userId"), 80) || uid("u");
    const name = safeText(url.searchParams.get("name"), 24) || "匿名同学";
    const room = getRoom(roomId);
    attachParticipant(room, userId, name);
    const key = connectionKey(roomId, userId);
    userConnections.set(key, (userConnections.get(key) || 0) + 1);
    scheduleSave();

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(`event: state\n`);
    res.write(`data: ${JSON.stringify(roomView(room))}\n\n`);
    const clientId = uid("sse");
    sseClients.set(clientId, { roomId, userId, res });
    broadcast(roomId);

    req.on("close", () => {
      sseClients.delete(clientId);
      detachParticipant(roomId, userId);
    });
    return true;
  }

  const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)(?:\/(.*))?$/);
  if (!roomMatch) return false;

  const roomId = cleanRoomId(roomMatch[1]);
  const tail = roomMatch[2] || "";
  const room = getRoom(roomId);

  if (req.method === "GET" && tail === "") {
    sendJson(res, 200, roomView(room));
    return true;
  }

  if (req.method === "POST" && tail === "presence") {
    readJson(req).then((body) => {
      const userId = safeText(body.userId, 80);
      if (!userId) {
        sendJson(res, 400, { error: "missing userId" });
        return;
      }
      attachParticipant(room, userId, body.name);
      room.participants[userId].activeProblemId = safeText(body.activeProblemId, 80);
      room.updatedAt = now();
      scheduleSave();
      broadcast(roomId);
      sendJson(res, 200, { ok: true });
    }).catch(() => sendJson(res, 400, { error: "invalid json" }));
    return true;
  }

  if (req.method === "POST" && tail === "problems") {
    readJson(req).then((body) => {
      const addedBy = safeText(body.addedBy, 80) || "system";
      let problem;
      if (body.source === "custom") {
        const judge = normalizeJudge(body);
        problem = {
          id: uid("p"),
          source: "custom",
          title: safeText(body.title, 120) || "未命名自定义题",
          difficulty: normalizeDifficulty(body.difficulty),
          url: "",
          number: "",
          slug: "",
          tags: normalizeTags(body.tags),
          statement: safeText(body.statement, 6000),
          examples: safeText(body.examples, 3000),
          judge,
          starterCode: safeText(body.starterCode, 20000) || (judge ? `function ${judge.functionName}() {\n  // TODO\n}\n` : ""),
          addedBy,
          createdAt: now()
        };
      } else {
        const parsed = parseLeetCodeUrl(body.url);
        const selected = catalog.find((item) => item.slug === body.slug || item.slug === parsed.slug);
        problem = selected ? toRoomProblem(selected, addedBy) : {
          id: uid("p"),
          source: "leetcode",
          title: safeText(body.title, 120) || parsed.slug || "LeetCode 题目",
          difficulty: normalizeDifficulty(body.difficulty),
          url: safeText(body.url, 300) || parsed.url || "",
          number: safeText(body.number, 20),
          slug: safeText(body.slug || parsed.slug, 100),
          tags: normalizeTags(body.tags),
          statement: "",
          examples: "",
          judge: normalizeJudge(body),
          starterCode: safeText(body.starterCode, 20000) || defaultStarterCode(body.slug || parsed.slug),
          addedBy,
          createdAt: now()
        };
        if (selected) {
          const overrideJudge = normalizeJudge(body);
          if (overrideJudge) {
            problem.judge = overrideJudge;
            problem.starterCode = safeText(body.starterCode, 20000) || `function ${overrideJudge.functionName}() {\n  // TODO\n}\n`;
          }
        }
      }

      room.problems.push(problem);
      room.updatedAt = now();
      scheduleSave();
      broadcast(roomId);
      sendJson(res, 201, { ok: true, problem: publicProblem(problem) });
    }).catch(() => sendJson(res, 400, { error: "invalid json" }));
    return true;
  }

  const deleteMatch = tail.match(/^problems\/([^/]+)$/);
  if (req.method === "DELETE" && deleteMatch) {
    const problemId = decodeURIComponent(deleteMatch[1]);
    const before = room.problems.length;
    room.problems = room.problems.filter((problem) => problem.id !== problemId);
    for (const userProgress of Object.values(room.progress || {})) delete userProgress[problemId];
    for (const userCode of Object.values(room.code || {})) delete userCode[problemId];
    room.submissions = (room.submissions || []).filter((submission) => submission.problemId !== problemId);
    room.updatedAt = now();
    scheduleSave();
    broadcast(roomId);
    sendJson(res, 200, { ok: true, removed: before - room.problems.length });
    return true;
  }

  if (req.method === "POST" && tail === "progress") {
    readJson(req).then((body) => {
      const userId = safeText(body.userId, 80);
      const problemId = safeText(body.problemId, 80);
      const status = safeText(body.status, 20);
      if (!userId || !problemId || !["todo", "working", "accepted", "review"].includes(status)) {
        sendJson(res, 400, { error: "invalid progress" });
        return;
      }
      if (!room.progress[userId]) room.progress[userId] = {};
      room.progress[userId][problemId] = {
        problemId,
        status,
        language: safeText(body.language, 30),
        note: safeText(body.note, 400),
        updatedAt: now()
      };
      if (room.participants[userId]) {
        room.participants[userId].activeProblemId = status === "working" ? problemId : "";
        room.participants[userId].lastSeen = now();
      }
      room.updatedAt = now();
      scheduleSave();
      broadcast(roomId);
      sendJson(res, 200, { ok: true, progress: room.progress[userId][problemId] });
    }).catch(() => sendJson(res, 400, { error: "invalid json" }));
    return true;
  }

  if (req.method === "POST" && tail === "judge") {
    readJson(req).then(async (body) => {
      const userId = safeText(body.userId, 80);
      const problemId = safeText(body.problemId, 80);
      const language = normalizeLanguage(body.language);
      const code = safeText(body.code, 100000);
      if (!userId || !problemId || !language || !code) {
        sendJson(res, 400, { error: "missing judge payload" });
        return;
      }
      const problem = room.problems.find((item) => item.id === problemId);
      if (!problem) {
        sendJson(res, 404, { error: "problem not found" });
        return;
      }
      if (!problem.judge) {
        sendJson(res, 400, { error: "problem has no judge tests" });
        return;
      }
      if (room.participants[userId]) {
        room.participants[userId].lastSeen = now();
        room.participants[userId].activeProblemId = problemId;
      }
      const judgeResult = await runServerJudge(problem, language, code);
      const submission = recordSubmission(room, {
        userId,
        problemId,
        result: judgeResult.result,
        language: displayLanguage(language),
        note: body.note,
        testSummary: summarizeJudge(judgeResult),
        judgeResult,
        code
      });
      scheduleSave();
      broadcast(roomId);
      sendJson(res, 201, { ok: judgeResult.ok, result: judgeResult.result, judgeResult, submission });
    }).catch((error) => sendJson(res, 400, { error: error.message || "invalid json" }));
    return true;
  }

  if (req.method === "POST" && tail === "submissions") {
    readJson(req).then((body) => {
      const userId = safeText(body.userId, 80);
      const problemId = safeText(body.problemId, 80);
      const result = safeText(body.result, 20).toUpperCase();
      if (!userId || !problemId || !["WA", "TLE", "RE", "CE", "NOTE"].includes(result)) {
        sendJson(res, 400, { error: "invalid submission" });
        return;
      }
      const submission = recordSubmission(room, {
        userId,
        problemId,
        result,
        language: body.language,
        note: body.note,
        testSummary: body.testSummary,
        code: body.code
      });
      scheduleSave();
      broadcast(roomId);
      sendJson(res, 201, { ok: true, submission });
    }).catch(() => sendJson(res, 400, { error: "invalid json" }));
    return true;
  }

  sendJson(res, 404, { error: "not found" });
  return true;
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/") || url.pathname === "/events") {
    if (routeApi(req, res, url)) return;
  }
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }
  serveStatic(req, res, url);
});

function persistNow() {
  if (saveTimer) clearTimeout(saveTimer);
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function shutdown() {
  persistNow();
  process.exit(0);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`冯欣老师课题组招生试题 running at http://localhost:${PORT}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
