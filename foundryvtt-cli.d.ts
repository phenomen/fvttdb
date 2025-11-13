declare module "@foundryvtt/foundryvtt-cli" {
  export interface ExtractOptions {
    nedb?: boolean;
    yaml?: boolean;
    collection?: string;
  }

  export interface CompileOptions {
    nedb?: boolean;
    yaml?: boolean;
    collection?: string;
  }

  export function extractPack(
    inputPath: string,
    outputPath: string,
    options?: ExtractOptions
  ): Promise<void>;

  export function compilePack(
    inputPath: string,
    outputPath: string,
    options?: CompileOptions
  ): Promise<void>;
}
