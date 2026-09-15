import * as fs from 'fs';
import * as path from 'path';
import { ProcessInfo, ProjectInfo } from './types';

const KNOWN_FRAMEWORKS: Record<string, string> = {
  'next': 'Next.js',
  'vite': 'Vite',
  '@remix-run/dev': 'Remix',
  'nuxt': 'Nuxt',
  'astro': 'Astro',
  'svelte': 'SvelteKit',
  'gatsby': 'Gatsby',
  'express': 'Express',
  'fastify': 'Fastify',
  '@nestjs/core': 'NestJS',
  'koa': 'Koa',
  'hono': 'Hono',
  'react-scripts': 'Create React App',
};

const KNOWN_EXECUTABLES: Record<string, { framework: string; type: ProjectInfo['type'] }> = {
  'postgres': { framework: 'PostgreSQL', type: 'generic' },
  'postgres.exe': { framework: 'PostgreSQL', type: 'generic' },
  'redis-server': { framework: 'Redis', type: 'generic' },
  'redis-server.exe': { framework: 'Redis', type: 'generic' },
  'mongod': { framework: 'MongoDB', type: 'generic' },
  'mongod.exe': { framework: 'MongoDB', type: 'generic' },
  'ollama': { framework: 'Ollama', type: 'generic' },
  'ollama.exe': { framework: 'Ollama', type: 'generic' },
  'docker-proxy': { framework: 'Docker Proxy', type: 'docker' },
  'docker-proxy.exe': { framework: 'Docker Proxy', type: 'docker' },
  'mysqld': { framework: 'MySQL', type: 'generic' },
  'mysqld.exe': { framework: 'MySQL', type: 'generic' },
  'caddy': { framework: 'Caddy', type: 'generic' },
  'caddy.exe': { framework: 'Caddy', type: 'generic' },
  'nginx': { framework: 'Nginx', type: 'generic' },
  'nginx.exe': { framework: 'Nginx', type: 'generic' },
};

/**
 * Inspects a process and discovers the project/application it belongs to.
 * Checks working directory manifests (package.json, Cargo.toml, pyproject.toml),
 * command line arguments, and executable names.
 */
export function identifyProject(process: ProcessInfo): ProjectInfo | null {
  const cwd = process.workingDirectory;
  const cmd = process.commandLine || '';
  const exe = process.name ? process.name.toLowerCase() : '';

  // 1. Check known standalone services (e.g. Postgres, Redis, Ollama, Docker)
  if (KNOWN_EXECUTABLES[exe]) {
    const info = KNOWN_EXECUTABLES[exe];
    return {
      name: info.framework,
      directory: cwd || process.executablePath || 'System Service',
      type: info.type,
      framework: info.framework,
      detectedFrom: 'executable'
    };
  }

  // 2. Check working directory if available
  if (cwd && fs.existsSync(cwd)) {
    const projectFromCwd = detectFromDirectory(cwd);
    if (projectFromCwd) {
      return projectFromCwd;
    }
  }

  // 3. Fall back to inspecting the command line
  if (cmd) {
    const projectFromCmd = detectFromCommandLine(cmd, cwd);
    if (projectFromCmd) {
      return projectFromCmd;
    }
  }

  // 4. Return null if not reliably identifiable (No fake data!)
  return null;
}

function detectFromDirectory(dir: string): ProjectInfo | null {
  // Check package.json (Node.js ecosystem)
  const pkgJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const name = content.name || path.basename(dir);
      
      let framework: string | undefined;
      const allDeps = {
        ...(content.dependencies || {}),
        ...(content.devDependencies || {})
      };

      for (const [depKey, fwName] of Object.entries(KNOWN_FRAMEWORKS)) {
        if (allDeps[depKey]) {
          framework = fwName;
          break;
        }
      }

      return {
        name,
        directory: dir,
        type: 'nodejs',
        framework: framework || (content.type === 'module' ? 'Node.js (ESM)' : 'Node.js'),
        detectedFrom: 'package_json'
      };
    } catch {
      // Ignored malformed JSON
    }
  }

  // Check Cargo.toml (Rust ecosystem)
  const cargoPath = path.join(dir, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    try {
      const cargoText = fs.readFileSync(cargoPath, 'utf8');
      const nameMatch = cargoText.match(/name\s*=\s*["']([^"']+)["']/);
      const name = nameMatch ? nameMatch[1] : path.basename(dir);
      return {
        name,
        directory: dir,
        type: 'rust',
        framework: 'Rust',
        detectedFrom: 'cargo_toml'
      };
    } catch {
      // Ignore
    }
  }

  // Check Python (pyproject.toml or requirements.txt)
  const pyprojectPath = path.join(dir, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    try {
      const pyText = fs.readFileSync(pyprojectPath, 'utf8');
      const nameMatch = pyText.match(/name\s*=\s*["']([^"']+)["']/);
      const name = nameMatch ? nameMatch[1] : path.basename(dir);
      let framework = 'Python';
      if (pyText.includes('fastapi')) framework = 'FastAPI';
      else if (pyText.includes('django')) framework = 'Django';
      else if (pyText.includes('flask')) framework = 'Flask';

      return {
        name,
        directory: dir,
        type: 'python',
        framework,
        detectedFrom: 'pyproject_toml'
      };
    } catch {
      // Ignore
    }
  }

  // Check Go (go.mod)
  const goModPath = path.join(dir, 'go.mod');
  if (fs.existsSync(goModPath)) {
    try {
      const goText = fs.readFileSync(goModPath, 'utf8');
      const modMatch = goText.match(/module\s+([^\s]+)/);
      const name = modMatch ? path.basename(modMatch[1]) : path.basename(dir);
      return {
        name,
        directory: dir,
        type: 'go',
        framework: 'Go',
        detectedFrom: 'go_mod'
      };
    } catch {
      // Ignore
    }
  }

  return null;
}

function detectFromCommandLine(cmd: string, cwd?: string | null): ProjectInfo | null {
  const lowerCmd = cmd.toLowerCase();

  if (lowerCmd.includes('next dev') || lowerCmd.includes('next start')) {
    return {
      name: cwd ? path.basename(cwd) : 'Next.js App',
      directory: cwd || process.cwd(),
      type: 'nodejs',
      framework: 'Next.js',
      detectedFrom: 'command_line'
    };
  }

  if (lowerCmd.includes('vite')) {
    return {
      name: cwd ? path.basename(cwd) : 'Vite App',
      directory: cwd || process.cwd(),
      type: 'nodejs',
      framework: 'Vite',
      detectedFrom: 'command_line'
    };
  }

  if (lowerCmd.includes('uvicorn') || lowerCmd.includes('fastapi')) {
    return {
      name: cwd ? path.basename(cwd) : 'FastAPI App',
      directory: cwd || process.cwd(),
      type: 'python',
      framework: 'FastAPI',
      detectedFrom: 'command_line'
    };
  }

  if (lowerCmd.includes('django') || lowerCmd.includes('manage.py runserver')) {
    return {
      name: cwd ? path.basename(cwd) : 'Django App',
      directory: cwd || process.cwd(),
      type: 'python',
      framework: 'Django',
      detectedFrom: 'command_line'
    };
  }

  if (lowerCmd.includes('flask run')) {
    return {
      name: cwd ? path.basename(cwd) : 'Flask App',
      directory: cwd || process.cwd(),
      type: 'python',
      framework: 'Flask',
      detectedFrom: 'command_line'
    };
  }

  if (lowerCmd.includes('ollama serve')) {
    return {
      name: 'Ollama',
      directory: cwd || 'System',
      type: 'generic',
      framework: 'Ollama',
      detectedFrom: 'command_line'
    };
  }

  return null;
}
