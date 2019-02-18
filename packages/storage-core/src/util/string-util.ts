

export function startsWith(val: string, check: string) {
  if (!isString(val) || !isString(check)) {
    return false;
  }
  return val.slice(0, check.length) === check;
}


export function endsWith(val: string, check: string) {
  return val.slice(val.length - check.length) === check; // vs -1 * check.length ?
}


export function isString(val: any) {
  return typeof val === 'string';
}