export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initModuly } = await import("./lib/init");
    initModuly();
  }
}
