import type { StockDataset } from '@workspace/api-client-react';

export type DatasetBundle = StockDataset;

/** Change detection only; this is not a security hash. */
export function datasetRevision(bundle: DatasetBundle): string {
  let value = 2166136261;
  for (const char of JSON.stringify(bundle)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return `provided-${(value >>> 0).toString(16)}`;
}
