import { readFile } from 'node:fs/promises';

let config = process.env
try {
  const filePath = new URL('./config.json', import.meta.url);
  const contents = await readFile(filePath, { encoding: 'utf8' });

  const json = JSON.parse(contents)

  for (const key in json) {
    config[key] = json[key]
  }
} catch (err) {
  console.log(`Failed to load config file`);
  console.error(err.message);
}

const exp = {config}

export default exp;
