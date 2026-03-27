/**
 * Structural tests — validate architectural invariants via filesystem analysis.
 * No database or running app required.
 *
 * These tests enforce:
 * 1. Module structure (every module has a route file)
 * 2. Dependency direction (route → service → repository, never reverse)
 * 3. Module isolation (no cross-module imports)
 * 4. All modules registered in route index
 * 5. Mappings single source of truth
 * 6. Frontend/backend boundary
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SERVER_SRC = path.join(ROOT, 'src_v2');
const MODULES_DIR = path.join(SERVER_SRC, 'modules');
const ROUTES_INDEX = path.join(SERVER_SRC, 'routes', 'index.ts');
const FRONTEND_SRC = path.join(ROOT, '..', 'src');

/** Get all module directory names */
function getModuleDirs(): string[] {
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** Get all .ts files in a directory (non-recursive) */
function getTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
}

/** Extract import paths from a TypeScript file */
function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  // Match: import ... from '...' and import ... from "..."
  const regex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/** Recursively get all .ts/.tsx files */
function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.match(/\.(ts|tsx)$/) && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Module Structure', () => {
  const modules = getModuleDirs();

  it('every module directory has a route file', () => {
    for (const mod of modules) {
      const modDir = path.join(MODULES_DIR, mod);
      const files = getTsFiles(modDir);
      const hasRoute = files.some((f) => f.includes('.route.'));
      expect(hasRoute, `Module "${mod}" is missing a route file (*route.ts)`).toBe(true);
    }
  });

  it('repository files do not import from route or service files', () => {
    for (const mod of modules) {
      const modDir = path.join(MODULES_DIR, mod);
      const repoFiles = getTsFiles(modDir).filter((f) => f.includes('.repository.'));

      for (const file of repoFiles) {
        const imports = extractImports(path.join(modDir, file));
        const violating = imports.filter(
          (imp) => imp.includes('.route') || imp.includes('.service'),
        );
        expect(
          violating,
          `${mod}/${file} imports route/service (dependency direction violation: route→service→repository)`,
        ).toEqual([]);
      }
    }
  });

  it('service files do not import from route files', () => {
    for (const mod of modules) {
      const modDir = path.join(MODULES_DIR, mod);
      const serviceFiles = getTsFiles(modDir).filter((f) => f.includes('.service.'));

      for (const file of serviceFiles) {
        const imports = extractImports(path.join(modDir, file));
        const violating = imports.filter((imp) => imp.includes('.route'));
        expect(
          violating,
          `${mod}/${file} imports route (dependency direction violation: route→service→repository)`,
        ).toEqual([]);
      }
    }
  });

  it('modules do not import from other modules', () => {
    for (const mod of modules) {
      const modDir = path.join(MODULES_DIR, mod);
      const files = getTsFiles(modDir);

      for (const file of files) {
        const imports = extractImports(path.join(modDir, file));
        for (const imp of imports) {
          // Check for relative imports that go to sibling module directories
          if (imp.startsWith('../') && !imp.startsWith('../../')) {
            const targetDir = imp.split('/')[1]; // e.g., "../users/users.service" → "users"
            const otherModules = modules.filter((m) => m !== mod);
            const isOtherModule = otherModules.some(
              (other) => targetDir === other || targetDir.startsWith(other + '.'),
            );
            expect(
              isOtherModule,
              `${mod}/${file} imports from module "${targetDir}" (cross-module import forbidden — use shared services in src_v2/services/)`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('all modules are registered in routes/index.ts', () => {
    const indexContent = fs.readFileSync(ROUTES_INDEX, 'utf-8');

    for (const mod of modules) {
      // Check if the module name appears in the route index (as import path or string)
      const isRegistered =
        indexContent.includes(`modules/${mod}/`) || indexContent.includes(`'${mod}'`);
      expect(
        isRegistered,
        `Module "${mod}" is not registered in routes/index.ts`,
      ).toBe(true);
    }
  });
});

describe('Frontend/Backend Boundary', () => {
  it('frontend src/ does not import from server/', () => {
    const frontendFiles = getAllTsFiles(FRONTEND_SRC);

    for (const file of frontendFiles) {
      const imports = extractImports(file);
      const serverImports = imports.filter(
        (imp) =>
          imp.includes('/server/') ||
          imp.startsWith('../server') ||
          imp === '@prisma/client',
      );
      const relPath = path.relative(FRONTEND_SRC, file);
      expect(
        serverImports,
        `src/${relPath} imports from server (frontend/backend boundary violation)`,
      ).toEqual([]);
    }
  });
});

describe('Backend User Data Contract', () => {
  it('all user selects include avatar field', () => {
    // Scan backend files for { select: { id: true, name: true } } without avatar
    const backendFiles = getAllTsFiles(SERVER_SRC);
    const selectPattern = /select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}/g;
    const selectWithAvatarPattern = /select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*avatar:\s*true/;
    const userBriefSelectPattern = /USER_BRIEF_SELECT/;

    for (const file of backendFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (selectPattern.test(line)) {
          // Reset regex lastIndex
          selectPattern.lastIndex = 0;
          // Check it's not already using USER_BRIEF_SELECT or includes avatar
          const hasAvatar = selectWithAvatarPattern.test(line) || userBriefSelectPattern.test(line);
          const relPath = path.relative(SERVER_SRC, file);
          expect(
            hasAvatar,
            `${relPath}:${i + 1} has { id, name } without avatar. Use USER_BRIEF_SELECT from utils/prisma-selects.ts`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('Mappings Single Source of Truth', () => {
  it('mapping keys only exist in src/lib/mappings.ts', () => {
    const MAPPING_KEYS = [
      'eventTagToScene',
      'chineseTagToEventTag',
      'eventTagToChinese',
      'roleLabelMap',
    ];
    const mappingsFile = path.join(FRONTEND_SRC, 'lib', 'mappings.ts');

    // Verify mappings.ts exists and contains the keys
    const mappingsContent = fs.readFileSync(mappingsFile, 'utf-8');
    for (const key of MAPPING_KEYS) {
      expect(
        mappingsContent.includes(key),
        `mappings.ts should contain "${key}"`,
      ).toBe(true);
    }

    // Check no other file defines these mappings (as variable declarations)
    const allFiles = getAllTsFiles(FRONTEND_SRC);
    for (const file of allFiles) {
      if (file === mappingsFile) continue;
      const content = fs.readFileSync(file, 'utf-8');
      for (const key of MAPPING_KEYS) {
        // Match: const/let/var keyName = or export const keyName =
        const defPattern = new RegExp(`(?:const|let|var|export\\s+const)\\s+${key}\\s*=`);
        expect(
          defPattern.test(content),
          `src/${path.relative(FRONTEND_SRC, file)} redefines "${key}" — use import from mappings.ts instead`,
        ).toBe(false);
      }
    }
  });
});
