import {
  DEFAULT_NOTIFICATIONS,
  detectTextTriggers,
  normaliseNotifications,
  resolveAlerts,
  type NotificationConfig,
} from '@/lib/notifications';
import { isBigDeal } from '@/lib/big-deals';

const config = (over: Partial<NotificationConfig> = {}): NotificationConfig => ({
  ...DEFAULT_NOTIFICATIONS,
  ...over,
});

describe('normaliseNotifications', () => {
  it('applies defaults for missing values', () => {
    expect(normaliseNotifications(null)).toEqual(DEFAULT_NOTIFICATIONS);
  });
  it('keeps a valid threshold and rejects nonsense', () => {
    expect(normaliseNotifications({ bigDealMinValue: 120000 }).bigDealMinValue).toBe(120000);
    expect(normaliseNotifications({ bigDealMinValue: 0 }).bigDealMinValue).toBe(50000);
    expect(normaliseNotifications({ bigDealMinValue: 'abc' }).bigDealMinValue).toBe(50000);
  });
  it('treats explicit false as off and missing as default', () => {
    expect(normaliseNotifications({ enabled: false }).enabled).toBe(false);
    expect(normaliseNotifications({}).enabled).toBe(true);
  });
});

describe('detectTextTriggers', () => {
  it('flags pricing language', () => {
    expect(detectTextTriggers('What is your best price per unit?').pricingQuestion).toBe(true);
  });
  it('flags escalation language', () => {
    expect(detectTextTriggers('I want to speak to a manager now').escalation).toBe(true);
  });
  it('returns nothing for empty text', () => {
    expect(detectTextTriggers('')).toEqual({ pricingQuestion: false, escalation: false });
    expect(detectTextTriggers(null)).toEqual({ pricingQuestion: false, escalation: false });
  });
});

describe('resolveAlerts', () => {
  it('is silent when disabled', () => {
    expect(resolveAlerts({ config: config({ enabled: false }), value: 999999 }).shouldAlert).toBe(false);
  });
  it('alerts on a big deal over the configured threshold', () => {
    const res = resolveAlerts({ config: config({ bigDealMinValue: 100000 }), value: 150000 });
    expect(res.shouldAlert).toBe(true);
    expect(res.reasons).toContain('Big deal');
  });
  it('does not alert on a deal below the configured threshold', () => {
    expect(resolveAlerts({ config: config({ bigDealMinValue: 100000 }), value: 80000 }).shouldAlert).toBe(false);
  });
  it('honours the per-trigger toggles', () => {
    const res = resolveAlerts({ config: config({ pricingQuestion: false }), text: 'price?' });
    expect(res.shouldAlert).toBe(false);
  });
  it('collects multiple reasons', () => {
    const res = resolveAlerts({
      config: config({ newInquiry: true, bigDealMinValue: 1000 }),
      text: 'please quote 500 units',
      value: 5000,
    });
    expect(res.reasons).toEqual(expect.arrayContaining(['New enquiry', 'Pricing question', 'Big deal']));
  });
});

describe('isBigDeal threshold', () => {
  it('uses the supplied threshold', () => {
    expect(isBigDeal({ stage: 'NEW', priority: null, estimated_order_value: 60000 }, 100000)).toBe(false);
    expect(isBigDeal({ stage: 'NEW', priority: null, estimated_order_value: 60000 }, 50000)).toBe(true);
  });
});
