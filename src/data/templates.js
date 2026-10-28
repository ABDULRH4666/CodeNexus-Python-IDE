export const templates = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Basic Python starter script.',
    files: [
      {
        id: 'hello-main',
        path: 'main.py',
        content: 'print("Hello, CodeNexus!")\nprint("Write, run, learn, and build Python projects from one place.")\n',
      },
    ],
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Simple arithmetic operations.',
    files: [
      {
        id: 'calc-main',
        path: 'main.py',
        content: 'def add(a, b):\n    return a + b\n\nprint(add(10, 5))\nprint(add(3.5, 2.25))\n',
      },
    ],
  },
  {
    id: 'json-demo',
    name: 'JSON Demo',
    description: 'Read and transform data using JSON.',
    files: [
      {
        id: 'json-main',
        path: 'main.py',
        content: 'import json\n\npayload = {"name": "CodeNexus", "features": ["editor", "runtime", "ai"]}\nprint(json.dumps(payload, indent=2))\n',
      },
    ],
  },
  {
    id: 'text-processing',
    name: 'Text Processing',
    description: 'Manipulate strings and word counts.',
    files: [
      {
        id: 'text-main',
        path: 'main.py',
        content: 'text = "CodeNexus Python IDE is built for learning and experimentation"\nwords = text.lower().split()\nprint(f"Total words: {len(words)}")\nprint(sorted(set(words)))\n',
      },
    ],
  },
];

export function buildProjectFromTemplate(template) {
  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    createdAt: new Date().toISOString(),
    files: template.files.map((file) => ({ ...file, id: `${file.id}-${Date.now()}` })),
  };
}
