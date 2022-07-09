/*
 * This class installs single drag event handlers on the whole document, and
 * evaluates which element they influence at drag time. If you drop a file the
 * relevant callback gets called, based on the element that the file was dropped
 * on. This allows us to swap out and rerender whole sections of the DOM without
 * having to reinstall a bunch of event handlers each time. This nicely
 * decouples the render logic from the drag event management logic.
 *
 * To make sure we really only install single handlers, you can use the
 * singleton pattern and ask for `FileTarget.instance()` instead of creating a new
 * object.
 */

import Click from './Click';

class FileTarget {

  constructor(dragClass = 'dragging') {
    this._dragClass = dragClass;
    this._handlers  = {};

    document.addEventListener('dragover',  (e) => this._dragOver(e));
    document.addEventListener('dragleave', (e) => this._dragLeave(e));
    document.addEventListener('drop',      (e) => this._drop(e));
  }

  register(selector, callback) {
    this._handlers[selector] = callback;
    Click.instance().register(selector, (e, s) => this._openFileDialog(e, s));
  }

  _dragOver(e) {
    if (!this._isDropTarget(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.target.classList.add(this._dragClass);
  }

  _dragLeave(e) {
    if (!this._isDropTarget(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
    e.target.classList.remove(this._dragClass);
  }

  _drop(e) {
    let selector = this._isDropTarget(e.target);
    if (!selector) return;
    e.stopPropagation();
    e.preventDefault();
    e.target.classList.remove(this._dragClass);
    this._handleFile(selector, e, e.dataTransfer.files[0]);
  }

  _isDropTarget(target) {
    return Object.keys(this._handlers).find((selector) => {
      if (target.closest(selector)) return selector;
    }) || false;
  }

  _openFileDialog(e, selector) {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.c8b,.ch8';
    input.addEventListener('change', (c) =>
      this._handleFile(selector, e, c.target.files[0])
    );
    input.click();
  }

  _handleFile(selector, e, file) {
    this._readFile(file)
        .then((r) => this._handlers[selector](file, r, e));
  }

  _readFile(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.addEventListener('load', (e) => resolve(e.target.result));
      reader.readAsArrayBuffer(file);
    });
  }

}

FileTarget.instance = function() {
  if (!!FileTarget._instance) return FileTarget._instance;
  return FileTarget._instance = new FileTarget();
}

export default FileTarget;
