function mountSavedMixes({ current, recall }) {
  const storageKey = 'sleepSoundsSavedMixes';
  const form = document.getElementById('savedMixForm');
  const name = document.getElementById('savedMixName');
  const submit = document.getElementById('savedMixSubmit');
  const cancel = document.getElementById('savedMixCancel');
  const list = document.getElementById('savedMixList');
  const status = document.getElementById('savedMixStatus');
  let mixes = [];
  let editing = null;
  const visible = new Map();

  name.maxLength = MAX_MIX_NAME;
  try { mixes = restorePersonalMixes(JSON.parse(localStorage.getItem(storageKey))); } catch {}

  function resetForm() {
    editing = null;
    name.value = '';
    submit.textContent = 'Save mix';
    cancel.hidden = true;
  }

  function store(next, message) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(serializePersonalMixes(next)));
    } catch {
      status.textContent = 'Couldn’t save on this device.';
      return false;
    }
    mixes = next;
    render();
    status.textContent = message;
    return true;
  }

  function action(label, accessibleName, activate) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', accessibleName);
    button.onclick = activate;
    return button;
  }

  function render() {
    list.replaceChildren();
    visible.clear();
    for (const mix of favoritesFirst(mixes)) {
      const row = document.createElement('li');
      const load = action(mix.name, 'Load mix ' + mix.name, () => {
        recall(mix);
        status.textContent = 'Loaded ' + mix.name + '.';
      });
      load.className = 'saved-mix-name';
      visible.set(mix, load);
      const favorite = action(mix.favorite ? 'Unstar' : 'Star', 'Favorite ' + mix.name, () => {
        store(mixes.map(item => item === mix ? { ...mix, favorite: !mix.favorite } : item),
          mix.favorite ? 'Unstarred.' : 'Starred.');
      });
      favorite.setAttribute('aria-pressed', String(mix.favorite));
      const rename = action('Rename', 'Rename ' + mix.name, () => {
        editing = mix.name;
        name.value = mix.name;
        submit.textContent = 'Save name';
        cancel.hidden = false;
        name.focus();
        name.select();
      });
      const remove = action('Delete', 'Delete ' + mix.name, () => {
        if (window.confirm('Delete “' + mix.name + '”?') &&
            store(mixes.filter(item => item !== mix), 'Deleted ' + mix.name + '.')) {
          if (editing === mix.name) resetForm();
        }
      });
      row.append(load, favorite, rename, remove);
      list.append(row);
    }
    updateSelected();
  }

  function updateSelected() {
    const {levels, boost} = current();
    for (const [mix, button] of visible) {
      const selected = mix.boost === boost && mix.levels.every((value, index) => value === levels[index]);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  cancel.onclick = resetForm;
  form.onsubmit = event => {
    event.preventDefault();
    const label = cleanMixName(name.value);
    if (!label) {
      status.textContent = 'Enter a name for the mix.';
      return;
    }
    if (mixes.some(mix => mix.name !== editing && mix.name.toLowerCase() === label.toLowerCase())) {
      status.textContent = 'A mix with this name already exists.';
      return;
    }
    const settings = current();
    if (!editing && !settings.levels.some(level => level > 0)) {
      status.textContent = 'Turn up a sound before saving this mix.';
      return;
    }
    const next = editing
      ? mixes.map(mix => mix.name === editing ? { ...mix, name: label } : mix)
      : [...mixes, { name: label, favorite: false, ...settings }];
    if (store(next, 'Saved ' + label + '.')) resetForm();
  };

  render();
  return updateSelected;
}
