(function(a,b){var d=(a.document,a.Zepto||a.$);b.page.fn.delegate=function(a,c,e){var f=b.plugin.domevent._options,g=f.page.cache,h=d(b.component.getActiveContent());3===arguments.length?g.push([a,c,e]):3===arguments.length&&Object.each(arguments[0],function(a,b){g.push([b,c,a])}),h.on.apply(h,arguments)},b.page.fn.undelegate=function(){var f=d(b.component.getActiveContent());f.off.apply(f,arguments)},b.plugin.domevent={_options:null,on:function(a,b){this._options=b,b.page.cache=[],a.events&&Object.each(a.events,function(b){var c=b[2];Object.isTypeof(c,"string")&&(c=a[c]),a.delegate(b[0],b[1],function(b){c.call(this,b,a)})})},off:function(a,b){var b=this._options;Object.each(b.page.cache,function(b){a.undelegate(b[0],b[1],b[2])}),delete b.page.cache}}})(window,window.app);