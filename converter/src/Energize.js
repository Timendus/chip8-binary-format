/**
 * Given a scope this class adds a bunch of behaviour to elements that
 * you define through data attributes. This behaviour is based around adding
 * or removing an 'active' class when elements are clicked:
 *
 *  - data-open — A selector to put the 'active' class on when clicked
 *  - data-close — A selector to remove the 'active' class from when clicked
 *  - data-toggle — A selector to toggle the 'active' class on when clicked
 *  - data-group — If I get the 'active' class, remove it from others in my group
 *  - data-timer — If I get the 'active' class, remove it again after this many milliseconds
 *  - data-follower — A selector for another element that follows my behaviour
 *
 * If you wish, you can override the class name and the names of all the
 * attributes as options to the constructor.
 */

import Click from './Click';

export default class Energize {

  constructor(scope, options = {}) {
    this._scope   = scope;
    this._options = this._normalizeOptions(options);

    Click.instance().register(`${scope} [${this._options.open}], ${scope} [${this._options.close}], ${scope} [${this._options.toggle}]`, (e) => this._handleClick(e));
  }

  _normalizeOptions(options) {
    return Object.assign({
      class:    'active',
      open:     'data-open',
      close:    'data-close',
      toggle:   'data-toggle',
      group:    'data-group',
      timer:    'data-timer',
      follower: 'data-follower'
    }, options);
  }

  _handleClick(evnt) {
    // Which element did we click?
    const target = evnt.target.closest(`[${this._options.open}], [${this._options.close}], [${this._options.toggle}]`);

    // What does the clicked element wish to open, close or toggle?
    const closeSelector  = target.getAttribute(this._options.close);
    const openSelector   = target.getAttribute(this._options.open);
    const toggleSelector = target.getAttribute(this._options.toggle);

    let closeElements = closeSelector ? document.querySelectorAll(`${this._scope} ${closeSelector}`)  : [];
    let openElements  =  openSelector ? document.querySelectorAll(`${this._scope} ${openSelector}`)   : [];

    // Add elements that need to be toggled
    closeElements = [...closeElements, ...(toggleSelector ? document.querySelectorAll(`${this._scope} ${toggleSelector}.${this._options.class}`)       : [])];
    openElements  = [...openElements,  ...(toggleSelector ? document.querySelectorAll(`${this._scope} ${toggleSelector}:not(.${this._options.class})`) : [])];

    this._close(closeElements);
    this._open(openElements);

    // We're done with this event, don't try to evaluate it any further
    evnt.preventDefault();
    evnt.stopPropagation();
  }

  _close(elements) {
    elements.forEach((element) => {
      element.classList.remove(this._options.class);
      this._close(this._followers(element));
    });
  }

  _open(elements) {
    elements.forEach((element) => {
      this._close(this._group(element));
      element.classList.add(this._options.class);
      this._open(this._followers(element));

      // Set self-destruct timer if needed
      const delay = element.getAttribute(this._options.timer);
      if (delay) window.setTimeout(() => this._close([element]), delay);
    });
  }

  _group(element) {
    const group = element.getAttribute(this._options.group);
    if (!group) return [];
    return [...document.querySelectorAll(`${this._scope} [${this._options.group}=${group}]`)];
  }

  _followers(element) {
    const selector = element.getAttribute(this._options.follower);
    if (!selector) return [];
    return [...document.querySelectorAll(`${this._scope} ${selector}`)];
  }

}
