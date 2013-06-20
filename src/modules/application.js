//@require message
//@require navigation
//@require template
//@require view
//@require page
//@require navbar
//@require toolbar
//@require content
//@require scroll
//@require transition


(function(win, app, undef) {

var doc = win.document,	$ = win['$'],

	am = app.module,
	StateStack = am.StateStack,
	Message = am.MessageScope,
	Navigation = am.Navigation,
	navigation = Navigation.instance,
	Template = am.Template,
	View = am.View,
	Page = am.Page,
	Navbar = am.Navbar,
	Toolbar = am.Toolbar,
	Content = am.Content,
	Scroll = am.Scroll,
	Animation = am.Animation,
	Transition = am.Transition,
	hooks = Message.get('hooks'),
	pagecache = {},
	pagemeta = {},
	templatecache = {}, 
	resourcecache = {},
	config = app.config = {
		viewport : null,
		templateEngine : null,
		enableMessageLog: false,
		enableContent: true,
		enableNavbar : false,
		enableToolbar : false,
		enableScroll : false,
		enableTransition : false
	};

// Config Initial
hooks.on('app:start', function() {
	var config = app.config;

	Navbar || (config.enableNavbar = false);
	Toolbar || (config.enableToolbar = false);
	Scroll || (config.enableScroll = false);
	Transition || (config.enableTransition = false);

	config.enableNavbar === true && (config.enableNavbar = {});
	config.enableToolbar === true && (config.enableToolbar = {});
	config.enableScroll === true && (config.enableScroll = {});
	config.enableTransition === true && (config.enableTransition = {});
	if (typeof config.enableContent === 'number') {
		config.enableContent = {cacheLength: config.enableContent};
	} else if (config.enableContent instanceof HTMLElement) {
		config.enableContent = {wrapEl: config.enableContent};
	} else if (typeof config.enableContent !== 'object') {
		config.enableContent = {};
	}
});

// Message Initial

//DOM Event Initial
var orientationEvent = 'onorientationchange' in win?'orientationchange':'resize';
window.addEventListener(orientationEvent, function(e){
	setTimeout(function() {
		hooks.trigger('orientaion:change');
	}, 10);
}, false);

// Navigation Initial
var lastState, lastPage;

hooks.on('page:define page:defineMeta', function(page) {
	var name = page.name,
		route = page.route;

	if (navigation.hasRoute(name)) return;

	if (!route) {
		route = {name: name, 'default': true}
	} else if (typeof route === 'string') {
		route = {name: name, text: route}
	}

	navigation.addRoute(route.name, route.text, {
		'default': route['default'],
		callback: route.callback,
		last: route.last
	});
});

navigation.on('forward backward', function(state) {
	var page = Page.get(state.name), meta;

	function pageReady() {
		var page = Page.get(state.name);

		hooks.trigger('navigation:switch', state, page, {
			isSamePage: lastPage && (lastPage.name === page.name),
			isSameState: lastState && StateStack.isEquals(lastState, state)
		});
		lastState = state;
		lastPage = page;
	}

	if (!page) {
		if ((meta = pagemeta[state.name])) {
			var	jsLoaded = {};

			meta.css && app.loadResource(meta.css);
			meta.js && app.loadResource(meta.js, pageReady);
		}
	} else {
		pageReady();
	}
});

// UI Initial
function q(selector, el) {
	el || (el = doc);
	return el.querySelector(selector);
}

hooks.on('navigation:switch', function(state, page, options){
	var c_navbar = config.enableNavbar,
		c_toolbar = config.enableToolbar,
		c_content = config.enableContent,
		c_transition = config.enableTransition,
		c_scroll = config.enableScroll,
		move = state.move,
		transition = state.transition
		;

	if (c_navbar) {
		var i_navbar = c_navbar.instance;

		i_navbar.setTitle(page.title);
		i_navbar.removeButton();

		if (page.buttons) {
			page.buttons.forEach(function(button) {
				var handler = button.handler;

				if (button.type === 'back') {
					if (button.autoHide !== false && state.index < 1) {
						button.hide = true;
					} else {
						button.hide = false;
					}
					if (!handler) {
						handler = button.handler = function() {
							app.navigation.pop();
						}
					}
				}

				if (typeof handler === 'string') {
					handler = page[handler];
				}
				button.handler = function() {
					handler.apply(page, arguments);
				}

				i_navbar.setButton(button);
			});
		}

		if (!options.isSamePage && c_navbar.titleWrapEl.parentNode === c_navbar.backWrapEl.parentNode && 
				c_navbar.titleWrapEl.parentNode === c_navbar.funcWrapEl.parentNode) {
			Transition.float(c_navbar.titleWrapEl.parentNode, transition === 'backward'?'LI':'RI', 50);
		}
	}

	if (c_toolbar) {
		var i_toolbar = c_toolbar.instance;
		page.toolbar?i_toolbar.show('', {height:page.toolbar}):i_toolbar.hide();
	}

	if (!options.isSamePage) {
		var i_content = c_content.instance;
		
		move === 'backward' ? i_content.previous() : i_content.next();

		if (c_scroll) {
			config.viewport.className += ' enableScroll';
			Scroll.disable(c_scroll.wrapEl);
			c_scroll.wrapEl = i_content.getActive();
			Scroll.enable(c_scroll.wrapEl, page.scroll);
		}

		if (c_transition) {
			config.viewport.className += ' enableTransition';
			var offsetX = c_transition.wrapEl.offsetWidth * (transition === 'backward'?1:-1),
				className = c_transition.wrapEl.className += ' ' + transition,
				activeEl = i_content.getActive()
				;

			Transition.move(c_transition.wrapEl, offsetX, 0, function() {
				c_transition.wrapEl.className = className.replace(' ' + transition, '');
				c_transition.wrapEl.style.left = (-Animation.getTransformOffset(c_transition.wrapEl).x) + 'px';
				i_content.setClassName();
			});
		} else {
			i_content.setClassName();
		}
	}
});

hooks.on('navigation:switch orientaion:change', function() {
	var c_navbar = config.enableNavbar,
		c_toolbar = config.enableToolbar,
		c_content = config.enableContent
		;

	var offsetHeight = config.viewport.offsetHeight;
	if (c_navbar) {
		offsetHeight -= c_navbar.wrapEl.offsetHeight;
	}
	if (c_toolbar) {
		offsetHeight -= c_toolbar.wrapEl.offsetHeight;
	}
	c_content.wrapEl.style.height = offsetHeight + 'px';
});

hooks.on('app:start', function() {
	var c_navbar = config.enableNavbar,
		c_toolbar = config.enableToolbar,
		c_content = config.enableContent, i_content,
		c_transition = config.enableTransition,
		c_scroll = config.enableScroll
		;

	config.viewport || (config.viewport = q('.viewport')) || doc.body;

	c_content.wrapEl || (c_content.wrapEl = q('section.content', config.viewport)) || config.viewport;
	c_content.cacheLength || (c_content.cacheLength = 5);
	i_content = c_content.instance = new Content(c_content.wrapEl, {
		cacheLength: c_content.cacheLength
	});

	if (c_navbar) {
		config.viewport.className += ' enableNavbar';
		c_navbar.wrapEl || (c_navbar.wrapEl = q('header.navbar', config.viewport));
		c_navbar.titleWrapEl || (c_navbar.titleWrapEl = q('header.navbar > ul > li:first-child', config.viewport));
		c_navbar.backWrapEl || (c_navbar.backWrapEl = q('header.navbar > ul > li:nth-child(2)', config.viewport));
		c_navbar.funcWrapEl || (c_navbar.funcWrapEl = q('header.navbar > ul > li:last-child', config.viewport));
		c_navbar.instance = new Navbar(c_navbar.wrapEl, c_navbar);
	}

	if (c_toolbar) {
		config.viewport.className += ' enableToolbar';
		c_toolbar.wrapEl || (c_toolbar.wrapEl = q('footer.toolbar', config.viewport));
		c_toolbar.instance = new Toolbar(c_toolbar.wrapEl, c_toolbar);
	}

	if (c_scroll) {
		c_scroll.wrapEl = i_content.getActive();
	}

	if (c_transition) {
		c_transition.wrapEl = i_content.getActive().parentNode;
	}
});

//Plugin Initial
hooks.on('app:start', function() {
	for (var name in app.plugin) {
		var plugin = app.plugin[name];
		plugin.onAppStart && plugin.onAppStart();
	}
});

hooks.on('navigation:switch', function(state, page) {
	for (var name in app.plugin) {
		var plugin = app.plugin[name], pluginOpt;

		if (page.plugins) {
			pluginOpt = page.plugins[name];
		}

		if (plugin) {
			state.plugins || (state.plugins = {});
			state.plugins[name] || (state.plugins[name] = {});
			if (typeof pluginOpt === 'object') {
				for (var p in pluginOpt) {
					state.plugins[name][p] = pluginOpt[p];
				}
			}
			plugin.onNavigationSwitch && plugin.onNavigationSwitch(page, state.plugins[name]);
		}
	}
});

hooks.on('view:render', function(view) {
	if (view.plugins) {
		for (var name in view.plugins) {
			var plugin = app.plugin[name], pluginOpt = view.plugins[name]
				;

			pluginOpt === true && (pluginOpt = view.plugins[name] = {});
			if (plugin && pluginOpt) {
				plugin.onViewRender && plugin.onViewRender(view, pluginOpt);
			}
		}
	}
});

hooks.on('view:destory', function(view) {
	if (view.plugins) {
		for (var name in view.plugins) {
			var plugin = app.plugin[name], pluginOpt = view.plugins[name]
				;

			if (plugin && pluginOpt) {
				plugin.onViewTeardown && plugin.onViewTeardown(view, pluginOpt);
			}
		}
	}
});

hooks.on('page:define', function(page) {
	if (page.plugins) {
		for (var name in page.plugins) {
			var plugin = app.plugin[name], pluginOpt = page.plugins[name]
				;

			if (plugin && pluginOpt) {
				plugin.onPageDefine && plugin.onPageDefine(page, pluginOpt);
			}
		}
	}
});

hooks.on('page:startup', function(state, page) {
	if (page.plugins) {
		for (var name in page.plugins) {
			var plugin = app.plugin[name], pluginOpt = state.plugins[name]
				;

			if (plugin && pluginOpt) {
				plugin.onPageStartup && plugin.onPageStartup(page, pluginOpt);
			}
		}
	}
});

hooks.on('page:teardown', function(state, page) {
	if (page.plugins) {
		for (var name in page.plugins) {
			var plugin = app.plugin[name], pluginOpt = state.plugins[name]
				;

			if (plugin && page.plugins[name]) {
				plugin.onPageTeardown && plugin.onPageTeardown(page, pluginOpt);
			}
		}
	}
});

//Template Initial
function checkTemplate(obj, name, callback) {
	var tpl = obj[name];

	if (typeof tpl === 'string') {
		hooks.on('template:loaded', function(_tpl) {
			if (tpl === _tpl) {
				hooks.off('template:loaded', arguments.callee);
				callback && callback();
			}
		});
	} else if (typeof tpl === 'object') {
		for (var name in tpl) {
			checkTemplate(tpl, name, function() {
				var complete = true;
				for (var name in tpl) {
					if (typeof tpl[name] !== 'function') {
						complete = false;
						break;
					}
				}
				if (complete) {
					callback && callback();
				}
			});
		}
	} else {
		callback && callback();
	}
}

function compileTemplate(template, text) {
	template.compile(text);
	return function(datas) {
		return template.render(datas);
	}
}

function preloadTemplate(obj, name) {
	var tpl = obj[name];

	if (typeof tpl === 'string') {
		var template;

		if (templatecache[tpl]) {
			obj[name] = templatecache[tpl];
		} else if (tpl.match(/\.tpl$/g)) {
			template = new Template();
			template.load(tpl, function(text) {
				obj[name] = templatecache[tpl] = compileTemplate(template, text);
				hooks.trigger('template:loaded', tpl);
			});
		} else {
			template = new Template();
			obj[name] = templatecache[tpl] = compileTemplate(template, tpl);
		}
	} else if (typeof tpl === 'object') {
		for (var name in tpl) {
			preloadTemplate(tpl, name);
		}
	}
}

hooks.on('view:extend', function(view) {
	if (view.prototype.template) {
		preloadTemplate(view.prototype, 'template');
	}
});

hooks.on('page:define', function(page) {
	if (page.template) {
		preloadTemplate(page, 'template');
	}
});

//View Intial
hooks.on('view:extend', function(view) {
	var render = view.prototype.render,
		destory = view.prototype.destory,
		templateLoaded = {}
		;

	view.prototype.render = function() {
		var that = this, args = arguments;
		hooks.trigger('view:render', that, arguments);
		if (!templateLoaded[that.name]) {
			checkTemplate(that, 'template', function() {
				templateLoaded[that.name] = true;
				render.apply(that, args);
			});
		} else {
			render.apply(that, args);
		}
	}

	view.prototype.destory = function() {
		hooks.trigger('view:destory', this, arguments);
		destory.apply(this, arguments);
	}
});

//Page Initial
hooks.on('page:define', function(page) {
	var startup = page.startup,
		teardown = page.teardown;

	page.startup = function(state) {
		hooks.trigger('page:startup', state, page);
		startup.call(page);
	}

	page.teardown = function(state) {
		hooks.trigger('page:teardown', state, page);
		teardown.call(page);
	}

	page.html = function(html) {
		config.enableContent.instance.html(html);
	}

	Object.defineProperty(page, 'el', {
		get: function() {
			return config.enableContent.instance.getActive();
		}
	});

	if ($) {
		Object.defineProperty(page, '$el', {
			get: function() {
				return $(config.enableContent.instance.getActive());
			}
		});
	}
});

hooks.on('navigation:switch', function(state, page, options) {
	var lastDataFragment = page.el.getAttribute('data-fragment'),
		curDataFragment = state.fragment, lastCache, templateLoaded = {}
		;

	if (lastDataFragment === curDataFragment) return;

	if ((lastCache = pagecache[lastDataFragment])) {
		lastCache.page.teardown(lastCache.state);
		delete pagecache[lastDataFragment];
	}

	pagecache[curDataFragment] = {state:state, page:page};
	page.el.setAttribute('data-fragment', curDataFragment);

	if (!templateLoaded[page.name]) {
		checkTemplate(page, 'template', function() {
			templateLoaded[page.name] = true;
			page.startup(state);
		});
	} else {
		page.startup(state);
	}
});

// Func Initial
hooks.on('app:start', function() {
	var c_scroll = config.enableScroll;

	if (c_scroll) {
		Object.defineProperty(app, 'scroll', {
			get: function() {
				return c_scroll.wrapEl;
			}
		})
	}
});

app.start = function() {
	hooks.trigger('app:start');
	navigation.start();
}

app.setTemplate = function(id, tpl) {
	if (typeof tpl === 'string') {
		templatecache[id] = compileTemplate(new Template(), tpl);
	} else if (typeof tpl === 'function') {
		templatecache[id] = tpl;
	}
}

app.extendView = function(properties) {
	var ChildView = View.extend(properties);
	hooks.trigger('view:extend', ChildView);
	return ChildView;
}

app.getView = function(name) {
	return new (View.get(name));
}

app.definePage = function(properties) {
	var page = Page.define(properties);
	hooks.trigger('page:define', page);
	return page;
}

app.definePageMeta = function(meta)  {
	pagemeta[meta.name] = meta;
	hooks.trigger('page:defineMeta', meta);
}

app.getPage = function(name) {
	return Page.get(name);
}

var aEl = document.createElement('a');
app.loadResource = function(urls, callback) {
	if (typeof urls === 'string') {
		urls = [urls];
	} else {
		urls = urls.slice(0);
	}

	function load(url, callback) {
		aEl.href = url;
		url = aEl.href;

		if (resourcecache[url]) {
			callback();
		} else {
			var id = resourcecache[url] = 'resource-' + Date.now() + '-' + Object.keys(resourcecache).length;

			if (url.match(/\.js$/)) {
				var script = document.createElement('script'), loaded = false;
				script.id = id;
				script.async = true;
				script.onload = script.onreadystatechange  = function() {
					if (!loaded) {
						loaded = true;
						callback && callback(url);
					}
				}
				script.src = url;
				doc.body.appendChild(script);
			} else if (url.match(/\.css$/)) {
				var link = document.createElement('link');
				link.id = id;
				link.type = 'text/css';
				link.rel = 'stylesheet';
				link.href = url;
				doc.body.appendChild(link);
				callback();
			}
		}
	}

	load(urls.shift(), function() {
		if (urls.length) {
			load(urls.shift(), arguments.callee);
		} else {
			callback && callback();
		}
	});
}

app.navigation = {
	push: function(fragment, options) {
		navigation.push(fragment, options);
	},

	pop: function() {
		navigation.pop();
	},

	resolve: function(name, params) {
		navigation.resolve(name, params);
	},

	getParameter: function(name) {
		var stack = navigation.getStack(),
			state = stack.getState();

		return state.params[name] || state.args[name] || state.datas[name];
	},

	getParameters: function() {
		var stack = navigation.getStack(),
			state = stack.getState(),
			params = {};

		for (var n in state.params) {
			params[n] = state.params[n];
		}

		for (var n in state.args) {
			params[n] = state.args[n];
		}

		for (var n in state.datas) {
			params[n] = state.datas[n];
		}

		return params;
	},

	getData: function(name) {
		var stack = navigation.getStack(),
			state = stack.getState();

		return state.datas[name];
	},

	setData: function(name, value) {
		var stack = navigation.getStack(),
			state = stack.getState();

		state.datas[name] = value;
	},

	setTitle: function(title) {
		if (app.config.enableNavbar) {
			app.config.enableNavbar.instance.setTitle(title);
		}
	},

	setButton: function(options) {
		if (app.config.enableNavbar) {
			app.config.enableNavbar.instance.setButton(options);
		}
	},

	setToolbar: function(el) {
		if (app.config.enableToolbar) {
			var c_toolbar = app.config.enableToolbar;
			if (typeof el === 'string') {
				c_toolbar.wrapEl.innerHTML = el;
			} else {
				c_toolbar.wrapEl.innerHTML = '';
				c_toolbar.wrapEl.appendChild(el);
			}
		}
	}
}

})(window, window['app']||(window['app']={module:{},plugin:{}}));