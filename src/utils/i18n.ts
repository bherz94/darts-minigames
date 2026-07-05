export function getValueByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string): unknown => {
    if (acc !== null && acc !== undefined && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return String(template).replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}
