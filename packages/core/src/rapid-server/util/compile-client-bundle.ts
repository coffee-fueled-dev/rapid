export async function compileClientBundle(): Promise<string> {
  try {
    const result = await Bun.build({
      entrypoints: ["src/client.tsx"],
      target: "browser",
      format: "esm",
      minify: false,
      sourcemap: "inline",
      splitting: false,
    });

    if (!result.success) {
      console.error("❌ Client bundling failed:", result.logs);
      throw new Error("Client bundling failed");
    }

    return await result.outputs[0].text();
  } catch (error) {
    console.error("❌ Failed to bundle client:", error);
    throw error;
  }
}

export async function getPrebuilt(path: string): Promise<string | null> {
  // Check for pre-built client bundle first (production)
  try {
    const file = Bun.file(path);
    if (await file.exists()) {
      const bundle = await file.text();
      console.log("✅ Using pre-built client bundle");
      return bundle;
    }
    return null;
  } catch {
    // Pre-built file not found, fall back to runtime compilation
    console.warn("Prebuilt files not found, performing runtime bundline.");
    return null;
  }
}
