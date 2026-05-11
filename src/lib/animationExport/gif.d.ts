declare module "gif.js" {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    transparent?: number | null;
    repeat?: number;
  }

  export interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      source: HTMLCanvasElement | CanvasRenderingContext2D | ImageData | HTMLImageElement,
      options?: AddFrameOptions,
    ): void;
    on(event: "start" | "abort" | "finished" | "progress", callback: (arg: number | Blob) => void): void;
    render(): void;
    abort(): void;
  }
}
