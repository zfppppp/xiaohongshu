import { evidence, topics, type Topic } from './evidence.ts';

export type BriefInput = {
  topic: Topic;
  audience: string;
  sku: string;
  source: string;
  conditions: string;
  software: string;
  draft: string;
};
export type Issue = {
  id: string;
  title: string;
  detail: string;
  level: 'gap' | 'review';
};
export function analyzeDraft(
  text: string,
  info: Pick<BriefInput, 'sku' | 'source' | 'conditions' | 'software'>,
): Issue[] {
  const issues: Issue[] = [];
  if (!text.trim())
    issues.push({
      id: 'empty',
      title: '请先填写内容草稿',
      detail: '检查只覆盖有限的显式规则，不能替代人工事实核查。',
      level: 'gap',
    });
  if (!info.sku.trim())
    issues.push({
      id: 'sku',
      title: '缺少具体商品配置',
      detail: '补齐型号、处理器、内存等；同系列名称不能代表同一配置。',
      level: 'gap',
    });
  let sourceOK = false;
  try {
    sourceOK = ['http:', 'https:'].includes(new URL(info.source).protocol);
  } catch {}
  if (!sourceOK)
    issues.push({
      id: 'source',
      title: '缺少可追溯的商品证据链接',
      detail:
        '填写 http(s) 测试记录或官方说明地址；通用研究证据不能证明你的商品表现。',
      level: 'gap',
    });
  if (
    /(?:\d+(?:\.\d+)?\s*(?:个?小时|h\b)|全天|一整天)/i.test(text) &&
    (!info.conditions.trim() || !sourceOK)
  )
    issues.push({
      id: 'battery',
      title: '续航承诺需要测试条件',
      detail:
        '补齐负载、亮度、联网、电源模式与记录来源，避免把视频时长当办公续航。',
      level: 'gap',
    });
  if (/所有|绝对|任何|零噪音|百分百|100%|永不|完全静音/.test(text))
    issues.push({
      id: 'absolute',
      title: '检查泛化或绝对化表述',
      detail: '将承诺收窄到已测场景；这只是编辑提示，不是平台规则或法律判定。',
      level: 'review',
    });
  if (/软件|应用|兼容|生产力/.test(text) && !info.software.trim())
    issues.push({
      id: 'software',
      title: '软件结论缺少任务与版本',
      detail: '写出软件、版本、插件和完成的具体任务；AI 标签不等于兼容性证明。',
      level: 'gap',
    });
  if (/静音|噪音|安静/.test(text) && !info.conditions.trim())
    issues.push({
      id: 'noise',
      title: '安静程度需要可比环境',
      detail: '补充负载、背景噪音、测量距离及电源模式，区分感受与仪器读数。',
      level: 'gap',
    });
  issues.push({
    id: 'manual',
    title: '保留人工复核',
    detail:
      '填写了字段不代表内容真实；需确认来源正文与具体 SKU、测试结果一致。',
    level: 'review',
  });
  return issues;
}
export function buildBrief(input: BriefInput): string {
  const t = topics[input.topic];
  const sources = evidence.filter((e) => e.topic === input.topic);
  const safe = (s: string) => s.trim() || '待补证';
  return `# 内容简报｜${t.label}\n\n状态：提案；实测与投放尚待执行。\n\n## 用户与任务\n${safe(input.audience)}\n\n要解决的问题：${t.question}\n\n## 选题判断\n${t.hypothesis}\n\n证据强度：${t.strength}。${t.reason}\n反证：${t.counter}\n\n## 商品证据\n- 配置：${safe(input.sku)}\n- 记录来源：${safe(input.source)}\n- 测试条件：${safe(input.conditions)}\n- 软件与任务：${safe(input.software)}\n\n## 标题方向\n${t.title}\n\n## 拍摄与补证清单\n${t.shots.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## 当前草稿\n${safe(input.draft)}\n\n## 表述检查\n${analyzeDraft(
    input.draft,
    input,
  )
    .map((i) => `- ${i.title}：${i.detail}`)
    .join(
      '\n',
    )}\n\n## 实验设计\n同一 SKU、价格权益、受众、流量来源与统计窗口，对比参数解释与场景实测；先观察商品访问到支付买家转化，再核对退款和贡献。自然内容比较只能提供方向信号，不能证明因果。\n\n## 研究来源\n${sources.map((e) => `- ${e.id} ${e.publisher}｜${e.kind}｜${e.date}\n  ${e.url}\n  限制：${e.boundary}`).join('\n')}\n\n本简报由人工整理的证据与确定性模板生成；不是大模型判断或性能背书。\n`;
}
export type Experiment = {
  name: string;
  visitors: number;
  buyers: number;
  orders: number;
  refunds: number;
  netRevenue: number;
  variableCosts: number;
  mediaCost: number;
  contentCost: number;
};
const counts = ['visitors', 'buyers', 'orders', 'refunds'] as const;
const money = [
  'netRevenue',
  'variableCosts',
  'mediaCost',
  'contentCost',
] as const;
export function summarizeExperiment(x: Experiment) {
  if (typeof x?.name !== 'string' || !x.name.trim())
    throw Error('每组需要名称');
  for (const k of [...counts, ...money])
    if (typeof x[k] !== 'number' || !Number.isFinite(x[k]) || x[k] < 0)
      throw Error(`${x.name}：${k} 必须是非负有限数值，不能缺失`);
  for (const k of counts)
    if (!Number.isSafeInteger(x[k]))
      throw Error(`${x.name}：人数与订单数必须是整数`);
  if (
    x.buyers > x.visitors ||
    x.refunds > x.orders ||
    x.orders < x.buyers ||
    (!x.buyers && x.orders)
  )
    throw Error(`${x.name}：请核对访客、支付买家、支付订单与退款订单的关系`);
  return {
    conversion: x.visitors ? x.buyers / x.visitors : null,
    refundRate: x.orders ? x.refunds / x.orders : null,
    costPerOrder: x.orders ? x.mediaCost / x.orders : null,
    contribution: x.netRevenue - x.variableCosts - x.mediaCost - x.contentCost,
  };
}
export function compareExperiments(
  a: Experiment,
  b: Experiment,
  comparable: boolean,
) {
  const left = summarizeExperiment(a),
    right = summarizeExperiment(b);
  const delta =
    comparable && left.conversion !== null && right.conversion !== null
      ? right.conversion - left.conversion
      : null;
  return {
    left,
    right,
    delta,
    message: !comparable
      ? '先确认同一商品、权益、渠道、归因与统计窗口。'
      : delta === null
        ? '访问数据不足，保留不确定。'
        : '仅为观察差异；自然内容比较不能证明因果，也不自动触发放量。',
  };
}
export function parseExperiments(text: string): Experiment[] {
  if (text.length > 500000) throw Error('文件过大，请限制在 500 KB 以内');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error('JSON 格式有误，请使用示例模板');
  }
  if (!Array.isArray(data) || data.length !== 2)
    throw Error('需要恰好两组实验记录');
  for (const x of data) summarizeExperiment(x);
  if (data[0].name === data[1].name) throw Error('两组名称需要不同');
  return data;
}
export const demoExperiments: Experiment[] = [
  {
    name: 'A · 参数介绍',
    visitors: 1200,
    buyers: 36,
    orders: 38,
    refunds: 6,
    netRevenue: 159968,
    variableCosts: 148600,
    mediaCost: 3000,
    contentCost: 1500,
  },
  {
    name: 'B · 场景实测',
    visitors: 1200,
    buyers: 48,
    orders: 50,
    refunds: 4,
    netRevenue: 229954,
    variableCosts: 214600,
    mediaCost: 3000,
    contentCost: 1500,
  },
];
