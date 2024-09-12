window.Util = {
  extractDomain(url) {
    const match = /\/\/([^/]+)/.exec(url);
    return match ? match[1] : '';
  },
  extractAnchor(url) {
    const match = /#(.+)/.exec(url);
    return match ? match[1] : '';
  },
  clone(obj) {
    // Note: JSON stringify/parse doesn't work for cloning native objects such as Position and PositionError
    //
    const t = typeof obj;
    if (obj === null || t === 'undefined' || t === 'boolean' || t === 'string' || t === 'number') return obj;
    if (t !== 'object') return null;

    const o = {};
    for (const k in obj) {
      if (Object.hasOwn(obj, k)) {
        o[k] = window.Util.clone(obj[k]);
      }
    }
    return o;
  },

  // Get icon information. 'about' can be:
  //   tabId
  //   null (get info for the default icon)
  //   state object { callUrl: ..., apiCalls: ... }
  //
  // Returns:
  //   { hidden:          true if the icon should be hidden,
  //     private:         true if the current tab is in a private mode,
  //     defaultPrivate:  true if the default settings are in a private mode,
  //     apiCalls:        no of times the API has been called in the current tab
  //     title:           icon's title }
  //
  //
  async getIconInfo() {
    // noop
  },

  async _getStateIconInfo() {
    // noop
  },

  events: {
    _listeners: {},

    addListener(name, fun) {
      if (!this._listeners[name]) this._listeners[name] = [];
      this._listeners[name].push(fun);
    },

    fire(name) {
      const list = this._listeners[name];
      if (!list) return;

      for (let i = 0; i < list.length; i++) list[i]();
    }
  }
};
