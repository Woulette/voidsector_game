function line(level, message, meta){
  const stamp = new Date().toISOString();
  const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](`[${stamp}] [${level.toUpperCase()}] ${message}${suffix}`);
}

export const logger = {
  info:(message, meta)=>line("info", message, meta),
  warn:(message, meta)=>line("warn", message, meta),
  error:(message, meta)=>line("error", message, meta)
};
