import type { ProvidedDataset } from './provided-dataset';

export async function readDatasetResponse(response: Response): Promise<ProvidedDataset> {
  if (!response.ok) throw new Error('The supplied datasets could not be loaded. Check that the API server is running, then retry.');
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The dataset URL returned a web page instead of data. For local development, run pnpm dev from the repository root and open the StockSync URL printed in the terminal.');
  }
  return response.json();
}
