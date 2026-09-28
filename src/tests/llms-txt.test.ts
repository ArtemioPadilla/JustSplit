import { describe, expect, it } from 'vitest';
import { GET } from '../pages/llms.txt';

/**
 * /llms.txt (plan B7): the "## Pages" section must list the real routes
 * once /landing, /about, /help exist, not just the placeholder "Home" entry
 * from before Track B built anything. Internal links go through withBase()
 * (spec D2) like everywhere else.
 */
describe('/llms.txt lists the real routes (plan B7)', () => {
  it('lists /landing, /about and /help', async () => {
    const res = await GET({} as never);
    const body = await res.text();
    expect(body).toMatch(/\/landing/);
    expect(body).toMatch(/\/about/);
    expect(body).toMatch(/\/help/);
  });
});
