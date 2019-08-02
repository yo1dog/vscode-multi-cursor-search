const vscode = require('vscode');

let lastPlainSearchInput;
let lastRegExpSearchInput;


/** @param {import('vscode').TextEditor} textEditor */
async function multiCursorPlainSearch(textEditor) {
  return multiCursorSearch(textEditor, false);
}

/** @param {import('vscode').TextEditor} textEditor */
async function multiCursorRegExpSearch(textEditor) {
  return multiCursorSearch(textEditor, true);
}

/**
 * @param {import('vscode').TextEditor} textEditor
 * @param {boolean} isRegExp
 */
async function multiCursorSearch(textEditor, isRegExp) {
  const searchInput = await vscode.window.showInputBox({
    prompt: `${isRegExp? 'RegExp' : 'Plain'} Search`,
    value: isRegExp? lastRegExpSearchInput : lastPlainSearchInput
  });
  if (!searchInput) return;
  
  let regexp;
  if (isRegExp) {
    lastRegExpSearchInput = searchInput;
    
    const flags = buildRegExpFlags({
      i: vscode.workspace.getConfiguration().get('multiCursorSearch.regexpSearch.ignoreCase'),
      m: vscode.workspace.getConfiguration().get('multiCursorSearch.regexpSearch.multiline' ),
      s: vscode.workspace.getConfiguration().get('multiCursorSearch.regexpSearch.dotAll'    ),
      u: vscode.workspace.getConfiguration().get('multiCursorSearch.regexpSearch.unicode'   ),
    });
    
    try {
      regexp = new RegExp(searchInput, flags);
    } catch(err) {
      vscode.window.showErrorMessage(`Invalid RegExp input.\n${err.message}`);
      return;
    }
  }
  else {
    lastPlainSearchInput = searchInput;
    
    const flags = buildRegExpFlags({
      i: vscode.workspace.getConfiguration().get('multiCursorSearch.plainSearch.ignoreCase')
    });
    regexp = new RegExp(escapeRegExp(searchInput), flags);
  }
  
  textEditor.selections = textEditor.selections.map(selection =>
    search(textEditor, regexp, selection)
  );
}

/**
 * @param {import('vscode').TextEditor} textEditor 
 * @param {RegExp} regexp 
 * @param {import('vscode').Selection} selection 
 */
function search(textEditor, regexp, selection) {
  const textRange = new vscode.Range(
    selection.end,
    textEditor.document.lineAt(textEditor.document.lineCount - 1).rangeIncludingLineBreak.end
  );
  
  const text = textEditor.document.getText(textRange);
  
  const match = regexp.exec(text);
  if (!match) {
    return selection;
  }
  
  const startOffset = textEditor.document.offsetAt(textRange.start) + match.index;
  return new vscode.Selection(
    textEditor.document.positionAt(startOffset),
    textEditor.document.positionAt(startOffset + match[0].length)
  );
}

function buildRegExpFlags({g,i,m,s,u,y}) {
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
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}


module.exports = {
  activate(context) {
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.plainSearch', multiCursorPlainSearch));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('yo1dog.multi-cursor-search.regexpSearch', multiCursorRegExpSearch));
  },
  
  deactivate() {
  },
  
  search
};
