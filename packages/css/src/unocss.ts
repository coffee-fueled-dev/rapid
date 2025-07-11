import { createGenerator, type UserConfig } from "unocss";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

// UnoCSS generator instance
let generator: Awaited<ReturnType<typeof createGenerator>> | null = null;
let compiledCSS: string | null = null;
let currentConfig: UserConfig | null = null;

async function getGenerator(config: UserConfig) {
  // Reset generator if config changed
  if (!generator || currentConfig !== config) {
    generator = await createGenerator(config);
    currentConfig = config;
    // Clear cached CSS when config changes
    compiledCSS = null;
  }
  return generator;
}

async function scanDirectory(dir: string): Promise<string[]> {
  const content: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const subContent = await scanDirectory(fullPath);
        content.push(...subContent);
      } else if (entry.name.match(/\.(tsx?|jsx?)$/)) {
        const fileContent = await readFile(fullPath, "utf-8");
        content.push(fileContent);
      }
    }
  } catch (error) {
    console.warn("Error while scanning directories:", error);
    // Directory might not exist, skip silently
  }

  return content;
}

/**
 * Extract content from component files for CSS generation
 */
async function extractContent(): Promise<string> {
  const content: string[] = [];

  try {
    // Scan shared UI components (simple relative path)
    const uiPath = join(process.cwd(), "../shared/ui/src");
    console.log(`📂 Scanning shared UI components at ${uiPath}`);
    const uiContent = await scanDirectory(uiPath);
    content.push(...uiContent);
    console.log(`  📄 Found ${uiContent.length} UI component files`);

    // Scan dev app components
    const devPath = join(process.cwd(), "src");
    console.log(`📂 Scanning dev app components at ${devPath}`);
    const devContent = await scanDirectory(devPath);
    content.push(...devContent);
    console.log(`  📄 Found ${devContent.length} dev app files`);
  } catch (error) {
    console.warn("⚠️ Could not scan component files:", error);
  }

  return content.join("\n");
}

/**
 * Compile UnoCSS from component files with provided config
 */
export async function compileUnoCSS(config: UserConfig): Promise<string> {
  if (compiledCSS && currentConfig === config) {
    return compiledCSS;
  }

  try {
    console.log("📂 Scanning component files for utility classes...");

    const gen = await getGenerator(config);

    // Extract content from all component files
    const content = await extractContent();

    // Generate CSS based on the actual content
    const result = await gen.generate(content);

    compiledCSS = result.css;
    console.log("✅ UnoCSS compilation successful");
    console.log(
      `📊 Generated ${result.matched.size} utility classes from component files`
    );

    return compiledCSS;
  } catch (error) {
    console.error("❌ UnoCSS compilation failed:", error);
    throw error;
  }
}
