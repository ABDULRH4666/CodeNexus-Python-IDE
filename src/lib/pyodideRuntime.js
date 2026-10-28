let pyodideInstance = null;

export async function loadPyodideRuntime() {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (!window.loadPyodide) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Pyodide failed to load.')); 
      document.head.appendChild(script);
    });
  }

  pyodideInstance = await window.loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  });

  return pyodideInstance;
}

export async function runPythonCode(code, onOutput, onError) {
  try {
    const pyodide = await loadPyodideRuntime();

    pyodide.setStdout({
      batched: (value) => {
        onOutput?.(value);
      },
    });

    pyodide.setStderr({
      batched: (value) => {
        onError?.(value);
      },
    });

    await pyodide.runPythonAsync(code);
    return true;
  } catch (error) {
    onError?.(error.message || 'Python execution failed.');
    return false;
  }
}
