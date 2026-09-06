#!/usr/bin/env npx tsx
/**
 * SDK Generator Script
 *
 * Fetches the OpenAPI spec from the running server and generates
 * TypeScript and Python client SDKs.
 *
 * Usage: npx tsx scripts/generate-sdk.ts
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(process.cwd(), 'sdk');

interface OpenAPISchema {
  openapi: string;
  info: { title: string; version: string; description: string };
  paths: Record<string, any>;
  components?: { schemas?: Record<string, any>; securitySchemes?: Record<string, any> };
}

async function fetchSpec(): Promise<OpenAPISchema> {
  const response = await axios.get(`${API_BASE}/docs/json`, { timeout: 5000 });
  return response.data;
}

function generateTypeScriptClient(spec: OpenAPISchema): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(` * ${spec.info.title} TypeScript Client — Auto-generated`);
  lines.push(` * Version: ${spec.info.version}`);
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(' */');
  lines.push('');
  lines.push('export interface ApiClientConfig {');
  lines.push('  baseUrl: string;');
  lines.push('  apiKey?: string;');
  lines.push('  timeout?: number;');
  lines.push('}');
  lines.push('');
  lines.push('export interface ApiResponse<T> {');
  lines.push('  data: T;');
  lines.push('  status: number;');
  lines.push('  headers: Record<string, string>;');
  lines.push('}');
  lines.push('');
  lines.push('export class KulimaClient {');
  lines.push('  private baseUrl: string;');
  lines.push('  private apiKey?: string;');
  lines.push('  private timeout: number;');
  lines.push('');
  lines.push('  constructor(config: ApiClientConfig) {');
  lines.push('    this.baseUrl = config.baseUrl.replace(/\\/$/, \'\');');
  lines.push('    this.apiKey = config.apiKey;');
  lines.push('    this.timeout = config.timeout || 30000;');
  lines.push('  }');
  lines.push('');
  lines.push('  private async request<T>(method: string, path: string, body?: any): Promise<T> {');
  lines.push('    const headers: Record<string, string> = {');
  lines.push('      \'Content-Type\': \'application/json\',');
  lines.push('    };');
  lines.push('    if (this.apiKey) {');
  lines.push('      headers[\'Authorization\'] = `Bearer ${this.apiKey}`;');
  lines.push('    }');
  lines.push('');
  lines.push('    const response = await fetch(`${this.baseUrl}${path}`, {');
  lines.push('      method,');
  lines.push('      headers,');
  lines.push('      body: body ? JSON.stringify(body) : undefined,');
  lines.push('      signal: AbortSignal.timeout(this.timeout),');
  lines.push('    });');
  lines.push('');
  lines.push('    if (!response.ok) {');
  lines.push('      const error = await response.json().catch(() => ({}));');
  lines.push('      throw new Error(error.message || `API error: ${response.status}`);');
  lines.push('    }');
  lines.push('');
  lines.push('    return response.json() as Promise<T>;');
  lines.push('  }');
  lines.push('');

  // Generate methods from paths
  for (const [pathStr, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      const op = operation as any;
      const operationId = op.operationId || `${method}_${pathStr.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const methodName = operationId.replace(/[^a-zA-Z0-9]/g, '');

      // Extract path parameters
      const pathParams = (pathStr.match(/\{(\w+)\}/g) || []).map((p: string) => p.slice(1, -1));

      // Build method signature
      const params: string[] = [];
      const args: string[] = [];
      for (const param of pathParams) {
        params.push(`${param}: string`);
        args.push(`\${${param}}`);
      }

      // Add body for POST/PUT/PATCH
      if (['post', 'put', 'patch'].includes(method)) {
        params.push('body?: any');
        args.push('body');
      }

      const signature = params.length > 0 ? params.join(', ') : '';

      lines.push(`  /**`);
      lines.push(`   * ${op.summary || op.description || `${method.toUpperCase()} ${pathStr}`}`);
      lines.push(`   */`);
      lines.push(`  async ${methodName}(${signature}): Promise<any> {`);
      if (pathParams.length > 0) {
        const interpolated = pathStr.replace(/\{(\w+)\}/g, (_, name) => `\${${name}}`);
        if (['post', 'put', 'patch'].includes(method)) {
          lines.push(`    return this.request('${method.toUpperCase()}', \`${interpolated}\`, body);`);
        } else {
          lines.push(`    return this.request('${method.toUpperCase()}', \`${interpolated}\`);`);
        }
      } else {
        if (['post', 'put', 'patch'].includes(method)) {
          lines.push(`    return this.request('${method.toUpperCase()}', '${pathStr}', body);`);
        } else {
          lines.push(`    return this.request('${method.toUpperCase()}', '${pathStr}');`);
        }
      }
      lines.push('  }');
      lines.push('');
    }
  }

  lines.push('}');
  lines.push('');

  // Add convenience factory
  lines.push('/**');
  lines.push(' * Create a KulimaAPI client.');
  lines.push(' *');
  lines.push(' * @example');
  lines.push(' * ```typescript');
  lines.push(' * import { createClient } from \'@kulima/api\';');
  lines.push(' *');
  lines.push(' * const client = createClient({');
  lines.push(' *   baseUrl: \'http://localhost:3000\',');
  lines.push(' *   apiKey: \'kulima_xxxxxxxx\',');
  lines.push(' * });');
  lines.push(' *');
  lines.push(' * const weather = await client.getV1WeatherCurrentLatLng(\'6.5\', \'3.4\');');
  lines.push(' * console.log(weather.temperatureC);');
  lines.push(' * ```');
  lines.push(' */');
  lines.push('export function createClient(config: ApiClientConfig): KulimaClient {');
  lines.push('  return new KulimaClient(config);');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function generatePythonClient(spec: OpenAPISchema): string {
  const lines: string[] = [];

  lines.push('"""');
  lines.push(`${spec.info.title} Python Client — Auto-generated`);
  lines.push(`Version: ${spec.info.version}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('"""');
  lines.push('');
  lines.push('import requests');
  lines.push('from typing import Any, Optional');
  lines.push('');
  lines.push('');
  lines.push('class KulimaClient:');
  lines.push('    """');
  lines.push(`    ${spec.info.title} API Client.`);
  lines.push('');
  lines.push('    Usage:');
  lines.push('        client = KulimaClient(base_url="http://localhost:3000", api_key="kulima_xxx")');
  lines.push('        weather = client.get_weather_current(lat="6.5", lng="3.4")');
  lines.push('    """');
  lines.push('');
  lines.push('    def __init__(self, base_url: str, api_key: str | None = None, timeout: int = 30):');
  lines.push('        self.base_url = base_url.rstrip("/")');
  lines.push('        self.api_key = api_key');
  lines.push('        self.timeout = timeout');
  lines.push('        self.session = requests.Session()');
  lines.push('        if api_key:');
  lines.push('            self.session.headers["Authorization"] = f"Bearer {api_key}"');
  lines.push('        self.session.headers["Content-Type"] = "application/json"');
  lines.push('');
  lines.push('    def _request(self, method: str, path: str, **kwargs) -> Any:');
  lines.push('        url = f"{self.base_url}{path}"');
  lines.push('        response = self.session.request(method, url, timeout=self.timeout, **kwargs)');
  lines.push('        response.raise_for_status()');
  lines.push('        return response.json()');
  lines.push('');

  // Generate methods from paths
  for (const [pathStr, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      const op = operation as any;
      const operationId = op.operationId || `${method}_${pathStr.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Python snake_case method name
      const methodName = operationId
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_');

      // Extract path parameters
      const pathParams = (pathStr.match(/\{(\w+)\}/g) || []).map((p: string) => p.slice(1, -1));

      const params: string[] = pathParams.map((p) => `${p}: str`);
      if (['post', 'put', 'patch'].includes(method)) {
        params.push('body: dict | None = None');
      }
      // Add query params for GET
      if (method === 'get') {
        params.push('**kwargs');
      }

      const signature = params.join(', ');

      lines.push(`    def ${methodName}(${signature}) -> Any:`);
      lines.push(`        """${op.summary || op.description || `${method.toUpperCase()} ${pathStr}`}"""`);

      if (pathParams.length > 0) {
        const interpolated = pathStr.replace(/\{(\w+)\}/g, (_, name) => `{${name}}`);
        if (['post', 'put', 'patch'].includes(method)) {
          lines.push(`        return self._request("${method}", f"${interpolated}".format(${pathParams.join(', ')}), json=body)`);
        } else {
          lines.push(`        return self._request("${method}", f"${interpolated}".format(${pathParams.join(', ')}), params=kwargs if kwargs else None)`);
        }
      } else {
        if (['post', 'put', 'patch'].includes(method)) {
          lines.push(`        return self._request("${method}", "${pathStr}", json=body)`);
        } else {
          lines.push(`        return self._request("${method}", "${pathStr}", params=kwargs if kwargs else None)`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function main() {
  console.log('📦 Fetching OpenAPI spec...');
  const spec = await fetchSpec();
  console.log(`   Found ${Object.keys(spec.paths || {}).length} endpoints`);

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'typescript'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'python'), { recursive: true });

  // Generate TypeScript SDK
  console.log('🔧 Generating TypeScript SDK...');
  const tsClient = generateTypeScriptClient(spec);
  await fs.writeFile(path.join(OUTPUT_DIR, 'typescript', 'index.ts'), tsClient);
  console.log('   ✅ sdk/typescript/index.ts');

  // Generate Python SDK
  console.log('🐍 Generating Python SDK...');
  const pyClient = generatePythonClient(spec);
  await fs.writeFile(path.join(OUTPUT_DIR, 'python', 'kulima_client.py'), pyClient);
  console.log('   ✅ sdk/python/kulima_client.py');

  // Save the raw OpenAPI spec
  console.log('📄 Saving OpenAPI spec...');
  await fs.writeFile(path.join(OUTPUT_DIR, 'openapi.json'), JSON.stringify(spec, null, 2));
  console.log('   ✅ sdk/openapi.json');

  console.log('\n🎉 SDK generation complete!');
  console.log('   Output: sdk/');
}

main().catch((err) => {
  console.error('❌ SDK generation failed:', err.message);
  process.exit(1);
});
