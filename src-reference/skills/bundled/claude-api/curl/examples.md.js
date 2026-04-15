import fs from 'fs';
import path from 'path';
const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "examples.md");
const text = fs.readFileSync(filePath, 'utf8');
export default text;
