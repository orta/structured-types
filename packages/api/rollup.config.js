import { config } from '../../rollup-config';

export default config({
  input: ['./src/index.ts', './src/types.ts', './src/react.ts'],
  external: ['typescript'],
});
