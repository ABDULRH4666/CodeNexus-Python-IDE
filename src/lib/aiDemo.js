export function buildDemoAiReply(input, codeText) {
  const normalized = input.toLowerCase();

  if (normalized.includes('fix') || normalized.includes('bug') || normalized.includes('error')) {
    return {
      status: 'review',
      content:
        'I reviewed the code and the likely issue is a logic or input handling problem. The safest minimal fix is to validate the function input before processing, then add a targeted test for the failing scenario. This keeps the patch small and reduces side effects.',
    };
  }

  if (normalized.includes('test')) {
    return {
      status: 'test',
      content:
        'Recommended test: cover the normal path and one edge case. Example: assert the function returns the expected result for valid input and raises a clear error for invalid values.',
    };
  }

  if (normalized.includes('optimize') || normalized.includes('performance')) {
    return {
      status: 'optimize',
      content:
        'Use a clear data flow, avoid repeated calculations inside loops, and keep the function single-purpose. If the code uses heavy iteration, compute shared values once and reuse them.',
    };
  }

  if (normalized.includes('explain') || normalized.includes('what')) {
    return {
      status: 'explain',
      content:
        'This code is a small Python program that initializes data, processes it, and prints the result. It follows a straightforward flow: input -> transformation -> output.',
    };
  }

  if (codeText && codeText.includes('print(')) {
    return {
      status: 'analyze',
      content:
        'The current code is using print statements to produce output, which is suitable for quick learning examples. The next improvement would be to wrap logic in functions and separate input from processing for easier testing.',
    };
  }

  return {
    status: 'general',
    content:
      'Demo mode is active because no external AI provider is configured. To enable live AI responses, connect an API provider and store the credentials securely on the server side. Until then, I can still help by suggesting safe fixes, tests, and code structure improvements.',
  };
}
