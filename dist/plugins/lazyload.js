(function(a,b){function e(){return d.fn.getScrollTop()}function g(){return d.offsetHeight}var d;a.document,b.plugin.lazyload={_options:null,_getOffset:function(a){var c=b.component.getActiveContent(),d=getComputedStyle(a),e=parseFloat(a.getAttribute("height")||a.offsetHeight||d.height);for(offsetParent=a.parentNode,offsetTop=parseFloat(a.offsetTop);offsetParent!=c;)offsetTop+=parseFloat(offsetParent.offsetTop),offsetParent=offsetParent.parentNode;return{top:offsetTop,bottom:offsetTop+e}},check:function(){for(var a=this._options,c=a.page.dataAttr||"data-src",d=b.component.getActiveContent(),f=d.querySelectorAll("img["+c+"]"),h=e(),i=e()+g(),j=0;f.length>j;j++){var m,k=f[j],l=this._getOffset(k);(l.top>h&&i>l.top||l.bottom>h&&i>l.bottom)&&(m=k.getAttribute(c),m&&(k.setAttribute("src",m),k.removeAttribute(c)))}},on:function(a,c){this._options=c,d=b.component.get("scroll"),b.component.on("scrollEnd",this.check,this),a.on("rendered",this.check,this)},off:function(a){b.component.off("scrollEnd",this.check,this),a.off("rendered",this.check,this)}}})(window,window.app);