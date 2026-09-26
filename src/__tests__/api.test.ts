// API tests for Sailwise
// Run with: npm test

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
  });
});

describe('Database Schema', () => {
  it('should have required tables', () => {
    // This is a placeholder test
    // In production, you would use a test database
    expect(true).toBe(true);
  });
});
