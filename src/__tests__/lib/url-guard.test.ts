import { assertPublicHttpUrl, isBlockedAddress } from '@/lib/url-guard';

describe('isBlockedAddress', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['0.0.0.0', 'unspecified'],
    ['10.1.2.3', 'private 10/8'],
    ['172.16.0.1', 'private 172.16/12'],
    ['172.31.255.254', 'private 172.16/12 upper bound'],
    ['192.168.1.1', 'private 192.168/16'],
    ['169.254.169.254', 'link-local / cloud metadata'],
    ['100.64.0.1', 'carrier-grade NAT'],
    ['224.0.0.1', 'multicast'],
    ['::1', 'IPv6 loopback'],
    ['fe80::1', 'IPv6 link-local'],
    ['fd00::1', 'IPv6 unique-local'],
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([['8.8.8.8'], ['93.184.216.34'], ['2606:4700:4700::1111']])(
    'allows public address %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    }
  );
});

describe('assertPublicHttpUrl', () => {
  it('rejects the cloud metadata endpoint', async () => {
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow();
  });

  it('rejects localhost and private hosts', async () => {
    await expect(assertPublicHttpUrl('http://localhost:3000/admin')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://127.0.0.1/')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://10.0.0.5/')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://192.168.0.1/')).rejects.toThrow();
  });

  it('rejects internal-looking hostnames', async () => {
    await expect(assertPublicHttpUrl('http://db.internal/')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://printer.local/')).rejects.toThrow();
  });

  it('rejects non-http(s) schemes and embedded credentials', async () => {
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertPublicHttpUrl('ftp://example.com/x')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://user:pass@93.184.216.34/')).rejects.toThrow();
  });

  it('rejects empty input', async () => {
    await expect(assertPublicHttpUrl(undefined)).rejects.toThrow();
    await expect(assertPublicHttpUrl('')).rejects.toThrow();
  });

  it('accepts a public IP-literal URL', async () => {
    const url = await assertPublicHttpUrl('http://93.184.216.34/path');
    expect(url.hostname).toBe('93.184.216.34');
  });
});
