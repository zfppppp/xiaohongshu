import {
  compareExperiments,
  tradeoffExperiments,
  summarizeExperiment,
  type Experiment,
  type Issue,
} from './domain.ts';
import { evidence, topics, pilotStages } from './evidence.ts';

export type EvidenceRecord = {
  id: string;
  title: string;
  kind: string;
  publisher: string;
  date: string;
  url: string;
  summary: string;
  boundary: string;
  verified: boolean;
  selected: boolean;
};
export type Metrics = { [K in keyof Experiment]: string };
export type Task = {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
};
export type Project = {
  id: string;
  name: string;
  category: string;
  audience: string;
  goal: string;
  sku: string;
  question: string;
  hypothesis: string;
  counter: string;
  title: string;
  shots: string;
  draft: string;
  conditions: string;
  software: string;
  source: string;
  owner: string;
  due: string;
  evidence: EvidenceRecord[];
  tasks: Task[];
  experiments: Metrics[];
  dataSource: string;
  window: string;
  attribution: string;
  refundWindow: string;
  comparable: boolean;
  decision: string;
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
};
export const metricFields = [
  ['visitors', '商品访问UV', '去重商品访客'],
  ['buyers', '支付买家UV', '去重支付人数'],
  ['orders', '支付订单', '允许一人多单'],
  ['refunds', '全额退款订单', '部分退款计入收入'],
  ['netRevenue', '退款后收入', '已扣全额及部分退款 / 元'],
  ['variableCosts', '可变成本', '商品、平台、履约与售后 / 元'],
  ['mediaCost', '媒体费', '归属于本组的投放费 / 元'],
  ['contentCost', '制作合作费', '归属于本组的制作费 / 元'],
] as const;
export const uid = () => globalThis.crypto.randomUUID();
export function newProject(name: string): Project {
  const now = new Date().toISOString();
  const empty = (name: string): Metrics => ({
    name,
    visitors: '',
    buyers: '',
    orders: '',
    refunds: '',
    netRevenue: '',
    variableCosts: '',
    mediaCost: '',
    contentCost: '',
  });
  return {
    id: uid(),
    name: name.trim() || '未命名项目',
    category: '',
    audience: '',
    goal: '',
    sku: '',
    question: '',
    hypothesis: '',
    counter: '',
    title: '',
    shots: '',
    draft: '',
    conditions: '',
    software: '',
    source: '',
    owner: '',
    due: '',
    evidence: [],
    tasks: [],
    experiments: [empty('A 组'), empty('B 组')],
    dataSource: '',
    window: '',
    attribution: '',
    refundWindow: '',
    comparable: false,
    decision: '',
    isExample: false,
    createdAt: now,
    updatedAt: now,
  };
}
export function copyProject(p: Project): Project {
  return {
    ...structuredClone(p),
    id: uid(),
    isExample: false,
    comparable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export function exampleProject(): Project {
  const p = newProject('通勤轻薄本 · 续航内容企划');
  return {
    ...p,
    id: 'example',
    isExample: true,
    category: '3C 数码 / 轻薄本',
    owner: '运营负责人（示例）',
    audience: topics.battery.audience,
    goal: '先验证场景说明是否帮助用户理解续航；取得同口径数据后再判断经营表现。',
    question: topics.battery.question,
    hypothesis: topics.battery.hypothesis,
    counter: topics.battery.counter,
    title: topics.battery.title,
    shots: topics.battery.shots.join('\n'),
    sku: '待商家选定同一 SKU；本案例未取得样机',
    conditions:
      '待实测：固定亮度、联网、电源模式，记录会议、文档与网页任务时长。',
    draft:
      '带电脑出门的一天，你会开多久视频会议？这次计划按通勤办公任务记录电量变化，同时展示电脑与充电器的合计重量。具体配置、续航结果和适用条件将在实测后补齐。',
    evidence: evidence
      .filter((e) => e.topic === 'battery' || e.kind === '反证')
      .map((e) => ({ ...e, verified: false, selected: true })),
    tasks: pilotStages.map((s) => ({
      id: uid(),
      title: `${s.task} 产出：${s.output}`,
      owner: s.owner,
      due: '',
      done: false,
    })),
    experiments: tradeoffExperiments.map(
      (e) =>
        Object.fromEntries(
          Object.entries(e).map(([k, v]) => [k, String(v)]),
        ) as Metrics,
    ),
    dataSource: '模拟数据：为说明转化上升但贡献下降而构造，非商家实绩',
    window: '模拟：两组各自完整的同长度统计窗口',
    attribution: '模拟：同 SKU、权益与交易链路，按内容归因互斥分组',
    refundWindow: '模拟：两组退款观察窗口均已成熟',
    comparable: true,
    decision:
      '先排查退款原因与费用结构，再决定是否重新制作内容；这组模拟差异不能证明内容导致退款。',
  };
}
export function safeUrl(value: string): string {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : '';
  } catch {
    return '';
  }
}
export function numericExperiments(rows: Metrics[]): Experiment[] {
  if (rows.length !== 2) throw Error('请提供 A、B 两组记录');
  const result = rows.map((row) => {
    if (
      typeof row.name !== 'string' ||
      !row.name.trim() ||
      row.name.length > 100
    )
      throw Error('组别名称应为 1–100 个字符');
    const x = { name: row.name } as Experiment;
    for (const [key, label] of metricFields) {
      if (typeof row[key] !== 'string' || !row[key].trim())
        throw Error(`${row.name}：请填写${label}；无费用时请明确填 0`);
      if (row[key].length > 24 || !/^\d+(\.\d+)?$/.test(row[key].trim()))
        throw Error(`${row.name}：${label}需要非负数字`);
      x[key] = Number(row[key]);
      if (
        !Number.isFinite(x[key]) ||
        (['visitors', 'buyers', 'orders', 'refunds'].includes(key) &&
          !Number.isSafeInteger(x[key]))
      )
        throw Error(`${row.name}：${label}数值无效`);
    }
    summarizeExperiment(x);
    return x;
  });
  if (result[0].name.trim() === result[1].name.trim())
    throw Error('两组名称需要不同');
  return result;
}
export function comparison(p: Project) {
  const rows = numericExperiments(p.experiments);
  const ready =
    p.comparable &&
    [p.dataSource, p.window, p.attribution, p.refundWindow].every((v) =>
      v.trim(),
    );
  return compareExperiments(rows[0], rows[1], Boolean(ready));
}
export function projectIssues(p: Project): Issue[] {
  const gaps: Issue[] = [];
  const gap = (id: string, title: string, detail: string) =>
    gaps.push({ id, title, detail, level: 'gap' });
  if (!p.audience.trim() || !p.question.trim())
    gap(
      'audience',
      '补充目标人群与核心问题',
      '让创作者知道这条内容需要回答谁的什么问题。',
    );
  if (!p.sku.trim())
    gap(
      'sku',
      '补充具体商品或服务',
      '标明版本、配置或规格，避免承诺适用范围不明。',
    );
  const picked = p.evidence.filter((e) => e.selected);
  if (!picked.length)
    gap(
      'evidence',
      '选入至少一条依据',
      '在证据资料中添加来源、发现与适用边界。',
    );
  const unverified = picked.filter((e) => !e.verified);
  if (unverified.length)
    gap(
      'verified',
      `${unverified.length} 条引用待核对`,
      '打开原文或核对原始记录，确认摘要与当前商品相关后再标记。',
    );
  if (!p.draft.trim())
    gap(
      'draft',
      '补充内容草稿',
      '可以先写开场、证据呈现和结尾，再交给创作者细化。',
    );
  if (
    /\d+(\.\d+)?\s*(小时|h\b|%|倍)|全天|静音|噪音|安静/i.test(p.draft) &&
    (!p.conditions.trim() || !safeUrl(p.source))
  )
    gap(
      'claim',
      '效果描述缺少条件或商品记录',
      '补充适用场景、测量方法以及可追溯的商品证据。',
    );
  if (/软件|兼容|生产力/.test(p.draft) && !p.software.trim())
    gap(
      'software',
      '补充软件版本与具体任务',
      '软件结论需要完整版本、插件和实际任务记录。',
    );
  if (/所有|绝对|百分百|100%|永不|零风险|完全静音/.test(p.draft))
    gaps.push({
      id: 'absolute',
      title: '复核泛化表述',
      detail: '将承诺收窄至证据实际覆盖的范围。',
      level: 'review',
    });
  return gaps;
}
const filled = (s: string) => s.trim() || '待补充';
export function projectBrief(p: Project): string {
  const sources = p.evidence.filter((e) => e.selected);
  return `# ${filled(p.title || p.name)}\n\n项目：${p.name}\n${p.isExample ? '完整案例：公开研究与模拟复盘，未执行真实投放。' : '工作简报：内容由项目使用者填写，需人工复核。'}\n\n## 任务\n- 品类：${filled(p.category)}\n- 目标：${filled(p.goal)}\n- 负责人：${filled(p.owner)}\n- 截止日期：${filled(p.due)}\n- 人群：${filled(p.audience)}\n- 问题：${filled(p.question)}\n\n## 内容判断\n${filled(p.hypothesis)}\n\n反证 / 停止条件：${filled(p.counter)}\n\n## 商品与条件\n- 商品：${filled(p.sku)}\n- 商品证据：${filled(p.source)}\n- 测试条件：${filled(p.conditions)}\n- 软件与任务：${filled(p.software)}\n\n## 拍摄与素材清单\n${filled(p.shots)}\n\n## 内容草稿\n${filled(p.draft)}\n\n## 引用证据\n${sources.length ? sources.map((e, i) => `${i + 1}. ${e.title || '未命名证据'}（${e.kind} / ${e.verified ? '使用者已核对' : '待核对'}）\n   来源：${filled(e.publisher)} / ${filled(e.date)}\n   ${e.url || '线下记录：请核对原件'}\n   发现：${filled(e.summary)}\n   边界：${filled(e.boundary)}`).join('\n\n') : '待补证'}\n\n## 执行清单\n${p.tasks.length ? p.tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.title}｜${filled(t.owner)}｜${filled(t.due)}`).join('\n') : '待安排'}\n\n## 编辑检查\n${
    projectIssues(p)
      .map((i) => `- ${i.title}：${i.detail}`)
      .join('\n') || '当前规则未发现漏项。'
  }\n\n以上是有限规则检查，不能代替事实核查或效果验证。\n`;
}
export const percent = (v: number | null) =>
  v === null ? '—' : `${(v * 100).toFixed(2)}%`;
export const money = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        maximumFractionDigits: 2,
      }).format(v);
export function projectReview(p: Project): string {
  const r = comparison(p);
  return `# ${p.name} · 数据复盘\n\n数据来源：${filled(p.dataSource)}\n统计窗口：${filled(p.window)}\n归因口径：${filled(p.attribution)}\n退款窗口：${filled(p.refundWindow)}\n同口径确认：${p.comparable ? '是' : '否'}\n\n## 计算结果\n${p.experiments
    .map((e, i) => {
      const s = i ? r.right : r.left;
      return `- ${e.name}：支付转化 ${percent(s.conversion)}；退款率 ${percent(s.refundRate)}；项目贡献 ${money(s.contribution)}；每千访客贡献 ${money(s.contributionPer1000)}`;
    })
    .join(
      '\n',
    )}\n\nB−A 转化差异：${r.delta === null ? '不计算' : (r.delta * 100).toFixed(2) + ' 个百分点'}\n${r.message}\n\n## 下一步检查\n${r.nextAction.title}\n${r.nextAction.reason}\n${r.nextAction.checks.map((c) => `- ${c}`).join('\n')}\n\n## 我的复盘与决策\n${filled(p.decision)}\n\n## 原始输入\n\`\`\`json\n${JSON.stringify(numericExperiments(p.experiments), null, 2)}\n\`\`\`\n\n贡献 = 退款后收入 − 可变成本 − 媒体费 − 制作合作费，不包含未录入的固定成本和税项，不等于净利润。每千访客贡献按当前窗口摊销，不预测未来收益。结果是观察差异，不构成因果、显著性或自动投放指令。\n`;
}
export function serializeBackup(projects: Project[]): string {
  return JSON.stringify(
    { format: 'brieflab-workspace', version: 1, projects },
    null,
    2,
  );
}
export const byteLength = (text: string) =>
  new TextEncoder().encode(text).byteLength;
export function parseBackup(text: string): Project[] {
  if (byteLength(text) > 4000000) throw Error('备份文件请小于 4 MB');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error('文件不是有效的 JSON 备份');
  }
  if (
    data?.format !== 'brieflab-workspace' ||
    data.version !== 1 ||
    !Array.isArray(data.projects) ||
    data.projects.length > 100
  )
    throw Error('不是受支持的 BriefLab 项目备份');
  const str = (v: unknown): string => {
    if (typeof v !== 'string' || v.length > 50000)
      throw Error('备份字段格式或长度不正确');
    return v;
  };
  const bool = (v: unknown): boolean => {
    if (typeof v !== 'boolean') throw Error('备份状态格式不正确');
    return v;
  };
  const arr = (v: unknown, max: number): unknown[] => {
    if (!Array.isArray(v) || v.length > max)
      throw Error('备份记录数量或格式不正确');
    return v;
  };
  const record = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v))
      throw Error('备份记录格式不正确');
    return v as Record<string, unknown>;
  };
  // Preserve incomplete URL drafts; all clickable links must use safeUrl at render time.
  const url = str;
  const ids = new Set<string>();
  return data.projects.map((value: unknown) => {
    const x = record(value);
    const p = newProject('');
    for (const k of [
      'id',
      'name',
      'category',
      'audience',
      'goal',
      'sku',
      'question',
      'hypothesis',
      'counter',
      'title',
      'shots',
      'draft',
      'conditions',
      'software',
      'owner',
      'due',
      'dataSource',
      'window',
      'attribution',
      'refundWindow',
      'decision',
      'createdAt',
      'updatedAt',
    ] as const)
      p[k] = str(x[k]);
    if (
      !p.id ||
      ids.has(p.id) ||
      !Number.isFinite(Date.parse(p.updatedAt)) ||
      !Number.isFinite(Date.parse(p.createdAt))
    )
      throw Error('项目标识、名称或时间无效');
    p.name = p.name.trim() || '未命名项目';
    ids.add(p.id);
    p.source = url(x.source);
    p.comparable = bool(x.comparable);
    p.isExample = bool(x.isExample);
    p.evidence = arr(x.evidence, 500).map((v) => {
      const e = record(v);
      return {
        id: str(e.id),
        title: str(e.title),
        kind: str(e.kind),
        publisher: str(e.publisher),
        date: str(e.date),
        url: url(e.url),
        summary: str(e.summary),
        boundary: str(e.boundary),
        verified: bool(e.verified),
        selected: bool(e.selected),
      };
    });
    p.tasks = arr(x.tasks, 200).map((v) => {
      const t = record(v);
      return {
        id: str(t.id),
        title: str(t.title),
        owner: str(t.owner),
        due: str(t.due),
        done: bool(t.done),
      };
    });
    for (const items of [p.evidence, p.tasks])
      if (
        new Set(items.map((e) => e.id)).size !== items.length ||
        items.some((e) => !e.id)
      )
        throw Error('子记录标识重复或为空');
    p.experiments = arr(x.experiments, 2).map((v) => {
      const m = record(v);
      return Object.fromEntries(
        ['name', ...metricFields.map((f) => f[0])].map((k) => [k, str(m[k])]),
      ) as Metrics;
    });
    if (p.experiments.length !== 2) throw Error('需要两组复盘表格');
    return p;
  });
}
export function metricsTemplate(): string {
  return (
    '\uFEFF组别,' +
    metricFields.map((f) => f[1]).join(',') +
    '\r\nA 组,,,,,,,,\r\nB 组,,,,,,,,\r\n'
  );
}
export const storageKey = 'brieflab.workspace.v1';
export function saveLocal(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  projects: Project[],
  expected: string | null,
): string {
  if (storage.getItem(storageKey) !== expected)
    throw Error('其他标签页已更新项目。请先导出当前备份，再刷新加载最新版本。');
  const next = serializeBackup(projects);
  if (projects.length > 100 || byteLength(next) > 4000000)
    throw Error('工作空间已达到容量上限，请导出旧项目并删除后继续。');
  parseBackup(next); // A saved workspace must always satisfy its reload contract.
  storage.setItem(storageKey, next);
  return next;
}
export function parseMetricsCsv(text: string): Metrics[] {
  if (text.length > 500000) throw Error('CSV 请小于 500 KB');
  // A small RFC 4180 reader: quoted commas/newlines and escaped quotes are retained.
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw Error('CSV 引号格式错误');
      quoted = true;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell);
      cell = '';
      closed = false;
      if (c !== ',') {
        if (c === '\r' && src[i + 1] === '\n') i++;
        if (row.some((s) => s.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed) throw Error('CSV 引号后包含无效字符');
      cell += c;
    }
  }
  if (quoted) throw Error('CSV 引号未闭合');
  row.push(cell);
  if (row.some((s) => s.trim())) rows.push(row);
  const headers = ['组别', ...metricFields.map((f) => f[1])];
  if (
    rows.length !== 3 ||
    rows[0].join(',') !== headers.join(',') ||
    rows.some((r) => r.length !== 9)
  )
    throw Error('请使用中文 CSV 模板，保留标题行并填写两组数据');
  const keys = ['name', ...metricFields.map((f) => f[0])];
  const result = rows
    .slice(1)
    .map(
      (r) =>
        Object.fromEntries(keys.map((k, i) => [k, r[i].trim()])) as Metrics,
    );
  numericExperiments(result);
  return result;
}
