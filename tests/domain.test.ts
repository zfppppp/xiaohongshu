import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDraft,
  summarizeExperiment,
  compareExperiments,
  parseExperiments,
  buildBrief,
} from '../lib/domain.ts';

const a = {
  name: 'A',
  visitors: 1000,
  buyers: 50,
  orders: 55,
  refunds: 5,
  netRevenue: 200000,
  variableCosts: 185000,
  mediaCost: 3000,
  contentCost: 1500,
};
await test('计算支付买家转化率与订单退款率时使用不同分母', () => {
  const r = summarizeExperiment(a);
  assert.equal(r.conversion, 0.05);
  assert.equal(r.refundRate, 5 / 55);
  assert.equal(r.contribution, 10500);
  assert.equal(r.costPerOrder, 3000 / 55);
});
await test('零曝光或零订单不伪造为零转化或零获客成本', () => {
  const r = summarizeExperiment({
    ...a,
    visitors: 0,
    buyers: 0,
    orders: 0,
    refunds: 0,
    netRevenue: 0,
    variableCosts: 0,
  });
  assert.equal(r.conversion, null);
  assert.equal(r.costPerOrder, null);
  assert.equal(r.contribution, -4500);
});
await test('拒绝退款多于订单、买家多于访问与非有限金额', () => {
  for (const data of [
    { ...a, refunds: 56 },
    { ...a, buyers: 1001 },
    { ...a, mediaCost: NaN },
    { ...a, orders: 2 },
    { ...a, visitors: -1 },
  ])
    assert.throws(() => summarizeExperiment(data));
});
await test('没有确认同口径时不计算两组优劣', () => {
  assert.equal(
    compareExperiments(a, { ...a, name: 'B', buyers: 55 }, false).delta,
    null,
  );
  assert.ok(
    Math.abs(
      compareExperiments(a, { ...a, name: 'B', buyers: 55 }, true).delta! -
        0.005,
    ) < 1e-12,
  );
});
await test('JSON导入必须完整且恰好两组，不把缺失成本补成0', () => {
  assert.equal(
    parseExperiments(JSON.stringify([a, { ...a, name: 'B' }])).length,
    2,
  );
  assert.throws(() => parseExperiments('[{}]'));
  assert.throws(() =>
    parseExperiments(JSON.stringify([{ ...a, contentCost: undefined }, a])),
  );
  assert.throws(() =>
    parseExperiments(JSON.stringify([{ ...a, visitors: '1000' }, a])),
  );
});
await test('缺少实测记录时提醒量化续航和泛化软件承诺', () => {
  const issues = analyzeDraft('续航26小时，所有软件都能流畅运行。', {
    sku: '',
    source: '',
    conditions: '',
    software: '',
  });
  assert.ok(issues.some((x) => x.id === 'battery'));
  assert.ok(issues.some((x) => x.id === 'absolute'));
  assert.ok(issues.some((x) => x.id === 'software'));
});
await test('补足条件只清除字段漏项，不把记录视为事实核验', () => {
  const issues = analyzeDraft('该样机在所列条件下续航10小时。', {
    sku: 'A',
    source: 'https://example.com/test',
    conditions: 'Wi-Fi，150nit，平衡模式，网页浏览',
    software: '浏览器版本1',
  });
  assert.ok(!issues.some((x) => x.id === 'battery'));
  assert.ok(issues.some((x) => x.id === 'manual'));
});
await test('没有来源的简报保留待验证状态，不生成已证实的性能结论', () => {
  const text = buildBrief({
    topic: 'battery',
    audience: '实习通勤',
    sku: '样机A',
    source: '',
    conditions: '',
    software: '',
    draft: '待测',
  });
  assert.match(text, /待补证/);
  assert.match(text, /https:\/\/club.lenovo.com.cn\/thread-9445640/);
});
