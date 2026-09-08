'use client';
import { useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  FileText,
  FlaskConical,
  Link2,
  Search,
  ShieldCheck,
  TriangleAlert,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  evidence,
  topics,
  topicPriority,
  pilotStages,
  type Topic,
} from '@/lib/evidence';
import {
  analyzeDraft,
  buildBrief,
  compareExperiments,
  demoExperiments,
  tradeoffExperiments,
  parseExperiments,
  type Experiment,
} from '@/lib/domain';
import { useBriefTool } from '@/lib/use-brief-tool';
function download(
  name: string,
  content: string,
  type = 'text/markdown;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const percent = (n: number | null) =>
  n === null ? '—' : `${(n * 100).toFixed(2)}%`;
const money = (n: number | null) =>
  n === null
    ? '—'
    : new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        maximumFractionDigits: 2,
      }).format(n);
const fields: [keyof Omit<Experiment, 'name'>, string, string][] = [
  ['visitors', '商品访问 UV', '去重访客'],
  ['buyers', '支付买家 UV', '去重支付人数'],
  ['orders', '支付订单', '可一人多单'],
  ['refunds', '全额退款订单', '部分退款体现在收入中'],
  ['netRevenue', '退款后收入 / 元', '已扣全额及部分退款'],
  ['variableCosts', '可变成本 / 元', '商品、平台、履约、售后'],
  ['mediaCost', '媒体费 / 元', '对应本组归因'],
  ['contentCost', '制作与合作费 / 元', '本组分摊费用'],
];
export default function Home() {
  const [tab, setTab] = useState('evidence'),
    [topic, setTopic] = useState<Topic>('battery');
  const [audience, setAudience] = useState<string>(topics.battery.audience),
    [sku, setSku] = useState(''),
    [source, setSource] = useState(''),
    [conditions, setConditions] = useState(''),
    [software, setSoftware] = useState('');
  const [draft, setDraft] = useState(
    '这台轻薄本续航26小时，通勤一整天不用带充电器，所有办公软件都能流畅运行。',
  );
  const [experiments, setExperiments] = useState<Experiment[]>(
      demoExperiments.map((x) => ({ ...x })),
    ),
    [comparable, setComparable] = useState(false),
    [error, setError] = useState(''),
    [dataset, setDataset] = useState('模拟演示数据'),
    [notice, setNotice] = useState('');
  const t = topics[topic],
    selected = evidence.filter((e) => e.topic === topic),
    briefInput = { topic, audience, sku, source, conditions, software, draft };
  const issues = analyzeDraft(draft, briefInput),
    gaps = issues.filter((i) => i.level === 'gap').length;
  useBriefTool(briefInput);
  const result = useMemo(() => {
    try {
      return {
        data: compareExperiments(experiments[0], experiments[1], comparable),
        error: '',
      };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  }, [experiments, comparable]);
  function updateExperiment(
    index: number,
    key: (typeof fields)[number][0],
    value: string,
  ) {
    setExperiments((xs) =>
      xs.map((x, i) =>
        i === index
          ? { ...x, [key]: value.trim() === '' ? NaN : Number(value) }
          : x,
      ),
    );
    setDataset('手动编辑 · 未核实来源');
    setComparable(false);
  }
  function loadExample(kind: 'improvement' | 'tradeoff') {
    const data = kind === 'tradeoff' ? tradeoffExperiments : demoExperiments;
    setExperiments(data.map((x) => ({ ...x })));
    setDataset(
      kind === 'tradeoff'
        ? '模拟反例：转化上涨，贡献下降'
        : '模拟示例：观察指标改善',
    );
    setComparable(false);
    setError('');
    setNotice('已载入模拟情景，请确认比较口径后查看下一步检查。');
  }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 500000) throw Error('文件过大，请限制在 500 KB 以内');
      setExperiments(parseExperiments(await file.text()));
      setComparable(false);
      setDataset(`导入：${file.name}`);
      setError('');
      setNotice('已导入两组数据，请重新确认统计口径。');
    } catch (e) {
      setError((e as Error).message);
    }
    event.target.value = '';
  }
  function exportReview() {
    if (!result.data) return;
    const { left, right, delta, message } = result.data;
    download(
      '实验复盘.md',
      `# 内容实验复盘\n\n数据状态：${dataset}\n同口径确认：${comparable ? '是' : '否'}\n\n| 指标 | ${experiments[0].name} | ${experiments[1].name} |\n| --- | --- | --- |\n| 商品访问 UV | ${experiments[0].visitors} | ${experiments[1].visitors} |\n| 支付转化率 | ${percent(left.conversion)} | ${percent(right.conversion)} |\n| 全额退款订单率 | ${percent(left.refundRate)} | ${percent(right.refundRate)} |\n| 单支付订单媒体费 | ${money(left.costPerOrder)} | ${money(right.costPerOrder)} |\n| 项目贡献 | ${money(left.contribution)} | ${money(right.contribution)} |\n\nB-A 支付转化率差异：${delta === null ? '不计算' : (delta * 100).toFixed(2) + ' 个百分点'}\n${message}\n\n贡献=退款后收入-可变成本-媒体费-制作合作费；不包含未录入的固定成本和税项，不等于净利润。退款窗口须完整。\n\n每千商品访客贡献 A / B：${money(left.contributionPer1000)} / ${money(right.contributionPer1000)}。按各组当前窗口费用摊销，用于控制流量规模差异，不是未来放量预测。\n\n## 下一步检查\n${result.data.nextAction.title}\n${result.data.nextAction.reason}\n${result.data.nextAction.checks.map((s) => `- ${s}`).join('\n')}\n以上只提示检查方向，不代表显著性、因果或自动投放指令。\n\n## 输入记录\n${JSON.stringify(experiments, null, 2)}\n`,
    );
    setNotice('已导出复盘。');
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main">
          <span className="brand-icon">
            <FlaskConical size={23} />
          </span>
          <span>
            种草证据台<small>BRIEFLAB / 轻薄本内容决策</small>
          </span>
        </a>
        <div className="top-meta">
          <span className="live-dot" />
          公开研究 · 2026.09.08<span className="author">周枫浦 / 求职项目</span>
        </div>
      </header>
      <main id="main" className="workspace">
        <div className="heading-row">
          <div>
            <p className="eyebrow">从用户问题，到一份有依据的内容简报</p>
            <h1>下一篇内容，先回答什么？</h1>
          </div>
          <div className="scope">
            <span>当前研究</span>
            <Select
              value={topic}
              onValueChange={(v) => {
                if (v) {
                  setTopic(v as Topic);
                  setAudience(topics[v as Topic].audience);
                }
              }}
            >
              <SelectTrigger aria-label="选择研究主题">
                <SelectValue>{t.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(topics).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList className="main-tabs" variant="line">
            <TabsTrigger value="evidence">
              <Search />
              选题证据
            </TabsTrigger>
            <TabsTrigger value="brief">
              <FileText />
              内容简报
            </TabsTrigger>
            <TabsTrigger value="experiment">
              <FlaskConical />
              实验复盘
            </TabsTrigger>
            <TabsTrigger value="research">
              <BookOpen />
              研究与取舍
            </TabsTrigger>
          </TabsList>
          <TabsContent value="evidence">
            <section className="business-brief">
              <div>
                <span className="eyebrow">经营提案 · 待商家验证</span>
                <h2>轻薄本商家，下一轮内容先验证什么？</h2>
                <p>
                  面向能提供样机、商品证据与店铺汇总数据的内容运营：先判断用户疑问，再决定制作与小范围试发的投入。本轮优先验证“续航与通勤”。
                </p>
              </div>
              <a
                className="secondary"
                href="https://github.com/zfppppp/xiaohongshu/blob/main/docs/DECISION.md"
                target="_blank"
                rel="noreferrer"
              >
                查看经营决策说明
                <ArrowUpRight size={16} />
              </a>
            </section>
            <div className="evidence-layout">
              <section>
                <div className="section-top">
                  <h2>问题是怎么被发现的</h2>
                  <span className="subtle">
                    {selected.length} 条相关证据 · 非随机样本
                  </span>
                </div>
                <div className="evidence-stack">
                  {selected.map((e, i) => (
                    <article className="evidence-card" key={e.id}>
                      <div className="card-meta">
                        <span
                          className={`type-tag ${e.kind.startsWith('用户') ? 'user-tag' : ''}`}
                        >
                          {e.kind}
                        </span>
                        <span>
                          {e.id} / {e.publisher}
                        </span>
                        <time>{e.date}</time>
                      </div>
                      <h3>
                        <span className="index-number">0{i + 1}</span>
                        {e.title}
                      </h3>
                      <p>{e.summary}</p>
                      <div className="evidence-bottom">
                        <span>{e.boundary}</span>
                        <a href={e.url} target="_blank" rel="noreferrer">
                          查看原始来源
                          <ArrowUpRight size={15} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <aside className="decision-panel">
                <span className="eyebrow">选题判断 / 可验证假设</span>
                <span className="decision-tag">{t.strength}</span>
                <h2>{t.question}</h2>
                <p>{t.reason}</p>
                <div className="panel-divider" />
                <h3>为什么值得试</h3>
                <p>{t.hypothesis}</p>
                <h3>什么会推翻它</h3>
                <p>{t.counter}</p>
                <button
                  className="primary light-button"
                  onClick={() => setTab('brief')}
                >
                  把证据变成简报
                  <ArrowRight size={18} />
                </button>
                <small>研究证据说明问题存在，不证明具体商品效果。</small>
              </aside>
            </div>
            <section className="white-panel priority-panel">
              <div className="section-top">
                <h2>为什么先做这个选题</h2>
                <span className="subtle">
                  按现有证据排序 · 不是需求热度排名
                </span>
              </div>
              <div className="priority-grid">
                {topicPriority.map((p) => (
                  <article key={p.topic}>
                    <span className="type-tag">{p.order}</span>
                    <h3>{topics[p.topic].label}</h3>
                    <p>{p.reason}</p>
                    <button
                      className="text-button"
                      aria-pressed={topic === p.topic}
                      onClick={() => {
                        setTopic(p.topic);
                        setAudience(topics[p.topic].audience);
                      }}
                    >
                      查看该主题证据
                      <ArrowRight size={14} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <div className="counter-strip">
              <ShieldCheck />
              <div>
                <strong>保留反证，避免把个案变成行业结论</strong>
                <p>
                  {evidence[6].summary} {evidence[6].boundary}
                </p>
              </div>
              <a href={evidence[6].url} target="_blank" rel="noreferrer">
                E07 原文
                <ArrowUpRight size={16} />
              </a>
            </div>
          </TabsContent>
          <TabsContent value="brief">
            <div className="brief-layout">
              <section className="white-panel">
                <div className="section-top">
                  <h2>创作任务</h2>
                  <span className="type-tag">{t.label}</span>
                </div>
                <label>
                  面向谁，解决什么任务
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    具体商品配置
                    <input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="型号 + 处理器 + 内存等"
                    />
                  </label>
                  <label>
                    商品证据链接
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="https://… 测试记录或官方说明"
                      type="url"
                    />
                  </label>
                </div>
                <label>
                  测试条件
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="设备、负载、亮度、联网、电源模式；噪音测试还需距离和环境底噪"
                    rows={2}
                  />
                </label>
                <label>
                  软件、版本与任务
                  <input
                    value={software}
                    onChange={(e) => setSoftware(e.target.value)}
                    placeholder="如：具体版本 + 文件规模 + 插件 + 操作任务"
                  />
                </label>
                <label>
                  内容草稿{' '}
                  <span className="subtle">
                    默认文案为故意含漏项的演示，非真实商品宣传
                  </span>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                  />
                </label>
                <div className="section-top">
                  <h3>表述检查</h3>
                  <span className={gaps ? 'amber-tag' : 'type-tag'}>
                    {gaps} 项待补充
                  </span>
                </div>
                <div className="issues">
                  {issues.map((i) => (
                    <div key={i.id} className={`issue ${i.level}`}>
                      <TriangleAlert size={17} />
                      <div>
                        <strong>{i.title}</strong>
                        <p>{i.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="brief-output white-panel">
                <div className="section-top">
                  <h2>简报预览</h2>
                  <span className="subtle">确定性模板</span>
                </div>
                <div className="brief-paper">
                  <span className="eyebrow">内容方向 / 非效果承诺</span>
                  <h2>{t.title}</h2>
                  <h4>核心判断</h4>
                  <p>{t.hypothesis}</p>
                  <h4>必须拍到的证据</h4>
                  <ol>
                    {t.shots.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <h4>实验怎么做</h4>
                  <p>
                    保持商品与权益一致，对比参数解释与场景实测；观察支付转化、退款及贡献。自然内容表现不等于因果效果。
                  </p>
                  <details className="pilot-plan">
                    <summary>准备、试发与复盘计划</summary>
                    <ol>
                      {pilotStages.map((s) => (
                        <li key={s.when}>
                          <strong>
                            {s.when} · {s.owner}
                          </strong>
                          <p>{s.task}</p>
                          <p>产出：{s.output}</p>
                        </li>
                      ))}
                    </ol>
                    <p>
                      若商家无法提供互斥归因和成熟退款数据，先验证简报效率；此时不计算销售效果。
                    </p>
                  </details>
                  <h4>来源跟着简报走</h4>
                  <div className="source-chips">
                    {selected.map((e) => (
                      <a
                        key={e.id}
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 size={13} />
                        {e.id} {e.kind}
                      </a>
                    ))}
                  </div>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    download('内容简报.md', buildBrief(briefInput));
                    setNotice('已导出带来源与补证项的简报。');
                  }}
                >
                  <Download size={17} />
                  导出完整简报
                </button>
                <p className="subtle">
                  未填写项会保留“待补证”。刷新会清除编辑，请先导出。
                </p>
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="experiment">
            <div className="example-switch">
              <span>选择模拟情景</span>
              <button
                className="secondary"
                onClick={() => loadExample('improvement')}
              >
                观察指标改善
              </button>
              <button
                className="secondary"
                onClick={() => loadExample('tradeoff')}
              >
                转化上涨，贡献下降
              </button>
              <small>用于检查判断逻辑，均非真实投放结果。</small>
            </div>
            <div className="section-top dataset-bar">
              <div>
                <h2>先统一口径，再比较表现</h2>
                <p className="subtle">{dataset} · 默认数字仅展示计算逻辑</p>
              </div>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      '实验数据模板.json',
                      JSON.stringify(demoExperiments, null, 2),
                      'application/json',
                    )
                  }
                >
                  <Download size={16} />
                  下载模板
                </button>
                <label className="secondary upload">
                  <Upload size={16} />
                  导入 JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={importData}
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label="恢复模拟数据"
                  onClick={() => {
                    setExperiments(demoExperiments.map((x) => ({ ...x })));
                    setDataset('模拟演示数据');
                    setComparable(false);
                    setError('');
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="error-banner">
                {error}；原数据已保留。
              </p>
            )}
            <div className="experiment-layout">
              <section className="white-panel">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>输入字段</TableHead>
                      {experiments.map((x, i) => (
                        <TableHead key={i}>
                          <input
                            aria-label={`第${i + 1}组名称`}
                            value={x.name}
                            onChange={(e) => {
                              setExperiments((xs) =>
                                xs.map((y, j) =>
                                  j === i ? { ...y, name: e.target.value } : y,
                                ),
                              );
                              setDataset('手动编辑 · 未核实来源');
                              setComparable(false);
                            }}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map(([key, label, hint]) => (
                      <TableRow key={key}>
                        <TableCell>
                          <strong>{label}</strong>
                          <small>{hint}</small>
                        </TableCell>
                        {experiments.map((x, i) => (
                          <TableCell key={i}>
                            <input
                              type="number"
                              min="0"
                              step={
                                [
                                  'visitors',
                                  'buyers',
                                  'orders',
                                  'refunds',
                                ].includes(key)
                                  ? '1'
                                  : '0.01'
                              }
                              aria-label={`${x.name} ${label}`}
                              value={Number.isFinite(x[key]) ? x[key] : ''}
                              onChange={(e) =>
                                updateExperiment(i, key, e.target.value)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <label className="check-line" htmlFor="comparable">
                  <Checkbox
                    id="comparable"
                    checked={comparable}
                    onCheckedChange={(v) => setComparable(Boolean(v))}
                  />
                  <span>
                    已确认同
                    SKU、权益、同一交易链路和互斥归因，统计及退款观察窗口一致且已成熟
                  </span>
                </label>
                <p className="subtle">
                  两组采用互斥归因。退款后收入已扣退款；可变成本包含退款损失，避免重复扣除。
                </p>
              </section>
              <aside className="white-panel results">
                <div className="section-top">
                  <h2>复盘结果</h2>
                  <span className="type-tag">可复算</span>
                </div>
                {result.error ? (
                  <div role="alert" className="error-banner">
                    {result.error}
                  </div>
                ) : (
                  result.data && (
                    <>
                      <div className="metric-pair">
                        <span>支付买家转化率</span>
                        <div>
                          <strong>
                            {percent(result.data.left.conversion)}
                          </strong>
                          <ArrowRight size={18} />
                          <strong>
                            {percent(result.data.right.conversion)}
                          </strong>
                        </div>
                        <small>A → B / 支付买家 UV ÷ 商品访问 UV</small>
                      </div>
                      <dl className="metrics">
                        <dt>全额退款订单率 A / B</dt>
                        <dd>
                          {percent(result.data.left.refundRate)} /{' '}
                          {percent(result.data.right.refundRate)}
                        </dd>
                        <dt>每笔支付订单媒体费 A / B</dt>
                        <dd>
                          {money(result.data.left.costPerOrder)} /{' '}
                          {money(result.data.right.costPerOrder)}
                        </dd>
                        <dt>项目贡献 A / B</dt>
                        <dd>
                          {money(result.data.left.contribution)} /{' '}
                          {money(result.data.right.contribution)}
                        </dd>
                        <dt>每千商品访客贡献 A / B</dt>
                        <dd>
                          {money(result.data.left.contributionPer1000)} /{' '}
                          {money(result.data.right.contributionPer1000)}
                        </dd>
                      </dl>
                      <div className="interpretation">
                        <strong>
                          {result.data.delta === null
                            ? '暂不比较两组优劣'
                            : `B − A：${(result.data.delta * 100).toFixed(2)} 个百分点`}
                        </strong>
                        <p>{result.data.message}</p>
                      </div>
                      <div className="next-action">
                        <span className="eyebrow">下一步检查</span>
                        <h3>{result.data.nextAction.title}</h3>
                        <p>{result.data.nextAction.reason}</p>
                        <ul>
                          {result.data.nextAction.checks.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <small>
                          依据观察指标生成检查方向；不代表统计显著、因果结论或自动投放指令。
                        </small>
                      </div>
                      <button className="primary" onClick={exportReview}>
                        <Download size={17} />
                        导出复盘与输入记录
                      </button>
                    </>
                  )
                )}
                <details>
                  <summary>查看计算口径</summary>
                  <p>
                    支付转化率 = 支付买家 ÷ 访客。全额退款订单率 = 全额退款订单
                    ÷ 支付订单。项目贡献 = 退款后收入 − 可变成本 − 媒体费 −
                    制作合作费。每千访客贡献 = 项目贡献 ÷ 商品访问 UV ×
                    1000，用于控制流量规模差异；这是当前窗口的费用摊销结果，不是未来放量预测。未包含未录入的税项、人工等固定成本，不等于净利润。零分母显示“—”。
                  </p>
                </details>
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="research">
            <div className="research-layout">
              <section className="white-panel">
                <span className="eyebrow">
                  RESEARCH → DECISION → VALIDATION
                </span>
                <h2>先发现问题，再决定做什么</h2>
                <p>
                  目标用户是准备轻薄本内容的商家与运营。本轮研究使用目的抽样，核验
                  2 篇社区原帖，并参考独立测试、厂商说明、技术边界与监管反证。
                </p>
                <div className="research-stat">
                  <strong>
                    2<span>篇用户原帖</span>
                  </strong>
                  <strong>
                    3<span>个待验证主题</span>
                  </strong>
                  <strong>
                    0<span>项已证明的增长效果</span>
                  </strong>
                </div>
                <h3>为什么没有继续做泛用看板</h3>
                <p>
                  灵犀和蒲公英已覆盖洞察与合作。本项目聚焦“从一个用户问题到一份可执行简报”，把来源、测试条件与复盘口径一起保留。
                </p>
                <h3>如何证明它值得用</h3>
                <p>
                  计划邀请 3
                  位参与者，用文档和工具交叉完成相似任务；记录完成时间、漏项与无依据表述。试点目标是耗时降低
                  20% 且错误不增加。尚未验证，不是产品成绩。
                </p>
                <h3>把提案交到谁手上</h3>
                <div className="execution-list">
                  {pilotStages.map((s) => (
                    <article key={s.when}>
                      <strong>
                        {s.when} · {s.owner}
                      </strong>
                      <p>{s.task}</p>
                      <small>{s.output}</small>
                    </article>
                  ))}
                </div>
                <h3>与个人经历的关系</h3>
                <p>
                  京东轻薄本采销与直播经验帮助理解商品、内容和交易；校园用户调研与产品比赛帮助拆解需求。代码与研究借助
                  AI 工具完成，业务假设和引用需要本人理解并复核。
                </p>
                <a className="secondary inline" href="./research.md" download>
                  <Download size={17} />
                  下载完整调研与产品取舍
                </a>
              </section>
              <aside className="white-panel">
                <h2>边界公开，判断才可检查</h2>
                <ul className="boundary-list">
                  {[
                    '公开社区样本不是小红书用户随机调查。',
                    '个案反馈不代表产品故障率。',
                    '演示数据不是京东或小红书后台数据。',
                    '规则检查不等于事实核查或法务审查。',
                    '自然内容差异不等于因果增量。',
                    '没有用户访谈或实际商业投放结果。',
                  ].map((s) => (
                    <li key={s}>
                      <Check />
                      {s}
                    </li>
                  ))}
                </ul>
                <h3>已有工具与反证</h3>
                {evidence
                  .filter((e) => e.topic === 'all')
                  .map((e) => (
                    <a
                      className="reference-link"
                      href={e.url}
                      key={e.id}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>
                        {e.id} / {e.publisher}
                        <small>{e.title}</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </a>
                  ))}
              </aside>
            </div>
          </TabsContent>
        </Tabs>
        {notice && (
          <output className="notice">
            {notice}
            <button onClick={() => setNotice('')} aria-label="关闭提示">
              ×
            </button>
          </output>
        )}
        <footer>
          <span>BRIEFLAB / 周枫浦</span>
          <span>公开证据可追溯 · 业务效果待验证 · 非小红书官方产品</span>
        </footer>
      </main>
    </div>
  );
}
