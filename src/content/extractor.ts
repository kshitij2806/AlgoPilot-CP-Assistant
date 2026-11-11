import { ProblemData, Example } from '../utils/types';

export interface PlatformExtractor {
  platformName: 'leetcode' | 'codeforces' | 'hackerrank' | 'codechef' | 'geeksforgeeks' | 'generic';
  canExtract(url: string): boolean;
  extract(): Promise<ProblemData>;
}

// Helper: Clean DOM elements to remove noise and save prompt tokens
export function cleanDOMText(element: Element | null): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove noise elements
  const junkSelectors = 'script, style, svg, button, form, noscript, nav, header, footer, iframe, [role="button"], .action-buttons';
  clone.querySelectorAll(junkSelectors).forEach(el => el.remove());

  // Replace line breaks properly
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  clone.querySelectorAll('p, div, li').forEach(block => {
    block.prepend(document.createTextNode(' '));
    block.append(document.createTextNode('\n'));
  });

  const raw = clone.innerText || clone.textContent || '';
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

// ---------------- LeetCode Extractor ----------------
export class LeetCodeExtractor implements PlatformExtractor {
  platformName: 'leetcode' = 'leetcode';

  canExtract(url: string): boolean {
    return url.includes('leetcode.com') || url.includes('leetcode.cn');
  }

  async extract(): Promise<ProblemData> {
    const titleEl = document.querySelector('[data-cy="question-title"]') ||
                    document.querySelector('div[class*="text-title-large"]') ||
                    document.querySelector('.text-title-large') ||
                    document.querySelector('div.flex.items-start a');
    
    let title = titleEl?.textContent?.trim() || document.title.replace('- LeetCode', '').trim();

    // Extract slug from URL
    const match = window.location.pathname.match(/problems\/([a-z0-9\-]+)/i);
    const slug = match ? `lc_${match[1].toLowerCase()}` : undefined;

    // Difficulty
    let difficulty = 'Medium';
    const diffEl = document.querySelector('[class*="text-difficulty-"]') ||
                   document.querySelector('.text-olive, .text-yellow, .text-pink') ||
                   document.querySelector('div[class*="text-easy"], div[class*="text-medium"], div[class*="text-hard"]');
    if (diffEl && diffEl.textContent) {
      difficulty = diffEl.textContent.trim();
    }

    // Problem description content container
    const contentEl = document.querySelector('[data-track-load="description_content"]') ||
                      document.querySelector('div[class*="elfjS"]') ||
                      document.querySelector('.question-content') ||
                      document.querySelector('.content__uFc5');

    const examples: Example[] = [];
    const constraints: string[] = [];
    let description = '';

    if (contentEl) {
      // Extract examples
      const preElements = contentEl.querySelectorAll('pre');
      preElements.forEach((pre, index) => {
        const text = pre.textContent || '';
        const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
        const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);
        const expMatch = text.match(/Explanation:\s*([\s\S]*?)$/i);

        if (inputMatch || outputMatch) {
          examples.push({
            id: index + 1,
            input: inputMatch ? inputMatch[1].trim() : text.trim(),
            output: outputMatch ? outputMatch[1].trim() : '',
            explanation: expMatch ? expMatch[1].trim() : undefined
          });
        }
      });

      // Extract constraints
      const listItems = contentEl.querySelectorAll('ul li');
      listItems.forEach(li => {
        const text = li.textContent?.trim();
        if (text && text.length > 2) {
          constraints.push(text);
        }
      });

      description = cleanDOMText(contentEl);
    } else {
      description = cleanDOMText(document.querySelector('main') || document.body);
    }

    return {
      title,
      slug,
      description: description.slice(0, 3500),
      examples,
      constraints,
      difficulty,
      url: window.location.href,
      platform: 'leetcode',
      timestamp: Date.now()
    };
  }
}

// ---------------- Codeforces Extractor ----------------
export class CodeforcesExtractor implements PlatformExtractor {
  platformName: 'codeforces' = 'codeforces';

  canExtract(url: string): boolean {
    return url.includes('codeforces.com');
  }

  async extract(): Promise<ProblemData> {
    const titleEl = document.querySelector('.problem-statement .title');
    const title = titleEl?.textContent?.trim() || document.title.replace('- Codeforces', '').trim();

    // Slug: cf_158_A
    const cfMatch = window.location.pathname.match(/problem(?:set\/problem|\/contest\/\d+\/problem)?\/(\d+)\/([a-z0-9]+)/i);
    const slug = cfMatch ? `cf_${cfMatch[1]}_${cfMatch[2].toLowerCase()}` : undefined;

    const stmt = document.querySelector('.problem-statement');
    let description = '';
    const examples: Example[] = [];
    const constraints: string[] = [];

    if (stmt) {
      // Time and memory limits
      const timeLimit = document.querySelector('.problem-statement .time-limit')?.textContent?.trim();
      const memoryLimit = document.querySelector('.problem-statement .memory-limit')?.textContent?.trim();
      if (timeLimit) constraints.push(timeLimit);
      if (memoryLimit) constraints.push(memoryLimit);

      // Description text
      const descDiv = stmt.querySelector('div:not(.header):not(.input-specification):not(.output-specification):not(.sample-tests)');
      description = cleanDOMText(descDiv || stmt);

      // Input / Output specifications
      const inputSpec = cleanDOMText(document.querySelector('.input-specification'));
      const outputSpec = cleanDOMText(document.querySelector('.output-specification'));
      if (inputSpec) description += `\n\nInput Specification:\n${inputSpec}`;
      if (outputSpec) description += `\n\nOutput Specification:\n${outputSpec}`;

      // Sample tests
      const sampleInputs = document.querySelectorAll('.sample-test .input pre');
      const sampleOutputs = document.querySelectorAll('.sample-test .output pre');

      sampleInputs.forEach((inEl, idx) => {
        const outEl = sampleOutputs[idx];
        examples.push({
          id: idx + 1,
          input: inEl.textContent?.trim() || '',
          output: outEl?.textContent?.trim() || ''
        });
      });
    }

    return {
      title,
      slug,
      description: (description || cleanDOMText(document.body)).slice(0, 3500),
      examples,
      constraints,
      difficulty: 'Codeforces Round',
      url: window.location.href,
      platform: 'codeforces',
      timestamp: Date.now()
    };
  }
}

// ---------------- HackerRank Extractor ----------------
export class HackerRankExtractor implements PlatformExtractor {
  platformName: 'hackerrank' = 'hackerrank';

  canExtract(url: string): boolean {
    return url.includes('hackerrank.com');
  }

  async extract(): Promise<ProblemData> {
    const titleEl = document.querySelector('h1.ui-heading, .challenge-title, h1.page-label');
    const title = titleEl?.textContent?.trim() || document.title.replace('| HackerRank', '').trim();

    const hrMatch = window.location.pathname.match(/challenges\/([a-z0-9\-]+)/i);
    const slug = hrMatch ? `hr_${hrMatch[1].toLowerCase()}` : undefined;

    const diffEl = document.querySelector('.difficulty-badge, span.difficulty-label');
    const difficulty = diffEl?.textContent?.trim() || 'Medium';

    const contentEl = document.querySelector('.challenge-body-html, .problem-statement, .challenge-text');
    let description = '';
    const examples: Example[] = [];
    const constraints: string[] = [];

    if (contentEl) {
      description = cleanDOMText(contentEl);
      const pres = contentEl.querySelectorAll('pre');
      for (let i = 0; i < pres.length; i += 2) {
        examples.push({
          id: Math.floor(i / 2) + 1,
          input: pres[i]?.textContent?.trim() || '',
          output: pres[i + 1]?.textContent?.trim() || ''
        });
      }
    }

    return {
      title,
      slug,
      description: (description || cleanDOMText(document.body)).slice(0, 3500),
      examples,
      constraints,
      difficulty,
      url: window.location.href,
      platform: 'hackerrank',
      timestamp: Date.now()
    };
  }
}

// ---------------- CodeChef Extractor ----------------
export class CodeChefExtractor implements PlatformExtractor {
  platformName: 'codechef' = 'codechef';

  canExtract(url: string): boolean {
    return url.includes('codechef.com');
  }

  async extract(): Promise<ProblemData> {
    const titleEl = document.querySelector('#problem-statement h1, h1._title, div[class*="problem-title"]');
    const title = titleEl?.textContent?.trim() || document.title.replace('| CodeChef', '').trim();

    const ccMatch = window.location.pathname.match(/problems\/([a-z0-9\-]+)/i);
    const slug = ccMatch ? `cc_${ccMatch[1].toLowerCase()}` : undefined;

    const contentEl = document.querySelector('#problem-statement, div[class*="ProblemStatement"], .problem-statement');
    const description = cleanDOMText(contentEl) || cleanDOMText(document.body);

    const examples: Example[] = [];
    const constraints: string[] = [];

    if (contentEl) {
      const pres = contentEl.querySelectorAll('pre');
      pres.forEach((pre, idx) => {
        examples.push({
          id: idx + 1,
          input: pre.textContent?.trim() || '',
          output: ''
        });
      });
    }

    return {
      title,
      slug,
      description: description.slice(0, 3500),
      examples,
      constraints,
      difficulty: 'CodeChef Contest',
      url: window.location.href,
      platform: 'codechef',
      timestamp: Date.now()
    };
  }
}

// ---------------- GeeksforGeeks Extractor ----------------
export class GeeksForGeeksExtractor implements PlatformExtractor {
  platformName: 'geeksforgeeks' = 'geeksforgeeks';

  canExtract(url: string): boolean {
    return url.includes('geeksforgeeks.org');
  }

  async extract(): Promise<ProblemData> {
    const titleEl = document.querySelector('.problems_header_content__h1__, .problems_header_content__title__, h3');
    const title = titleEl?.textContent?.trim() || document.title.replace('| Practice | GeeksforGeeks', '').trim();

    const gfgMatch = window.location.pathname.match(/problems\/([a-z0-9\-]+)/i);
    const slug = gfgMatch ? `gfg_${gfgMatch[1].toLowerCase()}` : undefined;

    const diffEl = document.querySelector('.problems_header_content__difficulty__');
    const difficulty = diffEl?.textContent?.trim() || 'Medium';

    const contentEl = document.querySelector('.problems_problem_content__X2Yr7, .problem-statement, div[class*="problems_problem_content"]');
    const description = cleanDOMText(contentEl) || cleanDOMText(document.body);

    const examples: Example[] = [];
    const constraints: string[] = [];

    if (contentEl) {
      const pres = contentEl.querySelectorAll('pre');
      pres.forEach((pre, idx) => {
        const text = pre.textContent || '';
        const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
        const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);
        examples.push({
          id: idx + 1,
          input: inputMatch ? inputMatch[1].trim() : text.trim(),
          output: outputMatch ? outputMatch[1].trim() : ''
        });
      });
    }

    return {
      title,
      slug,
      description: description.slice(0, 3500),
      examples,
      constraints,
      difficulty,
      url: window.location.href,
      platform: 'geeksforgeeks',
      timestamp: Date.now()
    };
  }
}

// ---------------- Generic Fallback Extractor ----------------
export class GenericExtractor implements PlatformExtractor {
  platformName: 'generic' = 'generic';

  canExtract(_url: string): boolean {
    return true; // Fallback matches any URL
  }

  async extract(): Promise<ProblemData> {
    const mainEl = document.querySelector('main, article, #content, .content, #main');
    const description = cleanDOMText(mainEl) || cleanDOMText(document.body);

    return {
      title: document.title || 'Coding Problem',
      description: description.slice(0, 3500),
      examples: [],
      constraints: [],
      difficulty: 'Unknown',
      url: window.location.href,
      platform: 'generic',
      timestamp: Date.now()
    };
  }
}

// ---------------- Extractor Registry ----------------
export class ExtractorRegistry {
  private static extractors: PlatformExtractor[] = [
    new LeetCodeExtractor(),
    new CodeforcesExtractor(),
    new HackerRankExtractor(),
    new CodeChefExtractor(),
    new GeeksForGeeksExtractor(),
    new GenericExtractor()
  ];

  static getExtractor(url: string = window.location.href): PlatformExtractor {
    for (const extractor of this.extractors) {
      if (extractor.canExtract(url)) {
        return extractor;
      }
    }
    return new GenericExtractor();
  }
}
