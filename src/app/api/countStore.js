// app/api/countStore.js
let globalCount = 0;

export function getGlobalCount() {
  return globalCount;
}

export function incrementGlobalCount() {
  globalCount += 1;
  return globalCount;
}
