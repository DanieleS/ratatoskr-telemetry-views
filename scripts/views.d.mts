// Types for views.mjs, so the TypeScript that imports it (the Playwright config and tests) is
// checked like everything else.
import type { Range, Version } from '../src/scry/range.ts';

export interface View {
  name: string;
  dir: string;
  title: string;
  contract: { id: string; range: Range };
}

export interface ContractVersion {
  text: string;
  version: Version;
  schemaFile: string;
}

export function loadViews(root: string): View[];
export function contractVersions(root: string, id: string): ContractVersion[];
export function versionsFor(root: string, view: View): ContractVersion[];
export function outputName(view: View): string;
