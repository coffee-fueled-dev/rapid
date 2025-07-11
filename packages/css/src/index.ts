export * from "./unocss";

/**
 * CSS compilation function type
 */
export type CSSCompiler = () => Promise<string>;
