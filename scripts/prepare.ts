import { emptyDirSync, copy } from 'fs-extra';

emptyDirSync('./dist');
copy('./templates', './dist/templates');
