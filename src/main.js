import './style.css'


const models = import.meta.glob('./assets/models/*/*.obj', {
  as: 'url',
  eager: true
});

export const polyData = Object.entries(models).map(([path, url]) => {
  const parts = path.split('/');
  const section = parts[3]; //sub folder name
  const name = parts.pop().replace('.obj', '');

  return {
    section,
    name,
    url,
    path,
  };
});

// overcomplicatedly sort everything into sections
const sectionsMap = polyData.reduce((acc, item) => {
  if (!acc[item.section]) {
    acc[item.section] = [];
  }
  acc[item.section].push(item);
  return acc;
}, {});

const sections = Object.entries(sectionsMap).map(([name, items]) => ({
  name,
  items
}));


// create layout to inject
const app = document.querySelector('#app')

app.innerHTML = `
  <div class="flex h-screen w-screen">
    <aside class="w-80 shrink-0 border-r border-slate-800 bg-slate-900 p-4 h-screen flex flex-col">
      <input
        id="search"
        class="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        placeholder="Search..."
      />
      <div id="sidebar" class="space-y-4 overflow-y-auto scrollbar-thin"></div>
    </aside>

    <main class="flex-1 p-4">
      <div class="h-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
        <div id="sketch-holder" class="h-full w-full"></div>
      </div>
    </main>
  </div>
`

// query sidebar elements
const sidebar = document.querySelector('#sidebar')
const search = document.querySelector('#search')

// fill sidebar list with sections + items, filtered by query string
function renderSidebar(query = '') {
  //sanitize query
  const q = query.toLowerCase().trim();

  // filter items by query
  sidebar.innerHTML = sections
    .map(section => {
      const items = section.items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        section.name.toLowerCase().includes(q)
      );

      if (!items.length) {
        return '';
      }

      // create dom elements from section + items (section, buttons+dataset stuff)
      return `
        <section class="mb-4">
          <h2 class="text-xs uppercase text-slate-400 mb-2">
            ${section.name}
          </h2>

          <ul class="space-y-1">
            ${items.map(item => `
              <li>
                <button
                  class="item-btn w-full text-left px-3 py-2 rounded-lg text-white hover:bg-slate-800"
                  data-url="${item.url || ''}"
                  data-name="${item.name}"
                >
                  ${item.name}
                </button>
              </li>
            `).join('')}
          </ul>
        </section>
      `;
    })
    .join('');
}

// load dataset when model clicked
sidebar.addEventListener('click', (e) => {
  const btn = e.target.closest('.item-btn');
  if (!btn) return;

  const url = btn.dataset.url;
  const name = btn.dataset.name;
  window.sketchAPI.displayPoly(name);
});

renderSidebar()

// register sidebar updates on search bar input changes
search.addEventListener('input', (e) => {
  renderSidebar(e.target.value)
})

