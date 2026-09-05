import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArgumentError, AuthRequiredError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { getRegistry } from '@jackwener/opencli/registry';
import { __test__ } from './feed.js';

const fixtureDir = dirname(fileURLToPath(import.meta.url));

function wrapHomeFeedHtml(html) {
  if (html.includes('role="feed"')) return html;
  if (html.includes('<main role="main">')) {
    return html.replace('<main role="main">', '<main role="main"><div role="feed">')
      .replace(/<\/main>\s*$/, '</div></main>');
  }
  return `<main role="main"><div role="feed">${html}</div></main>`;
}

function runExtract(html, limit = 10, url = 'https://www.facebook.com/', options = {}) {
  const { wrapFeed = true } = options;
  const onHome = /^https:\/\/www\.facebook\.com\/?(?:\?.*)?$/i.test(url);
  const documentHtml = wrapFeed && onHome ? wrapHomeFeedHtml(html) : html;
  const dom = new JSDOM(documentHtml, { url });
  return Function('window', 'document', `return ${__test__.buildFeedExtractScript(limit)};`)(dom.window, dom.window.document);
}

function runSurface(html, url = 'https://www.facebook.com/') {
  const dom = new JSDOM(html, { url });
  return Function('window', 'document', `return ${__test__.buildSurfaceCheckScript()};`)(dom.window, dom.window.document);
}

function createPage(payload, options = {}) {
  const surface = {
    ready: true,
    landmark: 'role-feed',
    feedFound: true,
    messengerDom: false,
    isMessagesRoute: false,
    onHome: true,
    path: '/',
    hash: '',
    href: 'https://www.facebook.com/',
    ...options.surface,
  };
  const prepare = { status: 'ready', feedFound: true, path: '/', ...options.prepare };

  return {
    goto: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue(undefined),
    tabs: vi.fn().mockResolvedValue(options.tabs ?? []),
    selectTab: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockImplementation((script) => {
      const source = String(script);
      if (source.includes('primaryContainers') || source.includes('wrong_surface') || source.includes('extractPost')) {
        return Promise.resolve(payload);
      }
      if (source.includes('redirecting')) {
        return Promise.resolve(prepare);
      }
      if (source.includes('visibilityState') && source.includes('pagelets')) {
        return Promise.resolve(surface);
      }
      if (source.includes('scrollHeight') || source.includes('scrollTop')) {
        return Promise.resolve(0);
      }
      return Promise.resolve(payload);
    }),
  };
}

describe('facebook feed', () => {
  it('registers the feed command with the existing row contract', () => {
    const cmd = getRegistry().get('facebook/feed');
    expect(cmd).toBeDefined();
    expect(cmd.columns).toEqual(['index', 'author', 'content', 'likes', 'comments', 'shares']);
  });

  it('extracts existing role=article feed rows', () => {
    const payload = runExtract(`
      <main role="main">
        <div role="article">
          <h2><a href="https://www.facebook.com/alice">Alice Example</a></h2>
          <div dir="auto">This is a normal Facebook feed post with enough text to extract.</div>
          <span>All: 12</span>
          <span>3 comments</span>
          <span>2 shares</span>
          <div aria-label="Like"></div><div aria-label="Comment"></div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows).toEqual([{
      index: 1,
      author: 'Alice Example',
      content: 'This is a normal Facebook feed post with enough text to extract.',
      likes: '12',
      comments: '3',
      shares: '2',
    }]);
  });

  it('falls back from empty article nodes to action-bounded feed containers', () => {
    const payload = runExtract(`
      <main role="main">
        <div role="article"></div>
        <section>
          <div>
            <h2><a href="https://www.facebook.com/bob/posts/123">Bob Builder</a></h2>
            <div dir="auto">Fallback post body from a Facebook feed card with empty article text.</div>
            <a href="https://www.facebook.com/bob/posts/123">Permalink</a>
            <span>All: 1.2K</span>
            <span>4 comments</span>
            <span>1 shares</span>
            <div><button aria-label="Like">Like</button><button aria-label="Comment">Comment</button></div>
          </div>
        </section>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows).toEqual([{
      index: 1,
      author: 'Bob Builder',
      content: 'Fallback post body from a Facebook feed card with empty article text.',
      likes: '1.2K',
      comments: '4',
      shares: '1',
    }]);
  });

  it('does not turn suggestions or side chrome action buttons into feed rows', () => {
    const payload = runExtract(`
      <main role="main">
        <aside>
          <h2>People you may know</h2>
          <div dir="auto">Charlie Suggested</div>
          <div dir="auto">Add friend from suggested people card with plenty of text.</div>
          <button aria-label="Like">Like</button>
          <button aria-label="Comment">Comment</button>
        </aside>
        <nav>
          <div dir="auto">Navigation item with a Like button but not a feed post.</div>
          <button aria-label="Like">Like</button>
          <button aria-label="Comment">Comment</button>
        </nav>
      </main>
    `);

    expect(payload.status).toBe('no_rows');
    expect(payload.rows).toEqual([]);
  });

  it('still considers bounded fallback rows when article nodes are suggestion chrome', () => {
    const payload = runExtract(`
      <main role="main">
        <div role="article">
          <h2>People you may know</h2>
          <div dir="auto">Suggested profile card with enough text to look article-like.</div>
          <button aria-label="Like">Like</button>
          <button aria-label="Comment">Comment</button>
        </div>
        <section>
          <div>
            <h2><a href="https://www.facebook.com/dana/posts/456">Dana Poster</a></h2>
            <div dir="auto">Fallback feed post should still be extracted after suggestion articles are filtered.</div>
            <a href="https://www.facebook.com/dana/posts/456">Permalink</a>
            <button aria-label="Like">Like</button>
            <button aria-label="Comment">Comment</button>
          </div>
        </section>
      </main>
    `, 1);

    expect(payload.status).toBe('ok');
    expect(payload.rows).toEqual([{
      index: 1,
      author: 'Dana Poster',
      content: 'Fallback feed post should still be extracted after suggestion articles are filtered.',
      likes: '-',
      comments: '-',
      shares: '-',
    }]);
  });

  it('reports auth pages from the browser extractor', () => {
    const payload = runExtract('<main role="main">Log in to Facebook</main>', 10, 'https://www.facebook.com/login/');
    expect(payload.status).toBe('auth');
    expect(payload.rows).toEqual([]);
  });

  it('validates limit before browser navigation', async () => {
    const page = createPage({ status: 'ok', rows: [] });
    await expect(__test__.command.func(page, { limit: 0 })).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('maps browser envelopes and returns extracted rows', async () => {
    const page = createPage({ session: 'site:facebook', data: { status: 'ok', rows: [{ index: 1, author: 'A', content: 'Body', likes: '-', comments: '-', shares: '-' }] } });

    await expect(__test__.command.func(page, { limit: 1 })).resolves.toEqual([{
      index: 1,
      author: 'A',
      content: 'Body',
      likes: '-',
      comments: '-',
      shares: '-',
    }]);
    expect(page.goto).toHaveBeenCalled();
    expect(String(page.goto.mock.calls[0][0])).toContain('_opencli_feed=');
  });

  it('keeps scrolling when raw article markers reach the limit but valid rows do not (#2195)', async () => {
    const page = {
      evaluate: vi.fn()
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce({ status: 'no_rows', rows: [] })
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce({
          status: 'ok',
          rows: [{ index: 1, author: 'A', content: 'Body', likes: '-', comments: '-', shares: '-' }],
        }),
    };

    await __test__.loadFeedPosts(page, 1);

    expect(page.evaluate).toHaveBeenCalledTimes(4);
    expect(String(page.evaluate.mock.calls[1][0])).toContain('primaryContainers');
  });

  it('maps auth, real empty, parser drift, and malformed payloads to typed errors', async () => {
    await expect(__test__.command.func(createPage({ status: 'auth', rows: [] }), { limit: 1 }))
      .rejects.toBeInstanceOf(AuthRequiredError);
    await expect(__test__.command.func(createPage({ status: 'empty', rows: [] }), { limit: 1 }))
      .rejects.toBeInstanceOf(EmptyResultError);
    await expect(__test__.command.func(createPage({ status: 'no_rows', rows: [], diagnostics: { articleCount: 1, fallbackActionCount: 2, mainTextLength: 500 } }), { limit: 1 }))
      .rejects.toBeInstanceOf(CommandExecutionError);
    await expect(__test__.command.func(createPage({ rows: null }), { limit: 1 }))
      .rejects.toBeInstanceOf(CommandExecutionError);
  });

  // Modern Facebook feed (#2089): no [role="article"], no Like/Comment
  // aria-labels — each post is bounded by its "Actions for this post" menu.
  // NOTE: this fixture encodes the DOM shape described in the issue, not a
  // captured live sample, so live verification is still required.
  it('extracts modern feed posts anchored on the "Actions for this post" menu (#2089)', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/carol">Carol Poster</a></h3>
            <div dir="auto">A modern feed post with no role=article wrapper anywhere on it.</div>
            <a href="https://www.facebook.com/carol/posts/999">2h</a>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/dave">Dave Danger</a></h3>
            <div dir="auto">Second streamed post body that should also be extracted fine.</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.diagnostics.actionMenuCount).toBe(2);
    expect(payload.rows.map((r) => r.author)).toEqual(['Carol Poster', 'Dave Danger']);
    expect(payload.rows[0].content).toContain('modern feed post');
  });

  it('keeps a legitimate author name that contains a 4-digit run (#2089)', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/class2024">Class of 2024</a></h3>
            <div dir="auto">Reunion planning post body long enough to be extracted correctly.</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/other">Someone Else</a></h3>
            <div dir="auto">A second post so the container walk stops before the main landmark.</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);
    expect(payload.rows[0].author).toBe('Class of 2024');
  });

  it('does not emit the whole main landmark as one post on a single-post page (#2089)', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/solo">Solo Poster</a></h3>
            <div dir="auto">The only post on the page — the container must not climb to role=main.</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].author).toBe('Solo Poster');
  });

  it('rejects a digit-bearing decoy author and hidden-char decoy text (#2089)', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/real">Real Human</a></h3>
            <span>​​​</span>
            <div dir="auto">Genuine post content that survives the anti-scrape decoy filtering.</div>
            <div dir="auto">1234567890123</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].author).toBe('Real Human');
    expect(payload.rows[0].content).not.toContain('1234567890123');
  });

  it('extracts authors from the group-scoped user links used by current Facebook', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/groups/123/user/456/">Group Author</a></h3>
            <div dir="auto">A genuine freelance group post with enough useful text to extract.</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows[0].author).toBe('Group Author');
  });

  it('removes combining-grapheme anti-scrape characters from decoy blocks', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div>
            <h3><a role="link" href="https://www.facebook.com/real-author">Real Author</a></h3>
            <div dir="auto">Genuine post content that remains after current Facebook decoys are removed.</div>
            <div dir="auto">a͏ b͏ c͏ d͏ e͏ f͏</div>
            <div aria-label="Actions for this post" role="button"></div>
          </div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows[0].content).toBe('Genuine post content that remains after current Facebook decoys are removed.');
  });

  it('does not let a misleading post menu in people suggestions consume surrounding page chrome', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div dir="auto">Facebook navigation label with enough characters to look like content.</div>
          <section>
            <h2 dir="auto">People you may know</h2>
            <div>
              <div dir="auto">Suggested Person</div>
              <div dir="auto">12 mutual friends</div>
              <button aria-label="Actions for this post"></button>
            </div>
          </section>
          <div dir="auto">Unrelated page text that must never become a feed row.</div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('no_rows');
    expect(payload.rows).toEqual([]);
  });

  it('extracts current post action labels that include the author name', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div dir="auto">Current Facebook post body with enough meaningful text to extract.</div>
          <button aria-label="Actions for this post by Current Author"></button>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows[0].author).toBe('Current Author');
    expect(payload.rows[0].content).toContain('Current Facebook post body');
  });

  it('does not treat current role=article comment nodes as feed posts', () => {
    const payload = runExtract(`
      <main role="main">
        <div role="article">
          <a role="link" href="https://www.facebook.com/commenter?comment_id=abc">Comment Author</a>
          <div dir="auto">A long reply that is a comment, not a top-level Facebook feed post.</div>
          <a href="https://www.facebook.com/author/posts/123?comment_id=abc">12h</a>
          <button aria-label="Like"></button>
        </div>
      </main>
    `);

    expect(payload.status).toBe('no_rows');
    expect(payload.rows).toEqual([]);
  });

  it('keeps walking past a permalink header to include its sibling post body', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <header>
            <h3><a role="link" href="https://www.facebook.com/alice">Alice Poster</a></h3>
            <a href="https://www.facebook.com/alice/posts/123">2h</a>
            <button aria-label="Actions for this post by Alice Poster"></button>
          </header>
          <div dir="auto">The actual post body is a sibling of the header containing the action menu.</div>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows[0].author).toBe('Alice Poster');
    expect(payload.rows[0].content).toBe('The actual post body is a sibling of the header containing the action menu.');
  });

  it('does not emit an authorless suggestion card with long descriptive text', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <div dir="auto">Suggested profile description long enough to resemble genuine post content.</div>
          <button aria-label="Actions for this post"></button>
        </div>
      </main>
    `);

    expect(payload.status).toBe('no_rows');
    expect(payload.rows).toEqual([]);
  });

  it('removes injected random-domain and opaque-token decoy blocks', () => {
    const payload = runExtract(`
      <main role="main">
        <div>
          <h3><a role="link" href="https://www.facebook.com/real-author">Real Author</a></h3>
          <div dir="auto">Genuine post body that should remain readable after decoy filtering.</div>
          <div dir="auto">wA4xvbU.com</div>
          <div dir="auto">8Mt4DKRlTLDjXTjnl4iAP5YS4DzIxQF52c7togr51dUFTo</div>
          <div dir="auto">onspeodSrtt5A12f71: 501aut12gi250s 8liui54P1u0cf 352Mf2617t · Shared with Public</div>
          <button aria-label="Actions for this post by Real Author"></button>
        </div>
      </main>
    `);

    expect(payload.status).toBe('ok');
    expect(payload.rows[0].content).toBe('Genuine post body that should remain readable after decoy filtering.');
  });

  it('ignores Messenger/chat bleed and keeps scoped news-feed posts', () => {
    const html = readFileSync(resolve(fixtureDir, '__fixtures__/feed-messenger-bleed.html'), 'utf8');
    const payload = runExtract(html, 5);

    expect(payload.status).toBe('ok');
    expect(payload.diagnostics.feedFound).toBe(true);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].author).toBe('Real Poster');
    expect(payload.rows[0].content).toContain('genuine news-feed post');
    expect(payload.rows[0].likes).toBe('8');
  });

  it('returns no rows when only embedded chat chrome is visible on home', () => {
    const payload = runExtract(`
      <main role="main">
        <section>
          <div role="article">
            <div dir="auto">Conversation preview that should never become a feed row.</div>
            <div dir="auto">Message sent March 1, 2026</div>
            <div dir="auto">Enter</div>
            <button aria-label="Send">Send</button>
            <button aria-label="Like">Like</button>
          </div>
        </section>
      </main>
    `, 5, 'https://www.facebook.com/', { wrapFeed: false });

    expect(payload.status).toBe('no_feed');
    expect(payload.rows).toEqual([]);
  });

  it('ignores embedded chat columns outside role=feed on facebook.com home', () => {
    const payload = runExtract(`
      <main role="main">
        <section>
          <div role="article">
            <div dir="auto">Teiki Travels email exchange with enough text to resemble a feed post.</div>
            <div dir="auto">Message sent February 26, 2026</div>
            <div dir="auto">Enter</div>
            <button aria-label="Send">Send</button>
            <button aria-label="Like">Like</button>
          </div>
        </section>
        <div role="feed">
          <div role="article">
            <h3><a role="link" href="https://www.facebook.com/real-poster">Real Poster</a></h3>
            <div dir="auto">A genuine news-feed post body long enough to extract cleanly.</div>
            <button aria-label="Actions for this post by Real Poster"></button>
          </div>
        </div>
      </main>
    `, 5, 'https://www.facebook.com/', { wrapFeed: false });

    expect(payload.status).toBe('ok');
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].author).toBe('Real Poster');
  });

  it('refuses messenger routes before extraction', () => {
    const payload = runExtract(`
      <main role="main">
        <div role="feed">
          <div role="article">
            <div dir="auto">Message sent February 26, 2026</div>
            <div dir="auto">Enter</div>
          </div>
        </div>
      </main>
    `, 5, 'https://www.facebook.com/messages/t/123', { wrapFeed: false });

    expect(payload.status).toBe('wrong_surface');
    expect(payload.rows).toEqual([]);
  });

  it('detects messenger-only home surfaces without a feed landmark', () => {
    const payload = runSurface(`
      <main role="main">
        <aside aria-label="Messenger" data-pagelet="ChatTab">
          <a href="https://www.facebook.com/messages/t/123">Teiki Travels</a>
        </aside>
      </main>
    `);

    expect(payload.ready).toBe(false);
    expect(payload.messengerDom).toBe(true);
    expect(payload.feedFound).toBe(false);
  });

  it('navigates to cache-busted facebook.com home and waits for role=feed', async () => {
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ ready: true, feedFound: true, landmark: 'role-feed', messengerDom: false, isMessagesRoute: false, onHome: true, path: '/' }),
    };

    await __test__.ensureNewsFeedSurface(page);
    expect(page.goto).toHaveBeenCalled();
    expect(String(page.goto.mock.calls[0][0])).toContain('_opencli_feed=');
    expect(page.tabs).toBeUndefined();
  });

  // Live smoke (#2453 stack): path=/ but no landmark after ~20s. The old loop
  // re-navigated on every attempt, resetting Facebook's slow hydration under
  // the proxy. Navigate once, then poll the same document until it appears.
  it('navigates once and polls the same document until the feed landmark hydrates', async () => {
    let probes = 0;
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      sleep: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation((script) => {
        const source = String(script);
        if (source.includes('redirecting')) return Promise.resolve({ status: 'ready', actions: [] });
        probes += 1;
        return Promise.resolve(probes < 4
          ? { ready: false, landmark: null, onHome: true, path: '/' }
          : { ready: true, landmark: 'feed-units', onHome: true, path: '/' });
      }),
    };

    let clock = 0;
    const surface = await __test__.ensureNewsFeedSurface(page, {
      timeoutMs: 30000,
      pollMs: 1500,
      now: () => { clock += 1000; return clock; },
    });

    expect(surface.ready).toBe(true);
    expect(surface.landmark).toBe('feed-units');
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(probes).toBe(4);
    expect(page.sleep).toHaveBeenCalledTimes(3);
  });

  it('nudges the SPA via the Home control once when no landmark appears for a while', async () => {
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      sleep: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation((script) => {
        const source = String(script);
        if (source.includes('redirecting')) {
          return Promise.resolve({ status: 'ready', actions: /!landmark && true/.test(source) ? ['click-home'] : [] });
        }
        return Promise.resolve({ ready: false, landmark: null, onHome: true, path: '/' });
      }),
    };

    let clock = 0;
    await __test__.ensureNewsFeedSurface(page, {
      timeoutMs: 12000,
      pollMs: 1000,
      homeClickAfterMs: 3000,
      now: () => { clock += 1000; return clock; },
    });

    const prepareCalls = page.evaluate.mock.calls
      .map(([script]) => String(script))
      .filter((source) => source.includes('redirecting'));
    const homeClickCalls = prepareCalls.filter((source) => /!landmark && true/.test(source));
    expect(prepareCalls.length).toBeGreaterThan(3);
    expect(homeClickCalls).toHaveLength(1);
    // Never re-navigates while polling; a second goto would reset hydration.
    expect(page.goto).toHaveBeenCalledTimes(1);
  });

  it('re-navigates home at most once when the document lands on a messages route', async () => {
    let prepares = 0;
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      sleep: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation((script) => {
        const source = String(script);
        if (source.includes('redirecting')) {
          prepares += 1;
          return Promise.resolve(prepares === 1 ? { status: 'redirecting', actions: ['redirect-home'] } : { status: 'ready', actions: [] });
        }
        return Promise.resolve(prepares >= 2
          ? { ready: true, landmark: 'role-feed', onHome: true, path: '/' }
          : { ready: false, landmark: null, isMessagesRoute: true, path: '/messages/t/1' });
      }),
    };

    const surface = await __test__.ensureNewsFeedSurface(page, { timeoutMs: 10000, pollMs: 1000, now: (() => { let c = 0; return () => (c += 500); })() });
    expect(surface.ready).toBe(true);
    expect(page.goto).toHaveBeenCalledTimes(2);
  });

  it('fails with structural diagnostics when the news-feed surface never becomes ready', async () => {
    const page = createPage({ status: 'ok', rows: [] }, {
      surface: {
        ready: false,
        landmark: null,
        feedFound: false,
        feedUnitCount: 0,
        postMenuCount: 0,
        articleCount: 2,
        messengerDom: true,
        chatChromeCount: 1,
        isMessagesRoute: false,
        path: '/',
        visibilityState: 'hidden',
        readyState: 'complete',
        pagelets: ['LeftRail', 'RightRail', 'ChatTab'],
        dialogs: [],
      },
    });

    const err = await __test__.command.func(page, { limit: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(CommandExecutionError);
    expect(err.message).toMatch(/news-feed surface did not render/);
    expect(err.hint).toContain('landmark=none');
    expect(err.hint).toContain('visibility=hidden');
    expect(err.hint).toContain('pagelets=LeftRail,RightRail,ChatTab');
    expect(err.hint).toContain('chatChrome=1');
  });

  it('does not treat the top-nav Messenger icon as embedded chat chrome', () => {
    const payload = runSurface(`
      <div role="banner">
        <a aria-label="Messenger" href="/messages/"></a>
        <a aria-label="Home" href="/"></a>
      </div>
      <main role="main">
        <div role="feed">
          <div role="article"><div dir="auto">A post long enough to be a real feed entry here.</div></div>
        </div>
      </main>
    `);

    expect(payload.ready).toBe(true);
    expect(payload.landmark).toBe('role-feed');
    expect(payload.messengerDom).toBe(false);
    expect(payload.chatChromeCount).toBe(0);
  });

  it('flags docked chat windows beside the feed as chat chrome without blocking readiness', () => {
    const payload = runSurface(`
      <main role="main">
        <div role="feed"><div role="article"><div dir="auto">Real feed content lives here.</div></div></div>
      </main>
      <div role="complementary">
        <div aria-label="Conversation with Someone">
          <div dir="auto">Message sent February 26, 2026</div>
          <button aria-label="Close chat"></button>
        </div>
      </div>
    `);

    expect(payload.ready).toBe(true);
    expect(payload.messengerDom).toBe(true);
    expect(payload.chatChromeCount).toBeGreaterThan(0);
  });

  it('accepts FeedUnit pagelets as the news-feed landmark when role=feed is absent', () => {
    const payload = runSurface(`
      <main role="main">
        <div data-pagelet="FeedUnit_0">
          <h3><a role="link" href="https://www.facebook.com/alice">Alice</a></h3>
          <div dir="auto">Modern home variant with no role=feed wrapper at all.</div>
          <button aria-label="Actions for this post by Alice"></button>
        </div>
        <div data-pagelet="FeedUnit_1"><div dir="auto">Second unit.</div></div>
      </main>
    `);

    expect(payload.ready).toBe(true);
    expect(payload.landmark).toBe('feed-units');
    expect(payload.feedFound).toBe(false);
    expect(payload.feedUnitCount).toBe(2);
    expect(payload.pagelets).toEqual(['FeedUnit_n']);
  });

  it('accepts per-post action menus as the landmark and ignores menus inside chat chrome', () => {
    const payload = runSurface(`
      <main role="main">
        <div>
          <div dir="auto">A modern post body with enough words to be a real feed entry.</div>
          <button aria-label="Actions for this post by Bob"></button>
        </div>
        <div data-pagelet="ChatTab">
          <button aria-label="Actions for this post by Chat Decoy"></button>
        </div>
      </main>
    `);

    expect(payload.landmark).toBe('post-menus');
    expect(payload.postMenuCount).toBe(1);
    expect(payload.ready).toBe(true);
  });

  it('extracts FeedUnit posts on home without role=feed and skips a docked chat window', () => {
    const payload = runExtract(`
      <main role="main">
        <div data-pagelet="FeedUnit_0">
          <h3><a role="link" href="https://www.facebook.com/alice">Alice Poster</a></h3>
          <div dir="auto">Modern home variant post body that must be extracted with its author.</div>
          <span>All: 4</span>
          <button aria-label="Actions for this post by Alice Poster"></button>
        </div>
      </main>
      <div role="complementary">
        <div aria-label="Conversation with Teiki Travels">
          <div role="article">
            <div dir="auto">Teiki Travels email exchange with enough text to look like a feed post.</div>
            <div dir="auto">Message sent February 26, 2026</div>
            <div dir="auto">Enter</div>
            <button aria-label="Send">Send</button>
            <button aria-label="Like">Like</button>
            <button aria-label="Close chat"></button>
          </div>
        </div>
      </div>
    `, 5, 'https://www.facebook.com/', { wrapFeed: false });

    expect(payload.status).toBe('ok');
    expect(payload.diagnostics.surface.landmark).toBe('feed-units');
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]).toMatchObject({ author: 'Alice Poster', likes: '4' });
    expect(payload.rows[0].content).not.toMatch(/Message sent|Enter|Teiki/);
  });

  it('closes docked chats and dialogs in the prepare step without touching accept buttons', () => {
    const dom = new JSDOM(`
      <main role="main"></main>
      <div role="complementary">
        <div aria-label="Conversation with Someone"><button aria-label="Close chat"></button></div>
      </div>
      <div role="dialog" aria-label="Allow cookies?">
        <button aria-label="Close"></button>
        <button>Allow all cookies</button>
      </div>
    `, { url: 'https://www.facebook.com/' });
    const clicked = [];
    for (const btn of dom.window.document.querySelectorAll('button')) {
      btn.click = () => clicked.push(btn.getAttribute('aria-label') || btn.textContent.trim());
    }

    const result = Function('window', 'document', `return ${__test__.buildPrepareFeedScript({ clickHome: false })};`)(dom.window, dom.window.document);

    expect(result.actions).toEqual(['close-chat', 'close-dialog']);
    expect(clicked).toEqual(['Close chat', 'Close']);
    expect(clicked).not.toContain('Allow all cookies');
  });

  it('clicks the banner Home control only when asked and no landmark exists', () => {
    const html = `
      <div role="banner"><a aria-label="Home" href="/"></a></div>
      <main role="main"><div>nothing yet</div></main>
    `;
    const run = (clickHome) => {
      const dom = new JSDOM(html, { url: 'https://www.facebook.com/' });
      const home = dom.window.document.querySelector('a[aria-label="Home"]');
      let clicks = 0;
      home.click = () => { clicks += 1; };
      const result = Function('window', 'document', `return ${__test__.buildPrepareFeedScript({ clickHome })};`)(dom.window, dom.window.document);
      return { clicks, result };
    };

    expect(run(false).clicks).toBe(0);
    const nudged = run(true);
    expect(nudged.clicks).toBe(1);
    expect(nudged.result.actions).toContain('click-home');
  });

  it('fails fast when the active tab is a Messenger route', async () => {
    const page = createPage({ status: 'ok', rows: [] }, {
      surface: { ready: false, feedFound: false, messengerDom: true, isMessagesRoute: true, path: '/messages/t/123' },
    });

    await expect(__test__.command.func(page, { limit: 1 }))
      .rejects.toThrow(/Messenger\/messages route/);
  });

  it('maps messenger-only extraction payloads to a typed bleed error', async () => {
    const page = createPage({
      status: 'ok',
      rows: [
        { index: 1, author: '', content: 'Message sent February 26, 2026 Enter', likes: '-', comments: '-', shares: '-' },
        { index: 2, author: '', content: 'Teiki Travels email exchange', likes: '-', comments: '-', shares: '-' },
      ],
    });

    await expect(__test__.command.func(page, { limit: 2 }))
      .rejects.toBeInstanceOf(CommandExecutionError);
    await expect(__test__.command.func(page, { limit: 2 }))
      .rejects.toThrow(/Messenger\/chat UI/);
  });

  it('filters messenger bleed rows but keeps valid feed rows when mixed', async () => {
    const page = createPage({
      status: 'ok',
      rows: [
        { index: 1, author: '', content: 'Message sent February 26, 2026 Enter', likes: '-', comments: '-', shares: '-' },
        { index: 2, author: 'Real Poster', content: 'Genuine feed post body', likes: '3', comments: '-', shares: '-' },
      ],
    });

    await expect(__test__.command.func(page, { limit: 2 })).resolves.toEqual([{
      index: 2,
      author: 'Real Poster',
      content: 'Genuine feed post body',
      likes: '3',
      comments: '-',
      shares: '-',
    }]);
  });
});
