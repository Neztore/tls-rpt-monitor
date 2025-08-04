import {readFile} from 'node:fs/promises';

let config = {...process.env}
try {
  const filePath = new URL('./config.json', import.meta.url);
  const contents = await readFile(filePath, {encoding: 'utf8'});

  const json = JSON.parse(contents)

  for (const key in json) {
    config[key] = json[key]
  }
  // Allow one recipient to be set via. env if desired.
  if (config.MAIL_TO && typeof config.MAIL_TO === "string") {
    config.recipients = config.MAIL_TO;
  }


} catch (err) {
  console.log(`Failed to load config file`);
  console.error(err.message);
}

const exp = {config}

export default exp;
