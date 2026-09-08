import test from 'node:test';
import assert from 'node:assert/strict';
import * as work from '../lib/workspace.ts';

void test('新项目没有模拟成交或预设研究，副本不共享证据', () => {
  const p = work.newProject('我的选题');
  assert.equal(p.evidence.length, 0);
  assert.equal(p.experiments[0].visitors, '');
  assert.equal(p.isExample, false);
  const example = work.exampleProject();
  const copy = work.copyProject(example);
  copy.evidence[0].summary = '改动';
  assert.notEqual(example.evidence[0].summary, '改动');
  assert.notEqual(copy.id, example.id);
  assert.equal(copy.isExample, false);
  assert.match(copy.dataSource, /模拟/);
});

void test('项目备份往返保留空值与自定义证据，导入副本不覆盖原 ID', () => {
  const p = work.newProject('咖啡内容');
  p.audience = '晨间通勤者';
  const parsed = work.parseBackup(work.serializeBackup([p]));
  assert.equal(parsed[0].audience, '晨间通勤者');
  assert.equal(parsed[0].experiments[1].buyers, '');
  assert.notEqual(work.copyProject(parsed[0]).id, p.id);
  assert.throws(() => work.parseBackup('{"version":1,"projects":[{}]}'));
  const broken = JSON.parse(work.serializeBackup([p]));
  broken.projects[0].experiments[0].visitors = null;
  assert.throws(() => work.parseBackup(JSON.stringify(broken)));
});

void test('复盘空值不当零处理，中文 CSV 支持 BOM 和带逗号名称', () => {
  assert.throws(
    () => work.numericExperiments(work.newProject('空项目').experiments),
    /填写/,
  );
  const csv =
    '\uFEFF组别,商品访问UV,支付买家UV,支付订单,全额退款订单,退款后收入,可变成本,媒体费,制作合作费\r\n"A,常规",100,3,3,0,300,150,10,20\r\nB,200,8,8,1,700,350,20,30';
  const result = work.parseMetricsCsv(csv);
  assert.equal(result[0].name, 'A,常规');
  assert.equal(result[1].visitors, '200');
  assert.throws(() => work.parseMetricsCsv(csv.replace(',700,', ',,')), /填写/);
  assert.throws(() => work.parseMetricsCsv(csv.replace(',100,3,', ',2,3,')));
});

void test('导出只使用选中项目证据，保留待补证与模拟数据标签', () => {
  const p = work.newProject('自定义项目');
  p.evidence = [
    {
      id: 'e1',
      title: '我自己的证据',
      kind: '用户反馈',
      publisher: '访谈',
      date: '2026-09-08',
      url: '',
      summary: '明确的提问',
      boundary: '单次访谈',
      verified: false,
      selected: true,
    },
    {
      id: 'e2',
      title: '不选入',
      kind: '其他',
      publisher: '',
      date: '',
      url: '',
      summary: '不应输出',
      boundary: '',
      verified: false,
      selected: false,
    },
  ];
  const md = work.projectBrief(p);
  assert.match(md, /我自己的证据/);
  assert.doesNotMatch(md, /不应输出|联想社区|续航与通勤/);
  assert.match(md, /待补/);
  assert.match(work.projectReview(work.exampleProject()), /模拟/);
});

void test('不安全 URL 不可点击，备份保留尚未写完的链接草稿', () => {
  assert.equal(work.safeUrl('javascript:alert(1)'), '');
  assert.equal(work.safeUrl('https://example.com'), 'https://example.com/');
  const p = work.newProject('测试');
  const raw = JSON.parse(work.serializeBackup([p]));
  raw.projects[0].evidence = [
    {
      id: 'a',
      title: 'x',
      kind: '其他',
      publisher: '',
      date: '',
      url: 'javascript:alert(1)',
      summary: '',
      boundary: '',
      verified: false,
      selected: true,
    },
  ];
  const imported = work.parseBackup(JSON.stringify(raw));
  assert.equal(work.safeUrl(imported[0].evidence[0].url), '');
  raw.projects[0].source = 'https://';
  assert.equal(work.parseBackup(JSON.stringify(raw))[0].source, 'https://');
});

void test('保存前检测其他标签页的新版本，冲突时不覆盖', () => {
  let raw: string | null = 'other';
  const storage = {
    getItem: () => raw,
    setItem: (_k: string, v: string) => {
      raw = v;
    },
  };
  assert.throws(
    () => work.saveLocal(storage, [work.newProject('mine')], 'old'),
    /其他/,
  );
  assert.equal(raw, 'other');
  const next = work.saveLocal(storage, [], 'other');
  assert.equal(raw, next);
  assert.equal(work.parseBackup(raw!).length, 0);
});

void test('所有接受保存的中间状态能再次读取，拒绝超长 CSV 名称', () => {
  const p = work.newProject('项目');
  p.name = '   ';
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem: (_k: string, v: string) => {
      value = v;
    },
  };
  work.saveLocal(storage, [p], null);
  assert.equal(work.parseBackup(value!)[0].name, '未命名项目');
  const csv =
    '组别,商品访问UV,支付买家UV,支付订单,全额退款订单,退款后收入,可变成本,媒体费,制作合作费\n' +
    'A'.repeat(50001) +
    ',100,3,3,0,300,150,10,20\nB,200,8,8,1,700,350,20,30';
  assert.throws(() => work.parseMetricsCsv(csv), /名称/);
});

void test('中文备份按 UTF-8 字节限制，能保存的备份能重新导入', () => {
  const p = work.newProject('中文');
  p.draft = '字'.repeat(20000);
  p.shots = '字'.repeat(20000);
  const projects = Array.from({ length: 40 }, () => work.copyProject(p));
  const large = work.serializeBackup(projects);
  assert.ok(large.length < 4000000);
  assert.throws(() => work.parseBackup(large), /4 MB/);
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw Error('不应写入');
    },
  };
  assert.throws(() => work.saveLocal(storage, projects, null), /容量/);
  assert.equal(
    work.parseBackup(work.serializeBackup(projects.slice(0, 10))).length,
    10,
  );
});

void test('写入拒绝无法加载的超长字段，CSV 数字不能用前导零绕过限制', () => {
  const p = work.newProject('名称');
  p.name = '长'.repeat(50001);
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw Error('不应写入');
    },
  };
  assert.throws(() => work.saveLocal(storage, [p], null), /字段/);
  const csv =
    '组别,商品访问UV,支付买家UV,支付订单,全额退款订单,退款后收入,可变成本,媒体费,制作合作费\nA,' +
    '0'.repeat(50001) +
    '100,3,3,0,300,150,10,20\nB,200,8,8,1,700,350,20,30';
  assert.throws(() => work.parseMetricsCsv(csv), /数字/);
});
