import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { templates, buildProjectFromTemplate } from './data/templates';
import { getRecentProjects, loadSettings, persistProject, saveSettings } from './lib/projectStore';
import { buildDemoAiReply } from './lib/aiDemo';
import { runPythonCode } from './lib/pyodideRuntime';

const defaultProject = buildProjectFromTemplate(templates[0]);

function App() {
  const settings = loadSettings();
  const [language, setLanguage] = useState(settings.language || 'en');
  const [theme, setTheme] = useState(settings.theme || 'dark');
  const [showEditor, setShowEditor] = useState(false);
  const [project, setProject] = useState(defaultProject);
  const [activeFile, setActiveFile] = useState(defaultProject.files[0].path);
  const [output, setOutput] = useState('Ready to run Python code.');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [recentProjects, setRecentProjects] = useState(getRecentProjects());
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content:
        'Demo AI mode is active. Connect a real provider later to enable live code analysis and fixes.',
    },
  ]);
  const [pendingPrompt, setPendingPrompt] = useState('');

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    saveSettings({ language, theme });
  }, [theme, language]);

  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, [project]);

  const activeFileContent = useMemo(() => {
    const current = project.files.find((file) => file.path === activeFile) || project.files[0];
    return current ? current.content : '';
  }, [project, activeFile]);

  const handleProjectChange = (nextProject) => {
    setProject(nextProject);
    setActiveFile(nextProject.files[0]?.path || 'main.py');
    persistProject(nextProject);
    setRecentProjects(getRecentProjects());
    setDirty(false);
    setStatus('Project saved');
  };

  const createProject = (template = templates[0]) => {
    const nextProject = buildProjectFromTemplate(template);
    handleProjectChange(nextProject);
    setShowEditor(true);
    setOutput(`Project created: ${nextProject.name}`);
  };

  const createFile = () => {
    const name = window.prompt('New file name', 'notes.py');
    if (!name) {
      return;
    }
    const normalized = name.trim();
    if (!normalized) {
      return;
    }
    const nextProject = {
      ...project,
      files: [...project.files, { id: `file-${Date.now()}`, path: normalized, content: '' }],
    };
    setProject(nextProject);
    setActiveFile(normalized);
    setDirty(true);
    setOutput(`Created file: ${normalized}`);
  };

  const saveCurrentFile = () => {
    const current = project.files.find((file) => file.path === activeFile);
    if (!current) {
      return;
    }
    const nextProject = {
      ...project,
      files: project.files.map((file) =>
        file.path === activeFile ? { ...file, content: activeFileContent } : file,
      ),
    };
    handleProjectChange(nextProject);
    setOutput(`Saved: ${current.path}`);
  };

  const handleEditorChange = (value) => {
    setProject((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.path === activeFile ? { ...file, content: value } : file,
      ),
    }));
    setDirty(true);
  };

  const handleFileRemoval = (path) => {
    const confirmed = window.confirm(`Delete ${path}?`);
    if (!confirmed) {
      return;
    }
    const remaining = project.files.filter((file) => file.path !== path);
    if (remaining.length === 0) {
      setOutput('No files remain in the project.');
      return;
    }
    const nextProject = { ...project, files: remaining };
    setProject(nextProject);
    setActiveFile(remaining[0].path);
    setDirty(false);
    setOutput(`Deleted: ${path}`);
    persistProject(nextProject);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    project.files.forEach((file) => {
      zip.file(file.path, file.content || '');
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name || 'project'}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOutput('Project exported as ZIP.');
  };

  const importFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const imported = await Promise.all(
      files.map(async (file) => {
        const content = await file.text();
        return { id: `import-${Date.now()}-${Math.random()}`, path: file.name, content };
      }),
    );

    const nextProject = {
      ...project,
      files: [...project.files, ...imported],
    };

    setProject(nextProject);
    setActiveFile(imported[0]?.path || activeFile);
    setShowEditor(true);
    setOutput(`${imported.length} file(s) imported.`);
    persistProject(nextProject);
  };

  const runSelectedCode = async () => {
    const source = project.files.find((file) => file.path === activeFile)?.content || '';
    if (!source.trim()) {
      setOutput('No code to run in the selected file.');
      return;
    }

    setIsRunning(true);
    setOutput('Loading Pyodide runtime...');
    setStatus('Running');

    const captured = [];
    const errors = [];

    const success = await runPythonCode(
      source,
      (message) => captured.push(String(message)),
      (message) => errors.push(String(message)),
    );

    setIsRunning(false);
    if (success) {
      setOutput(captured.join('\n') || 'Program finished with no output.');
      setStatus('Completed');
    } else {
      setOutput(errors.join('\n') || 'Python execution failed.');
      setStatus('Error');
    }
  };

  const addAiPrompt = () => {
    if (!pendingPrompt.trim()) return;
    const reply = buildDemoAiReply(pendingPrompt, activeFileContent);
    setChatMessages((current) => [
      ...current,
      { role: 'user', content: pendingPrompt },
      { role: 'assistant', content: reply.content },
    ]);
    setPendingPrompt('');
    setOutput('AI assistant reviewed the current code context.');
  };

  const projectTree = useMemo(() => {
    const map = new Map();
    project.files.forEach((file) => {
      const segments = file.path.split('/');
      let pointer = map;
      segments.forEach((segment, index) => {
        const key = segments.slice(0, index + 1).join('/');
        if (!pointer.has(key)) {
          pointer.set(key, { name: segment, path: key, children: new Map() });
        }
        if (index < segments.length - 1) {
          pointer = pointer.get(key).children;
        }
      });
    });
    return map;
  }, [project]);

  const renderTree = (map, level = 0) => {
    const entries = Array.from(map.entries());
    return entries.map(([key, node]) => {
      const isFile = node.children.size === 0 && node.path.includes('.');
      return (
        <div key={key} style={{ marginLeft: level ? 18 : 0 }}>
          <button
            type="button"
            className={`tree-node ${activeFile === node.path ? 'active' : ''}`}
            onClick={() => isFile && setActiveFile(node.path)}
          >
            {isFile ? '📄' : '📁'} {node.name}
          </button>
          {node.children.size > 0 && renderTree(node.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">C</div>
          <div>
            <strong>CodeNexus</strong>
            <small>Python IDE</small>
          </div>
        </div>

        <nav className="top-nav">
          <button type="button" onClick={() => setShowEditor(true)} className="nav-button primary">
            Open Editor
          </button>
          <button type="button" onClick={() => createProject()} className="nav-button">
            Create Project
          </button>
          <button
            type="button"
            className="nav-button"
            aria-label="Toggle theme"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button type="button" className="nav-button" onClick={() => setLanguage((current) => (current === 'en' ? 'ar' : 'en'))}>
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </nav>
      </header>

      {!showEditor ? (
        <main className="landing-page">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Write, run, learn, build</p>
              <h1>CodeNexus Python IDE</h1>
              <p className="lead">
                A professional browser-based Python workspace for writing code, running scripts,
                managing projects, and exploring ideas without leaving the browser.
              </p>
              <div className="cta-row">
                <button type="button" className="primary-btn" onClick={() => setShowEditor(true)}>
                  Open Editor
                </button>
                <button type="button" className="secondary-btn" onClick={() => createProject()}>
                  Create Project
                </button>
              </div>
            </div>

            <div className="preview-panel">
              <div className="editor-preview">
                <div className="editor-topbar">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <pre>{`print("Hello, CodeNexus!")\nvalue = 42\nprint(value * 2)`}</pre>
              </div>
            </div>
          </section>

          <section className="feature-grid">
            {[
              'Python code editor',
              'Project templates',
              'In-browser execution',
              'Local persistence',
              'AI assistant demo',
              'Responsive for desktop and mobile',
            ].map((feature) => (
              <div key={feature} className="feature-card">
                {feature}
              </div>
            ))}
          </section>

          <section className="examples">
            <h2>Python Examples</h2>
            <div className="example-list">
              {templates.map((template) => (
                <button key={template.id} type="button" className="example-item" onClick={() => createProject(template)}>
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="faq">
            <h2>FAQ</h2>
            <div className="faq-list">
              <div>
                <h3>Does it run Python in the browser?</h3>
                <p>Yes, using Pyodide for compatible Python execution within the browser.</p>
              </div>
              <div>
                <h3>Is AI available?</h3>
                <p>AI is available in demo mode until a provider is configured securely.</p>
              </div>
              <div>
                <h3>Can I save projects?</h3>
                <p>Yes, data is stored locally using IndexedDB and LocalStorage.</p>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="workspace-shell">
          <aside className="sidebar left-panel">
            <div className="panel-header">
              <h3>Projects</h3>
              <button type="button" className="mini-btn" onClick={() => createProject()}>
                New
              </button>
            </div>

            <div className="project-meta">
              <strong>{project.name}</strong>
              <span>{project.files.length} files</span>
            </div>

            <div className="tree-list">{renderTree(projectTree)}</div>

            <div className="recent-list">
              <h4>Recent</h4>
              {recentProjects.length ? (
                recentProjects.map((entry) => (
                  <button key={entry.id} type="button" className="recent-item" onClick={() => setProject(entry)}>
                    {entry.name}
                  </button>
                ))
              ) : (
                <span className="muted">No recent projects yet.</span>
              )}
            </div>
          </aside>

          <section className="editor-area">
            <div className="toolbar">
              <button type="button" className="mini-btn" onClick={createFile}>New File</button>
              <button type="button" className="mini-btn" onClick={saveCurrentFile}>Save</button>
              <button type="button" className="mini-btn" onClick={() => createProject()}>New Project</button>
              <button type="button" className="mini-btn" onClick={exportZip}>Export ZIP</button>
              <label className="mini-btn upload-label">
                Import Files
                <input type="file" multiple onChange={importFiles} hidden />
              </label>
              <button type="button" className="mini-btn primary" onClick={runSelectedCode} disabled={isRunning}>
                {isRunning ? 'Running...' : 'Run'}
              </button>
              <button type="button" className="mini-btn" onClick={() => setShowEditor(false)}>
                Exit IDE
              </button>
            </div>

            <div className="editor-wrap">
              <div className="tab-row">
                {project.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    className={`tab ${file.path === activeFile ? 'active' : ''}`}
                    onClick={() => setActiveFile(file.path)}
                  >
                    {file.path}
                    <span className="tab-close" onClick={(event) => { event.stopPropagation(); handleFileRemoval(file.path); }}>
                      ×
                    </span>
                  </button>
                ))}
              </div>

              <Editor
                height="58vh"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language="python"
                value={activeFileContent}
                onChange={handleEditorChange}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  padding: { top: 16 },
                  wordWrap: 'on',
                  renderWhitespace: 'selection',
                }}
              />
            </div>

            <div className="output-panel">
              <strong>Output</strong>
              <pre>{output}</pre>
            </div>
          </section>

          <aside className="sidebar right-panel">
            <div className="panel-header">
              <h3>AI Assistant</h3>
              <span className="status-pill">Demo mode</span>
            </div>

            <div className="chat-box">
              {chatMessages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                  {item.content}
                </div>
              ))}
            </div>

            <div className="prompt-box">
              <textarea
                value={pendingPrompt}
                onChange={(event) => setPendingPrompt(event.target.value)}
                rows={4}
                placeholder="Ask the AI to explain, fix, or improve the current code..."
              />
              <button type="button" className="primary-btn full" onClick={addAiPrompt}>
                Send
              </button>
            </div>
          </aside>
        </main>
      )}

      <footer className="footer-bar">
        <span>File: {activeFile}</span>
        <span>Language: {language.toUpperCase()}</span>
        <span>Theme: {theme}</span>
        <span>Dirty: {dirty ? 'Yes' : 'No'}</span>
        <span>Status: {status}</span>
      </footer>
    </div>
  );
}

export default App;
