#!/usr/bin/env node

const glob = require('glob');
const fs = require('fs');
const cbf = require('../parser/parser.js');

glob(__dirname + '/ch8/*.ch8', {}, (err, files)=>{
  files.forEach(file => {
    const propsFile = file + '.json';
    const bareFilename = file.substr(file.lastIndexOf('/') + 1);
    const cbfFile = './c8b/' + bareFilename.substr(0, bareFilename.lastIndexOf('.')) + '.c8b';
    console.log(`./ch8/${bareFilename} -> ${cbfFile}`);

    const properties = fs.existsSync(propsFile)
      ? JSON.parse(fs.readFileSync(propsFile, { encoding: 'UTF8' }))
      : {};
    const bytecode = [
      {
        platforms: properties.platforms,
        bytecode: new Uint8Array(fs.readFileSync(file))
      }
    ];

    let binary;
    try {
      binary = cbf.pack({ properties, bytecode, verbose: false });
      fs.writeFileSync(cbfFile, binary);
    } catch(e) {
      if ( 'join' in e )
        console.error(`Could not pack file because of these issues:\n  *`, e.join('\n  * '), '\n');
      else
        console.error(e);
    }

    // For testing if it came out right
    // console.log(cbf.unpack(fs.readFileSync(cbfFile)));
  });
});
