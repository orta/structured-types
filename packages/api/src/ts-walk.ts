import * as ts from 'typescript';
import { PropTypes, PropDiagnostic } from './types';
import { tsDefaults, DocsOptions, ProgramOptions } from './ts-utils';
import { SymbolParser } from './SymbolParser';

export const anaylizeFiles = (
  fileNames: string[],
  options: DocsOptions = {},
  programOptions: ProgramOptions = {},
): PropTypes => {
  const {
    tsOptions = tsDefaults,
    scope = 'exports',
    ...parseOptions
  } = options;
  const { extractNames, collectDiagnostics } = parseOptions || {};
  const { program: userProgram, host } = programOptions;
  const program = userProgram || ts.createProgram(fileNames, tsOptions, host);
  // Get the checker, we will use it to find more about classes
  const checker = program.getTypeChecker();

  const parser = new SymbolParser(checker, parseOptions);
  const parsed: PropTypes = {};
  const addSymbol = (symbol?: ts.Symbol): void => {
    if (symbol) {
      const symbolName = symbol.getName();
      if (!extractNames || extractNames.includes(symbolName)) {
        const prop = parser.parseSymbol(symbol);
        if (prop) {
          parsed[symbolName] = prop;
        }
      }
    }
  };
  for (const fileName of fileNames) {
    const sourceFile = program.getSourceFile(fileName);
    if (sourceFile) {
      if (scope === 'all') {
        ts.forEachChild(sourceFile, (node: ts.Node) => {
          const namedNode = node as ts.ClassDeclaration;
          if (namedNode.name) {
            const symbol = checker.getSymbolAtLocation(namedNode.name);
            addSymbol(symbol);
          }
        });
      }
      const module = checker.getSymbolAtLocation(sourceFile);
      if (module) {
        const exports = checker.getExportsOfModule(module);
        exports.forEach((symbol) => addSymbol(symbol));
      }
    }
  }
  // only return parents that are not already exported from the same file
  const parents = Object.keys(parser.parents)
    .filter((name) => parsed[name] === undefined)
    .reduce((acc, name) => ({ ...acc, [name]: parser.parents[name] }), {});
  if (Object.keys(parents).length) {
    parsed.__parents = parents;
  }
  if (collectDiagnostics) {
    const allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter(({ file }) => file && fileNames.includes(file.fileName));
    if (allDiagnostics.length) {
      parsed.__diagnostics = allDiagnostics.map(
        ({ category, messageText, file, start }) => {
          const message =
            typeof messageText === 'string'
              ? messageText
              : messageText.messageText;

          const result: PropDiagnostic = {
            category,
            message,
          };
          if (file) {
            result.fileName = file.fileName.split('\\').pop()?.split('/').pop();
            if (typeof start !== 'undefined') {
              const location = file.getLineAndCharacterOfPosition(start);
              result.row = location.line + 1;
              result.column = location.character + 1;
            }
          }
          return result;
        },
      );
    }
  }

  return parsed;
};
