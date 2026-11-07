const controls = [...document.querySelectorAll('[data-workspace]')];
const panels = new Map(['map', 'electricity', 'databank'].map(id => [id, document.getElementById(`${id}-workspace`)]));
const initialized = new Map();
const cache = new Map();
async function loadJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const pending = fetch(path).then(response => {if (!response.ok) throw Error(`Data nelze načíst (${response.status}).`); return response.json();});
  cache.set(path, pending);
  try {return await pending;} catch (error) {cache.delete(path); throw error;}
}
async function showWorkspace(id) {
  if (!panels.has(id)) id = 'map';
  for (const [key, panel] of panels) panel.hidden = key !== id;
  window.dispatchEvent(new CustomEvent('workspacechange', {detail: id}));
  for (const button of controls) {if (button.dataset.workspace === id) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');}
  if (id === 'map') {window.dispatchEvent(new Event('resize')); return;}
  if (initialized.has(id)) return;
  const root = panels.get(id);
  const loading = (async () => {
    if (id === 'electricity') {
      const {initializeElectricityPanel} = await import('./ui/electricity-panel.mjs?v=0.6.1');
      initializeElectricityPanel({root, loadJSON}).open();
    } else {
      const {initializeDatabankPanel} = await import('./ui/databank-panel.mjs?v=0.6.1');
      await initializeDatabankPanel({root, loadJSON});
    }
  })();
  initialized.set(id, loading);
  try {await loading;} catch (error) {
    initialized.delete(id); root.replaceChildren();
    const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.textContent = error.message;
    const retry = document.createElement('button'); retry.textContent = 'Zkusit znovu'; retry.addEventListener('click', () => showWorkspace(id)); root.append(message, retry);
  }
}
for (const button of controls) button.addEventListener('click', () => {location.hash = button.dataset.workspace === 'map' ? '' : button.dataset.workspace; showWorkspace(button.dataset.workspace);});
window.addEventListener('hashchange', () => showWorkspace(location.hash.slice(1)));
showWorkspace(location.hash.slice(1) || 'map');

const offline = document.getElementById('offline-prepare');
offline?.addEventListener('click', async () => {
  offline.disabled = true;
  try {
    if (!('serviceWorker' in navigator)) throw Error('Offline režim není v tomto prohlížeči dostupný. Stáhněte archiv v databance.');
    const registration = await navigator.serviceWorker.register('./sw.js', {scope: './'});
    const ready = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();
    channel.port1.onmessage = ({data}) => {
      offline.textContent = data.error ? `Chyba: ${data.error}` : data.done ? '✓ Připraveno offline' : `Ukládání ${data.current}/${data.total}…`;
      if (data.done || data.error) offline.disabled = false;
    };
    (registration.active || ready.active).postMessage({type: 'PREPARE_OFFLINE'}, [channel.port2]);
  } catch (error) {offline.textContent = error.message; offline.disabled = false;}
});
