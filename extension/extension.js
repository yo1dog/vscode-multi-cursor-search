const vscode = require('vscode');

const validRegexFlags = ['i','m','s','u'];

/**
 * @typedef SearchResult
 * @property {import('vscode').Selection} cursorSelection
 * @property {import('vscode').Range} matchRange
 */

let lastPlainSearchInput;
let lastRegexSearchInput;
let lastRegexFlagsInput;
//let lastCaptureGroupInput;


module.exports = {
  activate(context) {
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.plainSearch',                plainSearchCommand               ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.plainSearchSelectBetween',   plainSearchSelectBetweenCommand  ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.plainSearchExpandSelection', plainSearchExpandSelectionCommand));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.regexSearch',                regexSearchCommand               ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.regexSearchSelectBetween',   regexSearchSelectBetweenCommand  ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.regexSearchExpandSelection', regexSearchExpandSelectionCommand));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.advancedSearch',             advancedSearchCommand            ));
  },
  
  deactivate() {
    // noop
  },
  
  search,
  multiCursorSearch,
  selectResults,
  selectBetweenResults,
  selectToResultEnds
};


/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function plainSearchCommand(textEditor) {
  const results = await performPlainMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectResults(results);
}
/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function plainSearchSelectBetweenCommand(textEditor) {
  const results = await performPlainMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectBetweenResults(results);
}
/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function plainSearchExpandSelectionCommand(textEditor) {
  const results = await performPlainMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectToResultEnds(results);
}

/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function regexSearchCommand(textEditor) {
  const results = await performRegexMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectResults(results);
}
/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function regexSearchSelectBetweenCommand(textEditor) {
  const results = await performRegexMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectBetweenResults(results);
}
/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function regexSearchExpandSelectionCommand(textEditor) {
  const results = await performRegexMultiCursorSearch(textEditor);
  if (!results) return;
  textEditor.selections = selectToResultEnds(results);
}

/**
 * @param {import('vscode').TextEditor} textEditor
 */
async function advancedSearchCommand(textEditor) {
  const searchInput = await askRegexSearchInput();
  if (!searchInput) return;
  
  const regexFlagsInput = await askRegexFlagsInput();
  if (typeof regexFlagsInput === 'undefined') return;
  
  const {errMsg: flagsErrMsg, regexFlags} = parseRegexFlagsInput(regexFlagsInput);
  if (flagsErrMsg) {
    vscode.window.showErrorMessage(flagsErrMsg);
    return;
  }
  
  const {errMsg: regexErrMsg, regex} = createRegexSearchRegex(searchInput, regexFlags);
  if (regexErrMsg) {
    vscode.window.showErrorMessage(regexErrMsg);
    return;
  }
  
//  const captureGroupInput = await askCaptureGroupInput();
//  if (typeof captureGroupInput === 'undefined') return;
//  
//  const {errMsg: captureGroupErrMsg, captureGroup} = parseCaptureGroup(captureGroupInput);
//  if (captureGroupErrMsg) {
//    vscode.window.showErrorMessage(captureGroupErrMsg);
//    return;
//  }
  
  const selectionType = await askSelectionType();
  if (!selectionType) return;
  
  const results = multiCursorSearch(textEditor, regex);
  
  switch (selectionType) {
    case 'result':
      textEditor.selections = selectResults(results);
      break;
    case 'between':
      textEditor.selections = selectBetweenResults(results);
      break;
    case 'expand':
      textEditor.selections = selectToResultEnds(results);
      break;
    default: throw new Error(`Unrecognized selection type: '${selectionType}'.`);
  }
}


/**
 * @param {import('vscode').TextEditor} textEditor
 * @returns {SearchResult[]}
 */
async function performPlainMultiCursorSearch(textEditor) {
  const searchInput = await askPlainSearchInput();
  if (!searchInput) return;
  
  const regex = createPlainSeachRegex(
    searchInput,
    getPlainSeachRegexFlags()
  );
  const results = multiCursorSearch(textEditor, regex);
  return results;
}
/**
 * @param {import('vscode').TextEditor} textEditor
 * @returns {SearchResult[]}
 */
async function performRegexMultiCursorSearch(textEditor) {
  const searchInput = await askRegexSearchInput();
  if (!searchInput) return;
  
  const {errMsg, regex} = createRegexSearchRegex(
    searchInput,
    getRegexSearchRegexFlags()
  );
  if (errMsg) {
    vscode.window.showErrorMessage(errMsg);
    return;
  }
  
  const results = multiCursorSearch(textEditor, regex);
  return results;
}

/**
 * @returns {Promise<string>}
 */
async function askPlainSearchInput() {
  const searchInput = await vscode.window.showInputBox({
    prompt: 'Plain Search',
    value: lastPlainSearchInput
  });
  
  if (searchInput) {
    lastPlainSearchInput = searchInput;
  }
  
  return searchInput;
}
/**
 * @returns {Promise<string>}
 */
async function askRegexSearchInput() {
  const searchInput = await vscode.window.showInputBox({
    prompt: 'Regex Search',
    value: lastRegexSearchInput,
    validateInput(input) {
      try {new RegExp(input);} catch(err) {
        return err.message;
      }
    }
  });
  
  if (searchInput) {
    lastRegexSearchInput = searchInput;
  }
  
  return searchInput;
}

/**
 * @returns {Promise<string>}
 */
async function askRegexFlagsInput() {
  if (typeof lastRegexFlagsInput === 'undefined') {
    lastRegexFlagsInput = getRegexSearchRegexFlags();
  }
  
  const regexFlagsInput = await vscode.window.showInputBox({
    prompt: `Regex Flags (${validRegexFlags.join(',')})`,
    value: lastRegexFlagsInput,
    validateInput(input) {
      const {errMsg} = parseRegexFlagsInput(input);
      return errMsg;
    }
  });
  
  if (typeof regexFlagsInput !== 'undefined') {
    lastRegexFlagsInput = regexFlagsInput;
  }
  
  return regexFlagsInput;
}

///**
// * @returns {Promise<string>}
// */
//async function askCaptureGroupInput() {
//  const captureGroupInput = await vscode.window.showInputBox({
//    placeHolder: '',
//    prompt: 'Capture group to select. 0 for entire match.',
//    validateInput(input) {
//      const {errMsg} = parseCaptureGroup(input);
//      return errMsg;
//    },
//    value: lastCaptureGroupInput
//  });
//  
//  if (typeof captureGroupInput !== 'undefined') {
//    lastCaptureGroupInput = captureGroupInput;
//  }
//  
//  return captureGroupInput;
//}

/**
 * @returns {Promise<'result' | 'between' | 'expand'>}
 */
async function askSelectionType() {
  const option = await vscode.window.showQuickPick([
    {type: 'result',  label: 'Select Results',         description: 'Search results are selected.'},
    {type: 'between', label: 'Select Between Results', description: 'Text between cursors and results is selected.'},
    {type: 'expand',  label: 'Expand Selections',      description: 'Text between start of selections/cursors to end of results is selected.'},
  ]);
  return option && option.type;
}

/**
 * @param {string} regexFlagsInput
 * @returns {{errMsg: string, regexFlags: string}}
 */
function parseRegexFlagsInput(regexFlagsInput) {
  const flagOptions = {};
  const regexFlagsInputClean = regexFlagsInput.replace(/(\s|,)+/g, '');
  
  for (const char of regexFlagsInputClean) {
    const flag = char.toLowerCase();
    
    if (!validRegexFlags.includes(flag)) {
      return {errMsg: `Invalid eegex flag: ${char}`};
    }
    if (flagOptions[flag]) {
      return {errMsg: `Duplicate regex flag: ${char}`};
    }
    
    flagOptions[flag] = true;
  }
  
  return {
    regexFlags: buildRegexFlags(flagOptions)
  };
}

///**
// * @param {string} captureGroupInput 
// * @returns {{errMsg: string, captureGroup: number}}
// */
//function parseCaptureGroup(captureGroupInput) {
//  const match = /\s*(\d*)\s*/.exec(captureGroupInput);
//  if (!match) {
//    return {errMsg: 'Digits only.'};
//  }
//  
//  const captureGroupStr = match[1];
//  return {
//    captureGroup: (
//      captureGroupStr.length === 0
//      ? 0
//      : parseInt(captureGroupStr, 10)
//    )
//  };
//}

/**
 * @param {string} searchInput
 * @returns {RegExp}
 */
function createPlainSeachRegex(searchInput, flags) {
  return new RegExp(escapeRegex(searchInput), flags);
}
/**
 * @param {string} searchInput
 * @param {string} flags
 * @returns {{errMsg: string, regex: RegExp}}
 */
function createRegexSearchRegex(searchInput, flags) {
  try {
    return {regex: new RegExp(searchInput, flags)};
  }
  catch(err) {
    return {errMsg: `Invalid regex input.\n${err.message}`};
  }
}

function getPlainSeachRegexFlags() {
  return buildRegexFlags({
    i: vscode.workspace.getConfiguration().get('multiCursorSearch.plainSearch.ignoreCase')
  });
}
function getRegexSearchRegexFlags() {
  return buildRegexFlags({
    i: vscode.workspace.getConfiguration().get('multiCursorSearch.regexSearch.ignoreCase'),
    m: vscode.workspace.getConfiguration().get('multiCursorSearch.regexSearch.multiline' ),
    s: vscode.workspace.getConfiguration().get('multiCursorSearch.regexSearch.dotAll'    ),
    u: vscode.workspace.getConfiguration().get('multiCursorSearch.regexSearch.unicode'   ),
  });
}

/**
 * @param {import('vscode').TextEditor} textEditor
 * @param {RegExp} regex
 * @returns {SearchResult[]}
 */
function multiCursorSearch(textEditor, regex) {
  return textEditor.selections.map(cursorSelection =>
    search(textEditor, regex, cursorSelection)
  );
}

/**
 * @param {import('vscode').TextEditor} textEditor 
 * @param {RegExp} regex 
 * @param {import('vscode').Selection} cursorSelection 
 * @return {SearchResult}
 */
function search(textEditor, regex, cursorSelection) {
  const textRange = new vscode.Range(
    cursorSelection.end,
    textEditor.document.lineAt(textEditor.document.lineCount - 1).rangeIncludingLineBreak.end
  );
  
  const text = textEditor.document.getText(textRange);
  
  let matchRange = null;
  const match = regex.exec(text);
  if (match && match[0]) {
    const matchOffset = textEditor.document.offsetAt(textRange.start) + match.index;
    
    matchRange = new vscode.Range(
      textEditor.document.positionAt(matchOffset),
      textEditor.document.positionAt(matchOffset + match[0].length)
    );
  }
  
  return {
    cursorSelection,
    matchRange
  };
}

/**
 * @param {SearchResult[]} results 
 * @returns {import('vscode').Selection[]}
 */
function selectResults(results) {
  return results.map(result => 
    result.matchRange
    ? new vscode.Selection(result.matchRange.start, result.matchRange.end)
    : result.cursorSelection
  );
}

/**
 * @param {SearchResult[]} results 
 * @returns {import('vscode').Selection[]}
 */
function selectBetweenResults(results) {
  return results.map(result => 
    result.matchRange
    ? new vscode.Selection(result.cursorSelection.end, result.matchRange.start)
    : result.cursorSelection
  );
}

/**
 * @param {SearchResult[]} results 
 * @returns {import('vscode').Selection[]}
 */
function selectToResultEnds(results) {
  return results.map(result => 
    result.matchRange
    ? new vscode.Selection(result.cursorSelection.start, result.matchRange.end)
    : result.cursorSelection
  );
}

function buildRegexFlags({g,i,m,s,u,y}) {
  let flags = '';
  if (g) flags += 'g';
  if (i) flags += 'i';
  if (m) flags += 'm';
  if (s) flags += 's';
  if (u) flags += 'u';
  if (y) flags += 'y';
  
  return flags;
}

// https://stackoverflow.com/a/6969486/2544290
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
