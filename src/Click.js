/*
 * This class installs one single click handler on the whole document, and
 * evaluates which callback to call at click time, based on the element that has
 * been clicked. This allows us to swap out and rerender whole sections of the
 * DOM without having to reinstall a bunch of click handlers each time. This
 * nicely decouples the render logic from the click event management logic.
 *
 * To make sure we really only install a single click handler, you can use the
 * singleton pattern and ask for `Click.instance()` instead of creating a new
 * object.
 */

class Click {

  constructor() {
    this._handlers = {};

    document.addEventListener('click',     (e) => this._callHandler('click',     e));
    document.addEventListener('mousedown', (e) => this._callHandler('mousedown', e));
    document.addEventListener('mouseup',   (e) => this._callHandler('mouseup',   e));
  }

  register(selector, handlers = {click: null, mousedown: null, mouseup: null}) {
    if (typeof handlers == 'function') handlers = { click: handlers };
    this._handlers[selector] = this._handlers[selector] || [];
    this._handlers[selector].push(handlers);
  }

  _callHandler(type, e) {
    Object.keys(this._handlers).forEach((selector) => {
      if (e.target.closest(selector) !== null) {
        const handlers = this._handlers[selector].map((h) => h[type]);
        handlers.forEach((handler) => {
          if (typeof handler == 'function' && !e.defaultPrevented)
            handler(e, selector)
        });
      }
    });
  }

}

Click.instance = function() {
  if (!!Click._instance) return Click._instance;
  return Click._instance = new Click();
}

export default Click;
