import { ProblemData, ResponseType } from '../utils/types';

export class PromptTemplates {
  static buildPrompt(type: ResponseType, problem: ProblemData, language: string = 'Python3'): string {
    const context = this.formatProblemContext(problem);

    switch (type) {
      case 'understanding':
        return `You are an elite Competitive Programming coach. Help the student understand the problem.
${context}
Respond with concise Markdown:
1. **Core Objective**: 2 sentences explaining the goal in plain terms.
2. **Inputs & Expected Output**: Clear format breakdown.
3. **Key Constraints & Meaning**: What limitations/sizes imply for algorithms.
4. **Edge Cases**: 3 critical test scenarios to consider.
*DO NOT reveal code or optimal algorithms yet.*`;

      case 'intuition':
        return `You are an elite Competitive Programming coach. Guide the student's thought process without giving full code.
${context}
Respond with concise Markdown:
1. **First Observations**: Immediate clues from problem/examples.
2. **Constraint Insights**: What the constraints imply for time complexity (e.g. $O(N)$ vs $O(N \\log N)$).
3. **Candidate Patterns**: Algorithmic techniques that fit (Two Pointers, DP, Monotonic Stack, etc.).
4. **The Core Invariant**: The mathematical or structural "aha!" moment unlocking the solution.`;

      case 'hints':
        return `You are an elite Competitive Programming coach. Give 3 progressive hints for:
${context}
Respond with Markdown:
- **Hint 1 (Gentle Direction)**: High-level hint without spoiling.
- **Hint 2 (Technique/Data Structure)**: Which algorithmic paradigm/structure to apply and why.
- **Hint 3 (Crucial Logic)**: The key transition, edge case handling, or formula.`;

      case 'bruteforce':
        return `You are an elite Competitive Programming coach. Explain the brute-force baseline approach.
${context}
Respond with Markdown:
1. **Naive Approach**: The simplest solution that comes to mind.
2. **Code**: Working ${language} code.
3. **Complexity**: Exact Time and Space complexity and why it hits TLE.
4. **Bottleneck**: The exact loop/operation causing the slowdown.`;

      case 'optimized':
        return `You are an elite Competitive Programming coach. Provide the optimal accepted solution.
${context}
Respond with Markdown:
1. **Optimal Paradigm**: Name and explain the optimal technique.
2. **Step-by-Step Logic**: Clear breakdown of how it works.
3. **Optimal Implementation**: Clean, commented, idiomatic ${language} code.
4. **Complexity Analysis**: Big-O Time and Space complexity with variables defined.
5. **Key Takeaway**: 1 memorable pattern to apply to future CP problems.`;

      default:
        return `Analyze problem:\n${context}`;
    }
  }

  private static formatProblemContext(problem: ProblemData): string {
    const examplesText = problem.examples && problem.examples.length > 0
      ? problem.examples.slice(0, 3).map(ex => `Example ${ex.id}:\nInput: ${ex.input}\nOutput: ${ex.output}`).join('\n')
      : '';

    const constraintsText = problem.constraints && problem.constraints.length > 0
      ? problem.constraints.slice(0, 8).join('; ')
      : 'Standard';

    return `### Problem: ${problem.title} (${problem.difficulty || 'Medium'}) [${problem.platform}]
Description:
${problem.description.slice(0, 2500)}
${examplesText ? `\nExamples:\n${examplesText}` : ''}
Constraints: ${constraintsText}`;
  }
}
