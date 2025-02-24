import { NextApiRequest, NextApiResponse } from 'next';
import { reactPlugin } from '@structured-types/api/react';

import { parseFiles, DocsOptions } from '@structured-types/api';
import { createTempFile } from './../../src/api/create-temp-file';

export default async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  const { code, config, tsoptions } = req.query as {
    code?: string;
    config?: string;
    tsoptions?: string;
  };
  const options: DocsOptions = {
    plugins: [reactPlugin],
    ...(config ? JSON.parse(config) : undefined),
    tsOptions: tsoptions ? JSON.parse(tsoptions) : undefined,
  };

  const { lang = 'typescript' } = options?.tsOptions || {};
  const extension = lang === 'javascript' ? 'jsx' : 'tsx';
  const result = createTempFile(
    extension,
    (fileNames) => {
      return parseFiles(fileNames, options);
    },
    code,
  );

  res.status(200).json(result);
};
