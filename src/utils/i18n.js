export function getValueByPath(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}
