import FileTarget from './FileTarget';
import Energize from './Energize';
import Click from './Click';
import SlimSelect from 'slim-select';
const parser = require('../../parser/parser.js');

let bytecode, properties, filename;

Click.instance().register('#do-wrap', () => {
  properties = Object.fromEntries(
    new FormData(
      document.querySelector('#properties')
    ).entries()
  );
  console.log(properties);

  const binary = parser.pack({ properties, bytecode });
  download(filename, binary, true);
});

Click.instance().register('#do-unwrap', () => {
  download(filename, bytecode, true);
});

new Energize('main');

FileTarget.instance().register('#droptarget', (file, data) => {
  const binary = new Uint8Array(data);
  const name = file.name.substring(0, file.name.lastIndexOf('.'));
  const extension = file.name.substring(file.name.lastIndexOf('.')+1, file.name.length);

  switch(extension) {
    case 'ch8':
      filename = name + '.c8b';
      bytecode = binary;
      goToFileProperties(
        `Converting <code>${file.name}</code>`,
        `Please supply information about this file so we can add it as meta-data to the <code>.c8b</code> file`,
        true
      );
      break;

    case 'c8b':
      filename = name + '.ch8';
      const unpacked = parser.unpack(binary);
      bytecode = unpacked.bytecode;
      goToFileProperties(
        `Unpacked <code>${file.name}</code>`,
        `This is what we found in this <code>.c8b</code> file!`,
        false,
        unpacked.properties
      );
      break;

    default:
      alert('Invalid file extension, expecting either `ch8` or `c8b`');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const platformSelect = document.querySelector('#platform-select');
  const compatibilitySelect = document.querySelector('#compatibility-select');
  const platformSlimSelect = new SlimSelect({ select: '#platform-select' });
  let compatibilitySlimSelect = new SlimSelect({ select: '#compatibility-select' });

  // Add all platforms to the selects
  const platformsList = Object.keys(parser.PLATFORMS).map(key =>
          `<option value='${parser.PLATFORMS[key]}'>${key}</option>`);

  platformSelect.innerHTML = platformsList;
  compatibilitySelect.innerHTML = platformsList;

  // Disable platform selected in the first select
  platformSelect.addEventListener('change', updateDisabledPlatforms);
  updateDisabledPlatforms();

  function updateDisabledPlatforms() {
    compatibilitySelect.querySelectorAll('option')
                       .forEach(option => option.removeAttribute('disabled'));
    compatibilitySelect.querySelector(`option[value='${platformSelect.value}']`)
                       .setAttribute('disabled', true);

    // Reload SlimSelect
    compatibilitySlimSelect.destroy();
    compatibilitySlimSelect = new SlimSelect({ select: '#compatibility-select' });
  }
});

function goToFileProperties(header, text, wrap, properties) {
  document.querySelector('#properties-header').innerHTML = header;
  document.querySelector('#properties-text').innerHTML = text;
  document.querySelector('#do-wrap').classList.add('active');
  document.querySelector('#do-unwrap').classList.toggle('active', !wrap);

  if ( properties ) {
    document.querySelector('select[name="platform"]').value = properties.platform || 0;
    document.querySelector('input[name="name"]').value = properties.name || '';
    document.querySelector('input[name="author"]').value = properties.author || '';
    document.querySelector('textarea[name="description"]').value = properties.description || '';
  }

  // Show the properties section
  document.querySelector('#welcome').classList.remove('active');
  document.querySelector('#file-properties').classList.add('active');
}

function download(newname, contents, binary = false) {
  if ( !newname || !contents ) return;
  const anchor = document.createElement('a');
  anchor.download = newname;
  if ( binary ) {
    anchor.href = 'data:application/octet-stream;base64,' + btoa(String.fromCharCode.apply(null, contents))
  } else
    anchor.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents);
  anchor.click();
}
