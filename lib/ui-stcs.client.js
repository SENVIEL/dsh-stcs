window.__ModuleLoader__.load({
	id: "dsh-stcs",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region ../../../deepseek-harness/node_modules/.pnpm/classcat@5.0.5/node_modules/classcat/index.js
		function cc(names) {
			if (typeof names === "string" || typeof names === "number") return "" + names;
			let out = "";
			if (Array.isArray(names)) {
				for (let i = 0, tmp; i < names.length; i++) if ((tmp = cc(names[i])) !== "") out += (out && " ") + tmp;
			} else for (let k in names) if (names[k]) out += (out && " ") + k;
			return out;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-dispatch@3.0.1/node_modules/d3-dispatch/src/dispatch.js
		var noop = { value: () => {} };
		function dispatch() {
			for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
				if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
				_[t] = [];
			}
			return new Dispatch(_);
		}
		function Dispatch(_) {
			this._ = _;
		}
		function parseTypenames$1(typenames, types) {
			return typenames.trim().split(/^|\s+/).map(function(t) {
				var name = "", i = t.indexOf(".");
				if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
				if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
				return {
					type: t,
					name
				};
			});
		}
		Dispatch.prototype = dispatch.prototype = {
			constructor: Dispatch,
			on: function(typename, callback) {
				var _ = this._, T = parseTypenames$1(typename + "", _), t, i = -1, n = T.length;
				if (arguments.length < 2) {
					while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
					return;
				}
				if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
				while (++i < n) if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
				else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
				return this;
			},
			copy: function() {
				var copy = {}, _ = this._;
				for (var t in _) copy[t] = _[t].slice();
				return new Dispatch(copy);
			},
			call: function(type, that) {
				if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
				if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
				for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
			},
			apply: function(type, that, args) {
				if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
				for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
			}
		};
		function get$1(type, name) {
			for (var i = 0, n = type.length, c; i < n; ++i) if ((c = type[i]).name === name) return c.value;
		}
		function set$1(type, name, callback) {
			for (var i = 0, n = type.length; i < n; ++i) if (type[i].name === name) {
				type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
				break;
			}
			if (callback != null) type.push({
				name,
				value: callback
			});
			return type;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/matcher.js
		function matcher_default(selector) {
			return function() {
				return this.matches(selector);
			};
		}
		function childMatcher(selector) {
			return function(node) {
				return node.matches(selector);
			};
		}
		var namespaces_default = {
			svg: "http://www.w3.org/2000/svg",
			xhtml: "http://www.w3.org/1999/xhtml",
			xlink: "http://www.w3.org/1999/xlink",
			xml: "http://www.w3.org/XML/1998/namespace",
			xmlns: "http://www.w3.org/2000/xmlns/"
		};
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespace.js
		function namespace_default(name) {
			var prefix = name += "", i = prefix.indexOf(":");
			if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
			return namespaces_default.hasOwnProperty(prefix) ? {
				space: namespaces_default[prefix],
				local: name
			} : name;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/sourceEvent.js
		function sourceEvent_default(event) {
			let sourceEvent;
			while (sourceEvent = event.sourceEvent) event = sourceEvent;
			return event;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/pointer.js
		function pointer_default(event, node) {
			event = sourceEvent_default(event);
			if (node === void 0) node = event.currentTarget;
			if (node) {
				var svg = node.ownerSVGElement || node;
				if (svg.createSVGPoint) {
					var point = svg.createSVGPoint();
					point.x = event.clientX, point.y = event.clientY;
					point = point.matrixTransform(node.getScreenCTM().inverse());
					return [point.x, point.y];
				}
				if (node.getBoundingClientRect) {
					var rect = node.getBoundingClientRect();
					return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
				}
			}
			return [event.pageX, event.pageY];
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selector.js
		function none() {}
		function selector_default(selector) {
			return selector == null ? none : function() {
				return this.querySelector(selector);
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/select.js
		function select_default$2(select) {
			if (typeof select !== "function") select = selector_default(select);
			for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
				if ("__data__" in node) subnode.__data__ = node.__data__;
				subgroup[i] = subnode;
			}
			return new Selection$1(subgroups, this._parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/array.js
		function array(x) {
			return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selectorAll.js
		function empty() {
			return [];
		}
		function selectorAll_default(selector) {
			return selector == null ? empty : function() {
				return this.querySelectorAll(selector);
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectAll.js
		function arrayAll(select) {
			return function() {
				return array(select.apply(this, arguments));
			};
		}
		function selectAll_default$1(select) {
			if (typeof select === "function") select = arrayAll(select);
			else select = selectorAll_default(select);
			for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
				subgroups.push(select.call(node, node.__data__, i, group));
				parents.push(node);
			}
			return new Selection$1(subgroups, parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChild.js
		var find = Array.prototype.find;
		function childFind(match) {
			return function() {
				return find.call(this.children, match);
			};
		}
		function childFirst() {
			return this.firstElementChild;
		}
		function selectChild_default(match) {
			return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChildren.js
		var filter = Array.prototype.filter;
		function children() {
			return Array.from(this.children);
		}
		function childrenFilter(match) {
			return function() {
				return filter.call(this.children, match);
			};
		}
		function selectChildren_default(match) {
			return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/filter.js
		function filter_default$1(match) {
			if (typeof match !== "function") match = matcher_default(match);
			for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
			return new Selection$1(subgroups, this._parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sparse.js
		function sparse_default(update) {
			return new Array(update.length);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/enter.js
		function enter_default() {
			return new Selection$1(this._enter || this._groups.map(sparse_default), this._parents);
		}
		function EnterNode(parent, datum) {
			this.ownerDocument = parent.ownerDocument;
			this.namespaceURI = parent.namespaceURI;
			this._next = null;
			this._parent = parent;
			this.__data__ = datum;
		}
		EnterNode.prototype = {
			constructor: EnterNode,
			appendChild: function(child) {
				return this._parent.insertBefore(child, this._next);
			},
			insertBefore: function(child, next) {
				return this._parent.insertBefore(child, next);
			},
			querySelector: function(selector) {
				return this._parent.querySelector(selector);
			},
			querySelectorAll: function(selector) {
				return this._parent.querySelectorAll(selector);
			}
		};
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/constant.js
		function constant_default$3(x) {
			return function() {
				return x;
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/data.js
		function bindIndex(parent, group, enter, update, exit, data) {
			var i = 0, node, groupLength = group.length, dataLength = data.length;
			for (; i < dataLength; ++i) if (node = group[i]) {
				node.__data__ = data[i];
				update[i] = node;
			} else enter[i] = new EnterNode(parent, data[i]);
			for (; i < groupLength; ++i) if (node = group[i]) exit[i] = node;
		}
		function bindKey(parent, group, enter, update, exit, data, key) {
			var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
			for (i = 0; i < groupLength; ++i) if (node = group[i]) {
				keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
				if (nodeByKeyValue.has(keyValue)) exit[i] = node;
				else nodeByKeyValue.set(keyValue, node);
			}
			for (i = 0; i < dataLength; ++i) {
				keyValue = key.call(parent, data[i], i, data) + "";
				if (node = nodeByKeyValue.get(keyValue)) {
					update[i] = node;
					node.__data__ = data[i];
					nodeByKeyValue.delete(keyValue);
				} else enter[i] = new EnterNode(parent, data[i]);
			}
			for (i = 0; i < groupLength; ++i) if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) exit[i] = node;
		}
		function datum(node) {
			return node.__data__;
		}
		function data_default(value, key) {
			if (!arguments.length) return Array.from(this, datum);
			var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
			if (typeof value !== "function") value = constant_default$3(value);
			for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
				var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength);
				bind(parent, group, enterGroup, updateGroup, exit[j] = new Array(groupLength), data, key);
				for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) if (previous = enterGroup[i0]) {
					if (i0 >= i1) i1 = i0 + 1;
					while (!(next = updateGroup[i1]) && ++i1 < dataLength);
					previous._next = next || null;
				}
			}
			update = new Selection$1(update, parents);
			update._enter = enter;
			update._exit = exit;
			return update;
		}
		function arraylike(data) {
			return typeof data === "object" && "length" in data ? data : Array.from(data);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/exit.js
		function exit_default() {
			return new Selection$1(this._exit || this._groups.map(sparse_default), this._parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/join.js
		function join_default(onenter, onupdate, onexit) {
			var enter = this.enter(), update = this, exit = this.exit();
			if (typeof onenter === "function") {
				enter = onenter(enter);
				if (enter) enter = enter.selection();
			} else enter = enter.append(onenter + "");
			if (onupdate != null) {
				update = onupdate(update);
				if (update) update = update.selection();
			}
			if (onexit == null) exit.remove();
			else onexit(exit);
			return enter && update ? enter.merge(update).order() : update;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/merge.js
		function merge_default$1(context) {
			var selection = context.selection ? context.selection() : context;
			for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
			for (; j < m0; ++j) merges[j] = groups0[j];
			return new Selection$1(merges, this._parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/order.js
		function order_default() {
			for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) if (node = group[i]) {
				if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
				next = node;
			}
			return this;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sort.js
		function sort_default(compare) {
			if (!compare) compare = ascending;
			function compareNode(a, b) {
				return a && b ? compare(a.__data__, b.__data__) : !a - !b;
			}
			for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
				for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group[i]) sortgroup[i] = node;
				sortgroup.sort(compareNode);
			}
			return new Selection$1(sortgroups, this._parents).order();
		}
		function ascending(a, b) {
			return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/call.js
		function call_default() {
			var callback = arguments[0];
			arguments[0] = this;
			callback.apply(null, arguments);
			return this;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/nodes.js
		function nodes_default() {
			return Array.from(this);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/node.js
		function node_default() {
			for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
				var node = group[i];
				if (node) return node;
			}
			return null;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/size.js
		function size_default() {
			let size = 0;
			for (const node of this) ++size;
			return size;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/empty.js
		function empty_default() {
			return !this.node();
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/each.js
		function each_default(callback) {
			for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) callback.call(node, node.__data__, i, group);
			return this;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/attr.js
		function attrRemove$1(name) {
			return function() {
				this.removeAttribute(name);
			};
		}
		function attrRemoveNS$1(fullname) {
			return function() {
				this.removeAttributeNS(fullname.space, fullname.local);
			};
		}
		function attrConstant$1(name, value) {
			return function() {
				this.setAttribute(name, value);
			};
		}
		function attrConstantNS$1(fullname, value) {
			return function() {
				this.setAttributeNS(fullname.space, fullname.local, value);
			};
		}
		function attrFunction$1(name, value) {
			return function() {
				var v = value.apply(this, arguments);
				if (v == null) this.removeAttribute(name);
				else this.setAttribute(name, v);
			};
		}
		function attrFunctionNS$1(fullname, value) {
			return function() {
				var v = value.apply(this, arguments);
				if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
				else this.setAttributeNS(fullname.space, fullname.local, v);
			};
		}
		function attr_default$1(name, value) {
			var fullname = namespace_default(name);
			if (arguments.length < 2) {
				var node = this.node();
				return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
			}
			return this.each((value == null ? fullname.local ? attrRemoveNS$1 : attrRemove$1 : typeof value === "function" ? fullname.local ? attrFunctionNS$1 : attrFunction$1 : fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/window.js
		function window_default(node) {
			return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/style.js
		function styleRemove$1(name) {
			return function() {
				this.style.removeProperty(name);
			};
		}
		function styleConstant$1(name, value, priority) {
			return function() {
				this.style.setProperty(name, value, priority);
			};
		}
		function styleFunction$1(name, value, priority) {
			return function() {
				var v = value.apply(this, arguments);
				if (v == null) this.style.removeProperty(name);
				else this.style.setProperty(name, v, priority);
			};
		}
		function style_default$1(name, value, priority) {
			return arguments.length > 1 ? this.each((value == null ? styleRemove$1 : typeof value === "function" ? styleFunction$1 : styleConstant$1)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
		}
		function styleValue(node, name) {
			return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/property.js
		function propertyRemove(name) {
			return function() {
				delete this[name];
			};
		}
		function propertyConstant(name, value) {
			return function() {
				this[name] = value;
			};
		}
		function propertyFunction(name, value) {
			return function() {
				var v = value.apply(this, arguments);
				if (v == null) delete this[name];
				else this[name] = v;
			};
		}
		function property_default(name, value) {
			return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/classed.js
		function classArray(string) {
			return string.trim().split(/^|\s+/);
		}
		function classList(node) {
			return node.classList || new ClassList(node);
		}
		function ClassList(node) {
			this._node = node;
			this._names = classArray(node.getAttribute("class") || "");
		}
		ClassList.prototype = {
			add: function(name) {
				if (this._names.indexOf(name) < 0) {
					this._names.push(name);
					this._node.setAttribute("class", this._names.join(" "));
				}
			},
			remove: function(name) {
				var i = this._names.indexOf(name);
				if (i >= 0) {
					this._names.splice(i, 1);
					this._node.setAttribute("class", this._names.join(" "));
				}
			},
			contains: function(name) {
				return this._names.indexOf(name) >= 0;
			}
		};
		function classedAdd(node, names) {
			var list = classList(node), i = -1, n = names.length;
			while (++i < n) list.add(names[i]);
		}
		function classedRemove(node, names) {
			var list = classList(node), i = -1, n = names.length;
			while (++i < n) list.remove(names[i]);
		}
		function classedTrue(names) {
			return function() {
				classedAdd(this, names);
			};
		}
		function classedFalse(names) {
			return function() {
				classedRemove(this, names);
			};
		}
		function classedFunction(names, value) {
			return function() {
				(value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
			};
		}
		function classed_default(name, value) {
			var names = classArray(name + "");
			if (arguments.length < 2) {
				var list = classList(this.node()), i = -1, n = names.length;
				while (++i < n) if (!list.contains(names[i])) return false;
				return true;
			}
			return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/text.js
		function textRemove() {
			this.textContent = "";
		}
		function textConstant$1(value) {
			return function() {
				this.textContent = value;
			};
		}
		function textFunction$1(value) {
			return function() {
				var v = value.apply(this, arguments);
				this.textContent = v == null ? "" : v;
			};
		}
		function text_default$1(value) {
			return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction$1 : textConstant$1)(value)) : this.node().textContent;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/html.js
		function htmlRemove() {
			this.innerHTML = "";
		}
		function htmlConstant(value) {
			return function() {
				this.innerHTML = value;
			};
		}
		function htmlFunction(value) {
			return function() {
				var v = value.apply(this, arguments);
				this.innerHTML = v == null ? "" : v;
			};
		}
		function html_default(value) {
			return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/raise.js
		function raise() {
			if (this.nextSibling) this.parentNode.appendChild(this);
		}
		function raise_default() {
			return this.each(raise);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/lower.js
		function lower() {
			if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
		}
		function lower_default() {
			return this.each(lower);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/creator.js
		function creatorInherit(name) {
			return function() {
				var document = this.ownerDocument, uri = this.namespaceURI;
				return uri === "http://www.w3.org/1999/xhtml" && document.documentElement.namespaceURI === "http://www.w3.org/1999/xhtml" ? document.createElement(name) : document.createElementNS(uri, name);
			};
		}
		function creatorFixed(fullname) {
			return function() {
				return this.ownerDocument.createElementNS(fullname.space, fullname.local);
			};
		}
		function creator_default(name) {
			var fullname = namespace_default(name);
			return (fullname.local ? creatorFixed : creatorInherit)(fullname);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/append.js
		function append_default(name) {
			var create = typeof name === "function" ? name : creator_default(name);
			return this.select(function() {
				return this.appendChild(create.apply(this, arguments));
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/insert.js
		function constantNull() {
			return null;
		}
		function insert_default(name, before) {
			var create = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
			return this.select(function() {
				return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/remove.js
		function remove() {
			var parent = this.parentNode;
			if (parent) parent.removeChild(this);
		}
		function remove_default$1() {
			return this.each(remove);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/clone.js
		function selection_cloneShallow() {
			var clone = this.cloneNode(false), parent = this.parentNode;
			return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
		}
		function selection_cloneDeep() {
			var clone = this.cloneNode(true), parent = this.parentNode;
			return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
		}
		function clone_default(deep) {
			return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/datum.js
		function datum_default(value) {
			return arguments.length ? this.property("__data__", value) : this.node().__data__;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/on.js
		function contextListener(listener) {
			return function(event) {
				listener.call(this, event, this.__data__);
			};
		}
		function parseTypenames(typenames) {
			return typenames.trim().split(/^|\s+/).map(function(t) {
				var name = "", i = t.indexOf(".");
				if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
				return {
					type: t,
					name
				};
			});
		}
		function onRemove(typename) {
			return function() {
				var on = this.__on;
				if (!on) return;
				for (var j = 0, i = -1, m = on.length, o; j < m; ++j) if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) this.removeEventListener(o.type, o.listener, o.options);
				else on[++i] = o;
				if (++i) on.length = i;
				else delete this.__on;
			};
		}
		function onAdd(typename, value, options) {
			return function() {
				var on = this.__on, o, listener = contextListener(value);
				if (on) {
					for (var j = 0, m = on.length; j < m; ++j) if ((o = on[j]).type === typename.type && o.name === typename.name) {
						this.removeEventListener(o.type, o.listener, o.options);
						this.addEventListener(o.type, o.listener = listener, o.options = options);
						o.value = value;
						return;
					}
				}
				this.addEventListener(typename.type, listener, options);
				o = {
					type: typename.type,
					name: typename.name,
					value,
					listener,
					options
				};
				if (!on) this.__on = [o];
				else on.push(o);
			};
		}
		function on_default$1(typename, value, options) {
			var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
			if (arguments.length < 2) {
				var on = this.node().__on;
				if (on) {
					for (var j = 0, m = on.length, o; j < m; ++j) for (i = 0, o = on[j]; i < n; ++i) if ((t = typenames[i]).type === o.type && t.name === o.name) return o.value;
				}
				return;
			}
			on = value ? onAdd : onRemove;
			for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
			return this;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/dispatch.js
		function dispatchEvent(node, type, params) {
			var window = window_default(node), event = window.CustomEvent;
			if (typeof event === "function") event = new event(type, params);
			else {
				event = window.document.createEvent("Event");
				if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
				else event.initEvent(type, false, false);
			}
			node.dispatchEvent(event);
		}
		function dispatchConstant(type, params) {
			return function() {
				return dispatchEvent(this, type, params);
			};
		}
		function dispatchFunction(type, params) {
			return function() {
				return dispatchEvent(this, type, params.apply(this, arguments));
			};
		}
		function dispatch_default(type, params) {
			return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/iterator.js
		function* iterator_default() {
			for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) if (node = group[i]) yield node;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/index.js
		var root = [null];
		function Selection$1(groups, parents) {
			this._groups = groups;
			this._parents = parents;
		}
		function selection() {
			return new Selection$1([[document.documentElement]], root);
		}
		function selection_selection() {
			return this;
		}
		Selection$1.prototype = selection.prototype = {
			constructor: Selection$1,
			select: select_default$2,
			selectAll: selectAll_default$1,
			selectChild: selectChild_default,
			selectChildren: selectChildren_default,
			filter: filter_default$1,
			data: data_default,
			enter: enter_default,
			exit: exit_default,
			join: join_default,
			merge: merge_default$1,
			selection: selection_selection,
			order: order_default,
			sort: sort_default,
			call: call_default,
			nodes: nodes_default,
			node: node_default,
			size: size_default,
			empty: empty_default,
			each: each_default,
			attr: attr_default$1,
			style: style_default$1,
			property: property_default,
			classed: classed_default,
			text: text_default$1,
			html: html_default,
			raise: raise_default,
			lower: lower_default,
			append: append_default,
			insert: insert_default,
			remove: remove_default$1,
			clone: clone_default,
			datum: datum_default,
			on: on_default$1,
			dispatch: dispatch_default,
			[Symbol.iterator]: iterator_default
		};
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/select.js
		function select_default$1(selector) {
			return typeof selector === "string" ? new Selection$1([[document.querySelector(selector)]], [document.documentElement]) : new Selection$1([[selector]], root);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/noevent.js
		const nonpassive = { passive: false };
		const nonpassivecapture = {
			capture: true,
			passive: false
		};
		function nopropagation$1(event) {
			event.stopImmediatePropagation();
		}
		function noevent_default$1(event) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/nodrag.js
		function nodrag_default(view) {
			var root = view.document.documentElement, selection = select_default$1(view).on("dragstart.drag", noevent_default$1, nonpassivecapture);
			if ("onselectstart" in root) selection.on("selectstart.drag", noevent_default$1, nonpassivecapture);
			else {
				root.__noselect = root.style.MozUserSelect;
				root.style.MozUserSelect = "none";
			}
		}
		function yesdrag(view, noclick) {
			var root = view.document.documentElement, selection = select_default$1(view).on("dragstart.drag", null);
			if (noclick) {
				selection.on("click.drag", noevent_default$1, nonpassivecapture);
				setTimeout(function() {
					selection.on("click.drag", null);
				}, 0);
			}
			if ("onselectstart" in root) selection.on("selectstart.drag", null);
			else {
				root.style.MozUserSelect = root.__noselect;
				delete root.__noselect;
			}
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/constant.js
		var constant_default$2 = (x) => () => x;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/event.js
		function DragEvent(type, { sourceEvent, subject, target, identifier, active, x, y, dx, dy, dispatch }) {
			Object.defineProperties(this, {
				type: {
					value: type,
					enumerable: true,
					configurable: true
				},
				sourceEvent: {
					value: sourceEvent,
					enumerable: true,
					configurable: true
				},
				subject: {
					value: subject,
					enumerable: true,
					configurable: true
				},
				target: {
					value: target,
					enumerable: true,
					configurable: true
				},
				identifier: {
					value: identifier,
					enumerable: true,
					configurable: true
				},
				active: {
					value: active,
					enumerable: true,
					configurable: true
				},
				x: {
					value: x,
					enumerable: true,
					configurable: true
				},
				y: {
					value: y,
					enumerable: true,
					configurable: true
				},
				dx: {
					value: dx,
					enumerable: true,
					configurable: true
				},
				dy: {
					value: dy,
					enumerable: true,
					configurable: true
				},
				_: { value: dispatch }
			});
		}
		DragEvent.prototype.on = function() {
			var value = this._.on.apply(this._, arguments);
			return value === this._ ? this : value;
		};
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/drag.js
		function defaultFilter$1(event) {
			return !event.ctrlKey && !event.button;
		}
		function defaultContainer() {
			return this.parentNode;
		}
		function defaultSubject(event, d) {
			return d == null ? {
				x: event.x,
				y: event.y
			} : d;
		}
		function defaultTouchable$1() {
			return navigator.maxTouchPoints || "ontouchstart" in this;
		}
		function drag_default() {
			var filter = defaultFilter$1, container = defaultContainer, subject = defaultSubject, touchable = defaultTouchable$1, gestures = {}, listeners = dispatch("start", "drag", "end"), active = 0, mousedownx, mousedowny, mousemoving, touchending, clickDistance2 = 0;
			function drag(selection) {
				selection.on("mousedown.drag", mousedowned).filter(touchable).on("touchstart.drag", touchstarted).on("touchmove.drag", touchmoved, nonpassive).on("touchend.drag touchcancel.drag", touchended).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
			}
			function mousedowned(event, d) {
				if (touchending || !filter.call(this, event, d)) return;
				var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
				if (!gesture) return;
				select_default$1(event.view).on("mousemove.drag", mousemoved, nonpassivecapture).on("mouseup.drag", mouseupped, nonpassivecapture);
				nodrag_default(event.view);
				nopropagation$1(event);
				mousemoving = false;
				mousedownx = event.clientX;
				mousedowny = event.clientY;
				gesture("start", event);
			}
			function mousemoved(event) {
				noevent_default$1(event);
				if (!mousemoving) {
					var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
					mousemoving = dx * dx + dy * dy > clickDistance2;
				}
				gestures.mouse("drag", event);
			}
			function mouseupped(event) {
				select_default$1(event.view).on("mousemove.drag mouseup.drag", null);
				yesdrag(event.view, mousemoving);
				noevent_default$1(event);
				gestures.mouse("end", event);
			}
			function touchstarted(event, d) {
				if (!filter.call(this, event, d)) return;
				var touches = event.changedTouches, c = container.call(this, event, d), n = touches.length, i, gesture;
				for (i = 0; i < n; ++i) if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
					nopropagation$1(event);
					gesture("start", event, touches[i]);
				}
			}
			function touchmoved(event) {
				var touches = event.changedTouches, n = touches.length, i, gesture;
				for (i = 0; i < n; ++i) if (gesture = gestures[touches[i].identifier]) {
					noevent_default$1(event);
					gesture("drag", event, touches[i]);
				}
			}
			function touchended(event) {
				var touches = event.changedTouches, n = touches.length, i, gesture;
				if (touchending) clearTimeout(touchending);
				touchending = setTimeout(function() {
					touchending = null;
				}, 500);
				for (i = 0; i < n; ++i) if (gesture = gestures[touches[i].identifier]) {
					nopropagation$1(event);
					gesture("end", event, touches[i]);
				}
			}
			function beforestart(that, container, event, d, identifier, touch) {
				var dispatch = listeners.copy(), p = pointer_default(touch || event, container), dx, dy, s;
				if ((s = subject.call(that, new DragEvent("beforestart", {
					sourceEvent: event,
					target: drag,
					identifier,
					active,
					x: p[0],
					y: p[1],
					dx: 0,
					dy: 0,
					dispatch
				}), d)) == null) return;
				dx = s.x - p[0] || 0;
				dy = s.y - p[1] || 0;
				return function gesture(type, event, touch) {
					var p0 = p, n;
					switch (type) {
						case "start":
							gestures[identifier] = gesture, n = active++;
							break;
						case "end": delete gestures[identifier], --active;
						case "drag":
							p = pointer_default(touch || event, container), n = active;
							break;
					}
					dispatch.call(type, that, new DragEvent(type, {
						sourceEvent: event,
						subject: s,
						target: drag,
						identifier,
						active: n,
						x: p[0] + dx,
						y: p[1] + dy,
						dx: p[0] - p0[0],
						dy: p[1] - p0[1],
						dispatch
					}), d);
				};
			}
			drag.filter = function(_) {
				return arguments.length ? (filter = typeof _ === "function" ? _ : constant_default$2(!!_), drag) : filter;
			};
			drag.container = function(_) {
				return arguments.length ? (container = typeof _ === "function" ? _ : constant_default$2(_), drag) : container;
			};
			drag.subject = function(_) {
				return arguments.length ? (subject = typeof _ === "function" ? _ : constant_default$2(_), drag) : subject;
			};
			drag.touchable = function(_) {
				return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default$2(!!_), drag) : touchable;
			};
			drag.on = function() {
				var value = listeners.on.apply(listeners, arguments);
				return value === listeners ? drag : value;
			};
			drag.clickDistance = function(_) {
				return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
			};
			return drag;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
		function define_default(constructor, factory, prototype) {
			constructor.prototype = factory.prototype = prototype;
			prototype.constructor = constructor;
		}
		function extend(parent, definition) {
			var prototype = Object.create(parent.prototype);
			for (var key in definition) prototype[key] = definition[key];
			return prototype;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
		function Color() {}
		var darker = .7;
		var brighter = 1 / darker;
		var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
		var named = {
			aliceblue: 15792383,
			antiquewhite: 16444375,
			aqua: 65535,
			aquamarine: 8388564,
			azure: 15794175,
			beige: 16119260,
			bisque: 16770244,
			black: 0,
			blanchedalmond: 16772045,
			blue: 255,
			blueviolet: 9055202,
			brown: 10824234,
			burlywood: 14596231,
			cadetblue: 6266528,
			chartreuse: 8388352,
			chocolate: 13789470,
			coral: 16744272,
			cornflowerblue: 6591981,
			cornsilk: 16775388,
			crimson: 14423100,
			cyan: 65535,
			darkblue: 139,
			darkcyan: 35723,
			darkgoldenrod: 12092939,
			darkgray: 11119017,
			darkgreen: 25600,
			darkgrey: 11119017,
			darkkhaki: 12433259,
			darkmagenta: 9109643,
			darkolivegreen: 5597999,
			darkorange: 16747520,
			darkorchid: 10040012,
			darkred: 9109504,
			darksalmon: 15308410,
			darkseagreen: 9419919,
			darkslateblue: 4734347,
			darkslategray: 3100495,
			darkslategrey: 3100495,
			darkturquoise: 52945,
			darkviolet: 9699539,
			deeppink: 16716947,
			deepskyblue: 49151,
			dimgray: 6908265,
			dimgrey: 6908265,
			dodgerblue: 2003199,
			firebrick: 11674146,
			floralwhite: 16775920,
			forestgreen: 2263842,
			fuchsia: 16711935,
			gainsboro: 14474460,
			ghostwhite: 16316671,
			gold: 16766720,
			goldenrod: 14329120,
			gray: 8421504,
			green: 32768,
			greenyellow: 11403055,
			grey: 8421504,
			honeydew: 15794160,
			hotpink: 16738740,
			indianred: 13458524,
			indigo: 4915330,
			ivory: 16777200,
			khaki: 15787660,
			lavender: 15132410,
			lavenderblush: 16773365,
			lawngreen: 8190976,
			lemonchiffon: 16775885,
			lightblue: 11393254,
			lightcoral: 15761536,
			lightcyan: 14745599,
			lightgoldenrodyellow: 16448210,
			lightgray: 13882323,
			lightgreen: 9498256,
			lightgrey: 13882323,
			lightpink: 16758465,
			lightsalmon: 16752762,
			lightseagreen: 2142890,
			lightskyblue: 8900346,
			lightslategray: 7833753,
			lightslategrey: 7833753,
			lightsteelblue: 11584734,
			lightyellow: 16777184,
			lime: 65280,
			limegreen: 3329330,
			linen: 16445670,
			magenta: 16711935,
			maroon: 8388608,
			mediumaquamarine: 6737322,
			mediumblue: 205,
			mediumorchid: 12211667,
			mediumpurple: 9662683,
			mediumseagreen: 3978097,
			mediumslateblue: 8087790,
			mediumspringgreen: 64154,
			mediumturquoise: 4772300,
			mediumvioletred: 13047173,
			midnightblue: 1644912,
			mintcream: 16121850,
			mistyrose: 16770273,
			moccasin: 16770229,
			navajowhite: 16768685,
			navy: 128,
			oldlace: 16643558,
			olive: 8421376,
			olivedrab: 7048739,
			orange: 16753920,
			orangered: 16729344,
			orchid: 14315734,
			palegoldenrod: 15657130,
			palegreen: 10025880,
			paleturquoise: 11529966,
			palevioletred: 14381203,
			papayawhip: 16773077,
			peachpuff: 16767673,
			peru: 13468991,
			pink: 16761035,
			plum: 14524637,
			powderblue: 11591910,
			purple: 8388736,
			rebeccapurple: 6697881,
			red: 16711680,
			rosybrown: 12357519,
			royalblue: 4286945,
			saddlebrown: 9127187,
			salmon: 16416882,
			sandybrown: 16032864,
			seagreen: 3050327,
			seashell: 16774638,
			sienna: 10506797,
			silver: 12632256,
			skyblue: 8900331,
			slateblue: 6970061,
			slategray: 7372944,
			slategrey: 7372944,
			snow: 16775930,
			springgreen: 65407,
			steelblue: 4620980,
			tan: 13808780,
			teal: 32896,
			thistle: 14204888,
			tomato: 16737095,
			turquoise: 4251856,
			violet: 15631086,
			wheat: 16113331,
			white: 16777215,
			whitesmoke: 16119285,
			yellow: 16776960,
			yellowgreen: 10145074
		};
		define_default(Color, color, {
			copy(channels) {
				return Object.assign(new this.constructor(), this, channels);
			},
			displayable() {
				return this.rgb().displayable();
			},
			hex: color_formatHex,
			formatHex: color_formatHex,
			formatHex8: color_formatHex8,
			formatHsl: color_formatHsl,
			formatRgb: color_formatRgb,
			toString: color_formatRgb
		});
		function color_formatHex() {
			return this.rgb().formatHex();
		}
		function color_formatHex8() {
			return this.rgb().formatHex8();
		}
		function color_formatHsl() {
			return hslConvert(this).formatHsl();
		}
		function color_formatRgb() {
			return this.rgb().formatRgb();
		}
		function color(format) {
			var m, l;
			format = (format + "").trim().toLowerCase();
			return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
		}
		function rgbn(n) {
			return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
		}
		function rgba(r, g, b, a) {
			if (a <= 0) r = g = b = NaN;
			return new Rgb(r, g, b, a);
		}
		function rgbConvert(o) {
			if (!(o instanceof Color)) o = color(o);
			if (!o) return new Rgb();
			o = o.rgb();
			return new Rgb(o.r, o.g, o.b, o.opacity);
		}
		function rgb(r, g, b, opacity) {
			return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
		}
		function Rgb(r, g, b, opacity) {
			this.r = +r;
			this.g = +g;
			this.b = +b;
			this.opacity = +opacity;
		}
		define_default(Rgb, rgb, extend(Color, {
			brighter(k) {
				k = k == null ? brighter : Math.pow(brighter, k);
				return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
			},
			darker(k) {
				k = k == null ? darker : Math.pow(darker, k);
				return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
			},
			rgb() {
				return this;
			},
			clamp() {
				return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
			},
			displayable() {
				return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
			},
			hex: rgb_formatHex,
			formatHex: rgb_formatHex,
			formatHex8: rgb_formatHex8,
			formatRgb: rgb_formatRgb,
			toString: rgb_formatRgb
		}));
		function rgb_formatHex() {
			return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
		}
		function rgb_formatHex8() {
			return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
		}
		function rgb_formatRgb() {
			const a = clampa(this.opacity);
			return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
		}
		function clampa(opacity) {
			return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
		}
		function clampi(value) {
			return Math.max(0, Math.min(255, Math.round(value) || 0));
		}
		function hex(value) {
			value = clampi(value);
			return (value < 16 ? "0" : "") + value.toString(16);
		}
		function hsla(h, s, l, a) {
			if (a <= 0) h = s = l = NaN;
			else if (l <= 0 || l >= 1) h = s = NaN;
			else if (s <= 0) h = NaN;
			return new Hsl(h, s, l, a);
		}
		function hslConvert(o) {
			if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
			if (!(o instanceof Color)) o = color(o);
			if (!o) return new Hsl();
			if (o instanceof Hsl) return o;
			o = o.rgb();
			var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
			if (s) {
				if (r === max) h = (g - b) / s + (g < b) * 6;
				else if (g === max) h = (b - r) / s + 2;
				else h = (r - g) / s + 4;
				s /= l < .5 ? max + min : 2 - max - min;
				h *= 60;
			} else s = l > 0 && l < 1 ? 0 : h;
			return new Hsl(h, s, l, o.opacity);
		}
		function hsl(h, s, l, opacity) {
			return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
		}
		function Hsl(h, s, l, opacity) {
			this.h = +h;
			this.s = +s;
			this.l = +l;
			this.opacity = +opacity;
		}
		define_default(Hsl, hsl, extend(Color, {
			brighter(k) {
				k = k == null ? brighter : Math.pow(brighter, k);
				return new Hsl(this.h, this.s, this.l * k, this.opacity);
			},
			darker(k) {
				k = k == null ? darker : Math.pow(darker, k);
				return new Hsl(this.h, this.s, this.l * k, this.opacity);
			},
			rgb() {
				var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < .5 ? l : 1 - l) * s, m1 = 2 * l - m2;
				return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
			},
			clamp() {
				return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
			},
			displayable() {
				return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
			},
			formatHsl() {
				const a = clampa(this.opacity);
				return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
			}
		}));
		function clamph(value) {
			value = (value || 0) % 360;
			return value < 0 ? value + 360 : value;
		}
		function clampt(value) {
			return Math.max(0, Math.min(1, value || 0));
		}
		function hsl2rgb(h, m1, m2) {
			return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
		var constant_default$1 = (x) => () => x;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
		function linear(a, d) {
			return function(t) {
				return a + t * d;
			};
		}
		function exponential(a, b, y) {
			return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
				return Math.pow(a + t * b, y);
			};
		}
		function gamma(y) {
			return (y = +y) === 1 ? nogamma : function(a, b) {
				return b - a ? exponential(a, b, y) : constant_default$1(isNaN(a) ? b : a);
			};
		}
		function nogamma(a, b) {
			var d = b - a;
			return d ? linear(a, d) : constant_default$1(isNaN(a) ? b : a);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
		var rgb_default = (function rgbGamma(y) {
			var color = gamma(y);
			function rgb$1(start, end) {
				var r = color((start = rgb(start)).r, (end = rgb(end)).r), g = color(start.g, end.g), b = color(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
				return function(t) {
					start.r = r(t);
					start.g = g(t);
					start.b = b(t);
					start.opacity = opacity(t);
					return start + "";
				};
			}
			rgb$1.gamma = rgbGamma;
			return rgb$1;
		})(1);
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/numberArray.js
		function numberArray_default(a, b) {
			if (!b) b = [];
			var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
			return function(t) {
				for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
				return c;
			};
		}
		function isNumberArray(x) {
			return ArrayBuffer.isView(x) && !(x instanceof DataView);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/array.js
		function genericArray(a, b) {
			var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x = new Array(na), c = new Array(nb), i;
			for (i = 0; i < na; ++i) x[i] = value_default(a[i], b[i]);
			for (; i < nb; ++i) c[i] = b[i];
			return function(t) {
				for (i = 0; i < na; ++i) c[i] = x[i](t);
				return c;
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/date.js
		function date_default(a, b) {
			var d = /* @__PURE__ */ new Date();
			return a = +a, b = +b, function(t) {
				return d.setTime(a * (1 - t) + b * t), d;
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
		function number_default(a, b) {
			return a = +a, b = +b, function(t) {
				return a * (1 - t) + b * t;
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/object.js
		function object_default(a, b) {
			var i = {}, c = {}, k;
			if (a === null || typeof a !== "object") a = {};
			if (b === null || typeof b !== "object") b = {};
			for (k in b) if (k in a) i[k] = value_default(a[k], b[k]);
			else c[k] = b[k];
			return function(t) {
				for (k in i) c[k] = i[k](t);
				return c;
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
		var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, reB = new RegExp(reA.source, "g");
		function zero(b) {
			return function() {
				return b;
			};
		}
		function one(b) {
			return function(t) {
				return b(t) + "";
			};
		}
		function string_default(a, b) {
			var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
			a = a + "", b = b + "";
			while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
				if ((bs = bm.index) > bi) {
					bs = b.slice(bi, bs);
					if (s[i]) s[i] += bs;
					else s[++i] = bs;
				}
				if ((am = am[0]) === (bm = bm[0])) if (s[i]) s[i] += bm;
				else s[++i] = bm;
				else {
					s[++i] = null;
					q.push({
						i,
						x: number_default(am, bm)
					});
				}
				bi = reB.lastIndex;
			}
			if (bi < b.length) {
				bs = b.slice(bi);
				if (s[i]) s[i] += bs;
				else s[++i] = bs;
			}
			return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
				for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
				return s.join("");
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/value.js
		function value_default(a, b) {
			var t = typeof b, c;
			return b == null || t === "boolean" ? constant_default$1(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
		var degrees = 180 / Math.PI;
		var identity$1 = {
			translateX: 0,
			translateY: 0,
			rotate: 0,
			skewX: 0,
			scaleX: 1,
			scaleY: 1
		};
		function decompose_default(a, b, c, d, e, f) {
			var scaleX, scaleY, skewX;
			if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
			if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
			if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
			if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
			return {
				translateX: e,
				translateY: f,
				rotate: Math.atan2(b, a) * degrees,
				skewX: Math.atan(skewX) * degrees,
				scaleX,
				scaleY
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/parse.js
		var svgNode;
		function parseCss(value) {
			const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
			return m.isIdentity ? identity$1 : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
		}
		function parseSvg(value) {
			if (value == null) return identity$1;
			if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
			svgNode.setAttribute("transform", value);
			if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
			value = value.matrix;
			return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/index.js
		function interpolateTransform(parse, pxComma, pxParen, degParen) {
			function pop(s) {
				return s.length ? s.pop() + " " : "";
			}
			function translate(xa, ya, xb, yb, s, q) {
				if (xa !== xb || ya !== yb) {
					var i = s.push("translate(", null, pxComma, null, pxParen);
					q.push({
						i: i - 4,
						x: number_default(xa, xb)
					}, {
						i: i - 2,
						x: number_default(ya, yb)
					});
				} else if (xb || yb) s.push("translate(" + xb + pxComma + yb + pxParen);
			}
			function rotate(a, b, s, q) {
				if (a !== b) {
					if (a - b > 180) b += 360;
					else if (b - a > 180) a += 360;
					q.push({
						i: s.push(pop(s) + "rotate(", null, degParen) - 2,
						x: number_default(a, b)
					});
				} else if (b) s.push(pop(s) + "rotate(" + b + degParen);
			}
			function skewX(a, b, s, q) {
				if (a !== b) q.push({
					i: s.push(pop(s) + "skewX(", null, degParen) - 2,
					x: number_default(a, b)
				});
				else if (b) s.push(pop(s) + "skewX(" + b + degParen);
			}
			function scale(xa, ya, xb, yb, s, q) {
				if (xa !== xb || ya !== yb) {
					var i = s.push(pop(s) + "scale(", null, ",", null, ")");
					q.push({
						i: i - 4,
						x: number_default(xa, xb)
					}, {
						i: i - 2,
						x: number_default(ya, yb)
					});
				} else if (xb !== 1 || yb !== 1) s.push(pop(s) + "scale(" + xb + "," + yb + ")");
			}
			return function(a, b) {
				var s = [], q = [];
				a = parse(a), b = parse(b);
				translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
				rotate(a.rotate, b.rotate, s, q);
				skewX(a.skewX, b.skewX, s, q);
				scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
				a = b = null;
				return function(t) {
					var i = -1, n = q.length, o;
					while (++i < n) s[(o = q[i]).i] = o.x(t);
					return s.join("");
				};
			};
		}
		var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
		var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/zoom.js
		var epsilon2 = 1e-12;
		function cosh(x) {
			return ((x = Math.exp(x)) + 1 / x) / 2;
		}
		function sinh(x) {
			return ((x = Math.exp(x)) - 1 / x) / 2;
		}
		function tanh(x) {
			return ((x = Math.exp(2 * x)) - 1) / (x + 1);
		}
		var zoom_default$1 = (function zoomRho(rho, rho2, rho4) {
			function zoom(p0, p1) {
				var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2], dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, i, S;
				if (d2 < epsilon2) {
					S = Math.log(w1 / w0) / rho;
					i = function(t) {
						return [
							ux0 + t * dx,
							uy0 + t * dy,
							w0 * Math.exp(rho * t * S)
						];
					};
				} else {
					var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
					S = (Math.log(Math.sqrt(b1 * b1 + 1) - b1) - r0) / rho;
					i = function(t) {
						var s = t * S, coshr0 = cosh(r0), u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
						return [
							ux0 + u * dx,
							uy0 + u * dy,
							w0 * coshr0 / cosh(rho * s + r0)
						];
					};
				}
				i.duration = S * 1e3 * rho / Math.SQRT2;
				return i;
			}
			zoom.rho = function(_) {
				var _1 = Math.max(.001, +_), _2 = _1 * _1;
				return zoomRho(_1, _2, _2 * _2);
			};
			return zoom;
		})(Math.SQRT2, 2, 4);
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timer.js
		var frame = 0, timeout = 0, interval = 0, pokeDelay = 1e3, taskHead, taskTail, clockLast = 0, clockNow = 0, clockSkew = 0, clock = typeof performance === "object" && performance.now ? performance : Date, setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
			setTimeout(f, 17);
		};
		function now() {
			return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
		}
		function clearNow() {
			clockNow = 0;
		}
		function Timer() {
			this._call = this._time = this._next = null;
		}
		Timer.prototype = timer.prototype = {
			constructor: Timer,
			restart: function(callback, delay, time) {
				if (typeof callback !== "function") throw new TypeError("callback is not a function");
				time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
				if (!this._next && taskTail !== this) {
					if (taskTail) taskTail._next = this;
					else taskHead = this;
					taskTail = this;
				}
				this._call = callback;
				this._time = time;
				sleep();
			},
			stop: function() {
				if (this._call) {
					this._call = null;
					this._time = Infinity;
					sleep();
				}
			}
		};
		function timer(callback, delay, time) {
			var t = new Timer();
			t.restart(callback, delay, time);
			return t;
		}
		function timerFlush() {
			now();
			++frame;
			var t = taskHead, e;
			while (t) {
				if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
				t = t._next;
			}
			--frame;
		}
		function wake() {
			clockNow = (clockLast = clock.now()) + clockSkew;
			frame = timeout = 0;
			try {
				timerFlush();
			} finally {
				frame = 0;
				nap();
				clockNow = 0;
			}
		}
		function poke() {
			var now = clock.now(), delay = now - clockLast;
			if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
		}
		function nap() {
			var t0, t1 = taskHead, t2, time = Infinity;
			while (t1) if (t1._call) {
				if (time > t1._time) time = t1._time;
				t0 = t1, t1 = t1._next;
			} else {
				t2 = t1._next, t1._next = null;
				t1 = t0 ? t0._next = t2 : taskHead = t2;
			}
			taskTail = t0;
			sleep(time);
		}
		function sleep(time) {
			if (frame) return;
			if (timeout) timeout = clearTimeout(timeout);
			if (time - clockNow > 24) {
				if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
				if (interval) interval = clearInterval(interval);
			} else {
				if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
				frame = 1, setFrame(wake);
			}
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timeout.js
		function timeout_default(callback, delay, time) {
			var t = new Timer();
			delay = delay == null ? 0 : +delay;
			t.restart((elapsed) => {
				t.stop();
				callback(elapsed + delay);
			}, delay, time);
			return t;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/schedule.js
		var emptyOn = dispatch("start", "end", "cancel", "interrupt");
		var emptyTween = [];
		function schedule_default(node, name, id, index, group, timing) {
			var schedules = node.__transition;
			if (!schedules) node.__transition = {};
			else if (id in schedules) return;
			create(node, id, {
				name,
				index,
				group,
				on: emptyOn,
				tween: emptyTween,
				time: timing.time,
				delay: timing.delay,
				duration: timing.duration,
				ease: timing.ease,
				timer: null,
				state: 0
			});
		}
		function init(node, id) {
			var schedule = get(node, id);
			if (schedule.state > 0) throw new Error("too late; already scheduled");
			return schedule;
		}
		function set(node, id) {
			var schedule = get(node, id);
			if (schedule.state > 3) throw new Error("too late; already running");
			return schedule;
		}
		function get(node, id) {
			var schedule = node.__transition;
			if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
			return schedule;
		}
		function create(node, id, self) {
			var schedules = node.__transition, tween;
			schedules[id] = self;
			self.timer = timer(schedule, 0, self.time);
			function schedule(elapsed) {
				self.state = 1;
				self.timer.restart(start, self.delay, self.time);
				if (self.delay <= elapsed) start(elapsed - self.delay);
			}
			function start(elapsed) {
				var i, j, n, o;
				if (self.state !== 1) return stop();
				for (i in schedules) {
					o = schedules[i];
					if (o.name !== self.name) continue;
					if (o.state === 3) return timeout_default(start);
					if (o.state === 4) {
						o.state = 6;
						o.timer.stop();
						o.on.call("interrupt", node, node.__data__, o.index, o.group);
						delete schedules[i];
					} else if (+i < id) {
						o.state = 6;
						o.timer.stop();
						o.on.call("cancel", node, node.__data__, o.index, o.group);
						delete schedules[i];
					}
				}
				timeout_default(function() {
					if (self.state === 3) {
						self.state = 4;
						self.timer.restart(tick, self.delay, self.time);
						tick(elapsed);
					}
				});
				self.state = 2;
				self.on.call("start", node, node.__data__, self.index, self.group);
				if (self.state !== 2) return;
				self.state = 3;
				tween = new Array(n = self.tween.length);
				for (i = 0, j = -1; i < n; ++i) if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) tween[++j] = o;
				tween.length = j + 1;
			}
			function tick(elapsed) {
				var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = 5, 1), i = -1, n = tween.length;
				while (++i < n) tween[i].call(node, t);
				if (self.state === 5) {
					self.on.call("end", node, node.__data__, self.index, self.group);
					stop();
				}
			}
			function stop() {
				self.state = 6;
				self.timer.stop();
				delete schedules[id];
				for (var i in schedules) return;
				delete node.__transition;
			}
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/interrupt.js
		function interrupt_default$1(node, name) {
			var schedules = node.__transition, schedule, active, empty = true, i;
			if (!schedules) return;
			name = name == null ? null : name + "";
			for (i in schedules) {
				if ((schedule = schedules[i]).name !== name) {
					empty = false;
					continue;
				}
				active = schedule.state > 2 && schedule.state < 5;
				schedule.state = 6;
				schedule.timer.stop();
				schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
				delete schedules[i];
			}
			if (empty) delete node.__transition;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/interrupt.js
		function interrupt_default(name) {
			return this.each(function() {
				interrupt_default$1(this, name);
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/tween.js
		function tweenRemove(id, name) {
			var tween0, tween1;
			return function() {
				var schedule = set(this, id), tween = schedule.tween;
				if (tween !== tween0) {
					tween1 = tween0 = tween;
					for (var i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
						tween1 = tween1.slice();
						tween1.splice(i, 1);
						break;
					}
				}
				schedule.tween = tween1;
			};
		}
		function tweenFunction(id, name, value) {
			var tween0, tween1;
			if (typeof value !== "function") throw new Error();
			return function() {
				var schedule = set(this, id), tween = schedule.tween;
				if (tween !== tween0) {
					tween1 = (tween0 = tween).slice();
					for (var t = {
						name,
						value
					}, i = 0, n = tween1.length; i < n; ++i) if (tween1[i].name === name) {
						tween1[i] = t;
						break;
					}
					if (i === n) tween1.push(t);
				}
				schedule.tween = tween1;
			};
		}
		function tween_default(name, value) {
			var id = this._id;
			name += "";
			if (arguments.length < 2) {
				var tween = get(this.node(), id).tween;
				for (var i = 0, n = tween.length, t; i < n; ++i) if ((t = tween[i]).name === name) return t.value;
				return null;
			}
			return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
		}
		function tweenValue(transition, name, value) {
			var id = transition._id;
			transition.each(function() {
				var schedule = set(this, id);
				(schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
			});
			return function(node) {
				return get(node, id).value[name];
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/interpolate.js
		function interpolate_default(a, b) {
			var c;
			return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attr.js
		function attrRemove(name) {
			return function() {
				this.removeAttribute(name);
			};
		}
		function attrRemoveNS(fullname) {
			return function() {
				this.removeAttributeNS(fullname.space, fullname.local);
			};
		}
		function attrConstant(name, interpolate, value1) {
			var string00, string1 = value1 + "", interpolate0;
			return function() {
				var string0 = this.getAttribute(name);
				return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
			};
		}
		function attrConstantNS(fullname, interpolate, value1) {
			var string00, string1 = value1 + "", interpolate0;
			return function() {
				var string0 = this.getAttributeNS(fullname.space, fullname.local);
				return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
			};
		}
		function attrFunction(name, interpolate, value) {
			var string00, string10, interpolate0;
			return function() {
				var string0, value1 = value(this), string1;
				if (value1 == null) return void this.removeAttribute(name);
				string0 = this.getAttribute(name);
				string1 = value1 + "";
				return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
			};
		}
		function attrFunctionNS(fullname, interpolate, value) {
			var string00, string10, interpolate0;
			return function() {
				var string0, value1 = value(this), string1;
				if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
				string0 = this.getAttributeNS(fullname.space, fullname.local);
				string1 = value1 + "";
				return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
			};
		}
		function attr_default(name, value) {
			var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
			return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname) : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attrTween.js
		function attrInterpolate(name, i) {
			return function(t) {
				this.setAttribute(name, i.call(this, t));
			};
		}
		function attrInterpolateNS(fullname, i) {
			return function(t) {
				this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
			};
		}
		function attrTweenNS(fullname, value) {
			var t0, i0;
			function tween() {
				var i = value.apply(this, arguments);
				if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
				return t0;
			}
			tween._value = value;
			return tween;
		}
		function attrTween(name, value) {
			var t0, i0;
			function tween() {
				var i = value.apply(this, arguments);
				if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
				return t0;
			}
			tween._value = value;
			return tween;
		}
		function attrTween_default(name, value) {
			var key = "attr." + name;
			if (arguments.length < 2) return (key = this.tween(key)) && key._value;
			if (value == null) return this.tween(key, null);
			if (typeof value !== "function") throw new Error();
			var fullname = namespace_default(name);
			return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/delay.js
		function delayFunction(id, value) {
			return function() {
				init(this, id).delay = +value.apply(this, arguments);
			};
		}
		function delayConstant(id, value) {
			return value = +value, function() {
				init(this, id).delay = value;
			};
		}
		function delay_default(value) {
			var id = this._id;
			return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id, value)) : get(this.node(), id).delay;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/duration.js
		function durationFunction(id, value) {
			return function() {
				set(this, id).duration = +value.apply(this, arguments);
			};
		}
		function durationConstant(id, value) {
			return value = +value, function() {
				set(this, id).duration = value;
			};
		}
		function duration_default(value) {
			var id = this._id;
			return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id, value)) : get(this.node(), id).duration;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/ease.js
		function easeConstant(id, value) {
			if (typeof value !== "function") throw new Error();
			return function() {
				set(this, id).ease = value;
			};
		}
		function ease_default(value) {
			var id = this._id;
			return arguments.length ? this.each(easeConstant(id, value)) : get(this.node(), id).ease;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/easeVarying.js
		function easeVarying(id, value) {
			return function() {
				var v = value.apply(this, arguments);
				if (typeof v !== "function") throw new Error();
				set(this, id).ease = v;
			};
		}
		function easeVarying_default(value) {
			if (typeof value !== "function") throw new Error();
			return this.each(easeVarying(this._id, value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/filter.js
		function filter_default(match) {
			if (typeof match !== "function") match = matcher_default(match);
			for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) if ((node = group[i]) && match.call(node, node.__data__, i, group)) subgroup.push(node);
			return new Transition(subgroups, this._parents, this._name, this._id);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/merge.js
		function merge_default(transition) {
			if (transition._id !== this._id) throw new Error();
			for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) if (node = group0[i] || group1[i]) merge[i] = node;
			for (; j < m0; ++j) merges[j] = groups0[j];
			return new Transition(merges, this._parents, this._name, this._id);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/on.js
		function start(name) {
			return (name + "").trim().split(/^|\s+/).every(function(t) {
				var i = t.indexOf(".");
				if (i >= 0) t = t.slice(0, i);
				return !t || t === "start";
			});
		}
		function onFunction(id, name, listener) {
			var on0, on1, sit = start(name) ? init : set;
			return function() {
				var schedule = sit(this, id), on = schedule.on;
				if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
				schedule.on = on1;
			};
		}
		function on_default(name, listener) {
			var id = this._id;
			return arguments.length < 2 ? get(this.node(), id).on.on(name) : this.each(onFunction(id, name, listener));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/remove.js
		function removeFunction(id) {
			return function() {
				var parent = this.parentNode;
				for (var i in this.__transition) if (+i !== id) return;
				if (parent) parent.removeChild(this);
			};
		}
		function remove_default() {
			return this.on("end.remove", removeFunction(this._id));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/select.js
		function select_default(select) {
			var name = this._name, id = this._id;
			if (typeof select !== "function") select = selector_default(select);
			for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
				if ("__data__" in node) subnode.__data__ = node.__data__;
				subgroup[i] = subnode;
				schedule_default(subgroup[i], name, id, i, subgroup, get(node, id));
			}
			return new Transition(subgroups, this._parents, name, id);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selectAll.js
		function selectAll_default(select) {
			var name = this._name, id = this._id;
			if (typeof select !== "function") select = selectorAll_default(select);
			for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
				for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) if (child = children[k]) schedule_default(child, name, id, k, children, inherit);
				subgroups.push(children);
				parents.push(node);
			}
			return new Transition(subgroups, parents, name, id);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selection.js
		var Selection = selection.prototype.constructor;
		function selection_default() {
			return new Selection(this._groups, this._parents);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/style.js
		function styleNull(name, interpolate) {
			var string00, string10, interpolate0;
			return function() {
				var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
				return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
			};
		}
		function styleRemove(name) {
			return function() {
				this.style.removeProperty(name);
			};
		}
		function styleConstant(name, interpolate, value1) {
			var string00, string1 = value1 + "", interpolate0;
			return function() {
				var string0 = styleValue(this, name);
				return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
			};
		}
		function styleFunction(name, interpolate, value) {
			var string00, string10, interpolate0;
			return function() {
				var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
				if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
				return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
			};
		}
		function styleMaybeRemove(id, name) {
			var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
			return function() {
				var schedule = set(this, id), on = schedule.on, listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : void 0;
				if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
				schedule.on = on1;
			};
		}
		function style_default(name, value, priority) {
			var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
			return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove(name)) : typeof value === "function" ? this.styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant(name, i, value), priority).on("end.style." + name, null);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/styleTween.js
		function styleInterpolate(name, i, priority) {
			return function(t) {
				this.style.setProperty(name, i.call(this, t), priority);
			};
		}
		function styleTween(name, value, priority) {
			var t, i0;
			function tween() {
				var i = value.apply(this, arguments);
				if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
				return t;
			}
			tween._value = value;
			return tween;
		}
		function styleTween_default(name, value, priority) {
			var key = "style." + (name += "");
			if (arguments.length < 2) return (key = this.tween(key)) && key._value;
			if (value == null) return this.tween(key, null);
			if (typeof value !== "function") throw new Error();
			return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/text.js
		function textConstant(value) {
			return function() {
				this.textContent = value;
			};
		}
		function textFunction(value) {
			return function() {
				var value1 = value(this);
				this.textContent = value1 == null ? "" : value1;
			};
		}
		function text_default(value) {
			return this.tween("text", typeof value === "function" ? textFunction(tweenValue(this, "text", value)) : textConstant(value == null ? "" : value + ""));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/textTween.js
		function textInterpolate(i) {
			return function(t) {
				this.textContent = i.call(this, t);
			};
		}
		function textTween(value) {
			var t0, i0;
			function tween() {
				var i = value.apply(this, arguments);
				if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
				return t0;
			}
			tween._value = value;
			return tween;
		}
		function textTween_default(value) {
			var key = "text";
			if (arguments.length < 1) return (key = this.tween(key)) && key._value;
			if (value == null) return this.tween(key, null);
			if (typeof value !== "function") throw new Error();
			return this.tween(key, textTween(value));
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/transition.js
		function transition_default$1() {
			var name = this._name, id0 = this._id, id1 = newId();
			for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) {
				var inherit = get(node, id0);
				schedule_default(node, name, id1, i, group, {
					time: inherit.time + inherit.delay + inherit.duration,
					delay: 0,
					duration: inherit.duration,
					ease: inherit.ease
				});
			}
			return new Transition(groups, this._parents, name, id1);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/end.js
		function end_default() {
			var on0, on1, that = this, id = that._id, size = that.size();
			return new Promise(function(resolve, reject) {
				var cancel = { value: reject }, end = { value: function() {
					if (--size === 0) resolve();
				} };
				that.each(function() {
					var schedule = set(this, id), on = schedule.on;
					if (on !== on0) {
						on1 = (on0 = on).copy();
						on1._.cancel.push(cancel);
						on1._.interrupt.push(cancel);
						on1._.end.push(end);
					}
					schedule.on = on1;
				});
				if (size === 0) resolve();
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/index.js
		var id = 0;
		function Transition(groups, parents, name, id) {
			this._groups = groups;
			this._parents = parents;
			this._name = name;
			this._id = id;
		}
		function transition(name) {
			return selection().transition(name);
		}
		function newId() {
			return ++id;
		}
		var selection_prototype = selection.prototype;
		Transition.prototype = transition.prototype = {
			constructor: Transition,
			select: select_default,
			selectAll: selectAll_default,
			selectChild: selection_prototype.selectChild,
			selectChildren: selection_prototype.selectChildren,
			filter: filter_default,
			merge: merge_default,
			selection: selection_default,
			transition: transition_default$1,
			call: selection_prototype.call,
			nodes: selection_prototype.nodes,
			node: selection_prototype.node,
			size: selection_prototype.size,
			empty: selection_prototype.empty,
			each: selection_prototype.each,
			on: on_default,
			attr: attr_default,
			attrTween: attrTween_default,
			style: style_default,
			styleTween: styleTween_default,
			text: text_default,
			textTween: textTween_default,
			remove: remove_default,
			tween: tween_default,
			delay: delay_default,
			duration: duration_default,
			ease: ease_default,
			easeVarying: easeVarying_default,
			end: end_default,
			[Symbol.iterator]: selection_prototype[Symbol.iterator]
		};
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
		function cubicInOut(t) {
			return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/transition.js
		var defaultTiming = {
			time: null,
			delay: 0,
			duration: 250,
			ease: cubicInOut
		};
		function inherit(node, id) {
			var timing;
			while (!(timing = node.__transition) || !(timing = timing[id])) if (!(node = node.parentNode)) throw new Error(`transition ${id} not found`);
			return timing;
		}
		function transition_default(name) {
			var id, timing;
			if (name instanceof Transition) id = name._id, name = name._name;
			else id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
			for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) if (node = group[i]) schedule_default(node, name, id, i, group, timing || inherit(node, id));
			return new Transition(groups, this._parents, name, id);
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/index.js
		selection.prototype.interrupt = interrupt_default;
		selection.prototype.transition = transition_default;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/constant.js
		var constant_default = (x) => () => x;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/event.js
		function ZoomEvent(type, { sourceEvent, target, transform, dispatch }) {
			Object.defineProperties(this, {
				type: {
					value: type,
					enumerable: true,
					configurable: true
				},
				sourceEvent: {
					value: sourceEvent,
					enumerable: true,
					configurable: true
				},
				target: {
					value: target,
					enumerable: true,
					configurable: true
				},
				transform: {
					value: transform,
					enumerable: true,
					configurable: true
				},
				_: { value: dispatch }
			});
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/transform.js
		function Transform(k, x, y) {
			this.k = k;
			this.x = x;
			this.y = y;
		}
		Transform.prototype = {
			constructor: Transform,
			scale: function(k) {
				return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
			},
			translate: function(x, y) {
				return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
			},
			apply: function(point) {
				return [point[0] * this.k + this.x, point[1] * this.k + this.y];
			},
			applyX: function(x) {
				return x * this.k + this.x;
			},
			applyY: function(y) {
				return y * this.k + this.y;
			},
			invert: function(location) {
				return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
			},
			invertX: function(x) {
				return (x - this.x) / this.k;
			},
			invertY: function(y) {
				return (y - this.y) / this.k;
			},
			rescaleX: function(x) {
				return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
			},
			rescaleY: function(y) {
				return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
			},
			toString: function() {
				return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
			}
		};
		var identity = new Transform(1, 0, 0);
		transform.prototype = Transform.prototype;
		function transform(node) {
			while (!node.__zoom) if (!(node = node.parentNode)) return identity;
			return node.__zoom;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/noevent.js
		function nopropagation(event) {
			event.stopImmediatePropagation();
		}
		function noevent_default(event) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/zoom.js
		function defaultFilter(event) {
			return (!event.ctrlKey || event.type === "wheel") && !event.button;
		}
		function defaultExtent() {
			var e = this;
			if (e instanceof SVGElement) {
				e = e.ownerSVGElement || e;
				if (e.hasAttribute("viewBox")) {
					e = e.viewBox.baseVal;
					return [[e.x, e.y], [e.x + e.width, e.y + e.height]];
				}
				return [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
			}
			return [[0, 0], [e.clientWidth, e.clientHeight]];
		}
		function defaultTransform() {
			return this.__zoom || identity;
		}
		function defaultWheelDelta(event) {
			return -event.deltaY * (event.deltaMode === 1 ? .05 : event.deltaMode ? 1 : .002) * (event.ctrlKey ? 10 : 1);
		}
		function defaultTouchable() {
			return navigator.maxTouchPoints || "ontouchstart" in this;
		}
		function defaultConstrain(transform, extent, translateExtent) {
			var dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0], dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0], dy0 = transform.invertY(extent[0][1]) - translateExtent[0][1], dy1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
			return transform.translate(dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1), dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1));
		}
		function zoom_default() {
			var filter = defaultFilter, extent = defaultExtent, constrain = defaultConstrain, wheelDelta = defaultWheelDelta, touchable = defaultTouchable, scaleExtent = [0, Infinity], translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]], duration = 250, interpolate = zoom_default$1, listeners = dispatch("start", "zoom", "end"), touchstarting, touchfirst, touchending, touchDelay = 500, wheelDelay = 150, clickDistance2 = 0, tapDistance = 10;
			function zoom(selection) {
				selection.property("__zoom", defaultTransform).on("wheel.zoom", wheeled, { passive: false }).on("mousedown.zoom", mousedowned).on("dblclick.zoom", dblclicked).filter(touchable).on("touchstart.zoom", touchstarted).on("touchmove.zoom", touchmoved).on("touchend.zoom touchcancel.zoom", touchended).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
			}
			zoom.transform = function(collection, transform, point, event) {
				var selection = collection.selection ? collection.selection() : collection;
				selection.property("__zoom", defaultTransform);
				if (collection !== selection) schedule(collection, transform, point, event);
				else selection.interrupt().each(function() {
					gesture(this, arguments).event(event).start().zoom(null, typeof transform === "function" ? transform.apply(this, arguments) : transform).end();
				});
			};
			zoom.scaleBy = function(selection, k, p, event) {
				zoom.scaleTo(selection, function() {
					return this.__zoom.k * (typeof k === "function" ? k.apply(this, arguments) : k);
				}, p, event);
			};
			zoom.scaleTo = function(selection, k, p, event) {
				zoom.transform(selection, function() {
					var e = extent.apply(this, arguments), t0 = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p, p1 = t0.invert(p0), k1 = typeof k === "function" ? k.apply(this, arguments) : k;
					return constrain(translate(scale(t0, k1), p0, p1), e, translateExtent);
				}, p, event);
			};
			zoom.translateBy = function(selection, x, y, event) {
				zoom.transform(selection, function() {
					return constrain(this.__zoom.translate(typeof x === "function" ? x.apply(this, arguments) : x, typeof y === "function" ? y.apply(this, arguments) : y), extent.apply(this, arguments), translateExtent);
				}, null, event);
			};
			zoom.translateTo = function(selection, x, y, p, event) {
				zoom.transform(selection, function() {
					var e = extent.apply(this, arguments), t = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p;
					return constrain(identity.translate(p0[0], p0[1]).scale(t.k).translate(typeof x === "function" ? -x.apply(this, arguments) : -x, typeof y === "function" ? -y.apply(this, arguments) : -y), e, translateExtent);
				}, p, event);
			};
			function scale(transform, k) {
				k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
				return k === transform.k ? transform : new Transform(k, transform.x, transform.y);
			}
			function translate(transform, p0, p1) {
				var x = p0[0] - p1[0] * transform.k, y = p0[1] - p1[1] * transform.k;
				return x === transform.x && y === transform.y ? transform : new Transform(transform.k, x, y);
			}
			function centroid(extent) {
				return [(+extent[0][0] + +extent[1][0]) / 2, (+extent[0][1] + +extent[1][1]) / 2];
			}
			function schedule(transition, transform, point, event) {
				transition.on("start.zoom", function() {
					gesture(this, arguments).event(event).start();
				}).on("interrupt.zoom end.zoom", function() {
					gesture(this, arguments).event(event).end();
				}).tween("zoom", function() {
					var that = this, args = arguments, g = gesture(that, args).event(event), e = extent.apply(that, args), p = point == null ? centroid(e) : typeof point === "function" ? point.apply(that, args) : point, w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]), a = that.__zoom, b = typeof transform === "function" ? transform.apply(that, args) : transform, i = interpolate(a.invert(p).concat(w / a.k), b.invert(p).concat(w / b.k));
					return function(t) {
						if (t === 1) t = b;
						else {
							var l = i(t), k = w / l[2];
							t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k);
						}
						g.zoom(null, t);
					};
				});
			}
			function gesture(that, args, clean) {
				return !clean && that.__zooming || new Gesture(that, args);
			}
			function Gesture(that, args) {
				this.that = that;
				this.args = args;
				this.active = 0;
				this.sourceEvent = null;
				this.extent = extent.apply(that, args);
				this.taps = 0;
			}
			Gesture.prototype = {
				event: function(event) {
					if (event) this.sourceEvent = event;
					return this;
				},
				start: function() {
					if (++this.active === 1) {
						this.that.__zooming = this;
						this.emit("start");
					}
					return this;
				},
				zoom: function(key, transform) {
					if (this.mouse && key !== "mouse") this.mouse[1] = transform.invert(this.mouse[0]);
					if (this.touch0 && key !== "touch") this.touch0[1] = transform.invert(this.touch0[0]);
					if (this.touch1 && key !== "touch") this.touch1[1] = transform.invert(this.touch1[0]);
					this.that.__zoom = transform;
					this.emit("zoom");
					return this;
				},
				end: function() {
					if (--this.active === 0) {
						delete this.that.__zooming;
						this.emit("end");
					}
					return this;
				},
				emit: function(type) {
					var d = select_default$1(this.that).datum();
					listeners.call(type, this.that, new ZoomEvent(type, {
						sourceEvent: this.sourceEvent,
						target: zoom,
						type,
						transform: this.that.__zoom,
						dispatch: listeners
					}), d);
				}
			};
			function wheeled(event, ...args) {
				if (!filter.apply(this, arguments)) return;
				var g = gesture(this, args).event(event), t = this.__zoom, k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta.apply(this, arguments)))), p = pointer_default(event);
				if (g.wheel) {
					if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) g.mouse[1] = t.invert(g.mouse[0] = p);
					clearTimeout(g.wheel);
				} else if (t.k === k) return;
				else {
					g.mouse = [p, t.invert(p)];
					interrupt_default$1(this);
					g.start();
				}
				noevent_default(event);
				g.wheel = setTimeout(wheelidled, wheelDelay);
				g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));
				function wheelidled() {
					g.wheel = null;
					g.end();
				}
			}
			function mousedowned(event, ...args) {
				if (touchending || !filter.apply(this, arguments)) return;
				var currentTarget = event.currentTarget, g = gesture(this, args, true).event(event), v = select_default$1(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true), p = pointer_default(event, currentTarget), x0 = event.clientX, y0 = event.clientY;
				nodrag_default(event.view);
				nopropagation(event);
				g.mouse = [p, this.__zoom.invert(p)];
				interrupt_default$1(this);
				g.start();
				function mousemoved(event) {
					noevent_default(event);
					if (!g.moved) {
						var dx = event.clientX - x0, dy = event.clientY - y0;
						g.moved = dx * dx + dy * dy > clickDistance2;
					}
					g.event(event).zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = pointer_default(event, currentTarget), g.mouse[1]), g.extent, translateExtent));
				}
				function mouseupped(event) {
					v.on("mousemove.zoom mouseup.zoom", null);
					yesdrag(event.view, g.moved);
					noevent_default(event);
					g.event(event).end();
				}
			}
			function dblclicked(event, ...args) {
				if (!filter.apply(this, arguments)) return;
				var t0 = this.__zoom, p0 = pointer_default(event.changedTouches ? event.changedTouches[0] : event, this), p1 = t0.invert(p0), k1 = t0.k * (event.shiftKey ? .5 : 2), t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, args), translateExtent);
				noevent_default(event);
				if (duration > 0) select_default$1(this).transition().duration(duration).call(schedule, t1, p0, event);
				else select_default$1(this).call(zoom.transform, t1, p0, event);
			}
			function touchstarted(event, ...args) {
				if (!filter.apply(this, arguments)) return;
				var touches = event.touches, n = touches.length, g = gesture(this, args, event.changedTouches.length === n).event(event), started, i, t, p;
				nopropagation(event);
				for (i = 0; i < n; ++i) {
					t = touches[i], p = pointer_default(t, this);
					p = [
						p,
						this.__zoom.invert(p),
						t.identifier
					];
					if (!g.touch0) g.touch0 = p, started = true, g.taps = 1 + !!touchstarting;
					else if (!g.touch1 && g.touch0[2] !== p[2]) g.touch1 = p, g.taps = 0;
				}
				if (touchstarting) touchstarting = clearTimeout(touchstarting);
				if (started) {
					if (g.taps < 2) touchfirst = p[0], touchstarting = setTimeout(function() {
						touchstarting = null;
					}, touchDelay);
					interrupt_default$1(this);
					g.start();
				}
			}
			function touchmoved(event, ...args) {
				if (!this.__zooming) return;
				var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t, p, l;
				noevent_default(event);
				for (i = 0; i < n; ++i) {
					t = touches[i], p = pointer_default(t, this);
					if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
					else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
				}
				t = g.that.__zoom;
				if (g.touch1) {
					var p0 = g.touch0[0], l0 = g.touch0[1], p1 = g.touch1[0], l1 = g.touch1[1], dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp, dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
					t = scale(t, Math.sqrt(dp / dl));
					p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
					l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
				} else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
				else return;
				g.zoom("touch", constrain(translate(t, p, l), g.extent, translateExtent));
			}
			function touchended(event, ...args) {
				if (!this.__zooming) return;
				var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t;
				nopropagation(event);
				if (touchending) clearTimeout(touchending);
				touchending = setTimeout(function() {
					touchending = null;
				}, touchDelay);
				for (i = 0; i < n; ++i) {
					t = touches[i];
					if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
					else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
				}
				if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
				if (g.touch0) g.touch0[1] = this.__zoom.invert(g.touch0[0]);
				else {
					g.end();
					if (g.taps === 2) {
						t = pointer_default(t, this);
						if (Math.hypot(touchfirst[0] - t[0], touchfirst[1] - t[1]) < tapDistance) {
							var p = select_default$1(this).on("dblclick.zoom");
							if (p) p.apply(this, arguments);
						}
					}
				}
			}
			zoom.wheelDelta = function(_) {
				return arguments.length ? (wheelDelta = typeof _ === "function" ? _ : constant_default(+_), zoom) : wheelDelta;
			};
			zoom.filter = function(_) {
				return arguments.length ? (filter = typeof _ === "function" ? _ : constant_default(!!_), zoom) : filter;
			};
			zoom.touchable = function(_) {
				return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default(!!_), zoom) : touchable;
			};
			zoom.extent = function(_) {
				return arguments.length ? (extent = typeof _ === "function" ? _ : constant_default([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
			};
			zoom.scaleExtent = function(_) {
				return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
			};
			zoom.translateExtent = function(_) {
				return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
			};
			zoom.constrain = function(_) {
				return arguments.length ? (constrain = _, zoom) : constrain;
			};
			zoom.duration = function(_) {
				return arguments.length ? (duration = +_, zoom) : duration;
			};
			zoom.interpolate = function(_) {
				return arguments.length ? (interpolate = _, zoom) : interpolate;
			};
			zoom.on = function() {
				var value = listeners.on.apply(listeners, arguments);
				return value === listeners ? zoom : value;
			};
			zoom.clickDistance = function(_) {
				return arguments.length ? (clickDistance2 = (_ = +_) * _, zoom) : Math.sqrt(clickDistance2);
			};
			zoom.tapDistance = function(_) {
				return arguments.length ? (tapDistance = +_, zoom) : tapDistance;
			};
			return zoom;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/@xyflow+system@0.0.80/node_modules/@xyflow/system/dist/esm/index.js
		const errorMessages = {
			error001: (lib = "react") => `Seems like you have not used ${lib === "svelte" ? "SvelteFlowProvider" : "ReactFlowProvider"} as an ancestor. Help: https://${lib}flow.dev/error#001`,
			error002: () => "It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.",
			error003: (nodeType) => `Node type "${nodeType}" not found. Using fallback type "default".`,
			error004: () => "The parent container needs a width and a height to render the graph.",
			error005: () => "Only child nodes can use a parent extent.",
			error006: () => "Can't create edge. An edge needs a source and a target.",
			error007: (id) => `The old edge with id=${id} does not exist.`,
			error009: (type) => `Marker type "${type}" doesn't exist.`,
			error008: (handleType, { id, sourceHandle, targetHandle }) => `Couldn't create edge for ${handleType} handle id: "${handleType === "source" ? sourceHandle : targetHandle}", edge id: ${id}.`,
			error010: () => "Handle: No node id found. Make sure to only use a Handle inside a custom Node.",
			error011: (edgeType) => `Edge type "${edgeType}" not found. Using fallback type "default".`,
			error012: (id) => `Node with id "${id}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`,
			error013: (lib = "react") => `It seems that you haven't loaded the styles. Please import '@xyflow/${lib}/dist/style.css' or base.css to make sure everything is working properly.`,
			error014: () => "useNodeConnections: No node ID found. Call useNodeConnections inside a custom Node or provide a node ID.",
			error015: () => "It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs.",
			error016: (id) => `Edge with id "${id}" does not exist, it may have been removed. This can happen when an edge is deleted before the "onEdgeClick" handler is called.`
		};
		const infiniteExtent = [[Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY], [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]];
		const elementSelectionKeys = [
			"Enter",
			" ",
			"Escape"
		];
		const defaultAriaLabelConfig = {
			"node.a11yDescription.default": "Press enter or space to select a node. Press delete to remove it and escape to cancel.",
			"node.a11yDescription.keyboardDisabled": "Press enter or space to select a node. You can then use the arrow keys to move the node around. Press delete to remove it and escape to cancel.",
			"node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) => `Moved selected node ${direction}. New position, x: ${x}, y: ${y}`,
			"edge.a11yDescription.default": "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel.",
			"controls.ariaLabel": "Control Panel",
			"controls.zoomIn.ariaLabel": "Zoom In",
			"controls.zoomOut.ariaLabel": "Zoom Out",
			"controls.fitView.ariaLabel": "Fit View",
			"controls.interactive.ariaLabel": "Toggle Interactivity",
			"minimap.ariaLabel": "Mini Map",
			"handle.ariaLabel": "Handle"
		};
		/**
		* The `ConnectionMode` is used to set the mode of connection between nodes.
		* The `Strict` mode is the default one and only allows source to target edges.
		* `Loose` mode allows source to source and target to target edges as well.
		*
		* @public
		*/
		var ConnectionMode;
		(function(ConnectionMode) {
			ConnectionMode["Strict"] = "strict";
			ConnectionMode["Loose"] = "loose";
		})(ConnectionMode || (ConnectionMode = {}));
		/**
		* This enum is used to set the different modes of panning the viewport when the
		* user scrolls. The `Free` mode allows the user to pan in any direction by scrolling
		* with a device like a trackpad. The `Vertical` and `Horizontal` modes restrict
		* scroll panning to only the vertical or horizontal axis, respectively.
		*
		* @public
		*/
		var PanOnScrollMode;
		(function(PanOnScrollMode) {
			PanOnScrollMode["Free"] = "free";
			PanOnScrollMode["Vertical"] = "vertical";
			PanOnScrollMode["Horizontal"] = "horizontal";
		})(PanOnScrollMode || (PanOnScrollMode = {}));
		var SelectionMode;
		(function(SelectionMode) {
			SelectionMode["Partial"] = "partial";
			SelectionMode["Full"] = "full";
		})(SelectionMode || (SelectionMode = {}));
		const initialConnection = {
			inProgress: false,
			isValid: null,
			from: null,
			fromHandle: null,
			fromPosition: null,
			fromNode: null,
			to: null,
			toHandle: null,
			toPosition: null,
			toNode: null,
			pointer: null
		};
		/**
		* If you set the `connectionLineType` prop on your [`<ReactFlow />`](/api-reference/react-flow#connection-connectionLineType)
		*component, it will dictate the style of connection line rendered when creating
		*new edges.
		*
		* @public
		*
		* @remarks If you choose to render a custom connection line component, this value will be
		*passed to your component as part of its [`ConnectionLineComponentProps`](/api-reference/types/connection-line-component-props).
		*/
		var ConnectionLineType;
		(function(ConnectionLineType) {
			ConnectionLineType["Bezier"] = "default";
			ConnectionLineType["Straight"] = "straight";
			ConnectionLineType["Step"] = "step";
			ConnectionLineType["SmoothStep"] = "smoothstep";
			ConnectionLineType["SimpleBezier"] = "simplebezier";
		})(ConnectionLineType || (ConnectionLineType = {}));
		/**
		* Edges may optionally have a marker on either end. The MarkerType type enumerates
		* the options available to you when configuring a given marker.
		*
		* @public
		*/
		var MarkerType;
		(function(MarkerType) {
			MarkerType["Arrow"] = "arrow";
			MarkerType["ArrowClosed"] = "arrowclosed";
		})(MarkerType || (MarkerType = {}));
		/**
		* While [`PanelPosition`](/api-reference/types/panel-position) can be used to place a
		* component in the corners of a container, the `Position` enum is less precise and used
		* primarily in relation to edges and handles.
		*
		* @public
		*/
		var Position;
		(function(Position) {
			Position["Left"] = "left";
			Position["Top"] = "top";
			Position["Right"] = "right";
			Position["Bottom"] = "bottom";
		})(Position || (Position = {}));
		const oppositePosition = {
			[Position.Left]: Position.Right,
			[Position.Right]: Position.Left,
			[Position.Top]: Position.Bottom,
			[Position.Bottom]: Position.Top
		};
		function getConnectionStatus(isValid) {
			return isValid === null ? null : isValid ? "valid" : "invalid";
		}
		/**
		* Test whether an object is usable as an Edge
		* @public
		* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
		* @param element - The element to test
		* @returns A boolean indicating whether the element is an Edge
		*/
		const isEdgeBase = (element) => !!element && typeof element === "object" && "id" in element && "source" in element && "target" in element;
		/**
		* Test whether an object is usable as a Node
		* @public
		* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
		* @param element - The element to test
		* @returns A boolean indicating whether the element is an Node
		*/
		const isNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "position" in element && !("source" in element) && !("target" in element);
		const isInternalNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "internals" in element && !("source" in element) && !("target" in element);
		const getNodePositionWithOrigin = (node, nodeOrigin = [0, 0]) => {
			const { width, height } = getNodeDimensions(node);
			const origin = node.origin ?? nodeOrigin;
			const offsetX = width * origin[0];
			const offsetY = height * origin[1];
			return {
				x: node.position.x - offsetX,
				y: node.position.y - offsetY
			};
		};
		/**
		* Returns the bounding box that contains all the given nodes in an array. This can
		* be useful when combined with [`getViewportForBounds`](/api-reference/utils/get-viewport-for-bounds)
		* to calculate the correct transform to fit the given nodes in a viewport.
		* @public
		* @remarks Useful when combined with {@link getViewportForBounds} to calculate the correct transform to fit the given nodes in a viewport.
		* @param nodes - Nodes to calculate the bounds for.
		* @returns Bounding box enclosing all nodes.
		*
		* @remarks This function was previously called `getRectOfNodes`
		*
		* @example
		* ```js
		*import { getNodesBounds } from '@xyflow/react';
		*
		*const nodes = [
		*  {
		*    id: 'a',
		*    position: { x: 0, y: 0 },
		*    data: { label: 'a' },
		*    width: 50,
		*    height: 25,
		*  },
		*  {
		*    id: 'b',
		*    position: { x: 100, y: 100 },
		*    data: { label: 'b' },
		*    width: 50,
		*    height: 25,
		*  },
		*];
		*
		*const bounds = getNodesBounds(nodes);
		*```
		*/
		const getNodesBounds = (nodes, params = { nodeOrigin: [0, 0] }) => {
			if (nodes.length === 0) return {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
			let hasNode = false;
			const box = nodes.reduce((currBox, nodeOrId) => {
				const isId = typeof nodeOrId === "string";
				let currentNode = !params.nodeLookup && !isId ? nodeOrId : void 0;
				if (params.nodeLookup) currentNode = isId ? params.nodeLookup.get(nodeOrId) : !isInternalNodeBase(nodeOrId) ? params.nodeLookup.get(nodeOrId.id) : nodeOrId;
				if (!currentNode) return currBox;
				hasNode = true;
				return getBoundsOfBoxes(currBox, nodeToBox(currentNode, params.nodeOrigin));
			}, {
				x: Infinity,
				y: Infinity,
				x2: -Infinity,
				y2: -Infinity
			});
			return hasNode ? boxToRect(box) : {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
		};
		/**
		* Determines a bounding box that contains all given nodes in an array
		* @internal
		*/
		const getInternalNodesBounds = (nodeLookup, params = {}) => {
			let box = {
				x: Infinity,
				y: Infinity,
				x2: -Infinity,
				y2: -Infinity
			};
			let hasVisibleNodes = false;
			nodeLookup.forEach((node) => {
				if (params.filter === void 0 || params.filter(node)) {
					box = getBoundsOfBoxes(box, nodeToBox(node));
					hasVisibleNodes = true;
				}
			});
			return hasVisibleNodes ? boxToRect(box) : {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
		};
		const getNodesInside = (nodes, rect, [tx, ty, tScale] = [
			0,
			0,
			1
		], partially = false, excludeNonSelectableNodes = false) => {
			const paneX = (rect.x - tx) / tScale;
			const paneY = (rect.y - ty) / tScale;
			const paneWidth = rect.width / tScale;
			const paneHeight = rect.height / tScale;
			const visibleNodes = [];
			for (const node of nodes.values()) {
				const { measured, selectable = true, hidden = false } = node;
				if (excludeNonSelectableNodes && !selectable || hidden) continue;
				const width = measured.width ?? node.width ?? node.initialWidth ?? 0;
				const height = measured.height ?? node.height ?? node.initialHeight ?? 0;
				const { x, y } = node.internals.positionAbsolute;
				const overlappingArea = getRectsOverlappingArea(paneX, paneY, paneWidth, paneHeight, x, y, width, height);
				const area = width * height;
				const partiallyVisible = partially && overlappingArea > 0;
				if (!node.internals.handleBounds || partiallyVisible || overlappingArea >= area || node.dragging) visibleNodes.push(node);
			}
			return visibleNodes;
		};
		/**
		* This utility filters an array of edges, keeping only those where either the source or target
		* node is present in the given array of nodes.
		* @public
		* @param nodes - Nodes you want to get the connected edges for.
		* @param edges - All edges.
		* @returns Array of edges that connect any of the given nodes with each other.
		*
		* @example
		* ```js
		*import { getConnectedEdges } from '@xyflow/react';
		*
		*const nodes = [
		*  { id: 'a', position: { x: 0, y: 0 } },
		*  { id: 'b', position: { x: 100, y: 0 } },
		*];
		*
		*const edges = [
		*  { id: 'a->c', source: 'a', target: 'c' },
		*  { id: 'c->d', source: 'c', target: 'd' },
		*];
		*
		*const connectedEdges = getConnectedEdges(nodes, edges);
		* // => [{ id: 'a->c', source: 'a', target: 'c' }]
		*```
		*/
		const getConnectedEdges = (nodes, edges) => {
			const nodeIds = /* @__PURE__ */ new Set();
			nodes.forEach((node) => {
				nodeIds.add(node.id);
			});
			return edges.filter((edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target));
		};
		function getFitViewNodes(nodeLookup, options) {
			const fitViewNodes = /* @__PURE__ */ new Map();
			const optionNodeIds = options?.nodes ? new Set(options.nodes.map((node) => node.id)) : null;
			nodeLookup.forEach((n) => {
				let isVisible;
				if (options?.includeHiddenNodes) {
					const { width, height } = getNodeDimensions(n);
					isVisible = width > 0 && height > 0;
				} else isVisible = Boolean(n.measured.width && n.measured.height && !n.hidden);
				if (isVisible && (!optionNodeIds || optionNodeIds.has(n.id))) fitViewNodes.set(n.id, n);
			});
			return fitViewNodes;
		}
		async function fitViewport({ nodes, width, height, panZoom, minZoom, maxZoom }, options) {
			if (nodes.size === 0) return true;
			const viewport = getViewportForBounds(getInternalNodesBounds(getFitViewNodes(nodes, options)), width, height, options?.minZoom ?? minZoom, options?.maxZoom ?? maxZoom, options?.padding ?? .1);
			await panZoom.setViewport(viewport, {
				duration: options?.duration,
				ease: options?.ease,
				interpolate: options?.interpolate
			});
			return true;
		}
		/**
		* This function calculates the next position of a node, taking into account the node's extent, parent node, and origin.
		*
		* @internal
		* @returns position, positionAbsolute
		*/
		function calculateNodePosition({ nodeId, nextPosition, nodeLookup, nodeOrigin = [0, 0], nodeExtent, onError }) {
			const node = nodeLookup.get(nodeId);
			const parentNode = node.parentId ? nodeLookup.get(node.parentId) : void 0;
			const { x: parentX, y: parentY } = parentNode ? parentNode.internals.positionAbsolute : {
				x: 0,
				y: 0
			};
			const origin = node.origin ?? nodeOrigin;
			let extent = node.extent || nodeExtent;
			if (node.extent === "parent" && !node.expandParent) if (!parentNode) onError?.("005", errorMessages["error005"]());
			else {
				const { width: parentWidth, height: parentHeight } = getNodeDimensions(parentNode);
				if (parentWidth && parentHeight) extent = [[parentX, parentY], [parentX + parentWidth, parentY + parentHeight]];
			}
			else if (parentNode && isCoordinateExtent(node.extent)) extent = [[node.extent[0][0] + parentX, node.extent[0][1] + parentY], [node.extent[1][0] + parentX, node.extent[1][1] + parentY]];
			const positionAbsolute = isCoordinateExtent(extent) ? clampPosition(nextPosition, extent, node.measured) : nextPosition;
			if (node.measured.width === void 0 || node.measured.height === void 0) onError?.("015", errorMessages["error015"]());
			return {
				position: {
					x: positionAbsolute.x - parentX + (node.measured.width ?? 0) * origin[0],
					y: positionAbsolute.y - parentY + (node.measured.height ?? 0) * origin[1]
				},
				positionAbsolute
			};
		}
		/**
		* Pass in nodes & edges to delete, get arrays of nodes and edges that actually can be deleted
		* @internal
		* @param param.nodesToRemove - The nodes to remove
		* @param param.edgesToRemove - The edges to remove
		* @param param.nodes - All nodes
		* @param param.edges - All edges
		* @param param.onBeforeDelete - Callback to check which nodes and edges can be deleted
		* @returns nodes: nodes that can be deleted, edges: edges that can be deleted
		*/
		async function getElementsToRemove({ nodesToRemove = [], edgesToRemove = [], nodes, edges, onBeforeDelete }) {
			const nodeIds = new Set(nodesToRemove.map((node) => node.id));
			const matchingNodes = [];
			for (const node of nodes) {
				if (node.deletable === false) continue;
				const isIncluded = nodeIds.has(node.id);
				const parentHit = !isIncluded && node.parentId && matchingNodes.find((n) => n.id === node.parentId);
				if (isIncluded || parentHit) matchingNodes.push(node);
			}
			const edgeIds = new Set(edgesToRemove.map((edge) => edge.id));
			const deletableEdges = edges.filter((edge) => edge.deletable !== false);
			const matchingEdges = getConnectedEdges(matchingNodes, deletableEdges);
			for (const edge of deletableEdges) if (edgeIds.has(edge.id) && !matchingEdges.find((e) => e.id === edge.id)) matchingEdges.push(edge);
			if (!onBeforeDelete) return {
				edges: matchingEdges,
				nodes: matchingNodes
			};
			const onBeforeDeleteResult = await onBeforeDelete({
				nodes: matchingNodes,
				edges: matchingEdges
			});
			if (typeof onBeforeDeleteResult === "boolean") return onBeforeDeleteResult ? {
				edges: matchingEdges,
				nodes: matchingNodes
			} : {
				edges: [],
				nodes: []
			};
			return onBeforeDeleteResult;
		}
		const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
		const clampPosition = (position = {
			x: 0,
			y: 0
		}, extent, dimensions) => ({
			x: clamp(position.x, extent[0][0], extent[1][0] - (dimensions?.width ?? 0)),
			y: clamp(position.y, extent[0][1], extent[1][1] - (dimensions?.height ?? 0))
		});
		function clampPositionToParent(childPosition, childDimensions, parent) {
			const { width: parentWidth, height: parentHeight } = getNodeDimensions(parent);
			const { x: parentX, y: parentY } = parent.internals.positionAbsolute;
			return clampPosition(childPosition, [[parentX, parentY], [parentX + parentWidth, parentY + parentHeight]], childDimensions);
		}
		/**
		* Calculates the velocity of panning when the mouse is close to the edge of the canvas
		* @internal
		* @param value - One dimensional poition of the mouse (x or y)
		* @param min - Minimal position on canvas before panning starts
		* @param max - Maximal position on canvas before panning starts
		* @returns - A number between 0 and 1 that represents the velocity of panning
		*/
		const calcAutoPanVelocity = (value, min, max) => {
			if (value < min) return clamp(Math.abs(value - min), 1, min) / min;
			else if (value > max) return -clamp(Math.abs(value - max), 1, min) / min;
			return 0;
		};
		const calcAutoPan = (pos, bounds, speed = 15, distance = 40) => {
			return [calcAutoPanVelocity(pos.x, distance, bounds.width - distance) * speed, calcAutoPanVelocity(pos.y, distance, bounds.height - distance) * speed];
		};
		const getBoundsOfBoxes = (box1, box2) => ({
			x: Math.min(box1.x, box2.x),
			y: Math.min(box1.y, box2.y),
			x2: Math.max(box1.x2, box2.x2),
			y2: Math.max(box1.y2, box2.y2)
		});
		const rectToBox = ({ x, y, width, height }) => ({
			x,
			y,
			x2: x + width,
			y2: y + height
		});
		const boxToRect = ({ x, y, x2, y2 }) => ({
			x,
			y,
			width: x2 - x,
			height: y2 - y
		});
		const nodeToRect = (node, nodeOrigin = [0, 0]) => {
			const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
			return {
				x,
				y,
				width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
				height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
			};
		};
		const nodeToBox = (node, nodeOrigin = [0, 0]) => {
			const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
			return {
				x,
				y,
				x2: x + (node.measured?.width ?? node.width ?? node.initialWidth ?? 0),
				y2: y + (node.measured?.height ?? node.height ?? node.initialHeight ?? 0)
			};
		};
		const getBoundsOfRects = (rect1, rect2) => boxToRect(getBoundsOfBoxes(rectToBox(rect1), rectToBox(rect2)));
		const getRectsOverlappingArea = (aX, aY, aWidth, aHeight, bX, bY, bWidth, bHeight) => {
			const xOverlap = Math.max(0, Math.min(aX + aWidth, bX + bWidth) - Math.max(aX, bX));
			const yOverlap = Math.max(0, Math.min(aY + aHeight, bY + bHeight) - Math.max(aY, bY));
			return Math.ceil(xOverlap * yOverlap);
		};
		const getOverlappingArea = (rectA, rectB) => getRectsOverlappingArea(rectA.x, rectA.y, rectA.width, rectA.height, rectB.x, rectB.y, rectB.width, rectB.height);
		const isRectObject = (obj) => isNumeric(obj.width) && isNumeric(obj.height) && isNumeric(obj.x) && isNumeric(obj.y);
		const isNumeric = (n) => !isNaN(n) && isFinite(n);
		const createDevWarn = (lib, helpUrl) => (id, message) => {};
		const snapPosition = (position, snapGrid = [1, 1]) => {
			return {
				x: snapGrid[0] * Math.round(position.x / snapGrid[0]),
				y: snapGrid[1] * Math.round(position.y / snapGrid[1])
			};
		};
		const pointToRendererPoint = ({ x, y }, [tx, ty, tScale], snapToGrid = false, snapGrid = [1, 1]) => {
			const position = {
				x: (x - tx) / tScale,
				y: (y - ty) / tScale
			};
			return snapToGrid ? snapPosition(position, snapGrid) : position;
		};
		const rendererPointToPoint = ({ x, y }, [tx, ty, tScale]) => {
			return {
				x: x * tScale + tx,
				y: y * tScale + ty
			};
		};
		/**
		* Parses a single padding value to a number
		* @internal
		* @param padding - Padding to parse
		* @param viewport - Width or height of the viewport
		* @returns The padding in pixels
		*/
		function parsePadding(padding, viewport) {
			if (typeof padding === "number") return Math.floor((viewport - viewport / (1 + padding)) * .5);
			if (typeof padding === "string" && padding.endsWith("px")) {
				const paddingValue = parseFloat(padding);
				if (!Number.isNaN(paddingValue)) return Math.floor(paddingValue);
			}
			if (typeof padding === "string" && padding.endsWith("%")) {
				const paddingValue = parseFloat(padding);
				if (!Number.isNaN(paddingValue)) return Math.floor(viewport * paddingValue * .01);
			}
			console.error(`The padding value "${padding}" is invalid. Please provide a number or a string with a valid unit (px or %).`);
			return 0;
		}
		/**
		* Parses the paddings to an object with top, right, bottom, left, x and y paddings
		* @internal
		* @param padding - Padding to parse
		* @param width - Width of the viewport
		* @param height - Height of the viewport
		* @returns An object with the paddings in pixels
		*/
		function parsePaddings(padding, width, height) {
			if (typeof padding === "string" || typeof padding === "number") {
				const paddingY = parsePadding(padding, height);
				const paddingX = parsePadding(padding, width);
				return {
					top: paddingY,
					right: paddingX,
					bottom: paddingY,
					left: paddingX,
					x: paddingX * 2,
					y: paddingY * 2
				};
			}
			if (typeof padding === "object") {
				const top = parsePadding(padding.top ?? padding.y ?? 0, height);
				const bottom = parsePadding(padding.bottom ?? padding.y ?? 0, height);
				const left = parsePadding(padding.left ?? padding.x ?? 0, width);
				const right = parsePadding(padding.right ?? padding.x ?? 0, width);
				return {
					top,
					right,
					bottom,
					left,
					x: left + right,
					y: top + bottom
				};
			}
			return {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				x: 0,
				y: 0
			};
		}
		/**
		* Calculates the resulting paddings if the new viewport is applied
		* @internal
		* @param bounds - Bounds to fit inside viewport
		* @param x - X position of the viewport
		* @param y - Y position of the viewport
		* @param zoom - Zoom level of the viewport
		* @param width - Width of the viewport
		* @param height - Height of the viewport
		* @returns An object with the minimum padding required to fit the bounds inside the viewport
		*/
		function calculateAppliedPaddings(bounds, x, y, zoom, width, height) {
			const { x: left, y: top } = rendererPointToPoint(bounds, [
				x,
				y,
				zoom
			]);
			const { x: boundRight, y: boundBottom } = rendererPointToPoint({
				x: bounds.x + bounds.width,
				y: bounds.y + bounds.height
			}, [
				x,
				y,
				zoom
			]);
			const right = width - boundRight;
			const bottom = height - boundBottom;
			return {
				left: Math.floor(left),
				top: Math.floor(top),
				right: Math.floor(right),
				bottom: Math.floor(bottom)
			};
		}
		/**
		* Returns a viewport that encloses the given bounds with padding.
		* @public
		* @remarks You can determine bounds of nodes with {@link getNodesBounds} and {@link getBoundsOfRects}
		* @param bounds - Bounds to fit inside viewport.
		* @param width - Width of the viewport.
		* @param height  - Height of the viewport.
		* @param minZoom - Minimum zoom level of the resulting viewport.
		* @param maxZoom - Maximum zoom level of the resulting viewport.
		* @param padding - Padding around the bounds.
		* @returns A transformed {@link Viewport} that encloses the given bounds which you can pass to e.g. {@link setViewport}.
		* @example
		* const { x, y, zoom } = getViewportForBounds(
		* { x: 0, y: 0, width: 100, height: 100},
		* 1200, 800, 0.5, 2);
		*/
		const getViewportForBounds = (bounds, width, height, minZoom, maxZoom, padding) => {
			const p = parsePaddings(padding, width, height);
			const xZoom = (width - p.x) / bounds.width;
			const yZoom = (height - p.y) / bounds.height;
			const clampedZoom = clamp(Math.min(xZoom, yZoom), minZoom, maxZoom);
			const boundsCenterX = bounds.x + bounds.width / 2;
			const boundsCenterY = bounds.y + bounds.height / 2;
			const x = width / 2 - boundsCenterX * clampedZoom;
			const y = height / 2 - boundsCenterY * clampedZoom;
			const newPadding = calculateAppliedPaddings(bounds, x, y, clampedZoom, width, height);
			const offset = {
				left: Math.min(newPadding.left - p.left, 0),
				top: Math.min(newPadding.top - p.top, 0),
				right: Math.min(newPadding.right - p.right, 0),
				bottom: Math.min(newPadding.bottom - p.bottom, 0)
			};
			return {
				x: x - offset.left + offset.right,
				y: y - offset.top + offset.bottom,
				zoom: clampedZoom
			};
		};
		const isMacOs = () => typeof navigator !== "undefined" && navigator?.userAgent?.indexOf("Mac") >= 0;
		function isCoordinateExtent(extent) {
			return extent !== void 0 && extent !== null && extent !== "parent";
		}
		function getNodeDimensions(node) {
			return {
				width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
				height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
			};
		}
		function nodeHasDimensions(node) {
			return (node.measured?.width ?? node.width ?? node.initialWidth) !== void 0 && (node.measured?.height ?? node.height ?? node.initialHeight) !== void 0;
		}
		/**
		* Convert child position to absolute position
		*
		* @internal
		* @param position
		* @param parentId
		* @param nodeLookup
		* @param nodeOrigin
		* @returns an internal node with an absolute position
		*/
		function evaluateAbsolutePosition(position, dimensions = {
			width: 0,
			height: 0
		}, parentId, nodeLookup, nodeOrigin) {
			const positionAbsolute = { ...position };
			const parent = nodeLookup.get(parentId);
			if (parent) {
				const origin = parent.origin || nodeOrigin;
				positionAbsolute.x += parent.internals.positionAbsolute.x - (dimensions.width ?? 0) * origin[0];
				positionAbsolute.y += parent.internals.positionAbsolute.y - (dimensions.height ?? 0) * origin[1];
			}
			return positionAbsolute;
		}
		function areSetsEqual(a, b) {
			if (a.size !== b.size) return false;
			for (const item of a) if (!b.has(item)) return false;
			return true;
		}
		/**
		* Polyfill for Promise.withResolvers until we can use it in all browsers
		* @internal
		*/
		function withResolvers() {
			let resolve;
			let reject;
			return {
				promise: new Promise((res, rej) => {
					resolve = res;
					reject = rej;
				}),
				resolve,
				reject
			};
		}
		function mergeAriaLabelConfig(partial) {
			return {
				...defaultAriaLabelConfig,
				...partial || {}
			};
		}
		function getPointerPosition(event, { snapGrid = [0, 0], snapToGrid = false, transform, containerBounds }) {
			const { x, y } = getEventPosition(event);
			const pointerPos = pointToRendererPoint({
				x: x - (containerBounds?.left ?? 0),
				y: y - (containerBounds?.top ?? 0)
			}, transform);
			const { x: xSnapped, y: ySnapped } = snapToGrid ? snapPosition(pointerPos, snapGrid) : pointerPos;
			return {
				xSnapped,
				ySnapped,
				...pointerPos
			};
		}
		const getDimensions = (node) => ({
			width: node.offsetWidth,
			height: node.offsetHeight
		});
		const getHostForElement = (element) => element?.getRootNode?.() || window?.document;
		const inputTags = [
			"INPUT",
			"SELECT",
			"TEXTAREA"
		];
		function isInputDOMNode(event) {
			const target = event.composedPath?.()?.[0] || event.target;
			if (target?.nodeType !== 1) return false;
			return inputTags.includes(target.nodeName) || target.hasAttribute("contenteditable") || !!target.closest(".nokey");
		}
		const isMouseEvent = (event) => "clientX" in event;
		const getEventPosition = (event, bounds) => {
			const isMouse = isMouseEvent(event);
			const evtX = isMouse ? event.clientX : event.touches?.[0].clientX;
			const evtY = isMouse ? event.clientY : event.touches?.[0].clientY;
			return {
				x: evtX - (bounds?.left ?? 0),
				y: evtY - (bounds?.top ?? 0)
			};
		};
		const getHandleBounds = (type, nodeElement, nodeBounds, zoom, nodeId) => {
			const handles = nodeElement.querySelectorAll(`.${type}`);
			if (!handles || !handles.length) return null;
			return Array.from(handles).map((handle) => {
				const handleBounds = handle.getBoundingClientRect();
				return {
					id: handle.getAttribute("data-handleid"),
					type,
					nodeId,
					position: handle.getAttribute("data-handlepos"),
					x: (handleBounds.left - nodeBounds.left) / zoom,
					y: (handleBounds.top - nodeBounds.top) / zoom,
					...getDimensions(handle)
				};
			});
		};
		function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY, sourceControlX, sourceControlY, targetControlX, targetControlY }) {
			const centerX = sourceX * .125 + sourceControlX * .375 + targetControlX * .375 + targetX * .125;
			const centerY = sourceY * .125 + sourceControlY * .375 + targetControlY * .375 + targetY * .125;
			return [
				centerX,
				centerY,
				Math.abs(centerX - sourceX),
				Math.abs(centerY - sourceY)
			];
		}
		function calculateControlOffset(distance, curvature) {
			if (distance >= 0) return .5 * distance;
			return curvature * 25 * Math.sqrt(-distance);
		}
		function getControlWithCurvature({ pos, x1, y1, x2, y2, c }) {
			switch (pos) {
				case Position.Left: return [x1 - calculateControlOffset(x1 - x2, c), y1];
				case Position.Right: return [x1 + calculateControlOffset(x2 - x1, c), y1];
				case Position.Top: return [x1, y1 - calculateControlOffset(y1 - y2, c)];
				case Position.Bottom: return [x1, y1 + calculateControlOffset(y2 - y1, c)];
			}
		}
		/**
		* The `getBezierPath` util returns everything you need to render a bezier edge
		*between two nodes.
		* @public
		* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
		* and `offsetX`, `offsetY` between source handle and label.
		* - `path`: the path to use in an SVG `<path>` element.
		* - `labelX`: the `x` position you can use to render a label for this edge.
		* - `labelY`: the `y` position you can use to render a label for this edge.
		* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
		* middle of this path.
		* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
		* middle of this path.
		* @example
		* ```js
		*  const source = { x: 0, y: 20 };
		*  const target = { x: 150, y: 100 };
		*
		*  const [path, labelX, labelY, offsetX, offsetY] = getBezierPath({
		*    sourceX: source.x,
		*    sourceY: source.y,
		*    sourcePosition: Position.Right,
		*    targetX: target.x,
		*    targetY: target.y,
		*    targetPosition: Position.Left,
		*});
		*```
		*
		* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to
		*work with multiple edge paths at once.
		*/
		function getBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, curvature = .25 }) {
			const [sourceControlX, sourceControlY] = getControlWithCurvature({
				pos: sourcePosition,
				x1: sourceX,
				y1: sourceY,
				x2: targetX,
				y2: targetY,
				c: curvature
			});
			const [targetControlX, targetControlY] = getControlWithCurvature({
				pos: targetPosition,
				x1: targetX,
				y1: targetY,
				x2: sourceX,
				y2: sourceY,
				c: curvature
			});
			const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
				sourceX,
				sourceY,
				targetX,
				targetY,
				sourceControlX,
				sourceControlY,
				targetControlX,
				targetControlY
			});
			return [
				`M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
				labelX,
				labelY,
				offsetX,
				offsetY
			];
		}
		function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
			const xOffset = Math.abs(targetX - sourceX) / 2;
			const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
			const yOffset = Math.abs(targetY - sourceY) / 2;
			return [
				centerX,
				targetY < sourceY ? targetY + yOffset : targetY - yOffset,
				xOffset,
				yOffset
			];
		}
		/**
		* Returns the z-index for an edge based on the node it connects and whether it is selected.
		* By default, edges are rendered below nodes. This behaviour is different for edges that are
		* connected to nodes with a parent, as they are rendered above the parent node.
		*/
		function getElevatedEdgeZIndex({ sourceNode, targetNode, selected = false, zIndex = 0, elevateOnSelect = false, zIndexMode = "basic" }) {
			if (zIndexMode === "manual") return zIndex;
			return (elevateOnSelect && selected ? zIndex + 1e3 : zIndex) + Math.max(sourceNode.parentId || elevateOnSelect && sourceNode.selected ? sourceNode.internals.z : 0, targetNode.parentId || elevateOnSelect && targetNode.selected ? targetNode.internals.z : 0);
		}
		function isEdgeVisible({ sourceNode, targetNode, width, height, transform }) {
			const edgeBox = getBoundsOfBoxes(nodeToBox(sourceNode), nodeToBox(targetNode));
			if (edgeBox.x === edgeBox.x2) edgeBox.x2 += 1;
			if (edgeBox.y === edgeBox.y2) edgeBox.y2 += 1;
			return getOverlappingArea({
				x: -transform[0] / transform[2],
				y: -transform[1] / transform[2],
				width: width / transform[2],
				height: height / transform[2]
			}, boxToRect(edgeBox)) > 0;
		}
		/**
		* The default edge ID generator function. Generates an ID based on the source, target, and handles.
		* @public
		* @param params - The connection or edge to generate an ID for.
		* @returns The generated edge ID.
		*/
		const getEdgeId = ({ source, sourceHandle, target, targetHandle }) => `xy-edge__${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;
		const connectionExists = (edge, edges) => {
			return edges.some((el) => el.source === edge.source && el.target === edge.target && (el.sourceHandle === edge.sourceHandle || !el.sourceHandle && !edge.sourceHandle) && (el.targetHandle === edge.targetHandle || !el.targetHandle && !edge.targetHandle));
		};
		/**
		* This util is a convenience function to add a new Edge to an array of edges. It also performs some validation to make sure you don't add an invalid edge or duplicate an existing one.
		* @public
		* @param edgeParams - Either an `Edge` or a `Connection` you want to add.
		* @param edges - The array of all current edges.
		* @param options - Optional configuration object.
		* @returns A new array of edges with the new edge added.
		*
		* @remarks If an edge with the same `target` and `source` already exists (and the same
		*`targetHandle` and `sourceHandle` if those are set), then this util won't add
		*a new edge even if the `id` property is different.
		*
		*/
		const addEdge$1 = (edgeParams, edges, options = {}) => {
			if (!edgeParams.source || !edgeParams.target) {
				options.onError?.("006", errorMessages["error006"]());
				return edges;
			}
			const edgeIdGenerator = options.getEdgeId || getEdgeId;
			let edge;
			if (isEdgeBase(edgeParams)) edge = { ...edgeParams };
			else edge = {
				...edgeParams,
				id: edgeIdGenerator(edgeParams)
			};
			if (connectionExists(edge, edges)) return edges;
			if (edge.sourceHandle === null) delete edge.sourceHandle;
			if (edge.targetHandle === null) delete edge.targetHandle;
			return edges.concat(edge);
		};
		/**
		* Calculates the straight line path between two points.
		* @public
		* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
		* and `offsetX`, `offsetY` between source handle and label.
		*
		* - `path`: the path to use in an SVG `<path>` element.
		* - `labelX`: the `x` position you can use to render a label for this edge.
		* - `labelY`: the `y` position you can use to render a label for this edge.
		* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
		* middle of this path.
		* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
		* middle of this path.
		* @example
		* ```js
		*  const source = { x: 0, y: 20 };
		*  const target = { x: 150, y: 100 };
		*
		*  const [path, labelX, labelY, offsetX, offsetY] = getStraightPath({
		*    sourceX: source.x,
		*    sourceY: source.y,
		*    sourcePosition: Position.Right,
		*    targetX: target.x,
		*    targetY: target.y,
		*    targetPosition: Position.Left,
		*  });
		* ```
		* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to work with multiple edge paths at once.
		*/
		function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
			const [labelX, labelY, offsetX, offsetY] = getEdgeCenter({
				sourceX,
				sourceY,
				targetX,
				targetY
			});
			return [
				`M ${sourceX},${sourceY}L ${targetX},${targetY}`,
				labelX,
				labelY,
				offsetX,
				offsetY
			];
		}
		const handleDirections = {
			[Position.Left]: {
				x: -1,
				y: 0
			},
			[Position.Right]: {
				x: 1,
				y: 0
			},
			[Position.Top]: {
				x: 0,
				y: -1
			},
			[Position.Bottom]: {
				x: 0,
				y: 1
			}
		};
		const getDirection = ({ source, sourcePosition = Position.Bottom, target }) => {
			if (sourcePosition === Position.Left || sourcePosition === Position.Right) return source.x < target.x ? {
				x: 1,
				y: 0
			} : {
				x: -1,
				y: 0
			};
			return source.y < target.y ? {
				x: 0,
				y: 1
			} : {
				x: 0,
				y: -1
			};
		};
		const distance = (a, b) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
		function getPoints({ source, sourcePosition = Position.Bottom, target, targetPosition = Position.Top, center, offset, stepPosition }) {
			const sourceDir = handleDirections[sourcePosition];
			const targetDir = handleDirections[targetPosition];
			const sourceGapped = {
				x: source.x + sourceDir.x * offset,
				y: source.y + sourceDir.y * offset
			};
			const targetGapped = {
				x: target.x + targetDir.x * offset,
				y: target.y + targetDir.y * offset
			};
			const dir = getDirection({
				source: sourceGapped,
				sourcePosition,
				target: targetGapped
			});
			const dirAccessor = dir.x !== 0 ? "x" : "y";
			const currDir = dir[dirAccessor];
			let points = [];
			let centerX, centerY;
			const sourceGapOffset = {
				x: 0,
				y: 0
			};
			const targetGapOffset = {
				x: 0,
				y: 0
			};
			const [, , defaultOffsetX, defaultOffsetY] = getEdgeCenter({
				sourceX: source.x,
				sourceY: source.y,
				targetX: target.x,
				targetY: target.y
			});
			if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
				if (dirAccessor === "x") {
					centerX = center.x ?? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
					centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;
				} else {
					centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
					centerY = center.y ?? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
				}
				const verticalSplit = [{
					x: centerX,
					y: sourceGapped.y
				}, {
					x: centerX,
					y: targetGapped.y
				}];
				const horizontalSplit = [{
					x: sourceGapped.x,
					y: centerY
				}, {
					x: targetGapped.x,
					y: centerY
				}];
				if (sourceDir[dirAccessor] === currDir) points = dirAccessor === "x" ? verticalSplit : horizontalSplit;
				else points = dirAccessor === "x" ? horizontalSplit : verticalSplit;
			} else {
				const sourceTarget = [{
					x: sourceGapped.x,
					y: targetGapped.y
				}];
				const targetSource = [{
					x: targetGapped.x,
					y: sourceGapped.y
				}];
				if (dirAccessor === "x") points = sourceDir.x === currDir ? targetSource : sourceTarget;
				else points = sourceDir.y === currDir ? sourceTarget : targetSource;
				if (sourcePosition === targetPosition) {
					const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
					if (diff <= offset) {
						const gapOffset = Math.min(offset - 1, offset - diff);
						if (sourceDir[dirAccessor] === currDir) sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
						else targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
					}
				}
				if (sourcePosition !== targetPosition) {
					const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x";
					const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
					const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
					const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
					if (sourceDir[dirAccessor] === 1 && (!isSameDir && sourceGtTargetOppo || isSameDir && sourceLtTargetOppo) || sourceDir[dirAccessor] !== 1 && (!isSameDir && sourceLtTargetOppo || isSameDir && sourceGtTargetOppo)) points = dirAccessor === "x" ? sourceTarget : targetSource;
				}
				const sourceGapPoint = {
					x: sourceGapped.x + sourceGapOffset.x,
					y: sourceGapped.y + sourceGapOffset.y
				};
				const targetGapPoint = {
					x: targetGapped.x + targetGapOffset.x,
					y: targetGapped.y + targetGapOffset.y
				};
				if (Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x)) >= Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y))) {
					centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
					centerY = points[0].y;
				} else {
					centerX = points[0].x;
					centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
				}
			}
			const gappedSource = {
				x: sourceGapped.x + sourceGapOffset.x,
				y: sourceGapped.y + sourceGapOffset.y
			};
			const gappedTarget = {
				x: targetGapped.x + targetGapOffset.x,
				y: targetGapped.y + targetGapOffset.y
			};
			return [
				[
					source,
					...gappedSource.x !== points[0].x || gappedSource.y !== points[0].y ? [gappedSource] : [],
					...points,
					...gappedTarget.x !== points[points.length - 1].x || gappedTarget.y !== points[points.length - 1].y ? [gappedTarget] : [],
					target
				],
				centerX,
				centerY,
				defaultOffsetX,
				defaultOffsetY
			];
		}
		function getBend(a, b, c, size) {
			const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
			const { x, y } = b;
			if (a.x === x && x === c.x || a.y === y && y === c.y) return `L${x} ${y}`;
			if (a.y === y) {
				const xDir = a.x < c.x ? -1 : 1;
				const yDir = a.y < c.y ? 1 : -1;
				return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
			}
			const xDir = a.x < c.x ? 1 : -1;
			return `L ${x},${y + bendSize * (a.y < c.y ? -1 : 1)}Q ${x},${y} ${x + bendSize * xDir},${y}`;
		}
		/**
		* The `getSmoothStepPath` util returns everything you need to render a stepped path
		* between two nodes. The `borderRadius` property can be used to choose how rounded
		* the corners of those steps are.
		* @public
		* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
		* and `offsetX`, `offsetY` between source handle and label.
		*
		* - `path`: the path to use in an SVG `<path>` element.
		* - `labelX`: the `x` position you can use to render a label for this edge.
		* - `labelY`: the `y` position you can use to render a label for this edge.
		* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
		* middle of this path.
		* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
		* middle of this path.
		* @example
		* ```js
		*  const source = { x: 0, y: 20 };
		*  const target = { x: 150, y: 100 };
		*
		*  const [path, labelX, labelY, offsetX, offsetY] = getSmoothStepPath({
		*    sourceX: source.x,
		*    sourceY: source.y,
		*    sourcePosition: Position.Right,
		*    targetX: target.x,
		*    targetY: target.y,
		*    targetPosition: Position.Left,
		*  });
		* ```
		* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to work with multiple edge paths at once.
		*/
		function getSmoothStepPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, borderRadius = 5, centerX, centerY, offset = 20, stepPosition = .5 }) {
			const [points, labelX, labelY, offsetX, offsetY] = getPoints({
				source: {
					x: sourceX,
					y: sourceY
				},
				sourcePosition,
				target: {
					x: targetX,
					y: targetY
				},
				targetPosition,
				center: {
					x: centerX,
					y: centerY
				},
				offset,
				stepPosition
			});
			let path = `M${points[0].x} ${points[0].y}`;
			for (let i = 1; i < points.length - 1; i++) path += getBend(points[i - 1], points[i], points[i + 1], borderRadius);
			path += `L${points[points.length - 1].x} ${points[points.length - 1].y}`;
			return [
				path,
				labelX,
				labelY,
				offsetX,
				offsetY
			];
		}
		function isNodeInitialized(node) {
			return node && !!(node.internals.handleBounds || node.handles?.length) && !!(node.measured.width || node.width || node.initialWidth);
		}
		function getEdgePosition(params) {
			const { sourceNode, targetNode } = params;
			if (!isNodeInitialized(sourceNode) || !isNodeInitialized(targetNode)) return null;
			const sourceHandleBounds = sourceNode.internals.handleBounds || toHandleBounds(sourceNode.handles);
			const targetHandleBounds = targetNode.internals.handleBounds || toHandleBounds(targetNode.handles);
			const sourceHandle = getHandle$1(sourceHandleBounds?.source ?? [], params.sourceHandle);
			const targetHandle = getHandle$1(params.connectionMode === ConnectionMode.Strict ? targetHandleBounds?.target ?? [] : (targetHandleBounds?.target ?? []).concat(targetHandleBounds?.source ?? []), params.targetHandle);
			if (!sourceHandle || !targetHandle) {
				params.onError?.("008", errorMessages["error008"](!sourceHandle ? "source" : "target", {
					id: params.id,
					sourceHandle: params.sourceHandle,
					targetHandle: params.targetHandle
				}));
				return null;
			}
			const sourcePosition = sourceHandle?.position || Position.Bottom;
			const targetPosition = targetHandle?.position || Position.Top;
			const source = getHandlePosition(sourceNode, sourceHandle, sourcePosition);
			const target = getHandlePosition(targetNode, targetHandle, targetPosition);
			return {
				sourceX: source.x,
				sourceY: source.y,
				targetX: target.x,
				targetY: target.y,
				sourcePosition,
				targetPosition
			};
		}
		function toHandleBounds(handles) {
			if (!handles) return null;
			const source = [];
			const target = [];
			for (const handle of handles) {
				handle.width = handle.width ?? 1;
				handle.height = handle.height ?? 1;
				if (handle.type === "source") source.push(handle);
				else if (handle.type === "target") target.push(handle);
			}
			return {
				source,
				target
			};
		}
		function getHandlePosition(node, handle, fallbackPosition = Position.Left, center = false) {
			const x = (handle?.x ?? 0) + node.internals.positionAbsolute.x;
			const y = (handle?.y ?? 0) + node.internals.positionAbsolute.y;
			const { width, height } = handle ?? getNodeDimensions(node);
			if (center) return {
				x: x + width / 2,
				y: y + height / 2
			};
			switch (handle?.position ?? fallbackPosition) {
				case Position.Top: return {
					x: x + width / 2,
					y
				};
				case Position.Right: return {
					x: x + width,
					y: y + height / 2
				};
				case Position.Bottom: return {
					x: x + width / 2,
					y: y + height
				};
				case Position.Left: return {
					x,
					y: y + height / 2
				};
			}
		}
		function getHandle$1(bounds, handleId) {
			if (!bounds) return null;
			return (!handleId ? bounds[0] : bounds.find((d) => d.id === handleId)) || null;
		}
		function getMarkerId(marker, id) {
			if (!marker) return "";
			if (typeof marker === "string") return marker;
			return `${id ? `${id}__` : ""}${Object.keys(marker).sort().map((key) => `${key}=${marker[key]}`).join("&")}`;
		}
		function createMarkerIds(edges, { id, defaultColor, defaultMarkerStart, defaultMarkerEnd }) {
			const ids = /* @__PURE__ */ new Set();
			return edges.reduce((markers, edge) => {
				[edge.markerStart || defaultMarkerStart, edge.markerEnd || defaultMarkerEnd].forEach((marker) => {
					if (marker && typeof marker === "object") {
						const markerId = getMarkerId(marker, id);
						if (!ids.has(markerId)) {
							markers.push({
								id: markerId,
								color: marker.color || defaultColor,
								...marker
							});
							ids.add(markerId);
						}
					}
				});
				return markers;
			}, []).sort((a, b) => a.id.localeCompare(b.id));
		}
		const SELECTED_NODE_Z = 1e3;
		const ROOT_PARENT_Z_INCREMENT = 10;
		const defaultOptions = {
			nodeOrigin: [0, 0],
			nodeExtent: infiniteExtent,
			elevateNodesOnSelect: true,
			zIndexMode: "basic",
			defaults: {}
		};
		const adoptUserNodesDefaultOptions = {
			...defaultOptions,
			checkEquality: true
		};
		function mergeObjects(base, incoming) {
			const result = { ...base };
			for (const key in incoming) if (incoming[key] !== void 0) result[key] = incoming[key];
			return result;
		}
		function updateAbsolutePositions(nodeLookup, parentLookup, options) {
			const _options = mergeObjects(defaultOptions, options);
			for (const node of nodeLookup.values()) if (node.parentId) updateChildNode(node, nodeLookup, parentLookup, _options);
			else {
				const clampedPosition = clampPosition(getNodePositionWithOrigin(node, _options.nodeOrigin), isCoordinateExtent(node.extent) ? node.extent : _options.nodeExtent, getNodeDimensions(node));
				node.internals.positionAbsolute = clampedPosition;
			}
		}
		function parseHandles(userNode, internalNode) {
			if (!userNode.handles) return !userNode.measured ? void 0 : internalNode?.internals.handleBounds;
			const source = [];
			const target = [];
			for (const handle of userNode.handles) {
				const handleBounds = {
					id: handle.id,
					width: handle.width ?? 1,
					height: handle.height ?? 1,
					nodeId: userNode.id,
					x: handle.x,
					y: handle.y,
					position: handle.position,
					type: handle.type
				};
				if (handle.type === "source") source.push(handleBounds);
				else if (handle.type === "target") target.push(handleBounds);
			}
			return {
				source,
				target
			};
		}
		function isManualZIndexMode(zIndexMode) {
			return zIndexMode === "manual";
		}
		function adoptUserNodes(nodes, nodeLookup, parentLookup, options = {}) {
			const _options = mergeObjects(adoptUserNodesDefaultOptions, options);
			const rootParentIndex = { i: 0 };
			const tmpLookup = new Map(nodeLookup);
			const selectedNodeZ = _options?.elevateNodesOnSelect && !isManualZIndexMode(_options.zIndexMode) ? SELECTED_NODE_Z : 0;
			let nodesInitialized = nodes.length > 0;
			let hasSelectedNodes = false;
			nodeLookup.clear();
			parentLookup.clear();
			for (const userNode of nodes) {
				let internalNode = tmpLookup.get(userNode.id);
				if (_options.checkEquality && userNode === internalNode?.internals.userNode) nodeLookup.set(userNode.id, internalNode);
				else {
					const clampedPosition = clampPosition(getNodePositionWithOrigin(userNode, _options.nodeOrigin), isCoordinateExtent(userNode.extent) ? userNode.extent : _options.nodeExtent, getNodeDimensions(userNode));
					internalNode = {
						..._options.defaults,
						...userNode,
						measured: {
							width: userNode.measured?.width,
							height: userNode.measured?.height
						},
						internals: {
							positionAbsolute: clampedPosition,
							handleBounds: parseHandles(userNode, internalNode),
							z: calculateZ(userNode, selectedNodeZ, _options.zIndexMode),
							userNode
						}
					};
					nodeLookup.set(userNode.id, internalNode);
				}
				if ((internalNode.measured === void 0 || internalNode.measured.width === void 0 || internalNode.measured.height === void 0) && !internalNode.hidden) nodesInitialized = false;
				if (userNode.parentId) updateChildNode(internalNode, nodeLookup, parentLookup, options, rootParentIndex);
				hasSelectedNodes ||= userNode.selected ?? false;
			}
			return {
				nodesInitialized,
				hasSelectedNodes
			};
		}
		function updateParentLookup(node, parentLookup) {
			if (!node.parentId) return;
			const childNodes = parentLookup.get(node.parentId);
			if (childNodes) childNodes.set(node.id, node);
			else parentLookup.set(node.parentId, new Map([[node.id, node]]));
		}
		/**
		* Updates positionAbsolute and zIndex of a child node and the parentLookup.
		*/
		function updateChildNode(node, nodeLookup, parentLookup, options, rootParentIndex) {
			const { elevateNodesOnSelect, nodeOrigin, nodeExtent, zIndexMode } = mergeObjects(defaultOptions, options);
			const parentId = node.parentId;
			const parentNode = nodeLookup.get(parentId);
			if (!parentNode) {
				console.warn(`Parent node ${parentId} not found. Please make sure that parent nodes are in front of their child nodes in the nodes array.`);
				return;
			}
			updateParentLookup(node, parentLookup);
			if (rootParentIndex && !parentNode.parentId && parentNode.internals.rootParentIndex === void 0 && zIndexMode === "auto") {
				parentNode.internals.rootParentIndex = ++rootParentIndex.i;
				parentNode.internals.z = parentNode.internals.z + rootParentIndex.i * ROOT_PARENT_Z_INCREMENT;
			}
			if (rootParentIndex && parentNode.internals.rootParentIndex !== void 0) rootParentIndex.i = parentNode.internals.rootParentIndex;
			const { x, y, z } = calculateChildXYZ(node, parentNode, nodeOrigin, nodeExtent, elevateNodesOnSelect && !isManualZIndexMode(zIndexMode) ? SELECTED_NODE_Z : 0, zIndexMode);
			const { positionAbsolute } = node.internals;
			const positionChanged = x !== positionAbsolute.x || y !== positionAbsolute.y;
			if (positionChanged || z !== node.internals.z) nodeLookup.set(node.id, {
				...node,
				internals: {
					...node.internals,
					positionAbsolute: positionChanged ? {
						x,
						y
					} : positionAbsolute,
					z
				}
			});
		}
		function calculateZ(node, selectedNodeZ, zIndexMode) {
			const zIndex = isNumeric(node.zIndex) ? node.zIndex : 0;
			if (isManualZIndexMode(zIndexMode)) return zIndex;
			return zIndex + (node.selected ? selectedNodeZ : 0);
		}
		function calculateChildXYZ(childNode, parentNode, nodeOrigin, nodeExtent, selectedNodeZ, zIndexMode) {
			const { x: parentX, y: parentY } = parentNode.internals.positionAbsolute;
			const childDimensions = getNodeDimensions(childNode);
			const positionWithOrigin = getNodePositionWithOrigin(childNode, nodeOrigin);
			const clampedPosition = isCoordinateExtent(childNode.extent) ? clampPosition(positionWithOrigin, childNode.extent, childDimensions) : positionWithOrigin;
			let absolutePosition = clampPosition({
				x: parentX + clampedPosition.x,
				y: parentY + clampedPosition.y
			}, nodeExtent, childDimensions);
			if (childNode.extent === "parent") absolutePosition = clampPositionToParent(absolutePosition, childDimensions, parentNode);
			const childZ = calculateZ(childNode, selectedNodeZ, zIndexMode);
			const parentZ = parentNode.internals.z ?? 0;
			return {
				x: absolutePosition.x,
				y: absolutePosition.y,
				z: parentZ >= childZ ? parentZ + 1 : childZ
			};
		}
		function handleExpandParent(children, nodeLookup, parentLookup, nodeOrigin = [0, 0]) {
			const changes = [];
			const parentExpansions = /* @__PURE__ */ new Map();
			for (const child of children) {
				const parent = nodeLookup.get(child.parentId);
				if (!parent) continue;
				const expandedRect = getBoundsOfRects(parentExpansions.get(child.parentId)?.expandedRect ?? nodeToRect(parent), child.rect);
				parentExpansions.set(child.parentId, {
					expandedRect,
					parent
				});
			}
			if (parentExpansions.size > 0) parentExpansions.forEach(({ expandedRect, parent }, parentId) => {
				const positionAbsolute = parent.internals.positionAbsolute;
				const dimensions = getNodeDimensions(parent);
				const origin = parent.origin ?? nodeOrigin;
				const xChange = expandedRect.x < positionAbsolute.x ? Math.round(Math.abs(positionAbsolute.x - expandedRect.x)) : 0;
				const yChange = expandedRect.y < positionAbsolute.y ? Math.round(Math.abs(positionAbsolute.y - expandedRect.y)) : 0;
				const newWidth = Math.max(dimensions.width, Math.round(expandedRect.width));
				const newHeight = Math.max(dimensions.height, Math.round(expandedRect.height));
				const widthChange = (newWidth - dimensions.width) * origin[0];
				const heightChange = (newHeight - dimensions.height) * origin[1];
				if (xChange > 0 || yChange > 0 || widthChange || heightChange) {
					changes.push({
						id: parentId,
						type: "position",
						position: {
							x: parent.position.x - xChange + widthChange,
							y: parent.position.y - yChange + heightChange
						}
					});
					parentLookup.get(parentId)?.forEach((childNode) => {
						if (!children.some((child) => child.id === childNode.id)) changes.push({
							id: childNode.id,
							type: "position",
							position: {
								x: childNode.position.x + xChange,
								y: childNode.position.y + yChange
							}
						});
					});
				}
				if (dimensions.width < expandedRect.width || dimensions.height < expandedRect.height || xChange || yChange) changes.push({
					id: parentId,
					type: "dimensions",
					setAttributes: true,
					dimensions: {
						width: newWidth + (xChange ? origin[0] * xChange - widthChange : 0),
						height: newHeight + (yChange ? origin[1] * yChange - heightChange : 0)
					}
				});
			});
			return changes;
		}
		function updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent, zIndexMode) {
			const viewportNode = domNode?.querySelector(".xyflow__viewport");
			let updatedInternals = false;
			if (!viewportNode) return {
				changes: [],
				updatedInternals
			};
			const changes = [];
			const style = window.getComputedStyle(viewportNode);
			const { m22: zoom } = new window.DOMMatrixReadOnly(style.transform);
			const parentExpandChildren = [];
			for (const update of updates.values()) {
				const node = nodeLookup.get(update.id);
				if (!node) continue;
				if (node.hidden) {
					nodeLookup.set(node.id, {
						...node,
						internals: {
							...node.internals,
							handleBounds: void 0
						}
					});
					updatedInternals = true;
					continue;
				}
				const dimensions = getDimensions(update.nodeElement);
				const dimensionChanged = node.measured.width !== dimensions.width || node.measured.height !== dimensions.height;
				if (!!(dimensions.width && dimensions.height && (dimensionChanged || !node.internals.handleBounds || update.force))) {
					const nodeBounds = update.nodeElement.getBoundingClientRect();
					const extent = isCoordinateExtent(node.extent) ? node.extent : nodeExtent;
					let { positionAbsolute } = node.internals;
					if (node.parentId && node.extent === "parent") {
						const parentNode = nodeLookup.get(node.parentId);
						if (parentNode) positionAbsolute = clampPositionToParent(positionAbsolute, dimensions, parentNode);
					} else if (extent) positionAbsolute = clampPosition(positionAbsolute, extent, dimensions);
					const newNode = {
						...node,
						measured: dimensions,
						internals: {
							...node.internals,
							positionAbsolute,
							handleBounds: {
								source: getHandleBounds("source", update.nodeElement, nodeBounds, zoom, node.id),
								target: getHandleBounds("target", update.nodeElement, nodeBounds, zoom, node.id)
							}
						}
					};
					nodeLookup.set(node.id, newNode);
					if (node.parentId) updateChildNode(newNode, nodeLookup, parentLookup, {
						nodeOrigin,
						zIndexMode
					});
					updatedInternals = true;
					if (dimensionChanged) {
						changes.push({
							id: node.id,
							type: "dimensions",
							dimensions
						});
						if (node.expandParent && node.parentId) parentExpandChildren.push({
							id: node.id,
							parentId: node.parentId,
							rect: nodeToRect(newNode, nodeOrigin)
						});
					}
				}
			}
			if (parentExpandChildren.length > 0) {
				const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin);
				changes.push(...parentExpandChanges);
			}
			return {
				changes,
				updatedInternals
			};
		}
		async function panBy({ delta, panZoom, transform, translateExtent, width, height }) {
			if (!panZoom || !delta.x && !delta.y) return false;
			const nextViewport = await panZoom.setViewportConstrained({
				x: transform[0] + delta.x,
				y: transform[1] + delta.y,
				zoom: transform[2]
			}, [[0, 0], [width, height]], translateExtent);
			return !!nextViewport && (nextViewport.x !== transform[0] || nextViewport.y !== transform[1] || nextViewport.k !== transform[2]);
		}
		/**
		* this function adds the connection to the connectionLookup
		* at the following keys: nodeId-type-handleId, nodeId-type and nodeId
		* @param type type of the connection
		* @param connection connection that should be added to the lookup
		* @param connectionKey at which key the connection should be added
		* @param connectionLookup reference to the connection lookup
		* @param nodeId nodeId of the connection
		* @param handleId handleId of the connection
		*/
		function addConnectionToLookup(type, connection, connectionKey, connectionLookup, nodeId, handleId) {
			let key = nodeId;
			const nodeMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
			connectionLookup.set(key, nodeMap.set(connectionKey, connection));
			key = `${nodeId}-${type}`;
			const typeMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
			connectionLookup.set(key, typeMap.set(connectionKey, connection));
			if (handleId) {
				key = `${nodeId}-${type}-${handleId}`;
				const handleMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
				connectionLookup.set(key, handleMap.set(connectionKey, connection));
			}
		}
		function updateConnectionLookup(connectionLookup, edgeLookup, edges) {
			connectionLookup.clear();
			edgeLookup.clear();
			for (const edge of edges) {
				const { source: sourceNode, target: targetNode, sourceHandle = null, targetHandle = null } = edge;
				const connection = {
					edgeId: edge.id,
					source: sourceNode,
					target: targetNode,
					sourceHandle,
					targetHandle
				};
				const sourceKey = `${sourceNode}-${sourceHandle}--${targetNode}-${targetHandle}`;
				addConnectionToLookup("source", connection, `${targetNode}-${targetHandle}--${sourceNode}-${sourceHandle}`, connectionLookup, sourceNode, sourceHandle);
				addConnectionToLookup("target", connection, sourceKey, connectionLookup, targetNode, targetHandle);
				edgeLookup.set(edge.id, edge);
			}
		}
		function isParentSelected(node, nodeLookup) {
			if (!node.parentId) return false;
			const parentNode = nodeLookup.get(node.parentId);
			if (!parentNode) return false;
			if (parentNode.selected) return true;
			return isParentSelected(parentNode, nodeLookup);
		}
		function hasSelector(target, selector, domNode) {
			let current = target;
			do {
				if (current?.matches?.(selector)) return true;
				if (current === domNode) return false;
				current = current?.parentElement;
			} while (current);
			return false;
		}
		function getDragItems(nodeLookup, nodesDraggable, mousePos, nodeId) {
			const dragItems = /* @__PURE__ */ new Map();
			for (const [id, node] of nodeLookup) if ((node.selected || node.id === nodeId) && (!node.parentId || !isParentSelected(node, nodeLookup)) && (node.draggable || nodesDraggable && typeof node.draggable === "undefined")) {
				const internalNode = nodeLookup.get(id);
				if (internalNode) dragItems.set(id, {
					id,
					position: internalNode.position || {
						x: 0,
						y: 0
					},
					distance: {
						x: mousePos.x - internalNode.internals.positionAbsolute.x,
						y: mousePos.y - internalNode.internals.positionAbsolute.y
					},
					extent: internalNode.extent,
					parentId: internalNode.parentId,
					origin: internalNode.origin,
					expandParent: internalNode.expandParent,
					internals: { positionAbsolute: internalNode.internals.positionAbsolute || {
						x: 0,
						y: 0
					} },
					measured: {
						width: internalNode.measured.width ?? 0,
						height: internalNode.measured.height ?? 0
					}
				});
			}
			return dragItems;
		}
		function getEventHandlerParams({ nodeId, dragItems, nodeLookup, dragging = true }) {
			const nodesFromDragItems = [];
			for (const [id, dragItem] of dragItems) {
				const node = nodeLookup.get(id)?.internals.userNode;
				if (node) nodesFromDragItems.push({
					...node,
					position: dragItem.position,
					dragging
				});
			}
			if (!nodeId) return [nodesFromDragItems[0], nodesFromDragItems];
			const node = nodeLookup.get(nodeId)?.internals.userNode;
			return [!node ? nodesFromDragItems[0] : {
				...node,
				position: dragItems.get(nodeId)?.position || node.position,
				dragging
			}, nodesFromDragItems];
		}
		/**
		* If a selection is being dragged we want to apply the same snap offset to all nodes in the selection.
		* This function calculates the snap offset based on the first node in the selection.
		*/
		function calculateSnapOffset({ dragItems, snapGrid, x, y }) {
			const refDragItem = dragItems.values().next().value;
			if (!refDragItem) return null;
			const refPos = {
				x: x - refDragItem.distance.x,
				y: y - refDragItem.distance.y
			};
			const refPosSnapped = snapPosition(refPos, snapGrid);
			return {
				x: refPosSnapped.x - refPos.x,
				y: refPosSnapped.y - refPos.y
			};
		}
		function XYDrag({ onNodeMouseDown, getStoreItems, onDragStart, onDrag, onDragStop }) {
			let lastPos = {
				x: null,
				y: null
			};
			let autoPanId = 0;
			let dragItems = /* @__PURE__ */ new Map();
			let autoPanStarted = false;
			let mousePosition = {
				x: 0,
				y: 0
			};
			let containerBounds = null;
			let dragStarted = false;
			let d3Selection = null;
			let abortDrag = false;
			let nodePositionsChanged = false;
			let dragEvent = null;
			function update({ noDragClassName, handleSelector, domNode, isSelectable, nodeId, nodeClickDistance = 0 }) {
				d3Selection = select_default$1(domNode);
				function updateNodes({ x, y }) {
					const { nodeLookup, nodeExtent, snapGrid, snapToGrid, nodeOrigin, onNodeDrag, onSelectionDrag, onError, updateNodePositions } = getStoreItems();
					lastPos = {
						x,
						y
					};
					let hasChange = false;
					const isMultiDrag = dragItems.size > 1;
					const nodesBox = isMultiDrag && nodeExtent ? rectToBox(getInternalNodesBounds(dragItems)) : null;
					const multiDragSnapOffset = isMultiDrag && snapToGrid ? calculateSnapOffset({
						dragItems,
						snapGrid,
						x,
						y
					}) : null;
					for (const [id, dragItem] of dragItems) {
						if (!nodeLookup.has(id)) continue;
						let nextPosition = {
							x: x - dragItem.distance.x,
							y: y - dragItem.distance.y
						};
						if (snapToGrid) nextPosition = multiDragSnapOffset ? {
							x: Math.round(nextPosition.x + multiDragSnapOffset.x),
							y: Math.round(nextPosition.y + multiDragSnapOffset.y)
						} : snapPosition(nextPosition, snapGrid);
						let adjustedNodeExtent = null;
						if (isMultiDrag && nodeExtent && !dragItem.extent && nodesBox) {
							const { positionAbsolute } = dragItem.internals;
							const x1 = positionAbsolute.x - nodesBox.x + nodeExtent[0][0];
							const x2 = positionAbsolute.x + dragItem.measured.width - nodesBox.x2 + nodeExtent[1][0];
							const y1 = positionAbsolute.y - nodesBox.y + nodeExtent[0][1];
							const y2 = positionAbsolute.y + dragItem.measured.height - nodesBox.y2 + nodeExtent[1][1];
							adjustedNodeExtent = [[x1, y1], [x2, y2]];
						}
						const { position, positionAbsolute } = calculateNodePosition({
							nodeId: id,
							nextPosition,
							nodeLookup,
							nodeExtent: adjustedNodeExtent ? adjustedNodeExtent : nodeExtent,
							nodeOrigin,
							onError
						});
						hasChange = hasChange || dragItem.position.x !== position.x || dragItem.position.y !== position.y;
						dragItem.position = position;
						dragItem.internals.positionAbsolute = positionAbsolute;
					}
					nodePositionsChanged = nodePositionsChanged || hasChange;
					if (!hasChange) return;
					updateNodePositions(dragItems, true);
					if (dragEvent && (onDrag || onNodeDrag || !nodeId && onSelectionDrag)) {
						const [currentNode, currentNodes] = getEventHandlerParams({
							nodeId,
							dragItems,
							nodeLookup
						});
						onDrag?.(dragEvent, dragItems, currentNode, currentNodes);
						onNodeDrag?.(dragEvent, currentNode, currentNodes);
						if (!nodeId) onSelectionDrag?.(dragEvent, currentNodes);
					}
				}
				async function autoPan() {
					if (!containerBounds) return;
					const { transform, panBy, autoPanSpeed, autoPanOnNodeDrag } = getStoreItems();
					if (!autoPanOnNodeDrag) {
						autoPanStarted = false;
						cancelAnimationFrame(autoPanId);
						return;
					}
					const [xMovement, yMovement] = calcAutoPan(mousePosition, containerBounds, autoPanSpeed);
					if (xMovement !== 0 || yMovement !== 0) {
						lastPos.x = (lastPos.x ?? 0) - xMovement / transform[2];
						lastPos.y = (lastPos.y ?? 0) - yMovement / transform[2];
						if (await panBy({
							x: xMovement,
							y: yMovement
						})) updateNodes(lastPos);
					}
					autoPanId = requestAnimationFrame(autoPan);
				}
				function startDrag(event) {
					const { nodeLookup, multiSelectionActive, nodesDraggable, transform, snapGrid, snapToGrid, selectNodesOnDrag, onNodeDragStart, onSelectionDragStart, unselectNodesAndEdges } = getStoreItems();
					dragStarted = true;
					if ((!selectNodesOnDrag || !isSelectable) && !multiSelectionActive && nodeId) {
						if (!nodeLookup.get(nodeId)?.selected) unselectNodesAndEdges();
					}
					if (isSelectable && selectNodesOnDrag && nodeId) onNodeMouseDown?.(nodeId);
					const pointerPos = getPointerPosition(event.sourceEvent, {
						transform,
						snapGrid,
						snapToGrid,
						containerBounds
					});
					lastPos = pointerPos;
					dragItems = getDragItems(nodeLookup, nodesDraggable, pointerPos, nodeId);
					if (dragItems.size > 0 && (onDragStart || onNodeDragStart || !nodeId && onSelectionDragStart)) {
						const [currentNode, currentNodes] = getEventHandlerParams({
							nodeId,
							dragItems,
							nodeLookup
						});
						onDragStart?.(event.sourceEvent, dragItems, currentNode, currentNodes);
						onNodeDragStart?.(event.sourceEvent, currentNode, currentNodes);
						if (!nodeId) onSelectionDragStart?.(event.sourceEvent, currentNodes);
					}
				}
				const d3DragInstance = drag_default().clickDistance(nodeClickDistance).on("start", (event) => {
					const { domNode, nodeDragThreshold, transform, snapGrid, snapToGrid } = getStoreItems();
					containerBounds = domNode?.getBoundingClientRect() || null;
					abortDrag = false;
					nodePositionsChanged = false;
					dragEvent = event.sourceEvent;
					if (nodeDragThreshold === 0) startDrag(event);
					lastPos = getPointerPosition(event.sourceEvent, {
						transform,
						snapGrid,
						snapToGrid,
						containerBounds
					});
					mousePosition = getEventPosition(event.sourceEvent, containerBounds);
				}).on("drag", (event) => {
					const { autoPanOnNodeDrag, transform, snapGrid, snapToGrid, nodeDragThreshold, nodeLookup } = getStoreItems();
					const pointerPos = getPointerPosition(event.sourceEvent, {
						transform,
						snapGrid,
						snapToGrid,
						containerBounds
					});
					dragEvent = event.sourceEvent;
					if (event.sourceEvent.type === "touchmove" && event.sourceEvent.touches.length > 1 || nodeId && !nodeLookup.has(nodeId)) abortDrag = true;
					if (abortDrag) return;
					if (!autoPanStarted && autoPanOnNodeDrag && dragStarted) {
						autoPanStarted = true;
						autoPan();
					}
					if (!dragStarted) {
						const currentMousePosition = getEventPosition(event.sourceEvent, containerBounds);
						const x = currentMousePosition.x - mousePosition.x;
						const y = currentMousePosition.y - mousePosition.y;
						if (Math.sqrt(x * x + y * y) > nodeDragThreshold) startDrag(event);
					}
					if ((lastPos.x !== pointerPos.xSnapped || lastPos.y !== pointerPos.ySnapped) && dragItems && dragStarted) {
						mousePosition = getEventPosition(event.sourceEvent, containerBounds);
						updateNodes(pointerPos);
					}
				}).on("end", (event) => {
					if (!dragStarted || abortDrag) {
						if (abortDrag && dragItems.size > 0) getStoreItems().updateNodePositions(dragItems, false);
						return;
					}
					autoPanStarted = false;
					dragStarted = false;
					cancelAnimationFrame(autoPanId);
					if (dragItems.size > 0) {
						const { nodeLookup, updateNodePositions, onNodeDragStop, onSelectionDragStop } = getStoreItems();
						if (nodePositionsChanged) {
							updateNodePositions(dragItems, false);
							nodePositionsChanged = false;
						}
						if (onDragStop || onNodeDragStop || !nodeId && onSelectionDragStop) {
							const [currentNode, currentNodes] = getEventHandlerParams({
								nodeId,
								dragItems,
								nodeLookup,
								dragging: false
							});
							onDragStop?.(event.sourceEvent, dragItems, currentNode, currentNodes);
							onNodeDragStop?.(event.sourceEvent, currentNode, currentNodes);
							if (!nodeId) onSelectionDragStop?.(event.sourceEvent, currentNodes);
						}
					}
				}).filter((event) => {
					const target = event.target;
					return !event.button && (!noDragClassName || !hasSelector(target, `.${noDragClassName}`, domNode)) && (!handleSelector || hasSelector(target, handleSelector, domNode));
				});
				d3Selection.call(d3DragInstance);
			}
			function destroy() {
				d3Selection?.on(".drag", null);
			}
			return {
				update,
				destroy
			};
		}
		function getNodesWithinDistance(position, nodeLookup, distance) {
			const nodes = [];
			const rect = {
				x: position.x - distance,
				y: position.y - distance,
				width: distance * 2,
				height: distance * 2
			};
			for (const node of nodeLookup.values()) if (getOverlappingArea(rect, nodeToRect(node)) > 0) nodes.push(node);
			return nodes;
		}
		const ADDITIONAL_DISTANCE = 250;
		function getClosestHandle(position, connectionRadius, nodeLookup, fromHandle) {
			let closestHandles = [];
			let minDistance = Infinity;
			const closeNodes = getNodesWithinDistance(position, nodeLookup, connectionRadius + ADDITIONAL_DISTANCE);
			for (const node of closeNodes) {
				const allHandles = [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
				for (const handle of allHandles) {
					if (fromHandle.nodeId === handle.nodeId && fromHandle.type === handle.type && fromHandle.id === handle.id) continue;
					const { x, y } = getHandlePosition(node, handle, handle.position, true);
					const distance = Math.sqrt(Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2));
					if (distance > connectionRadius) continue;
					if (distance < minDistance) {
						closestHandles = [{
							...handle,
							x,
							y
						}];
						minDistance = distance;
					} else if (distance === minDistance) closestHandles.push({
						...handle,
						x,
						y
					});
				}
			}
			if (!closestHandles.length) return null;
			if (closestHandles.length > 1) {
				const oppositeHandleType = fromHandle.type === "source" ? "target" : "source";
				return closestHandles.find((handle) => handle.type === oppositeHandleType) ?? closestHandles[0];
			}
			return closestHandles[0];
		}
		function getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode, withAbsolutePosition = false) {
			const node = nodeLookup.get(nodeId);
			if (!node) return null;
			const handles = connectionMode === "strict" ? node.internals.handleBounds?.[handleType] : [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
			const handle = (handleId ? handles?.find((h) => h.id === handleId) : handles?.[0]) ?? null;
			return handle && withAbsolutePosition ? {
				...handle,
				...getHandlePosition(node, handle, handle.position, true)
			} : handle;
		}
		function getHandleType(edgeUpdaterType, handleDomNode) {
			if (edgeUpdaterType) return edgeUpdaterType;
			else if (handleDomNode?.classList.contains("target")) return "target";
			else if (handleDomNode?.classList.contains("source")) return "source";
			return null;
		}
		function isConnectionValid(isInsideConnectionRadius, isHandleValid) {
			let isValid = null;
			if (isHandleValid) isValid = true;
			else if (isInsideConnectionRadius && !isHandleValid) isValid = false;
			return isValid;
		}
		const alwaysValid = () => true;
		function onPointerDown(event, { connectionMode, connectionRadius, handleId, nodeId, edgeUpdaterType, isTarget, domNode, nodeLookup, lib, autoPanOnConnect, flowId, panBy, cancelConnection, onConnectStart, onConnect, onConnectEnd, isValidConnection = alwaysValid, onReconnectEnd, updateConnection, getTransform, getFromHandle, autoPanSpeed, dragThreshold = 1, handleDomNode }) {
			const doc = getHostForElement(event.target);
			let autoPanId = 0;
			let closestHandle;
			const { x, y } = getEventPosition(event);
			const handleType = getHandleType(edgeUpdaterType, handleDomNode);
			const containerBounds = domNode?.getBoundingClientRect();
			let connectionStarted = false;
			if (!containerBounds || !handleType) return;
			const fromHandleInternal = getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode);
			if (!fromHandleInternal) return;
			let position = getEventPosition(event, containerBounds);
			let autoPanStarted = false;
			let connection = null;
			let isValid = false;
			let resultHandleDomNode = null;
			function autoPan() {
				if (!autoPanOnConnect || !containerBounds) return;
				const [x, y] = calcAutoPan(position, containerBounds, autoPanSpeed);
				panBy({
					x,
					y
				});
				autoPanId = requestAnimationFrame(autoPan);
			}
			const fromHandle = {
				...fromHandleInternal,
				nodeId,
				type: handleType,
				position: fromHandleInternal.position
			};
			const fromInternalNode = nodeLookup.get(nodeId);
			let previousConnection = {
				inProgress: true,
				isValid: null,
				from: getHandlePosition(fromInternalNode, fromHandle, Position.Left, true),
				fromHandle,
				fromPosition: fromHandle.position,
				fromNode: fromInternalNode,
				to: position,
				toHandle: null,
				toPosition: oppositePosition[fromHandle.position],
				toNode: null,
				pointer: position
			};
			function startConnection() {
				connectionStarted = true;
				updateConnection(previousConnection);
				onConnectStart?.(event, {
					nodeId,
					handleId,
					handleType
				});
			}
			if (dragThreshold === 0) startConnection();
			function onPointerMove(event) {
				if (!connectionStarted) {
					const { x: evtX, y: evtY } = getEventPosition(event);
					const dx = evtX - x;
					const dy = evtY - y;
					if (!(dx * dx + dy * dy > dragThreshold * dragThreshold)) return;
					startConnection();
				}
				if (!getFromHandle() || !fromHandle) {
					onPointerUp(event);
					return;
				}
				const transform = getTransform();
				position = getEventPosition(event, containerBounds);
				closestHandle = getClosestHandle(pointToRendererPoint(position, transform, false, [1, 1]), connectionRadius, nodeLookup, fromHandle);
				if (!autoPanStarted) {
					autoPan();
					autoPanStarted = true;
				}
				const result = isValidHandle(event, {
					handle: closestHandle,
					connectionMode,
					fromNodeId: nodeId,
					fromHandleId: handleId,
					fromType: isTarget ? "target" : "source",
					isValidConnection,
					doc,
					lib,
					flowId,
					nodeLookup
				});
				resultHandleDomNode = result.handleDomNode;
				connection = result.connection;
				isValid = isConnectionValid(!!closestHandle, result.isValid);
				const fromInternalNode = nodeLookup.get(nodeId);
				const from = fromInternalNode ? getHandlePosition(fromInternalNode, fromHandle, Position.Left, true) : previousConnection.from;
				const newConnection = {
					...previousConnection,
					from,
					isValid,
					to: result.toHandle && isValid ? rendererPointToPoint({
						x: result.toHandle.x,
						y: result.toHandle.y
					}, transform) : position,
					toHandle: result.toHandle,
					toPosition: isValid && result.toHandle ? result.toHandle.position : oppositePosition[fromHandle.position],
					toNode: result.toHandle ? nodeLookup.get(result.toHandle.nodeId) : null,
					pointer: position
				};
				updateConnection(newConnection);
				previousConnection = newConnection;
			}
			function onPointerUp(event) {
				if ("touches" in event && event.touches.length > 0) return;
				if (connectionStarted) {
					if ((closestHandle || resultHandleDomNode) && connection && isValid) onConnect?.(connection);
					const { inProgress, ...connectionState } = previousConnection;
					const finalConnectionState = {
						...connectionState,
						toPosition: previousConnection.toHandle ? previousConnection.toPosition : null
					};
					onConnectEnd?.(event, finalConnectionState);
					if (edgeUpdaterType) onReconnectEnd?.(event, finalConnectionState);
				}
				cancelConnection();
				cancelAnimationFrame(autoPanId);
				autoPanStarted = false;
				isValid = false;
				connection = null;
				resultHandleDomNode = null;
				doc.removeEventListener("mousemove", onPointerMove);
				doc.removeEventListener("mouseup", onPointerUp);
				doc.removeEventListener("touchmove", onPointerMove);
				doc.removeEventListener("touchend", onPointerUp);
			}
			doc.addEventListener("mousemove", onPointerMove);
			doc.addEventListener("mouseup", onPointerUp);
			doc.addEventListener("touchmove", onPointerMove);
			doc.addEventListener("touchend", onPointerUp);
		}
		function isValidHandle(event, { handle, connectionMode, fromNodeId, fromHandleId, fromType, doc, lib, flowId, isValidConnection = alwaysValid, nodeLookup }) {
			const isTarget = fromType === "target";
			const handleDomNode = handle ? doc.querySelector(`.${lib}-flow__handle[data-id="${flowId}-${handle?.nodeId}-${handle?.id}-${handle?.type}"]`) : null;
			const { x, y } = getEventPosition(event);
			const handleBelow = doc.elementFromPoint(x, y);
			const handleToCheck = handleBelow?.classList.contains(`${lib}-flow__handle`) ? handleBelow : handleDomNode;
			const result = {
				handleDomNode: handleToCheck,
				isValid: false,
				connection: null,
				toHandle: null
			};
			if (handleToCheck) {
				const handleType = getHandleType(void 0, handleToCheck);
				const handleNodeId = handleToCheck.getAttribute("data-nodeid");
				const handleId = handleToCheck.getAttribute("data-handleid");
				const connectable = handleToCheck.classList.contains("connectable");
				const connectableEnd = handleToCheck.classList.contains("connectableend");
				if (!handleNodeId || !handleType) return result;
				const connection = {
					source: isTarget ? handleNodeId : fromNodeId,
					sourceHandle: isTarget ? handleId : fromHandleId,
					target: isTarget ? fromNodeId : handleNodeId,
					targetHandle: isTarget ? fromHandleId : handleId
				};
				result.connection = connection;
				result.isValid = connectable && connectableEnd && (connectionMode === ConnectionMode.Strict ? isTarget && handleType === "source" || !isTarget && handleType === "target" : handleNodeId !== fromNodeId || handleId !== fromHandleId) && isValidConnection(connection);
				result.toHandle = getHandle(handleNodeId, handleType, handleId, nodeLookup, connectionMode, true);
			}
			return result;
		}
		const XYHandle = {
			onPointerDown,
			isValid: isValidHandle
		};
		function XYMinimap({ domNode, panZoom, getTransform, getViewScale }) {
			const selection = select_default$1(domNode);
			function update({ translateExtent, width, height, zoomStep = 1, pannable = true, zoomable = true, inversePan = false }) {
				const zoomHandler = (event) => {
					if (event.sourceEvent.type !== "wheel" || !panZoom) return;
					const transform = getTransform();
					const factor = event.sourceEvent.ctrlKey && isMacOs() ? 10 : 1;
					const pinchDelta = -event.sourceEvent.deltaY * (event.sourceEvent.deltaMode === 1 ? .05 : event.sourceEvent.deltaMode ? 1 : .002) * zoomStep;
					const nextZoom = transform[2] * Math.pow(2, pinchDelta * factor);
					panZoom.scaleTo(nextZoom);
				};
				let panStart = [0, 0];
				const panStartHandler = (event) => {
					if (event.sourceEvent.type === "mousedown" || event.sourceEvent.type === "touchstart") panStart = [event.sourceEvent.clientX ?? event.sourceEvent.touches[0].clientX, event.sourceEvent.clientY ?? event.sourceEvent.touches[0].clientY];
				};
				const panHandler = (event) => {
					const transform = getTransform();
					if (event.sourceEvent.type !== "mousemove" && event.sourceEvent.type !== "touchmove" || !panZoom) return;
					const panCurrent = [event.sourceEvent.clientX ?? event.sourceEvent.touches[0].clientX, event.sourceEvent.clientY ?? event.sourceEvent.touches[0].clientY];
					const panDelta = [panCurrent[0] - panStart[0], panCurrent[1] - panStart[1]];
					panStart = panCurrent;
					const moveScale = getViewScale() * Math.max(transform[2], Math.log(transform[2])) * (inversePan ? -1 : 1);
					const position = {
						x: transform[0] - panDelta[0] * moveScale,
						y: transform[1] - panDelta[1] * moveScale
					};
					const extent = [[0, 0], [width, height]];
					panZoom.setViewportConstrained({
						x: position.x,
						y: position.y,
						zoom: transform[2]
					}, extent, translateExtent);
				};
				const zoomAndPanHandler = zoom_default().on("start", panStartHandler).on("zoom", pannable ? panHandler : null).on("zoom.wheel", zoomable ? zoomHandler : null);
				selection.call(zoomAndPanHandler, {});
			}
			function destroy() {
				selection.on("zoom", null);
			}
			return {
				update,
				destroy,
				pointer: pointer_default
			};
		}
		const transformToViewport = (transform) => ({
			x: transform.x,
			y: transform.y,
			zoom: transform.k
		});
		const viewportToTransform = ({ x, y, zoom }) => identity.translate(x, y).scale(zoom);
		const isWrappedWithClass = (event, className) => event.target.closest(`.${className}`);
		const isRightClickPan = (panOnDrag, usedButton) => usedButton === 2 && Array.isArray(panOnDrag) && panOnDrag.includes(2);
		const defaultEase = (t) => ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
		const getD3Transition = (selection, duration = 0, ease = defaultEase, onEnd = () => {}) => {
			const hasDuration = typeof duration === "number" && duration > 0;
			if (!hasDuration) onEnd();
			return hasDuration ? selection.transition().duration(duration).ease(ease).on("end", onEnd) : selection;
		};
		const wheelDelta = (event) => {
			const factor = event.ctrlKey && isMacOs() ? 10 : 1;
			return -event.deltaY * (event.deltaMode === 1 ? .05 : event.deltaMode ? 1 : .002) * factor;
		};
		function createPanOnScrollHandler({ zoomPanValues, noWheelClassName, d3Selection, d3Zoom, panOnScrollMode, panOnScrollSpeed, zoomOnPinch, onPanZoomStart, onPanZoom, onPanZoomEnd }) {
			return (event) => {
				if (isWrappedWithClass(event, noWheelClassName)) {
					if (event.ctrlKey) event.preventDefault();
					return false;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				const currentZoom = d3Selection.property("__zoom").k || 1;
				if (event.ctrlKey && zoomOnPinch) {
					const point = pointer_default(event);
					const pinchDelta = wheelDelta(event);
					const zoom = currentZoom * Math.pow(2, pinchDelta);
					d3Zoom.scaleTo(d3Selection, zoom, point, event);
					return;
				}
				const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
				let deltaX = panOnScrollMode === PanOnScrollMode.Vertical ? 0 : event.deltaX * deltaNormalize;
				let deltaY = panOnScrollMode === PanOnScrollMode.Horizontal ? 0 : event.deltaY * deltaNormalize;
				if (!isMacOs() && event.shiftKey && panOnScrollMode !== PanOnScrollMode.Vertical) {
					deltaX = event.deltaY * deltaNormalize;
					deltaY = 0;
				}
				d3Zoom.translateBy(d3Selection, -(deltaX / currentZoom) * panOnScrollSpeed, -(deltaY / currentZoom) * panOnScrollSpeed, { internal: true });
				const nextViewport = transformToViewport(d3Selection.property("__zoom"));
				clearTimeout(zoomPanValues.panScrollTimeout);
				if (!zoomPanValues.isPanScrolling) {
					zoomPanValues.isPanScrolling = true;
					onPanZoomStart?.(event, nextViewport);
				} else onPanZoom?.(event, nextViewport);
				zoomPanValues.panScrollTimeout = setTimeout(() => {
					onPanZoomEnd?.(event, nextViewport);
					zoomPanValues.isPanScrolling = false;
				}, 150);
			};
		}
		function createZoomOnScrollHandler({ noWheelClassName, preventScrolling, d3ZoomHandler }) {
			return function(event, d) {
				const isWheel = event.type === "wheel";
				const preventZoom = !preventScrolling && isWheel && !event.ctrlKey;
				const hasNoWheelClass = isWrappedWithClass(event, noWheelClassName);
				if (event.ctrlKey && isWheel && hasNoWheelClass) event.preventDefault();
				if (preventZoom || hasNoWheelClass) return null;
				event.preventDefault();
				d3ZoomHandler.call(this, event, d);
			};
		}
		function createPanZoomStartHandler({ zoomPanValues, onDraggingChange, onPanZoomStart }) {
			return (event) => {
				if (event.sourceEvent?.internal) return;
				const viewport = transformToViewport(event.transform);
				zoomPanValues.mouseButton = event.sourceEvent?.button || 0;
				zoomPanValues.isZoomingOrPanning = true;
				zoomPanValues.prevViewport = viewport;
				if (event.sourceEvent?.type === "mousedown") onDraggingChange(true);
				if (onPanZoomStart) onPanZoomStart?.(event.sourceEvent, viewport);
			};
		}
		function createPanZoomHandler({ zoomPanValues, panOnDrag, onPaneContextMenu, onTransformChange, onPanZoom }) {
			return (event) => {
				zoomPanValues.usedRightMouseButton = !!(onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0));
				if (!event.sourceEvent?.sync) onTransformChange([
					event.transform.x,
					event.transform.y,
					event.transform.k
				]);
				if (onPanZoom && !event.sourceEvent?.internal) onPanZoom?.(event.sourceEvent, transformToViewport(event.transform));
			};
		}
		function createPanZoomEndHandler({ zoomPanValues, panOnDrag, panOnScroll, onDraggingChange, onPanZoomEnd, onPaneContextMenu }) {
			return (event) => {
				if (event.sourceEvent?.internal) return;
				zoomPanValues.isZoomingOrPanning = false;
				if (onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0) && !zoomPanValues.usedRightMouseButton && event.sourceEvent) onPaneContextMenu(event.sourceEvent);
				zoomPanValues.usedRightMouseButton = false;
				onDraggingChange(false);
				if (onPanZoomEnd) {
					const viewport = transformToViewport(event.transform);
					zoomPanValues.prevViewport = viewport;
					clearTimeout(zoomPanValues.timerId);
					zoomPanValues.timerId = setTimeout(() => {
						onPanZoomEnd?.(event.sourceEvent, viewport);
					}, panOnScroll ? 150 : 0);
				}
			};
		}
		function createFilter({ panActivationKeyPressed, zoomActivationKeyPressed, zoomOnScroll, zoomOnPinch, panOnDrag, panOnScroll, zoomOnDoubleClick, userSelectionActive, noWheelClassName, noPanClassName, lib, connectionInProgress }) {
			return (event) => {
				const zoomScroll = zoomActivationKeyPressed || zoomOnScroll;
				const pinchZoom = zoomOnPinch && event.ctrlKey;
				const isWheelEvent = event.type === "wheel";
				if (event.button === 1 && event.type === "mousedown" && (isWrappedWithClass(event, `${lib}-flow__node`) || isWrappedWithClass(event, `${lib}-flow__edge`) || isWrappedWithClass(event, `${lib}-flow__selection`) || isWrappedWithClass(event, `${lib}-flow__nodesselection`))) return true;
				if (!panOnDrag && !zoomScroll && !panOnScroll && !zoomOnDoubleClick && !zoomOnPinch) return false;
				if (userSelectionActive) return false;
				if (connectionInProgress && !isWheelEvent) return false;
				if (isWrappedWithClass(event, noWheelClassName) && isWheelEvent) return false;
				if (isWrappedWithClass(event, noPanClassName) && (!isWheelEvent || panOnScroll && isWheelEvent && !zoomActivationKeyPressed)) return false;
				if (!zoomOnPinch && event.ctrlKey && isWheelEvent) return false;
				if (!zoomOnPinch && event.type === "touchstart" && event.touches?.length > 1) {
					event.preventDefault();
					return false;
				}
				if (!zoomScroll && !panOnScroll && !pinchZoom && isWheelEvent) return false;
				if (!panOnDrag && (event.type === "mousedown" || event.type === "touchstart")) return false;
				if (Array.isArray(panOnDrag) && !panOnDrag.includes(event.button) && event.type === "mousedown") return false;
				const buttonAllowed = Array.isArray(panOnDrag) && panOnDrag.includes(event.button) || !event.button || event.button <= 1;
				return (!event.ctrlKey || isWheelEvent || panActivationKeyPressed) && buttonAllowed;
			};
		}
		function XYPanZoom({ domNode, minZoom, maxZoom, translateExtent, viewport, onPanZoom, onPanZoomStart, onPanZoomEnd, onDraggingChange }) {
			const zoomPanValues = {
				isZoomingOrPanning: false,
				usedRightMouseButton: false,
				prevViewport: {},
				mouseButton: 0,
				timerId: void 0,
				panScrollTimeout: void 0,
				isPanScrolling: false
			};
			const bbox = domNode.getBoundingClientRect();
			let cachedExtent = [[0, 0], [bbox.width, bbox.height]];
			(typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
				const entry = entries[0];
				if (entry) cachedExtent = [[0, 0], [entry.contentRect.width, entry.contentRect.height]];
			}) : null)?.observe(domNode);
			const d3ZoomInstance = zoom_default().extent(() => cachedExtent).scaleExtent([minZoom, maxZoom]).translateExtent(translateExtent);
			const d3Selection = select_default$1(domNode).call(d3ZoomInstance);
			setViewportConstrained({
				x: viewport.x,
				y: viewport.y,
				zoom: clamp(viewport.zoom, minZoom, maxZoom)
			}, [[0, 0], [bbox.width, bbox.height]], translateExtent);
			const d3ZoomHandler = d3Selection.on("wheel.zoom");
			const d3DblClickZoomHandler = d3Selection.on("dblclick.zoom");
			d3ZoomInstance.wheelDelta(wheelDelta);
			async function setTransform(transform, options) {
				if (d3Selection) return new Promise((resolve) => {
					d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default$1).transform(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), transform);
				});
				return false;
			}
			function update({ noWheelClassName, noPanClassName, onPaneContextMenu, userSelectionActive, panOnScroll, panOnDrag, panOnScrollMode, panOnScrollSpeed, preventScrolling, zoomOnPinch, zoomOnScroll, zoomOnDoubleClick, panActivationKeyPressed = false, zoomActivationKeyPressed, lib, onTransformChange, connectionInProgress, paneClickDistance, selectionOnDrag }) {
				if (userSelectionActive && !zoomPanValues.isZoomingOrPanning) destroy();
				const isPanOnScroll = panOnScroll && !zoomActivationKeyPressed && !userSelectionActive;
				d3ZoomInstance.clickDistance(selectionOnDrag ? Infinity : !isNumeric(paneClickDistance) || paneClickDistance < 0 ? 0 : paneClickDistance);
				const wheelHandler = isPanOnScroll ? createPanOnScrollHandler({
					zoomPanValues,
					noWheelClassName,
					d3Selection,
					d3Zoom: d3ZoomInstance,
					panOnScrollMode,
					panOnScrollSpeed,
					zoomOnPinch,
					onPanZoomStart,
					onPanZoom,
					onPanZoomEnd
				}) : createZoomOnScrollHandler({
					noWheelClassName,
					preventScrolling,
					d3ZoomHandler
				});
				d3Selection.on("wheel.zoom", wheelHandler, { passive: false });
				const startHandler = createPanZoomStartHandler({
					zoomPanValues,
					onDraggingChange,
					onPanZoomStart
				});
				d3ZoomInstance.on("start", startHandler);
				const panZoomHandler = createPanZoomHandler({
					zoomPanValues,
					panOnDrag,
					onPaneContextMenu: !!onPaneContextMenu,
					onPanZoom,
					onTransformChange
				});
				d3ZoomInstance.on("zoom", panZoomHandler);
				const panZoomEndHandler = createPanZoomEndHandler({
					zoomPanValues,
					panOnDrag,
					panOnScroll,
					onPaneContextMenu,
					onPanZoomEnd,
					onDraggingChange
				});
				d3ZoomInstance.on("end", panZoomEndHandler);
				const filter = createFilter({
					panActivationKeyPressed,
					zoomActivationKeyPressed,
					panOnDrag,
					zoomOnScroll,
					panOnScroll,
					zoomOnDoubleClick,
					zoomOnPinch,
					userSelectionActive,
					noPanClassName,
					noWheelClassName,
					lib,
					connectionInProgress
				});
				d3ZoomInstance.filter(filter);
				if (zoomOnDoubleClick) d3Selection.on("dblclick.zoom", d3DblClickZoomHandler);
				else d3Selection.on("dblclick.zoom", null);
			}
			function destroy() {
				d3ZoomInstance.on("zoom", null);
			}
			async function setViewportConstrained(viewport, extent, translateExtent) {
				const nextTransform = viewportToTransform(viewport);
				const contrainedTransform = d3ZoomInstance?.constrain()(nextTransform, extent, translateExtent);
				if (contrainedTransform) await setTransform(contrainedTransform);
				return contrainedTransform;
			}
			async function setViewport(viewport, options) {
				const nextTransform = viewportToTransform(viewport);
				await setTransform(nextTransform, options);
				return nextTransform;
			}
			function syncViewport(viewport) {
				if (d3Selection) {
					const nextTransform = viewportToTransform(viewport);
					const currentTransform = d3Selection.property("__zoom");
					if (currentTransform.k !== viewport.zoom || currentTransform.x !== viewport.x || currentTransform.y !== viewport.y) d3ZoomInstance?.transform(d3Selection, nextTransform, null, { sync: true });
				}
			}
			function getViewport() {
				const transform$1 = d3Selection ? transform(d3Selection.node()) : {
					x: 0,
					y: 0,
					k: 1
				};
				return {
					x: transform$1.x,
					y: transform$1.y,
					zoom: transform$1.k
				};
			}
			async function scaleTo(zoom, options) {
				if (d3Selection) return new Promise((resolve) => {
					d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default$1).scaleTo(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), zoom);
				});
				return false;
			}
			async function scaleBy(factor, options) {
				if (d3Selection) return new Promise((resolve) => {
					d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default$1).scaleBy(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), factor);
				});
				return false;
			}
			function setScaleExtent(scaleExtent) {
				d3ZoomInstance?.scaleExtent(scaleExtent);
			}
			function setTranslateExtent(translateExtent) {
				d3ZoomInstance?.translateExtent(translateExtent);
			}
			function setClickDistance(distance) {
				const validDistance = !isNumeric(distance) || distance < 0 ? 0 : distance;
				d3ZoomInstance?.clickDistance(validDistance);
			}
			return {
				update,
				destroy,
				setViewport,
				setViewportConstrained,
				getViewport,
				scaleTo,
				scaleBy,
				setScaleExtent,
				setTranslateExtent,
				syncViewport,
				setClickDistance
			};
		}
		/**
		* Used to determine the variant of the resize control
		*
		* @public
		*/
		var ResizeControlVariant;
		(function(ResizeControlVariant) {
			ResizeControlVariant["Line"] = "line";
			ResizeControlVariant["Handle"] = "handle";
		})(ResizeControlVariant || (ResizeControlVariant = {}));
		/**
		* Get all connecting edges for a given set of nodes
		* @param width - new width of the node
		* @param prevWidth - previous width of the node
		* @param height - new height of the node
		* @param prevHeight - previous height of the node
		* @param affectsX - whether to invert the resize direction for the x axis
		* @param affectsY - whether to invert the resize direction for the y axis
		* @returns array of two numbers representing the direction of the resize for each axis, 0 = no change, 1 = increase, -1 = decrease
		*/
		function getResizeDirection({ width, prevWidth, height, prevHeight, affectsX, affectsY }) {
			const deltaWidth = width - prevWidth;
			const deltaHeight = height - prevHeight;
			const direction = [deltaWidth > 0 ? 1 : deltaWidth < 0 ? -1 : 0, deltaHeight > 0 ? 1 : deltaHeight < 0 ? -1 : 0];
			if (deltaWidth && affectsX) direction[0] = direction[0] * -1;
			if (deltaHeight && affectsY) direction[1] = direction[1] * -1;
			return direction;
		}
		/**
		* Parses the control position that is being dragged to dimensions that are being resized
		* @param controlPosition - position of the control that is being dragged
		* @returns isHorizontal, isVertical, affectsX, affectsY,
		*/
		function getControlDirection(controlPosition) {
			return {
				isHorizontal: controlPosition.includes("right") || controlPosition.includes("left"),
				isVertical: controlPosition.includes("bottom") || controlPosition.includes("top"),
				affectsX: controlPosition.includes("left"),
				affectsY: controlPosition.includes("top")
			};
		}
		function getLowerExtentClamp(lowerExtent, lowerBound) {
			return Math.max(0, lowerBound - lowerExtent);
		}
		function getUpperExtentClamp(upperExtent, upperBound) {
			return Math.max(0, upperExtent - upperBound);
		}
		function getSizeClamp(size, minSize, maxSize) {
			return Math.max(0, minSize - size, size - maxSize);
		}
		function xor(a, b) {
			return a ? !b : b;
		}
		/**
		* Calculates new width & height and x & y of node after resize based on pointer position
		* @description - Buckle up, this is a chunky one... If you want to determine the new dimensions of a node after a resize,
		* you have to account for all possible restrictions: min/max width/height of the node, the maximum extent the node is allowed
		* to move in (in this case: resize into) determined by the parent node, the minimal extent determined by child nodes
		* with expandParent or extent: 'parent' set and oh yeah, these things also have to work with keepAspectRatio!
		* The way this is done is by determining how much each of these restricting actually restricts the resize and then applying the
		* strongest restriction. Because the resize affects x, y and width, height and width, height of a opposing side with keepAspectRatio,
		* the resize amount is always kept in distX & distY amount (the distance in mouse movement)
		* Instead of clamping each value, we first calculate the biggest 'clamp' (for the lack of a better name) and then apply it to all values.
		* To complicate things nodeOrigin has to be taken into account as well. This is done by offsetting the nodes as if their origin is [0, 0],
		* then calculating the restrictions as usual
		* @param startValues - starting values of resize
		* @param controlDirection - dimensions affected by the resize
		* @param pointerPosition - the current pointer position corrected for snapping
		* @param boundaries - minimum and maximum dimensions of the node
		* @param keepAspectRatio - prevent changes of asprect ratio
		* @returns x, y, width and height of the node after resize
		*/
		function getDimensionsAfterResize(startValues, controlDirection, pointerPosition, boundaries, keepAspectRatio, nodeOrigin, extent, childExtent) {
			let { affectsX, affectsY } = controlDirection;
			const { isHorizontal, isVertical } = controlDirection;
			const isDiagonal = isHorizontal && isVertical;
			const { xSnapped, ySnapped } = pointerPosition;
			const { minWidth, maxWidth, minHeight, maxHeight } = boundaries;
			const { x: startX, y: startY, width: startWidth, height: startHeight, aspectRatio } = startValues;
			let distX = Math.floor(isHorizontal ? xSnapped - startValues.pointerX : 0);
			let distY = Math.floor(isVertical ? ySnapped - startValues.pointerY : 0);
			const newWidth = startWidth + (affectsX ? -distX : distX);
			const newHeight = startHeight + (affectsY ? -distY : distY);
			const originOffsetX = -nodeOrigin[0] * startWidth;
			const originOffsetY = -nodeOrigin[1] * startHeight;
			let clampX = getSizeClamp(newWidth, minWidth, maxWidth);
			let clampY = getSizeClamp(newHeight, minHeight, maxHeight);
			if (extent) {
				let xExtentClamp = 0;
				let yExtentClamp = 0;
				if (affectsX && distX < 0) xExtentClamp = getLowerExtentClamp(startX + distX + originOffsetX, extent[0][0]);
				else if (!affectsX && distX > 0) xExtentClamp = getUpperExtentClamp(startX + newWidth + originOffsetX, extent[1][0]);
				if (affectsY && distY < 0) yExtentClamp = getLowerExtentClamp(startY + distY + originOffsetY, extent[0][1]);
				else if (!affectsY && distY > 0) yExtentClamp = getUpperExtentClamp(startY + newHeight + originOffsetY, extent[1][1]);
				clampX = Math.max(clampX, xExtentClamp);
				clampY = Math.max(clampY, yExtentClamp);
			}
			if (childExtent) {
				let xExtentClamp = 0;
				let yExtentClamp = 0;
				if (affectsX && distX > 0) xExtentClamp = getUpperExtentClamp(startX + distX, childExtent[0][0]);
				else if (!affectsX && distX < 0) xExtentClamp = getLowerExtentClamp(startX + newWidth, childExtent[1][0]);
				if (affectsY && distY > 0) yExtentClamp = getUpperExtentClamp(startY + distY, childExtent[0][1]);
				else if (!affectsY && distY < 0) yExtentClamp = getLowerExtentClamp(startY + newHeight, childExtent[1][1]);
				clampX = Math.max(clampX, xExtentClamp);
				clampY = Math.max(clampY, yExtentClamp);
			}
			if (keepAspectRatio) {
				if (isHorizontal) {
					const aspectHeightClamp = getSizeClamp(newWidth / aspectRatio, minHeight, maxHeight) * aspectRatio;
					clampX = Math.max(clampX, aspectHeightClamp);
					if (extent) {
						let aspectExtentClamp = 0;
						if (!affectsX && !affectsY || affectsX && !affectsY && isDiagonal) aspectExtentClamp = getUpperExtentClamp(startY + originOffsetY + newWidth / aspectRatio, extent[1][1]) * aspectRatio;
						else aspectExtentClamp = getLowerExtentClamp(startY + originOffsetY + (affectsX ? distX : -distX) / aspectRatio, extent[0][1]) * aspectRatio;
						clampX = Math.max(clampX, aspectExtentClamp);
					}
					if (childExtent) {
						let aspectExtentClamp = 0;
						if (!affectsX && !affectsY || affectsX && !affectsY && isDiagonal) aspectExtentClamp = getLowerExtentClamp(startY + newWidth / aspectRatio, childExtent[1][1]) * aspectRatio;
						else aspectExtentClamp = getUpperExtentClamp(startY + (affectsX ? distX : -distX) / aspectRatio, childExtent[0][1]) * aspectRatio;
						clampX = Math.max(clampX, aspectExtentClamp);
					}
				}
				if (isVertical) {
					const aspectWidthClamp = getSizeClamp(newHeight * aspectRatio, minWidth, maxWidth) / aspectRatio;
					clampY = Math.max(clampY, aspectWidthClamp);
					if (extent) {
						let aspectExtentClamp = 0;
						if (!affectsX && !affectsY || affectsY && !affectsX && isDiagonal) aspectExtentClamp = getUpperExtentClamp(startX + newHeight * aspectRatio + originOffsetX, extent[1][0]) / aspectRatio;
						else aspectExtentClamp = getLowerExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio + originOffsetX, extent[0][0]) / aspectRatio;
						clampY = Math.max(clampY, aspectExtentClamp);
					}
					if (childExtent) {
						let aspectExtentClamp = 0;
						if (!affectsX && !affectsY || affectsY && !affectsX && isDiagonal) aspectExtentClamp = getLowerExtentClamp(startX + newHeight * aspectRatio, childExtent[1][0]) / aspectRatio;
						else aspectExtentClamp = getUpperExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio, childExtent[0][0]) / aspectRatio;
						clampY = Math.max(clampY, aspectExtentClamp);
					}
				}
			}
			distY = distY + (distY < 0 ? clampY : -clampY);
			distX = distX + (distX < 0 ? clampX : -clampX);
			if (keepAspectRatio) if (isDiagonal) if (newWidth > newHeight * aspectRatio) distY = (xor(affectsX, affectsY) ? -distX : distX) / aspectRatio;
			else distX = (xor(affectsX, affectsY) ? -distY : distY) * aspectRatio;
			else if (isHorizontal) {
				distY = distX / aspectRatio;
				affectsY = affectsX;
			} else {
				distX = distY * aspectRatio;
				affectsX = affectsY;
			}
			const x = affectsX ? startX + distX : startX;
			const y = affectsY ? startY + distY : startY;
			return {
				width: startWidth + (affectsX ? -distX : distX),
				height: startHeight + (affectsY ? -distY : distY),
				x: nodeOrigin[0] * distX * (!affectsX ? 1 : -1) + x,
				y: nodeOrigin[1] * distY * (!affectsY ? 1 : -1) + y
			};
		}
		const initPrevValues$1 = {
			width: 0,
			height: 0,
			x: 0,
			y: 0
		};
		const initStartValues = {
			...initPrevValues$1,
			pointerX: 0,
			pointerY: 0,
			aspectRatio: 1
		};
		function nodeToChildExtent(child, parent, nodeOrigin) {
			const x = parent.position.x + child.position.x;
			const y = parent.position.y + child.position.y;
			const width = child.measured.width ?? 0;
			const height = child.measured.height ?? 0;
			const originOffsetX = nodeOrigin[0] * width;
			const originOffsetY = nodeOrigin[1] * height;
			return [[x - originOffsetX, y - originOffsetY], [x + width - originOffsetX, y + height - originOffsetY]];
		}
		function XYResizer({ domNode, nodeId, getStoreItems, onChange, onEnd }) {
			const selection = select_default$1(domNode);
			let params = {
				controlDirection: getControlDirection("bottom-right"),
				boundaries: {
					minWidth: 0,
					minHeight: 0,
					maxWidth: Number.MAX_VALUE,
					maxHeight: Number.MAX_VALUE
				},
				resizeDirection: void 0,
				keepAspectRatio: false
			};
			function update({ controlPosition, boundaries, keepAspectRatio, resizeDirection, onResizeStart, onResize, onResizeEnd, shouldResize }) {
				let prevValues = { ...initPrevValues$1 };
				let startValues = { ...initStartValues };
				params = {
					boundaries,
					resizeDirection,
					keepAspectRatio,
					controlDirection: getControlDirection(controlPosition)
				};
				let node = void 0;
				let containerBounds = null;
				let childNodes = [];
				let parentNode = void 0;
				let nodeExtent = void 0;
				let childExtent = void 0;
				let resizeDetected = false;
				const dragHandler = drag_default().on("start", (event) => {
					const { nodeLookup, transform, snapGrid, snapToGrid, nodeOrigin, paneDomNode } = getStoreItems();
					node = nodeLookup.get(nodeId);
					if (!node) return;
					containerBounds = paneDomNode?.getBoundingClientRect() ?? null;
					const { xSnapped, ySnapped } = getPointerPosition(event.sourceEvent, {
						transform,
						snapGrid,
						snapToGrid,
						containerBounds
					});
					prevValues = {
						width: node.measured.width ?? 0,
						height: node.measured.height ?? 0,
						x: node.position.x ?? 0,
						y: node.position.y ?? 0
					};
					startValues = {
						...prevValues,
						pointerX: xSnapped,
						pointerY: ySnapped,
						aspectRatio: prevValues.width / prevValues.height
					};
					parentNode = void 0;
					nodeExtent = isCoordinateExtent(node.extent) ? node.extent : void 0;
					if (node.parentId && (node.extent === "parent" || node.expandParent)) parentNode = nodeLookup.get(node.parentId);
					if (parentNode && node.extent === "parent") nodeExtent = [[0, 0], [parentNode.measured.width, parentNode.measured.height]];
					childNodes = [];
					childExtent = void 0;
					for (const [childId, child] of nodeLookup) if (child.parentId === nodeId) {
						childNodes.push({
							id: childId,
							position: { ...child.position },
							extent: child.extent
						});
						if (child.extent === "parent" || child.expandParent) {
							const extent = nodeToChildExtent(child, node, child.origin ?? nodeOrigin);
							if (childExtent) childExtent = [[Math.min(extent[0][0], childExtent[0][0]), Math.min(extent[0][1], childExtent[0][1])], [Math.max(extent[1][0], childExtent[1][0]), Math.max(extent[1][1], childExtent[1][1])]];
							else childExtent = extent;
						}
					}
					onResizeStart?.(event, { ...prevValues });
				}).on("drag", (event) => {
					const { transform, snapGrid, snapToGrid, nodeOrigin: storeNodeOrigin } = getStoreItems();
					const pointerPosition = getPointerPosition(event.sourceEvent, {
						transform,
						snapGrid,
						snapToGrid,
						containerBounds
					});
					const childChanges = [];
					if (!node) return;
					const { x: prevX, y: prevY, width: prevWidth, height: prevHeight } = prevValues;
					const change = {};
					const nodeOrigin = node.origin ?? storeNodeOrigin;
					const { width, height, x, y } = getDimensionsAfterResize(startValues, params.controlDirection, pointerPosition, params.boundaries, params.keepAspectRatio, nodeOrigin, nodeExtent, childExtent);
					const isWidthChange = width !== prevWidth;
					const isHeightChange = height !== prevHeight;
					const isXPosChange = x !== prevX && isWidthChange;
					const isYPosChange = y !== prevY && isHeightChange;
					if (!isXPosChange && !isYPosChange && !isWidthChange && !isHeightChange) return;
					if (isXPosChange || isYPosChange || nodeOrigin[0] === 1 || nodeOrigin[1] === 1) {
						change.x = isXPosChange ? x : prevValues.x;
						change.y = isYPosChange ? y : prevValues.y;
						prevValues.x = change.x;
						prevValues.y = change.y;
						if (childNodes.length > 0) {
							const xChange = x - prevX;
							const yChange = y - prevY;
							for (const childNode of childNodes) {
								childNode.position = {
									x: childNode.position.x - xChange + nodeOrigin[0] * (width - prevWidth),
									y: childNode.position.y - yChange + nodeOrigin[1] * (height - prevHeight)
								};
								childChanges.push(childNode);
							}
						}
					}
					if (isWidthChange || isHeightChange) {
						change.width = isWidthChange && (!params.resizeDirection || params.resizeDirection === "horizontal") ? width : prevValues.width;
						change.height = isHeightChange && (!params.resizeDirection || params.resizeDirection === "vertical") ? height : prevValues.height;
						prevValues.width = change.width;
						prevValues.height = change.height;
					}
					if (parentNode && node.expandParent) {
						const xLimit = nodeOrigin[0] * (change.width ?? 0);
						if (change.x && change.x < xLimit) {
							prevValues.x = xLimit;
							startValues.x = startValues.x - (change.x - xLimit);
						}
						const yLimit = nodeOrigin[1] * (change.height ?? 0);
						if (change.y && change.y < yLimit) {
							prevValues.y = yLimit;
							startValues.y = startValues.y - (change.y - yLimit);
						}
					}
					const direction = getResizeDirection({
						width: prevValues.width,
						prevWidth,
						height: prevValues.height,
						prevHeight,
						affectsX: params.controlDirection.affectsX,
						affectsY: params.controlDirection.affectsY
					});
					const nextValues = {
						...prevValues,
						direction
					};
					if (shouldResize?.(event, nextValues) === false) return;
					resizeDetected = true;
					onResize?.(event, nextValues);
					onChange(change, childChanges);
				}).on("end", (event) => {
					if (!resizeDetected) return;
					onResizeEnd?.(event, { ...prevValues });
					onEnd?.({ ...prevValues });
					resizeDetected = false;
				});
				selection.call(dragHandler);
			}
			function destroy() {
				selection.on(".drag", null);
			}
			return {
				update,
				destroy
			};
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/use-sync-external-store@1.2.0_react@18.3.1/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.min.js
		/**
		* @license React
		* use-sync-external-store-shim.production.min.js
		*
		* Copyright (c) Facebook, Inc. and its affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_use_sync_external_store_shim_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			var e = require("react");
			function h(a, b) {
				return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
			}
			var k = "function" === typeof Object.is ? Object.is : h, l = e.useState, m = e.useEffect, n = e.useLayoutEffect, p = e.useDebugValue;
			function q(a, b) {
				var d = b(), f = l({ inst: {
					value: d,
					getSnapshot: b
				} }), c = f[0].inst, g = f[1];
				n(function() {
					c.value = d;
					c.getSnapshot = b;
					r(c) && g({ inst: c });
				}, [
					a,
					d,
					b
				]);
				m(function() {
					r(c) && g({ inst: c });
					return a(function() {
						r(c) && g({ inst: c });
					});
				}, [a]);
				p(d);
				return d;
			}
			function r(a) {
				var b = a.getSnapshot;
				a = a.value;
				try {
					var d = b();
					return !k(a, d);
				} catch (f) {
					return !0;
				}
			}
			function t(a, b) {
				return b();
			}
			var u = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? t : q;
			exports.useSyncExternalStore = void 0 !== e.useSyncExternalStore ? e.useSyncExternalStore : u;
		}));
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/use-sync-external-store@1.2.0_react@18.3.1/node_modules/use-sync-external-store/shim/index.js
		var require_shim = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_use_sync_external_store_shim_production_min();
		}));
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/use-sync-external-store@1.2.0_react@18.3.1/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.production.min.js
		/**
		* @license React
		* use-sync-external-store-shim/with-selector.production.min.js
		*
		* Copyright (c) Facebook, Inc. and its affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_with_selector_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			var h = require("react"), n = require_shim();
			function p(a, b) {
				return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
			}
			var q = "function" === typeof Object.is ? Object.is : p, r = n.useSyncExternalStore, t = h.useRef, u = h.useEffect, v = h.useMemo, w = h.useDebugValue;
			exports.useSyncExternalStoreWithSelector = function(a, b, e, l, g) {
				var c = t(null);
				if (null === c.current) {
					var f = {
						hasValue: !1,
						value: null
					};
					c.current = f;
				} else f = c.current;
				c = v(function() {
					function a(a) {
						if (!c) {
							c = !0;
							d = a;
							a = l(a);
							if (void 0 !== g && f.hasValue) {
								var b = f.value;
								if (g(b, a)) return k = b;
							}
							return k = a;
						}
						b = k;
						if (q(d, a)) return b;
						var e = l(a);
						if (void 0 !== g && g(b, e)) return b;
						d = a;
						return k = e;
					}
					var c = !1, d, k, m = void 0 === e ? null : e;
					return [function() {
						return a(b());
					}, null === m ? void 0 : function() {
						return a(m());
					}];
				}, [
					b,
					e,
					l,
					g
				]);
				var d = r(a, c[0], c[1]);
				u(function() {
					f.hasValue = !0;
					f.value = d;
				}, [d]);
				w(d);
				return d;
			};
		}));
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/zustand@4.4.7_@types+react@18.3.31_immer@10.2.0_react@18.3.1/node_modules/zustand/esm/vanilla.mjs
		var import_with_selector = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_with_selector_production_min();
		})))(), 1);
		const createStoreImpl = (createState) => {
			let state;
			const listeners = /* @__PURE__ */ new Set();
			const setState = (partial, replace) => {
				const nextState = typeof partial === "function" ? partial(state) : partial;
				if (!Object.is(nextState, state)) {
					const previousState = state;
					state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
					listeners.forEach((listener) => listener(state, previousState));
				}
			};
			const getState = () => state;
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			};
			const destroy = () => {
				listeners.clear();
			};
			const api = {
				setState,
				getState,
				subscribe,
				destroy
			};
			state = createState(setState, getState, api);
			return api;
		};
		const createStore$1 = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/zustand@4.4.7_@types+react@18.3.31_immer@10.2.0_react@18.3.1/node_modules/zustand/esm/traditional.mjs
		const { useDebugValue } = react.default;
		const { useSyncExternalStoreWithSelector } = import_with_selector.default;
		function useStoreWithEqualityFn(api, selector = api.getState, equalityFn) {
			const slice = useSyncExternalStoreWithSelector(api.subscribe, api.getState, api.getServerState || api.getState, selector, equalityFn);
			useDebugValue(slice);
			return slice;
		}
		const createWithEqualityFnImpl = (createState, defaultEqualityFn) => {
			const api = createStore$1(createState);
			const useBoundStoreWithEqualityFn = (selector, equalityFn = defaultEqualityFn) => useStoreWithEqualityFn(api, selector, equalityFn);
			Object.assign(useBoundStoreWithEqualityFn, api);
			return useBoundStoreWithEqualityFn;
		};
		const createWithEqualityFn = (createState, defaultEqualityFn) => createState ? createWithEqualityFnImpl(createState, defaultEqualityFn) : createWithEqualityFnImpl;
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/zustand@4.4.7_@types+react@18.3.31_immer@10.2.0_react@18.3.1/node_modules/zustand/esm/shallow.mjs
		function shallow$1(objA, objB) {
			if (Object.is(objA, objB)) return true;
			if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) return false;
			if (objA instanceof Map && objB instanceof Map) {
				if (objA.size !== objB.size) return false;
				for (const [key, value] of objA) if (!Object.is(value, objB.get(key))) return false;
				return true;
			}
			if (objA instanceof Set && objB instanceof Set) {
				if (objA.size !== objB.size) return false;
				for (const value of objA) if (!objB.has(value)) return false;
				return true;
			}
			const keysA = Object.keys(objA);
			if (keysA.length !== Object.keys(objB).length) return false;
			for (let i = 0; i < keysA.length; i++) if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) return false;
			return true;
		}
		//#endregion
		//#region ../../../deepseek-harness/node_modules/.pnpm/@xyflow+react@12.11.3_@type_c8ad5535bc0eee7278731c29742ea953/node_modules/@xyflow/react/dist/esm/index.js
		const StoreContext = (0, react.createContext)(null);
		const Provider$1 = StoreContext.Provider;
		const zustandErrorMessage = errorMessages["error001"]("react");
		/**
		* This hook can be used to subscribe to internal state changes of the React Flow
		* component. The `useStore` hook is re-exported from the [Zustand](https://github.com/pmndrs/zustand)
		* state management library, so you should check out their docs for more details.
		*
		* @public
		* @param selector - A selector function that returns a slice of the flow's internal state.
		* Extracting or transforming just the state you need is a good practice to avoid unnecessary
		* re-renders.
		* @param equalityFn - A function to compare the previous and next value. This is incredibly useful
		* for preventing unnecessary re-renders. Good sensible defaults are using `Object.is` or importing
		* `zustand/shallow`, but you can be as granular as you like.
		* @returns The selected state slice.
		*
		* @example
		* ```ts
		* const nodes = useStore((state) => state.nodes);
		* ```
		*
		* @remarks This hook should only be used if there is no other way to access the internal
		* state. For many of the common use cases, there are dedicated hooks available
		* such as {@link useReactFlow}, {@link useViewport}, etc.
		*/
		function useStore(selector, equalityFn) {
			const store = (0, react.useContext)(StoreContext);
			if (store === null) throw new Error(zustandErrorMessage);
			return useStoreWithEqualityFn(store, selector, equalityFn);
		}
		/**
		* In some cases, you might need to access the store directly. This hook returns the store object which can be used on demand to access the state or dispatch actions.
		*
		* @returns The store object.
		* @example
		* ```ts
		* const store = useStoreApi();
		* ```
		*
		* @remarks This hook should only be used if there is no other way to access the internal
		* state. For many of the common use cases, there are dedicated hooks available
		* such as {@link useReactFlow}, {@link useViewport}, etc.
		*/
		function useStoreApi() {
			const store = (0, react.useContext)(StoreContext);
			if (store === null) throw new Error(zustandErrorMessage);
			return (0, react.useMemo)(() => ({
				getState: store.getState,
				setState: store.setState,
				subscribe: store.subscribe
			}), [store]);
		}
		const style = { display: "none" };
		const ariaLiveStyle = {
			position: "absolute",
			width: 1,
			height: 1,
			margin: -1,
			border: 0,
			padding: 0,
			overflow: "hidden",
			clip: "rect(0px, 0px, 0px, 0px)",
			clipPath: "inset(100%)"
		};
		const ARIA_NODE_DESC_KEY = "react-flow__node-desc";
		const ARIA_EDGE_DESC_KEY = "react-flow__edge-desc";
		const ARIA_LIVE_MESSAGE = "react-flow__aria-live";
		const ariaLiveSelector = (s) => s.ariaLiveMessage;
		const ariaLabelConfigSelector = (s) => s.ariaLabelConfig;
		function AriaLiveMessage({ rfId }) {
			const ariaLiveMessage = useStore(ariaLiveSelector);
			return (0, react_jsx_runtime.jsx)("div", {
				id: `${ARIA_LIVE_MESSAGE}-${rfId}`,
				"aria-live": "assertive",
				"aria-atomic": "true",
				style: ariaLiveStyle,
				children: ariaLiveMessage
			});
		}
		function A11yDescriptions({ rfId, disableKeyboardA11y }) {
			const ariaLabelConfig = useStore(ariaLabelConfigSelector);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("div", {
					id: `${ARIA_NODE_DESC_KEY}-${rfId}`,
					style,
					children: disableKeyboardA11y ? ariaLabelConfig["node.a11yDescription.default"] : ariaLabelConfig["node.a11yDescription.keyboardDisabled"]
				}),
				(0, react_jsx_runtime.jsx)("div", {
					id: `${ARIA_EDGE_DESC_KEY}-${rfId}`,
					style,
					children: ariaLabelConfig["edge.a11yDescription.default"]
				}),
				!disableKeyboardA11y && (0, react_jsx_runtime.jsx)(AriaLiveMessage, { rfId })
			] });
		}
		/**
		* The `<Panel />` component helps you position content above the viewport.
		* It is used internally by the [`<MiniMap />`](/api-reference/components/minimap)
		* and [`<Controls />`](/api-reference/components/controls) components.
		*
		* @public
		*
		* @example
		* ```jsx
		*import { ReactFlow, Background, Panel } from '@xyflow/react';
		*
		*export default function Flow() {
		*  return (
		*    <ReactFlow nodes={[]} fitView>
		*      <Panel position="top-left">top-left</Panel>
		*      <Panel position="top-center">top-center</Panel>
		*      <Panel position="top-right">top-right</Panel>
		*      <Panel position="bottom-left">bottom-left</Panel>
		*      <Panel position="bottom-center">bottom-center</Panel>
		*      <Panel position="bottom-right">bottom-right</Panel>
		*    </ReactFlow>
		*  );
		*}
		*```
		*/
		const Panel = (0, react.forwardRef)(({ position = "top-left", children, className, style, ...rest }, ref) => {
			return (0, react_jsx_runtime.jsx)("div", {
				className: cc([
					"react-flow__panel",
					className,
					...`${position}`.split("-")
				]),
				style,
				ref,
				...rest,
				children
			});
		});
		Panel.displayName = "Panel";
		const link = `https://reactflow.dev?utm_source=attribution`;
		function Attribution({ proOptions, position = "bottom-right" }) {
			if (proOptions?.hideAttribution) return null;
			return (0, react_jsx_runtime.jsx)(Panel, {
				position,
				className: "react-flow__attribution",
				"data-message": `Please only hide this attribution when you are subscribed to React Flow Pro: ${link}`,
				children: (0, react_jsx_runtime.jsx)("a", {
					href: link,
					target: "_blank",
					rel: "noopener noreferrer",
					"aria-label": "React Flow attribution",
					children: "React Flow"
				})
			});
		}
		const selector$l = (s) => {
			const selectedNodes = [];
			const selectedEdges = [];
			for (const [, node] of s.nodeLookup) if (node.selected) selectedNodes.push(node.internals.userNode);
			for (const [, edge] of s.edgeLookup) if (edge.selected) selectedEdges.push(edge);
			return {
				selectedNodes,
				selectedEdges
			};
		};
		const selectId = (obj) => obj.id;
		function areEqual$1(a, b) {
			return shallow$1(a.selectedNodes.map(selectId), b.selectedNodes.map(selectId)) && shallow$1(a.selectedEdges.map(selectId), b.selectedEdges.map(selectId));
		}
		function SelectionListenerInner({ onSelectionChange }) {
			const store = useStoreApi();
			const { selectedNodes, selectedEdges } = useStore(selector$l, areEqual$1);
			(0, react.useEffect)(() => {
				const params = {
					nodes: selectedNodes,
					edges: selectedEdges
				};
				onSelectionChange?.(params);
				store.getState().onSelectionChangeHandlers.forEach((fn) => fn(params));
			}, [
				selectedNodes,
				selectedEdges,
				onSelectionChange
			]);
			return null;
		}
		const changeSelector = (s) => !!s.onSelectionChangeHandlers;
		function SelectionListener({ onSelectionChange }) {
			const storeHasSelectionChangeHandlers = useStore(changeSelector);
			if (onSelectionChange || storeHasSelectionChangeHandlers) return (0, react_jsx_runtime.jsx)(SelectionListenerInner, { onSelectionChange });
			return null;
		}
		const defaultNodeOrigin = [0, 0];
		const defaultViewport = {
			x: 0,
			y: 0,
			zoom: 1
		};
		const fieldsToTrack = [...[
			"nodes",
			"edges",
			"defaultNodes",
			"defaultEdges",
			"onConnect",
			"onConnectStart",
			"onConnectEnd",
			"onClickConnectStart",
			"onClickConnectEnd",
			"nodesDraggable",
			"autoPanOnNodeFocus",
			"nodesConnectable",
			"nodesFocusable",
			"edgesFocusable",
			"edgesReconnectable",
			"elevateNodesOnSelect",
			"elevateEdgesOnSelect",
			"minZoom",
			"maxZoom",
			"nodeExtent",
			"onNodesChange",
			"onEdgesChange",
			"elementsSelectable",
			"connectionMode",
			"snapGrid",
			"snapToGrid",
			"translateExtent",
			"connectOnClick",
			"defaultEdgeOptions",
			"fitView",
			"fitViewOptions",
			"onNodesDelete",
			"onEdgesDelete",
			"onDelete",
			"onNodeDrag",
			"onNodeDragStart",
			"onNodeDragStop",
			"onSelectionDrag",
			"onSelectionDragStart",
			"onSelectionDragStop",
			"onMoveStart",
			"onMove",
			"onMoveEnd",
			"noPanClassName",
			"nodeOrigin",
			"autoPanOnConnect",
			"autoPanOnNodeDrag",
			"onError",
			"connectionRadius",
			"isValidConnection",
			"selectNodesOnDrag",
			"nodeDragThreshold",
			"connectionDragThreshold",
			"onBeforeDelete",
			"debug",
			"autoPanSpeed",
			"ariaLabelConfig",
			"zIndexMode"
		], "rfId"];
		const selector$k = (s) => ({
			setNodes: s.setNodes,
			setEdges: s.setEdges,
			setMinZoom: s.setMinZoom,
			setMaxZoom: s.setMaxZoom,
			setTranslateExtent: s.setTranslateExtent,
			setNodeExtent: s.setNodeExtent,
			reset: s.reset,
			setDefaultNodesAndEdges: s.setDefaultNodesAndEdges
		});
		const initPrevValues = {
			translateExtent: infiniteExtent,
			nodeOrigin: defaultNodeOrigin,
			minZoom: .5,
			maxZoom: 2,
			elementsSelectable: true,
			noPanClassName: "nopan",
			rfId: "1"
		};
		function StoreUpdater(props) {
			const { setNodes, setEdges, setMinZoom, setMaxZoom, setTranslateExtent, setNodeExtent, reset, setDefaultNodesAndEdges } = useStore(selector$k, shallow$1);
			const store = useStoreApi();
			(0, react.useEffect)(() => {
				setDefaultNodesAndEdges(props.defaultNodes, props.defaultEdges);
				return () => {
					previousFields.current = initPrevValues;
					reset();
				};
			}, []);
			const previousFields = (0, react.useRef)(initPrevValues);
			(0, react.useEffect)(() => {
				for (const fieldName of fieldsToTrack) {
					const fieldValue = props[fieldName];
					if (fieldValue === previousFields.current[fieldName]) continue;
					if (typeof props[fieldName] === "undefined") continue;
					if (fieldName === "nodes") setNodes(fieldValue);
					else if (fieldName === "edges") setEdges(fieldValue);
					else if (fieldName === "minZoom") setMinZoom(fieldValue);
					else if (fieldName === "maxZoom") setMaxZoom(fieldValue);
					else if (fieldName === "translateExtent") setTranslateExtent(fieldValue);
					else if (fieldName === "nodeExtent") setNodeExtent(fieldValue);
					else if (fieldName === "ariaLabelConfig") store.setState({ ariaLabelConfig: mergeAriaLabelConfig(fieldValue) });
					else if (fieldName === "fitView") store.setState({ fitViewQueued: fieldValue });
					else if (fieldName === "fitViewOptions") store.setState({ fitViewOptions: fieldValue });
					else store.setState({ [fieldName]: fieldValue });
				}
				previousFields.current = props;
			}, fieldsToTrack.map((fieldName) => props[fieldName]));
			return null;
		}
		function getMediaQuery() {
			if (typeof window === "undefined" || !window.matchMedia) return null;
			return window.matchMedia("(prefers-color-scheme: dark)");
		}
		/**
		* Hook for receiving the current color mode class 'dark' or 'light'.
		*
		* @internal
		* @param colorMode - The color mode to use ('dark', 'light' or 'system')
		*/
		function useColorModeClass(colorMode) {
			const [colorModeClass, setColorModeClass] = (0, react.useState)(colorMode === "system" ? null : colorMode);
			(0, react.useEffect)(() => {
				if (colorMode !== "system") {
					setColorModeClass(colorMode);
					return;
				}
				const mediaQuery = getMediaQuery();
				const updateColorModeClass = () => setColorModeClass(mediaQuery?.matches ? "dark" : "light");
				updateColorModeClass();
				mediaQuery?.addEventListener("change", updateColorModeClass);
				return () => {
					mediaQuery?.removeEventListener("change", updateColorModeClass);
				};
			}, [colorMode]);
			return colorModeClass !== null ? colorModeClass : getMediaQuery()?.matches ? "dark" : "light";
		}
		const defaultDoc = typeof document !== "undefined" ? document : null;
		/**
		* This hook lets you listen for specific key codes and tells you whether they are
		* currently pressed or not.
		*
		* @public
		* @param options - Options
		*
		* @example
		* ```tsx
		*import { useKeyPress } from '@xyflow/react';
		*
		*export default function () {
		*  const spacePressed = useKeyPress('Space');
		*  const cmdAndSPressed = useKeyPress(['Meta+s', 'Strg+s']);
		*
		*  return (
		*    <div>
		*     {spacePressed && <p>Space pressed!</p>}
		*     {cmdAndSPressed && <p>Cmd + S pressed!</p>}
		*    </div>
		*  );
		*}
		*```
		*/
		function useKeyPress(keyCode = null, options = {
			target: defaultDoc,
			actInsideInputWithModifier: true
		}) {
			const [keyPressed, setKeyPressed] = (0, react.useState)(false);
			const modifierPressed = (0, react.useRef)(false);
			const pressedKeys = (0, react.useRef)(/* @__PURE__ */ new Set([]));
			const [keyCodes, keysToWatch] = (0, react.useMemo)(() => {
				if (keyCode !== null) {
					const keys = (Array.isArray(keyCode) ? keyCode : [keyCode]).filter((kc) => typeof kc === "string").map((kc) => kc.replace(/\+/g, "\n").replace("\n\n", "\n+").split("\n"));
					return [keys, keys.reduce((res, item) => res.concat(...item), [])];
				}
				return [[], []];
			}, [keyCode]);
			(0, react.useEffect)(() => {
				const target = options?.target ?? defaultDoc;
				const actInsideInputWithModifier = options?.actInsideInputWithModifier ?? true;
				if (keyCode !== null) {
					const downHandler = (event) => {
						modifierPressed.current = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
						if ((!modifierPressed.current || modifierPressed.current && !actInsideInputWithModifier) && isInputDOMNode(event)) return false;
						const keyOrCode = useKeyOrCode(event.code, keysToWatch);
						pressedKeys.current.add(event[keyOrCode]);
						if (isMatchingKey(keyCodes, pressedKeys.current, false)) {
							const target = event.composedPath?.()?.[0] || event.target;
							const isInteractiveElement = target?.nodeName === "BUTTON" || target?.nodeName === "A";
							if (options.preventDefault !== false && (modifierPressed.current || !isInteractiveElement)) event.preventDefault();
							setKeyPressed(true);
						}
					};
					const upHandler = (event) => {
						const keyOrCode = useKeyOrCode(event.code, keysToWatch);
						if (isMatchingKey(keyCodes, pressedKeys.current, true)) {
							setKeyPressed(false);
							pressedKeys.current.clear();
						} else pressedKeys.current.delete(event[keyOrCode]);
						if (event.key === "Meta") pressedKeys.current.clear();
						modifierPressed.current = false;
					};
					const resetHandler = () => {
						pressedKeys.current.clear();
						setKeyPressed(false);
					};
					target?.addEventListener("keydown", downHandler);
					target?.addEventListener("keyup", upHandler);
					window.addEventListener("blur", resetHandler);
					window.addEventListener("contextmenu", resetHandler);
					return () => {
						target?.removeEventListener("keydown", downHandler);
						target?.removeEventListener("keyup", upHandler);
						window.removeEventListener("blur", resetHandler);
						window.removeEventListener("contextmenu", resetHandler);
					};
				}
			}, [keyCode, setKeyPressed]);
			return keyPressed;
		}
		function isMatchingKey(keyCodes, pressedKeys, isUp) {
			return keyCodes.filter((keys) => isUp || keys.length === pressedKeys.size).some((keys) => keys.every((k) => pressedKeys.has(k)));
		}
		function useKeyOrCode(eventCode, keysToWatch) {
			return keysToWatch.includes(eventCode) ? "code" : "key";
		}
		/**
		* Hook for getting viewport helper functions.
		*
		* @internal
		* @returns viewport helper functions
		*/
		const useViewportHelper = () => {
			const store = useStoreApi();
			return (0, react.useMemo)(() => {
				return {
					zoomIn: async (options) => {
						const { panZoom } = store.getState();
						return panZoom ? panZoom.scaleBy(1.2, options) : false;
					},
					zoomOut: async (options) => {
						const { panZoom } = store.getState();
						return panZoom ? panZoom.scaleBy(1 / 1.2, options) : false;
					},
					zoomTo: async (zoomLevel, options) => {
						const { panZoom } = store.getState();
						return panZoom ? panZoom.scaleTo(zoomLevel, options) : false;
					},
					getZoom: () => store.getState().transform[2],
					setViewport: async (viewport, options) => {
						const { transform: [tX, tY, tZoom], panZoom } = store.getState();
						if (!panZoom) return false;
						await panZoom.setViewport({
							x: viewport.x ?? tX,
							y: viewport.y ?? tY,
							zoom: viewport.zoom ?? tZoom
						}, options);
						return true;
					},
					getViewport: () => {
						const [x, y, zoom] = store.getState().transform;
						return {
							x,
							y,
							zoom
						};
					},
					setCenter: async (x, y, options) => {
						return store.getState().setCenter(x, y, options);
					},
					fitBounds: async (bounds, options) => {
						const { width, height, minZoom, maxZoom, panZoom } = store.getState();
						const viewport = getViewportForBounds(bounds, width, height, minZoom, maxZoom, options?.padding ?? .1);
						if (!panZoom) return false;
						await panZoom.setViewport(viewport, {
							duration: options?.duration,
							ease: options?.ease,
							interpolate: options?.interpolate
						});
						return true;
					},
					screenToFlowPosition: (clientPosition, options = {}) => {
						const { transform, snapGrid, snapToGrid, domNode } = store.getState();
						if (!domNode) return clientPosition;
						const { x: domX, y: domY } = domNode.getBoundingClientRect();
						const correctedPosition = {
							x: clientPosition.x - domX,
							y: clientPosition.y - domY
						};
						const _snapGrid = options.snapGrid ?? snapGrid;
						return pointToRendererPoint(correctedPosition, transform, options.snapToGrid ?? snapToGrid, _snapGrid);
					},
					flowToScreenPosition: (flowPosition) => {
						const { transform, domNode } = store.getState();
						if (!domNode) return flowPosition;
						const { x: domX, y: domY } = domNode.getBoundingClientRect();
						const rendererPosition = rendererPointToPoint(flowPosition, transform);
						return {
							x: rendererPosition.x + domX,
							y: rendererPosition.y + domY
						};
					}
				};
			}, []);
		};
		function applyChanges(changes, elements) {
			const updatedElements = [];
			const changesMap = /* @__PURE__ */ new Map();
			const addItemChanges = [];
			for (const change of changes) if (change.type === "add") {
				addItemChanges.push(change);
				continue;
			} else if (change.type === "remove" || change.type === "replace") changesMap.set(change.id, [change]);
			else {
				const elementChanges = changesMap.get(change.id);
				if (elementChanges) elementChanges.push(change);
				else changesMap.set(change.id, [change]);
			}
			for (const element of elements) {
				const changes = changesMap.get(element.id);
				if (!changes) {
					updatedElements.push(element);
					continue;
				}
				if (changes[0].type === "remove") continue;
				if (changes[0].type === "replace") {
					updatedElements.push({ ...changes[0].item });
					continue;
				}
				/**
				* For other types of changes, we want to start with a shallow copy of the
				* object so React knows this element has changed. Sequential changes will
				* each _mutate_ this object, so there's only ever one copy.
				*/
				const updatedElement = { ...element };
				for (const change of changes) applyChange(change, updatedElement);
				updatedElements.push(updatedElement);
			}
			if (addItemChanges.length) addItemChanges.forEach((change) => {
				if (change.index !== void 0) updatedElements.splice(change.index, 0, { ...change.item });
				else updatedElements.push({ ...change.item });
			});
			return updatedElements;
		}
		function applyChange(change, element) {
			switch (change.type) {
				case "select":
					element.selected = change.selected;
					break;
				case "position":
					if (typeof change.position !== "undefined") element.position = change.position;
					if (typeof change.dragging !== "undefined") element.dragging = change.dragging;
					break;
				case "dimensions":
					if (typeof change.dimensions !== "undefined") {
						element.measured = { ...change.dimensions };
						if (change.setAttributes) {
							if (change.setAttributes === true || change.setAttributes === "width") element.width = change.dimensions.width;
							if (change.setAttributes === true || change.setAttributes === "height") element.height = change.dimensions.height;
						}
					}
					if (typeof change.resizing === "boolean") element.resizing = change.resizing;
					break;
			}
		}
		/**
		* Drop in function that applies node changes to an array of nodes.
		* @public
		* @param changes - Array of changes to apply.
		* @param nodes - Array of nodes to apply the changes to.
		* @returns Array of updated nodes.
		* @example
		*```tsx
		*import { useState, useCallback } from 'react';
		*import { ReactFlow, applyNodeChanges, type Node, type Edge, type OnNodesChange } from '@xyflow/react';
		*
		*export default function Flow() {
		*  const [nodes, setNodes] = useState<Node[]>([]);
		*  const [edges, setEdges] = useState<Edge[]>([]);
		*  const onNodesChange: OnNodesChange = useCallback(
		*    (changes) => {
		*      setNodes((oldNodes) => applyNodeChanges(changes, oldNodes));
		*    },
		*    [setNodes],
		*  );
		*
		*  return (
		*    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} />
		*  );
		*}
		*```
		* @remarks Various events on the <ReactFlow /> component can produce an {@link NodeChange}
		* that describes how to update the edges of your flow in some way.
		* If you don't need any custom behaviour, this util can be used to take an array
		* of these changes and apply them to your edges.
		*/
		function applyNodeChanges(changes, nodes) {
			return applyChanges(changes, nodes);
		}
		/**
		* Drop in function that applies edge changes to an array of edges.
		* @public
		* @param changes - Array of changes to apply.
		* @param edges - Array of edge to apply the changes to.
		* @returns Array of updated edges.
		* @example
		* ```tsx
		*import { useState, useCallback } from 'react';
		*import { ReactFlow, applyEdgeChanges } from '@xyflow/react';
		*
		*export default function Flow() {
		*  const [nodes, setNodes] = useState([]);
		*  const [edges, setEdges] = useState([]);
		*  const onEdgesChange = useCallback(
		*    (changes) => {
		*      setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
		*    },
		*    [setEdges],
		*  );
		*
		*  return (
		*    <ReactFlow nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} />
		*  );
		*}
		*```
		* @remarks Various events on the <ReactFlow /> component can produce an {@link EdgeChange}
		* that describes how to update the edges of your flow in some way.
		* If you don't need any custom behaviour, this util can be used to take an array
		* of these changes and apply them to your edges.
		*/
		function applyEdgeChanges(changes, edges) {
			return applyChanges(changes, edges);
		}
		function createSelectionChange(id, selected) {
			return {
				id,
				type: "select",
				selected
			};
		}
		function getSelectionChanges(items, selectedIds = /* @__PURE__ */ new Set(), mutateItem = false) {
			const changes = [];
			for (const [id, item] of items) {
				const willBeSelected = selectedIds.has(id);
				if (!(item.selected === void 0 && !willBeSelected) && item.selected !== willBeSelected) {
					if (mutateItem) item.selected = willBeSelected;
					changes.push(createSelectionChange(item.id, willBeSelected));
				}
			}
			return changes;
		}
		function getElementsDiffChanges({ items = [], lookup }) {
			const changes = [];
			const itemsLookup = new Map(items.map((item) => [item.id, item]));
			for (const [index, item] of items.entries()) {
				const lookupItem = lookup.get(item.id);
				const storeItem = lookupItem?.internals?.userNode ?? lookupItem;
				if (storeItem !== void 0 && storeItem !== item) changes.push({
					id: item.id,
					item,
					type: "replace"
				});
				if (storeItem === void 0) changes.push({
					item,
					type: "add",
					index
				});
			}
			for (const [id] of lookup) if (itemsLookup.get(id) === void 0) changes.push({
				id,
				type: "remove"
			});
			return changes;
		}
		function elementToRemoveChange(item) {
			return {
				id: item.id,
				type: "remove"
			};
		}
		const defaultOnError = createDevWarn("React Flow", "https://reactflow.dev/");
		function addEdge(edgeParams, edges, options = {}) {
			return addEdge$1(edgeParams, edges, {
				...options,
				onError: options.onError ?? defaultOnError
			});
		}
		/**
		* Test whether an object is usable as an [`Node`](/api-reference/types/node).
		* In TypeScript this is a type guard that will narrow the type of whatever you pass in to
		* [`Node`](/api-reference/types/node) if it returns `true`.
		*
		* @public
		* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
		* @param element - The element to test.
		* @returns Tests whether the provided value can be used as a `Node`. If you're using TypeScript,
		* this function acts as a type guard and will narrow the type of the value to `Node` if it returns
		* `true`.
		*
		* @example
		* ```js
		*import { isNode } from '@xyflow/react';
		*
		*if (isNode(node)) {
		* // ...
		*}
		*```
		*/
		const isNode = (element) => isNodeBase(element);
		/**
		* Test whether an object is usable as an [`Edge`](/api-reference/types/edge).
		* In TypeScript this is a type guard that will narrow the type of whatever you pass in to
		* [`Edge`](/api-reference/types/edge) if it returns `true`.
		*
		* @public
		* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
		* @param element - The element to test
		* @returns Tests whether the provided value can be used as an `Edge`. If you're using TypeScript,
		* this function acts as a type guard and will narrow the type of the value to `Edge` if it returns
		* `true`.
		*
		* @example
		* ```js
		*import { isEdge } from '@xyflow/react';
		*
		*if (isEdge(edge)) {
		* // ...
		*}
		*```
		*/
		const isEdge = (element) => isEdgeBase(element);
		function fixedForwardRef(render) {
			return (0, react.forwardRef)(render);
		}
		const useIsomorphicLayoutEffect = typeof window !== "undefined" ? react.useLayoutEffect : react.useEffect;
		/**
		* This hook returns a queue that can be used to batch updates.
		*
		* @param runQueue - a function that gets called when the queue is flushed
		* @internal
		*
		* @returns a Queue object
		*/
		function useQueue(runQueue) {
			const [serial, setSerial] = (0, react.useState)(BigInt(0));
			const [queue] = (0, react.useState)(() => createQueue(() => setSerial((n) => n + BigInt(1))));
			useIsomorphicLayoutEffect(() => {
				const queueItems = queue.get();
				if (queueItems.length) {
					runQueue(queueItems);
					queue.reset();
				}
			}, [serial]);
			return queue;
		}
		function createQueue(cb) {
			let queue = [];
			return {
				get: () => queue,
				reset: () => {
					queue = [];
				},
				push: (item) => {
					queue.push(item);
					cb();
				}
			};
		}
		const BatchContext = (0, react.createContext)(null);
		/**
		* This is a context provider that holds and processes the node and edge update queues
		* that are needed to handle setNodes, addNodes, setEdges and addEdges.
		*
		* @internal
		*/
		function BatchProvider({ children }) {
			const store = useStoreApi();
			const nodeQueue = useQueue((0, react.useCallback)((queueItems) => {
				const { nodes = [], setNodes, hasDefaultNodes, onNodesChange, nodeLookup, fitViewQueued, onNodesChangeMiddlewareMap } = store.getState();
				let next = nodes;
				for (const payload of queueItems) next = typeof payload === "function" ? payload(next) : payload;
				let changes = getElementsDiffChanges({
					items: next,
					lookup: nodeLookup
				});
				for (const middleware of onNodesChangeMiddlewareMap.values()) changes = middleware(changes);
				if (hasDefaultNodes) setNodes(next);
				if (changes.length > 0) onNodesChange?.(changes);
				else if (fitViewQueued) window.requestAnimationFrame(() => {
					const { fitViewQueued, nodes, setNodes } = store.getState();
					if (fitViewQueued) setNodes(nodes);
				});
			}, []));
			const edgeQueue = useQueue((0, react.useCallback)((queueItems) => {
				const { edges = [], setEdges, hasDefaultEdges, onEdgesChange, edgeLookup } = store.getState();
				let next = edges;
				for (const payload of queueItems) next = typeof payload === "function" ? payload(next) : payload;
				if (hasDefaultEdges) setEdges(next);
				else if (onEdgesChange) onEdgesChange(getElementsDiffChanges({
					items: next,
					lookup: edgeLookup
				}));
			}, []));
			const value = (0, react.useMemo)(() => ({
				nodeQueue,
				edgeQueue
			}), []);
			return (0, react_jsx_runtime.jsx)(BatchContext.Provider, {
				value,
				children
			});
		}
		function useBatchContext() {
			const batchContext = (0, react.useContext)(BatchContext);
			if (!batchContext) throw new Error("useBatchContext must be used within a BatchProvider");
			return batchContext;
		}
		const selector$j = (s) => !!s.panZoom;
		/**
		* This hook returns a ReactFlowInstance that can be used to update nodes and edges, manipulate the viewport, or query the current state of the flow.
		*
		* @public
		* @example
		* ```jsx
		*import { useCallback, useState } from 'react';
		*import { useReactFlow } from '@xyflow/react';
		*
		*export function NodeCounter() {
		*  const reactFlow = useReactFlow();
		*  const [count, setCount] = useState(0);
		*  const countNodes = useCallback(() => {
		*    setCount(reactFlow.getNodes().length);
		*    // you need to pass it as a dependency if you are using it with useEffect or useCallback
		*    // because at the first render, it's not initialized yet and some functions might not work.
		*  }, [reactFlow]);
		*
		*  return (
		*    <div>
		*      <button onClick={countNodes}>Update count</button>
		*      <p>There are {count} nodes in the flow.</p>
		*    </div>
		*  );
		*}
		*```
		*/
		function useReactFlow() {
			const viewportHelper = useViewportHelper();
			const store = useStoreApi();
			const batchContext = useBatchContext();
			const viewportInitialized = useStore(selector$j);
			const generalHelper = (0, react.useMemo)(() => {
				const getInternalNode = (id) => store.getState().nodeLookup.get(id);
				const setNodes = (payload) => {
					batchContext.nodeQueue.push(payload);
				};
				const setEdges = (payload) => {
					batchContext.edgeQueue.push(payload);
				};
				const getNodeRect = (node) => {
					const { nodeLookup, nodeOrigin } = store.getState();
					const nodeToUse = isNode(node) ? node : nodeLookup.get(node.id);
					const position = nodeToUse.parentId ? evaluateAbsolutePosition(nodeToUse.position, nodeToUse.measured, nodeToUse.parentId, nodeLookup, nodeOrigin) : nodeToUse.position;
					return nodeToRect({
						...nodeToUse,
						position,
						width: nodeToUse.measured?.width ?? nodeToUse.width,
						height: nodeToUse.measured?.height ?? nodeToUse.height
					});
				};
				const updateNode = (id, nodeUpdate, options = { replace: false }) => {
					setNodes((prevNodes) => prevNodes.map((node) => {
						if (node.id === id) {
							const nextNode = typeof nodeUpdate === "function" ? nodeUpdate(node) : nodeUpdate;
							return options.replace && isNode(nextNode) ? nextNode : {
								...node,
								...nextNode
							};
						}
						return node;
					}));
				};
				const updateEdge = (id, edgeUpdate, options = { replace: false }) => {
					setEdges((prevEdges) => prevEdges.map((edge) => {
						if (edge.id === id) {
							const nextEdge = typeof edgeUpdate === "function" ? edgeUpdate(edge) : edgeUpdate;
							return options.replace && isEdge(nextEdge) ? nextEdge : {
								...edge,
								...nextEdge
							};
						}
						return edge;
					}));
				};
				return {
					getNodes: () => store.getState().nodes.map((n) => ({ ...n })),
					getNode: (id) => getInternalNode(id)?.internals.userNode,
					getInternalNode,
					getEdges: () => {
						const { edges = [] } = store.getState();
						return edges.map((e) => ({ ...e }));
					},
					getEdge: (id) => store.getState().edgeLookup.get(id),
					setNodes,
					setEdges,
					addNodes: (payload) => {
						const newNodes = Array.isArray(payload) ? payload : [payload];
						batchContext.nodeQueue.push((nodes) => [...nodes, ...newNodes]);
					},
					addEdges: (payload) => {
						const newEdges = Array.isArray(payload) ? payload : [payload];
						batchContext.edgeQueue.push((edges) => [...edges, ...newEdges]);
					},
					toObject: () => {
						const { nodes = [], edges = [], transform } = store.getState();
						const [x, y, zoom] = transform;
						return {
							nodes: nodes.map((n) => ({ ...n })),
							edges: edges.map((e) => ({ ...e })),
							viewport: {
								x,
								y,
								zoom
							}
						};
					},
					deleteElements: async ({ nodes: nodesToRemove = [], edges: edgesToRemove = [] }) => {
						const { nodes, edges, onNodesDelete, onEdgesDelete, triggerNodeChanges, triggerEdgeChanges, onDelete, onBeforeDelete } = store.getState();
						const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove({
							nodesToRemove,
							edgesToRemove,
							nodes,
							edges,
							onBeforeDelete
						});
						const hasMatchingEdges = matchingEdges.length > 0;
						const hasMatchingNodes = matchingNodes.length > 0;
						if (hasMatchingEdges) {
							const edgeChanges = matchingEdges.map(elementToRemoveChange);
							onEdgesDelete?.(matchingEdges);
							triggerEdgeChanges(edgeChanges);
						}
						if (hasMatchingNodes) {
							const nodeChanges = matchingNodes.map(elementToRemoveChange);
							onNodesDelete?.(matchingNodes);
							triggerNodeChanges(nodeChanges);
						}
						if (hasMatchingNodes || hasMatchingEdges) onDelete?.({
							nodes: matchingNodes,
							edges: matchingEdges
						});
						return {
							deletedNodes: matchingNodes,
							deletedEdges: matchingEdges
						};
					},
					/**
					* Partial is defined as "the 2 nodes/areas are intersecting partially".
					* If a is contained in b or b is contained in a, they are both
					* considered fully intersecting.
					*/
					getIntersectingNodes: (nodeOrRect, partially = true, nodes) => {
						const isRect = isRectObject(nodeOrRect);
						const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);
						const hasNodesOption = nodes !== void 0;
						if (!nodeRect) return [];
						return (nodes || store.getState().nodes).filter((n) => {
							const internalNode = store.getState().nodeLookup.get(n.id);
							if (internalNode && !isRect && (n.id === nodeOrRect.id || !internalNode.internals.positionAbsolute)) return false;
							const currNodeRect = nodeToRect(hasNodesOption ? n : internalNode);
							const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
							return partially && overlappingArea > 0 || overlappingArea >= currNodeRect.width * currNodeRect.height || overlappingArea >= nodeRect.width * nodeRect.height;
						});
					},
					isNodeIntersecting: (nodeOrRect, area, partially = true) => {
						const nodeRect = isRectObject(nodeOrRect) ? nodeOrRect : getNodeRect(nodeOrRect);
						if (!nodeRect) return false;
						const overlappingArea = getOverlappingArea(nodeRect, area);
						return partially && overlappingArea > 0 || overlappingArea >= area.width * area.height || overlappingArea >= nodeRect.width * nodeRect.height;
					},
					updateNode,
					updateNodeData: (id, dataUpdate, options = { replace: false }) => {
						updateNode(id, (node) => {
							const nextData = typeof dataUpdate === "function" ? dataUpdate(node) : dataUpdate;
							return options.replace ? {
								...node,
								data: nextData
							} : {
								...node,
								data: {
									...node.data,
									...nextData
								}
							};
						}, options);
					},
					updateEdge,
					updateEdgeData: (id, dataUpdate, options = { replace: false }) => {
						updateEdge(id, (edge) => {
							const nextData = typeof dataUpdate === "function" ? dataUpdate(edge) : dataUpdate;
							return options.replace ? {
								...edge,
								data: nextData
							} : {
								...edge,
								data: {
									...edge.data,
									...nextData
								}
							};
						}, options);
					},
					getNodesBounds: (nodes) => {
						const { nodeLookup, nodeOrigin } = store.getState();
						return getNodesBounds(nodes, {
							nodeLookup,
							nodeOrigin
						});
					},
					getHandleConnections: ({ type, id, nodeId }) => Array.from(store.getState().connectionLookup.get(`${nodeId}-${type}${id ? `-${id}` : ""}`)?.values() ?? []),
					getNodeConnections: ({ type, handleId, nodeId }) => Array.from(store.getState().connectionLookup.get(`${nodeId}${type ? handleId ? `-${type}-${handleId}` : `-${type}` : ""}`)?.values() ?? []),
					fitView: async (options) => {
						const fitViewResolver = store.getState().fitViewResolver ?? withResolvers();
						store.setState({
							fitViewQueued: true,
							fitViewOptions: options,
							fitViewResolver
						});
						batchContext.nodeQueue.push((nodes) => [...nodes]);
						return fitViewResolver.promise;
					}
				};
			}, []);
			return (0, react.useMemo)(() => {
				return {
					...generalHelper,
					...viewportHelper,
					viewportInitialized
				};
			}, [viewportInitialized]);
		}
		const selected = (item) => item.selected;
		const win$1 = typeof window !== "undefined" ? window : void 0;
		/**
		* Hook for handling global key events.
		*
		* @internal
		*/
		function useGlobalKeyHandler({ deleteKeyCode, multiSelectionKeyCode }) {
			const store = useStoreApi();
			const { deleteElements } = useReactFlow();
			const deleteKeyPressed = useKeyPress(deleteKeyCode, { actInsideInputWithModifier: false });
			const multiSelectionKeyPressed = useKeyPress(multiSelectionKeyCode, { target: win$1 });
			(0, react.useEffect)(() => {
				if (deleteKeyPressed) {
					const { edges, nodes } = store.getState();
					deleteElements({
						nodes: nodes.filter(selected),
						edges: edges.filter(selected)
					});
					store.setState({ nodesSelectionActive: false });
				}
			}, [deleteKeyPressed]);
			(0, react.useEffect)(() => {
				store.setState({ multiSelectionActive: multiSelectionKeyPressed });
			}, [multiSelectionKeyPressed]);
		}
		/**
		* Hook for handling resize events.
		*
		* @internal
		*/
		function useResizeHandler(domNode) {
			const store = useStoreApi();
			(0, react.useEffect)(() => {
				const updateDimensions = () => {
					if (!domNode.current || !(domNode.current.checkVisibility?.() ?? true)) return false;
					const size = getDimensions(domNode.current);
					if (size.height === 0 || size.width === 0) store.getState().onError?.("004", errorMessages["error004"]());
					store.setState({
						width: size.width || 500,
						height: size.height || 500
					});
				};
				if (domNode.current) {
					updateDimensions();
					window.addEventListener("resize", updateDimensions);
					const resizeObserver = new ResizeObserver(() => updateDimensions());
					resizeObserver.observe(domNode.current);
					return () => {
						window.removeEventListener("resize", updateDimensions);
						if (resizeObserver && domNode.current) resizeObserver.unobserve(domNode.current);
					};
				}
			}, []);
		}
		const containerStyle = {
			position: "absolute",
			width: "100%",
			height: "100%",
			top: 0,
			left: 0
		};
		const selector$i = (s) => ({
			userSelectionActive: s.userSelectionActive,
			lib: s.lib,
			connectionInProgress: s.connection.inProgress
		});
		function ZoomPane({ onPaneContextMenu, zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panActivationKeyPressed, panOnScrollSpeed = .5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, defaultViewport, translateExtent, minZoom, maxZoom, zoomActivationKeyCode, preventScrolling = true, children, noWheelClassName, noPanClassName, onViewportChange, isControlledViewport, paneClickDistance, selectionOnDrag }) {
			const store = useStoreApi();
			const zoomPane = (0, react.useRef)(null);
			const { userSelectionActive, lib, connectionInProgress } = useStore(selector$i, shallow$1);
			const zoomActivationKeyPressed = useKeyPress(zoomActivationKeyCode);
			const panZoom = (0, react.useRef)();
			useResizeHandler(zoomPane);
			const onTransformChange = (0, react.useCallback)((transform) => {
				onViewportChange?.({
					x: transform[0],
					y: transform[1],
					zoom: transform[2]
				});
				if (!isControlledViewport) store.setState({ transform });
			}, [onViewportChange, isControlledViewport]);
			(0, react.useEffect)(() => {
				if (zoomPane.current) {
					panZoom.current = XYPanZoom({
						domNode: zoomPane.current,
						minZoom,
						maxZoom,
						translateExtent,
						viewport: defaultViewport,
						onDraggingChange: (paneDragging) => store.setState((prevState) => prevState.paneDragging === paneDragging ? prevState : { paneDragging }),
						onPanZoomStart: (event, vp) => {
							const { onViewportChangeStart, onMoveStart } = store.getState();
							onMoveStart?.(event, vp);
							onViewportChangeStart?.(vp);
						},
						onPanZoom: (event, vp) => {
							const { onViewportChange, onMove } = store.getState();
							onMove?.(event, vp);
							onViewportChange?.(vp);
						},
						onPanZoomEnd: (event, vp) => {
							const { onViewportChangeEnd, onMoveEnd } = store.getState();
							onMoveEnd?.(event, vp);
							onViewportChangeEnd?.(vp);
						}
					});
					const { x, y, zoom } = panZoom.current.getViewport();
					store.setState({
						panZoom: panZoom.current,
						transform: [
							x,
							y,
							zoom
						],
						domNode: zoomPane.current.closest(".react-flow")
					});
					return () => {
						panZoom.current?.destroy();
					};
				}
			}, []);
			(0, react.useEffect)(() => {
				panZoom.current?.update({
					onPaneContextMenu,
					zoomOnScroll,
					zoomOnPinch,
					panOnScroll,
					panActivationKeyPressed,
					panOnScrollSpeed,
					panOnScrollMode,
					zoomOnDoubleClick,
					panOnDrag,
					zoomActivationKeyPressed,
					preventScrolling,
					noPanClassName,
					userSelectionActive,
					noWheelClassName,
					lib,
					onTransformChange,
					connectionInProgress,
					selectionOnDrag,
					paneClickDistance
				});
			}, [
				onPaneContextMenu,
				zoomOnScroll,
				zoomOnPinch,
				panOnScroll,
				panActivationKeyPressed,
				panOnScrollSpeed,
				panOnScrollMode,
				zoomOnDoubleClick,
				panOnDrag,
				zoomActivationKeyPressed,
				preventScrolling,
				noPanClassName,
				userSelectionActive,
				noWheelClassName,
				lib,
				onTransformChange,
				connectionInProgress,
				selectionOnDrag,
				paneClickDistance
			]);
			return (0, react_jsx_runtime.jsx)("div", {
				className: "react-flow__renderer",
				ref: zoomPane,
				style: containerStyle,
				children
			});
		}
		const selector$h = (s) => ({
			userSelectionActive: s.userSelectionActive,
			userSelectionRect: s.userSelectionRect
		});
		function UserSelection() {
			const { userSelectionActive, userSelectionRect } = useStore(selector$h, shallow$1);
			if (!(userSelectionActive && userSelectionRect)) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: "react-flow__selection react-flow__container",
				style: {
					width: userSelectionRect.width,
					height: userSelectionRect.height,
					transform: `translate(${userSelectionRect.x}px, ${userSelectionRect.y}px)`
				}
			});
		}
		const wrapHandler = (handler, containerRef) => {
			return (event) => {
				if (event.target !== containerRef.current) return;
				handler?.(event);
			};
		};
		const selector$g = (s) => ({
			userSelectionActive: s.userSelectionActive,
			elementsSelectable: s.elementsSelectable,
			dragging: s.paneDragging,
			panBy: s.panBy,
			autoPanSpeed: s.autoPanSpeed
		});
		function Pane({ isSelecting, selectionKeyPressed, selectionMode = SelectionMode.Full, panOnDrag, autoPanOnSelection, paneClickDistance, selectionOnDrag, onSelectionStart, onSelectionEnd, onPaneClick, onPaneContextMenu, onPaneScroll, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, children }) {
			const autoPanId = (0, react.useRef)(0);
			const store = useStoreApi();
			const { userSelectionActive, elementsSelectable, dragging, panBy, autoPanSpeed } = useStore(selector$g, shallow$1);
			const isSelectionEnabled = elementsSelectable && (isSelecting || userSelectionActive);
			const container = (0, react.useRef)(null);
			const containerBounds = (0, react.useRef)();
			const selectedNodeIds = (0, react.useRef)(/* @__PURE__ */ new Set());
			const selectedEdgeIds = (0, react.useRef)(/* @__PURE__ */ new Set());
			const connectionEndedOnPane = (0, react.useRef)(false);
			const selectionInProgress = (0, react.useRef)(false);
			const position = (0, react.useRef)({
				x: 0,
				y: 0
			});
			const autoPanStarted = (0, react.useRef)(false);
			const onClick = (event) => {
				if (selectionInProgress.current || connectionEndedOnPane.current || store.getState().connection.inProgress) {
					selectionInProgress.current = false;
					connectionEndedOnPane.current = false;
					return;
				}
				onPaneClick?.(event);
				store.getState().resetSelectedElements();
				store.setState({ nodesSelectionActive: false });
			};
			const onContextMenu = (event) => {
				if (Array.isArray(panOnDrag) && panOnDrag?.includes(2)) {
					event.preventDefault();
					return;
				}
				onPaneContextMenu?.(event);
			};
			const onWheel = onPaneScroll ? (event) => onPaneScroll(event) : void 0;
			const onClickCapture = (event) => {
				if (selectionInProgress.current) {
					event.stopPropagation();
					selectionInProgress.current = false;
				}
			};
			const onPointerDownCapture = (event) => {
				if (event.pointerType === "touch" && panOnDrag !== false && !selectionKeyPressed) return;
				const { domNode, transform } = store.getState();
				containerBounds.current = domNode?.getBoundingClientRect();
				if (!containerBounds.current) return;
				const eventTargetIsContainer = event.target === container.current;
				if (!eventTargetIsContainer && !!event.target.closest(".nokey") || !isSelecting || !(selectionOnDrag && eventTargetIsContainer || selectionKeyPressed) || event.button !== 0 || !event.isPrimary) return;
				event.target?.setPointerCapture?.(event.pointerId);
				selectionInProgress.current = false;
				const { x, y } = getEventPosition(event.nativeEvent, containerBounds.current);
				const userSelectionStartPosition = pointToRendererPoint({
					x,
					y
				}, transform);
				store.setState({ userSelectionRect: {
					width: 0,
					height: 0,
					startX: userSelectionStartPosition.x,
					startY: userSelectionStartPosition.y,
					x,
					y
				} });
				if (!eventTargetIsContainer) {
					event.stopPropagation();
					event.preventDefault();
				}
			};
			function commitUserSelectionRect(mouseX, mouseY) {
				const { userSelectionRect } = store.getState();
				if (!userSelectionRect) return;
				const { transform, nodeLookup, edgeLookup, connectionLookup, triggerNodeChanges, triggerEdgeChanges, defaultEdgeOptions } = store.getState();
				const userStartPosition = {
					x: userSelectionRect.startX,
					y: userSelectionRect.startY
				};
				const { x: screenStartX, y: screenStartY } = rendererPointToPoint(userStartPosition, transform);
				const nextUserSelectRect = {
					startX: userStartPosition.x,
					startY: userStartPosition.y,
					x: mouseX < screenStartX ? mouseX : screenStartX,
					y: mouseY < screenStartY ? mouseY : screenStartY,
					width: Math.abs(mouseX - screenStartX),
					height: Math.abs(mouseY - screenStartY)
				};
				const prevSelectedNodeIds = selectedNodeIds.current;
				const prevSelectedEdgeIds = selectedEdgeIds.current;
				selectedNodeIds.current = new Set(getNodesInside(nodeLookup, nextUserSelectRect, transform, selectionMode === SelectionMode.Partial, true).map((node) => node.id));
				selectedEdgeIds.current = /* @__PURE__ */ new Set();
				const edgesSelectable = defaultEdgeOptions?.selectable ?? true;
				for (const nodeId of selectedNodeIds.current) {
					const connections = connectionLookup.get(nodeId);
					if (!connections) continue;
					for (const { edgeId } of connections.values()) {
						const edge = edgeLookup.get(edgeId);
						if (edge && (edge.selectable ?? edgesSelectable)) selectedEdgeIds.current.add(edgeId);
					}
				}
				if (!areSetsEqual(prevSelectedNodeIds, selectedNodeIds.current)) triggerNodeChanges(getSelectionChanges(nodeLookup, selectedNodeIds.current, true));
				if (!areSetsEqual(prevSelectedEdgeIds, selectedEdgeIds.current)) triggerEdgeChanges(getSelectionChanges(edgeLookup, selectedEdgeIds.current));
				store.setState({
					userSelectionRect: nextUserSelectRect,
					userSelectionActive: true,
					nodesSelectionActive: false
				});
			}
			function autoPan() {
				if (!autoPanOnSelection || !containerBounds.current) return;
				const [x, y] = calcAutoPan(position.current, containerBounds.current, autoPanSpeed);
				panBy({
					x,
					y
				}).then((panned) => {
					if (!selectionInProgress.current || !panned) {
						autoPanId.current = requestAnimationFrame(autoPan);
						return;
					}
					const { x: mx, y: my } = position.current;
					commitUserSelectionRect(mx, my);
					autoPanId.current = requestAnimationFrame(autoPan);
				});
			}
			const cleanupAutoPan = () => {
				cancelAnimationFrame(autoPanId.current);
				autoPanId.current = 0;
				autoPanStarted.current = false;
			};
			(0, react.useEffect)(() => {
				return () => cleanupAutoPan();
			}, []);
			const onPointerMove = (event) => {
				const { userSelectionRect, transform, resetSelectedElements } = store.getState();
				if (!containerBounds.current || !userSelectionRect) return;
				const { x: mouseX, y: mouseY } = getEventPosition(event.nativeEvent, containerBounds.current);
				position.current = {
					x: mouseX,
					y: mouseY
				};
				const screenStart = rendererPointToPoint({
					x: userSelectionRect.startX,
					y: userSelectionRect.startY
				}, transform);
				if (!selectionInProgress.current) {
					const requiredDistance = selectionKeyPressed ? 0 : paneClickDistance;
					if (Math.hypot(mouseX - screenStart.x, mouseY - screenStart.y) <= requiredDistance) return;
					resetSelectedElements();
					onSelectionStart?.(event);
				}
				selectionInProgress.current = true;
				if (!autoPanStarted.current) {
					autoPan();
					autoPanStarted.current = true;
				}
				commitUserSelectionRect(mouseX, mouseY);
			};
			const onPointerUp = (event) => {
				if (!isSelectionEnabled) {
					if (event.target === container.current && store.getState().connection.inProgress) connectionEndedOnPane.current = true;
					return;
				}
				if (event.button !== 0) return;
				event.target?.releasePointerCapture?.(event.pointerId);
				if (!userSelectionActive && event.target === container.current && store.getState().userSelectionRect) onClick?.(event);
				store.setState({
					userSelectionActive: false,
					userSelectionRect: null
				});
				if (selectionInProgress.current) {
					onSelectionEnd?.(event);
					store.setState({ nodesSelectionActive: selectedNodeIds.current.size > 0 });
				}
				cleanupAutoPan();
			};
			const onPointerCancel = (event) => {
				event.target?.releasePointerCapture?.(event.pointerId);
				cleanupAutoPan();
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: cc(["react-flow__pane", {
					draggable: panOnDrag === true || Array.isArray(panOnDrag) && panOnDrag.includes(0),
					dragging,
					selection: isSelecting
				}]),
				onClick: isSelectionEnabled ? void 0 : wrapHandler(onClick, container),
				onContextMenu: wrapHandler(onContextMenu, container),
				onWheel: wrapHandler(onWheel, container),
				onPointerEnter: isSelectionEnabled ? void 0 : onPaneMouseEnter,
				onPointerMove: isSelectionEnabled ? onPointerMove : onPaneMouseMove,
				onPointerUp,
				onPointerCancel: isSelectionEnabled ? onPointerCancel : void 0,
				onPointerDownCapture: isSelectionEnabled ? onPointerDownCapture : void 0,
				onClickCapture: isSelectionEnabled ? onClickCapture : void 0,
				onPointerLeave: onPaneMouseLeave,
				ref: container,
				style: containerStyle,
				children: [children, (0, react_jsx_runtime.jsx)(UserSelection, {})]
			});
		}
		function handleNodeClick({ id, store, unselect = false, nodeRef }) {
			const { addSelectedNodes, unselectNodesAndEdges, multiSelectionActive, nodeLookup, onError } = store.getState();
			const node = nodeLookup.get(id);
			if (!node) {
				onError?.("012", errorMessages["error012"](id));
				return;
			}
			store.setState({ nodesSelectionActive: false });
			if (!node.selected) addSelectedNodes([id]);
			else if (unselect || node.selected && multiSelectionActive) {
				unselectNodesAndEdges({
					nodes: [node],
					edges: []
				});
				requestAnimationFrame(() => nodeRef?.current?.blur());
			}
		}
		/**
		* Hook for calling XYDrag helper from @xyflow/system.
		*
		* @internal
		*/
		function useDrag({ nodeRef, disabled = false, noDragClassName, handleSelector, nodeId, isSelectable, nodeClickDistance }) {
			const store = useStoreApi();
			const [dragging, setDragging] = (0, react.useState)(false);
			const xyDrag = (0, react.useRef)();
			(0, react.useEffect)(() => {
				if (disabled) return;
				xyDrag.current = XYDrag({
					getStoreItems: () => store.getState(),
					onNodeMouseDown: (id) => {
						handleNodeClick({
							id,
							store,
							nodeRef
						});
					},
					onDragStart: () => {
						setDragging(true);
					},
					onDragStop: () => {
						setDragging(false);
					}
				});
				return () => {
					xyDrag.current?.destroy();
					xyDrag.current = void 0;
				};
			}, [
				disabled,
				store,
				nodeRef
			]);
			(0, react.useEffect)(() => {
				if (disabled || !nodeRef.current || !xyDrag.current) return;
				xyDrag.current.update({
					noDragClassName,
					handleSelector,
					domNode: nodeRef.current,
					isSelectable,
					nodeId,
					nodeClickDistance
				});
			}, [
				noDragClassName,
				handleSelector,
				disabled,
				isSelectable,
				nodeRef,
				nodeId,
				nodeClickDistance
			]);
			return dragging;
		}
		const selectedAndDraggable = (nodesDraggable) => (n) => n.selected && (n.draggable || nodesDraggable && typeof n.draggable === "undefined");
		/**
		* Hook for updating node positions by passing a direction and factor
		*
		* @internal
		* @returns function for updating node positions
		*/
		function useMoveSelectedNodes() {
			const store = useStoreApi();
			return (0, react.useCallback)((params) => {
				const { nodeExtent, snapToGrid, snapGrid, nodesDraggable, onError, updateNodePositions, nodeLookup, nodeOrigin } = store.getState();
				const nodeUpdates = /* @__PURE__ */ new Map();
				const isSelected = selectedAndDraggable(nodesDraggable);
				const xVelo = snapToGrid ? snapGrid[0] : 5;
				const yVelo = snapToGrid ? snapGrid[1] : 5;
				const xDiff = params.direction.x * xVelo * params.factor;
				const yDiff = params.direction.y * yVelo * params.factor;
				for (const [, node] of nodeLookup) {
					if (!isSelected(node)) continue;
					let nextPosition = {
						x: node.internals.positionAbsolute.x + xDiff,
						y: node.internals.positionAbsolute.y + yDiff
					};
					if (snapToGrid) nextPosition = snapPosition(nextPosition, snapGrid);
					const { position, positionAbsolute } = calculateNodePosition({
						nodeId: node.id,
						nextPosition,
						nodeLookup,
						nodeExtent,
						nodeOrigin,
						onError
					});
					node.position = position;
					node.internals.positionAbsolute = positionAbsolute;
					nodeUpdates.set(node.id, node);
				}
				updateNodePositions(nodeUpdates);
			}, []);
		}
		const NodeIdContext = (0, react.createContext)(null);
		const Provider = NodeIdContext.Provider;
		NodeIdContext.Consumer;
		/**
		* You can use this hook to get the id of the node it is used inside. It is useful
		* if you need the node's id deeper in the render tree but don't want to manually
		* drill down the id as a prop.
		*
		* @public
		* @returns The id for a node in the flow.
		*
		* @example
		*```jsx
		*import { useNodeId } from '@xyflow/react';
		*
		*export default function CustomNode() {
		*  return (
		*    <div>
		*      <span>This node has an id of </span>
		*      <NodeIdDisplay />
		*    </div>
		*  );
		*}
		*
		*function NodeIdDisplay() {
		*  const nodeId = useNodeId();
		*
		*  return <span>{nodeId}</span>;
		*}
		*```
		*/
		const useNodeId = () => {
			return (0, react.useContext)(NodeIdContext);
		};
		const selector$f = (s) => ({
			connectOnClick: s.connectOnClick,
			noPanClassName: s.noPanClassName,
			rfId: s.rfId
		});
		const HandleConfigContext = (0, react.createContext)(null);
		function HandleConfigProvider({ children }) {
			const config = useStore(selector$f, shallow$1);
			return (0, react_jsx_runtime.jsx)(HandleConfigContext.Provider, {
				value: config,
				children
			});
		}
		function useHandleConfig() {
			const config = (0, react.useContext)(HandleConfigContext);
			if (!config) throw new Error("useHandleConfig must be used within a HandleConfigProvider");
			return config;
		}
		const idleConnectingState = {
			connectingFrom: false,
			connectingTo: false,
			clickConnecting: false,
			isPossibleEndHandle: true,
			connectionInProcess: false,
			clickConnectionInProcess: false,
			valid: false
		};
		const connectingSelector = (nodeId, handleId, type) => (state) => {
			const { connectionClickStartHandle: clickHandle, connectionMode, connection } = state;
			const { fromHandle, toHandle, isValid } = connection;
			if (!fromHandle && !clickHandle) return idleConnectingState;
			const connectingTo = toHandle?.nodeId === nodeId && toHandle?.id === handleId && toHandle?.type === type;
			return {
				connectingFrom: fromHandle?.nodeId === nodeId && fromHandle?.id === handleId && fromHandle?.type === type,
				connectingTo,
				clickConnecting: clickHandle?.nodeId === nodeId && clickHandle?.id === handleId && clickHandle?.type === type,
				isPossibleEndHandle: connectionMode === ConnectionMode.Strict ? fromHandle?.type !== type : nodeId !== fromHandle?.nodeId || handleId !== fromHandle?.id,
				connectionInProcess: !!fromHandle,
				clickConnectionInProcess: !!clickHandle,
				valid: connectingTo && isValid
			};
		};
		function HandleComponent({ type = "source", position = Position.Top, isValidConnection, isConnectable = true, isConnectableStart = true, isConnectableEnd = true, id, onConnect, children, className, onMouseDown, onTouchStart, ...rest }, ref) {
			const handleId = id || null;
			const isTarget = type === "target";
			const store = useStoreApi();
			const nodeId = useNodeId();
			const { connectOnClick, noPanClassName, rfId } = useHandleConfig();
			const { connectingFrom, connectingTo, clickConnecting, isPossibleEndHandle, connectionInProcess, clickConnectionInProcess, valid } = useStore(connectingSelector(nodeId, handleId, type), shallow$1);
			if (!nodeId) store.getState().onError?.("010", errorMessages["error010"]());
			const onConnectExtended = (params) => {
				const { defaultEdgeOptions, onConnect: onConnectAction, hasDefaultEdges } = store.getState();
				const edgeParams = {
					...defaultEdgeOptions,
					...params
				};
				if (hasDefaultEdges) {
					const { edges, setEdges, onError } = store.getState();
					setEdges(addEdge(edgeParams, edges, { onError }));
				}
				onConnectAction?.(edgeParams);
				onConnect?.(edgeParams);
			};
			const onPointerDown = (event) => {
				if (!nodeId) return;
				const isMouseTriggered = isMouseEvent(event.nativeEvent);
				if (isConnectableStart && (isMouseTriggered && event.button === 0 || !isMouseTriggered)) {
					const currentStore = store.getState();
					XYHandle.onPointerDown(event.nativeEvent, {
						handleDomNode: event.currentTarget,
						autoPanOnConnect: currentStore.autoPanOnConnect,
						connectionMode: currentStore.connectionMode,
						connectionRadius: currentStore.connectionRadius,
						domNode: currentStore.domNode,
						nodeLookup: currentStore.nodeLookup,
						lib: currentStore.lib,
						isTarget,
						handleId,
						nodeId,
						flowId: currentStore.rfId,
						panBy: currentStore.panBy,
						cancelConnection: currentStore.cancelConnection,
						onConnectStart: currentStore.onConnectStart,
						onConnectEnd: (...args) => store.getState().onConnectEnd?.(...args),
						updateConnection: currentStore.updateConnection,
						onConnect: onConnectExtended,
						isValidConnection: isValidConnection || ((...args) => store.getState().isValidConnection?.(...args) ?? true),
						getTransform: () => store.getState().transform,
						getFromHandle: () => store.getState().connection.fromHandle,
						autoPanSpeed: currentStore.autoPanSpeed,
						dragThreshold: currentStore.connectionDragThreshold
					});
				}
				if (isMouseTriggered) onMouseDown?.(event);
				else onTouchStart?.(event);
			};
			const onClick = (event) => {
				const { onClickConnectStart, onClickConnectEnd, connectionClickStartHandle, connectionMode, isValidConnection: isValidConnectionStore, lib, rfId: flowId, nodeLookup, connection: connectionState } = store.getState();
				if (!nodeId || !connectionClickStartHandle && !isConnectableStart) return;
				if (!connectionClickStartHandle) {
					onClickConnectStart?.(event.nativeEvent, {
						nodeId,
						handleId,
						handleType: type
					});
					store.setState({ connectionClickStartHandle: {
						nodeId,
						type,
						id: handleId
					} });
					return;
				}
				const doc = getHostForElement(event.target);
				const isValidConnectionHandler = isValidConnection || isValidConnectionStore;
				const { connection, isValid } = XYHandle.isValid(event.nativeEvent, {
					handle: {
						nodeId,
						id: handleId,
						type
					},
					connectionMode,
					fromNodeId: connectionClickStartHandle.nodeId,
					fromHandleId: connectionClickStartHandle.id || null,
					fromType: connectionClickStartHandle.type,
					isValidConnection: isValidConnectionHandler,
					flowId,
					doc,
					lib,
					nodeLookup
				});
				if (isValid && connection) onConnectExtended(connection);
				const connectionClone = structuredClone(connectionState);
				delete connectionClone.inProgress;
				connectionClone.toPosition = connectionClone.toHandle ? connectionClone.toHandle.position : null;
				onClickConnectEnd?.(event, connectionClone);
				store.setState({ connectionClickStartHandle: null });
			};
			return (0, react_jsx_runtime.jsx)("div", {
				"data-handleid": handleId,
				"data-nodeid": nodeId,
				"data-handlepos": position,
				"data-id": `${rfId}-${nodeId}-${handleId}-${type}`,
				className: cc([
					"react-flow__handle",
					`react-flow__handle-${position}`,
					"nodrag",
					noPanClassName,
					className,
					{
						source: !isTarget,
						target: isTarget,
						connectable: isConnectable,
						connectablestart: isConnectableStart,
						connectableend: isConnectableEnd,
						clickconnecting: clickConnecting,
						connectingfrom: connectingFrom,
						connectingto: connectingTo,
						valid,
						connectionindicator: isConnectable && (!connectionInProcess || isPossibleEndHandle) && (connectionInProcess || clickConnectionInProcess ? isConnectableEnd : isConnectableStart)
					}
				]),
				onMouseDown: onPointerDown,
				onTouchStart: onPointerDown,
				onClick: connectOnClick ? onClick : void 0,
				ref,
				...rest,
				children
			});
		}
		/**
		* The `<Handle />` component is used in your [custom nodes](/learn/customization/custom-nodes)
		* to define connection points.
		*
		*@public
		*
		*@example
		*
		*```jsx
		*import { Handle, Position } from '@xyflow/react';
		*
		*export function CustomNode({ data }) {
		*  return (
		*    <>
		*      <div style={{ padding: '10px 20px' }}>
		*        {data.label}
		*      </div>
		*
		*      <Handle type="target" position={Position.Left} />
		*      <Handle type="source" position={Position.Right} />
		*    </>
		*  );
		*};
		*```
		*/
		const Handle = (0, react.memo)(fixedForwardRef(HandleComponent));
		function InputNode({ data, isConnectable, sourcePosition = Position.Bottom }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [data?.label, (0, react_jsx_runtime.jsx)(Handle, {
				type: "source",
				position: sourcePosition,
				isConnectable
			})] });
		}
		function DefaultNode({ data, isConnectable, targetPosition = Position.Top, sourcePosition = Position.Bottom }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)(Handle, {
					type: "target",
					position: targetPosition,
					isConnectable
				}),
				data?.label,
				(0, react_jsx_runtime.jsx)(Handle, {
					type: "source",
					position: sourcePosition,
					isConnectable
				})
			] });
		}
		function GroupNode() {
			return null;
		}
		function OutputNode({ data, isConnectable, targetPosition = Position.Top }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(Handle, {
				type: "target",
				position: targetPosition,
				isConnectable
			}), data?.label] });
		}
		const arrowKeyDiffs = {
			ArrowUp: {
				x: 0,
				y: -1
			},
			ArrowDown: {
				x: 0,
				y: 1
			},
			ArrowLeft: {
				x: -1,
				y: 0
			},
			ArrowRight: {
				x: 1,
				y: 0
			}
		};
		const builtinNodeTypes = {
			input: InputNode,
			default: DefaultNode,
			output: OutputNode,
			group: GroupNode
		};
		function getNodeInlineStyleDimensions(node) {
			if (node.internals.handleBounds === void 0) return {
				width: node.width ?? node.initialWidth ?? node.style?.width,
				height: node.height ?? node.initialHeight ?? node.style?.height
			};
			return {
				width: node.width ?? node.style?.width,
				height: node.height ?? node.style?.height
			};
		}
		const selector$e = (s) => {
			const { width, height, x, y } = getInternalNodesBounds(s.nodeLookup, { filter: (node) => !!node.selected });
			return {
				width: isNumeric(width) ? width : null,
				height: isNumeric(height) ? height : null,
				userSelectionActive: s.userSelectionActive,
				transformString: `translate(${s.transform[0]}px,${s.transform[1]}px) scale(${s.transform[2]}) translate(${x}px,${y}px)`
			};
		};
		function NodesSelection({ onSelectionContextMenu, noPanClassName, disableKeyboardA11y }) {
			const store = useStoreApi();
			const { width, height, transformString, userSelectionActive } = useStore(selector$e, shallow$1);
			const moveSelectedNodes = useMoveSelectedNodes();
			const nodeRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!disableKeyboardA11y) nodeRef.current?.focus({ preventScroll: true });
			}, [disableKeyboardA11y]);
			const shouldRender = !userSelectionActive && width !== null && height !== null;
			useDrag({
				nodeRef,
				disabled: !shouldRender
			});
			if (!shouldRender) return null;
			const onContextMenu = onSelectionContextMenu ? (event) => {
				onSelectionContextMenu(event, store.getState().nodes.filter((n) => n.selected));
			} : void 0;
			const onKeyDown = (event) => {
				if (Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
					event.preventDefault();
					moveSelectedNodes({
						direction: arrowKeyDiffs[event.key],
						factor: event.shiftKey ? 4 : 1
					});
				}
			};
			return (0, react_jsx_runtime.jsx)("div", {
				className: cc([
					"react-flow__nodesselection",
					"react-flow__container",
					noPanClassName
				]),
				style: { transform: transformString },
				children: (0, react_jsx_runtime.jsx)("div", {
					ref: nodeRef,
					className: "react-flow__nodesselection-rect",
					onContextMenu,
					tabIndex: disableKeyboardA11y ? void 0 : -1,
					onKeyDown: disableKeyboardA11y ? void 0 : onKeyDown,
					style: {
						width,
						height
					}
				})
			});
		}
		const win = typeof window !== "undefined" ? window : void 0;
		const selector$d = (s) => {
			return {
				nodesSelectionActive: s.nodesSelectionActive,
				userSelectionActive: s.userSelectionActive
			};
		};
		function FlowRendererComponent({ children, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneContextMenu, onPaneScroll, paneClickDistance, deleteKeyCode, selectionKeyCode, selectionOnDrag, selectionMode, onSelectionStart, onSelectionEnd, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, elementsSelectable, zoomOnScroll, zoomOnPinch, panOnScroll: _panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag: _panOnDrag, autoPanOnSelection, defaultViewport, translateExtent, minZoom, maxZoom, preventScrolling, onSelectionContextMenu, noWheelClassName, noPanClassName, disableKeyboardA11y, onViewportChange, isControlledViewport }) {
			const { nodesSelectionActive, userSelectionActive } = useStore(selector$d, shallow$1);
			const selectionKeyPressed = useKeyPress(selectionKeyCode, { target: win });
			const panActivationKeyPressed = useKeyPress(panActivationKeyCode, { target: win });
			const panOnDrag = panActivationKeyPressed || _panOnDrag;
			const panOnScroll = panActivationKeyPressed || _panOnScroll;
			const _selectionOnDrag = selectionOnDrag && panOnDrag !== true;
			const isSelecting = selectionKeyPressed || userSelectionActive || _selectionOnDrag;
			useGlobalKeyHandler({
				deleteKeyCode,
				multiSelectionKeyCode
			});
			return (0, react_jsx_runtime.jsx)(ZoomPane, {
				onPaneContextMenu,
				elementsSelectable,
				zoomOnScroll,
				zoomOnPinch,
				panOnScroll,
				panActivationKeyPressed,
				panOnScrollSpeed,
				panOnScrollMode,
				zoomOnDoubleClick,
				panOnDrag: !selectionKeyPressed && panOnDrag,
				defaultViewport,
				translateExtent,
				minZoom,
				maxZoom,
				zoomActivationKeyCode,
				preventScrolling,
				noWheelClassName,
				noPanClassName,
				onViewportChange,
				isControlledViewport,
				paneClickDistance,
				selectionOnDrag: _selectionOnDrag,
				children: (0, react_jsx_runtime.jsxs)(Pane, {
					onSelectionStart,
					onSelectionEnd,
					onPaneClick,
					onPaneMouseEnter,
					onPaneMouseMove,
					onPaneMouseLeave,
					onPaneContextMenu,
					onPaneScroll,
					panOnDrag,
					autoPanOnSelection,
					isSelecting: !!isSelecting,
					selectionMode,
					selectionKeyPressed,
					paneClickDistance,
					selectionOnDrag: _selectionOnDrag,
					children: [children, nodesSelectionActive && (0, react_jsx_runtime.jsx)(NodesSelection, {
						onSelectionContextMenu,
						noPanClassName,
						disableKeyboardA11y
					})]
				})
			});
		}
		FlowRendererComponent.displayName = "FlowRenderer";
		const FlowRenderer = (0, react.memo)(FlowRendererComponent);
		const selector$c = (onlyRenderVisible) => (s) => {
			return onlyRenderVisible ? getNodesInside(s.nodeLookup, {
				x: 0,
				y: 0,
				width: s.width,
				height: s.height
			}, s.transform, true).map((node) => node.id) : Array.from(s.nodeLookup.keys());
		};
		/**
		* Hook for getting the visible node ids from the store.
		*
		* @internal
		* @param onlyRenderVisible
		* @returns array with visible node ids
		*/
		function useVisibleNodeIds(onlyRenderVisible) {
			return useStore((0, react.useCallback)(selector$c(onlyRenderVisible), [onlyRenderVisible]), shallow$1);
		}
		const selector$b = (s) => s.updateNodeInternals;
		function useResizeObserver() {
			const updateNodeInternals = useStore(selector$b);
			const [resizeObserver] = (0, react.useState)(() => {
				if (typeof ResizeObserver === "undefined") return null;
				return new ResizeObserver((entries) => {
					const updates = /* @__PURE__ */ new Map();
					entries.forEach((entry) => {
						const id = entry.target.getAttribute("data-id");
						updates.set(id, {
							id,
							nodeElement: entry.target,
							force: true
						});
					});
					updateNodeInternals(updates);
				});
			});
			(0, react.useEffect)(() => {
				return () => {
					resizeObserver?.disconnect();
				};
			}, [resizeObserver]);
			return resizeObserver;
		}
		/**
		* Hook to handle the resize observation + internal updates for the passed node.
		*
		* @internal
		* @returns nodeRef - reference to the node element
		*/
		function useNodeObserver({ node, nodeType, hasDimensions, resizeObserver }) {
			const store = useStoreApi();
			const nodeRef = (0, react.useRef)(null);
			const observedNode = (0, react.useRef)(null);
			const prevSourcePosition = (0, react.useRef)(node.sourcePosition);
			const prevTargetPosition = (0, react.useRef)(node.targetPosition);
			const prevType = (0, react.useRef)(nodeType);
			const isInitialized = hasDimensions && !!node.internals.handleBounds;
			(0, react.useEffect)(() => {
				if (nodeRef.current && !node.hidden && (!isInitialized || observedNode.current !== nodeRef.current)) {
					if (observedNode.current) resizeObserver?.unobserve(observedNode.current);
					resizeObserver?.observe(nodeRef.current);
					observedNode.current = nodeRef.current;
				}
			}, [isInitialized, node.hidden]);
			(0, react.useEffect)(() => {
				return () => {
					if (observedNode.current) {
						resizeObserver?.unobserve(observedNode.current);
						observedNode.current = null;
					}
				};
			}, []);
			(0, react.useEffect)(() => {
				if (nodeRef.current) {
					const typeChanged = prevType.current !== nodeType;
					const sourcePosChanged = prevSourcePosition.current !== node.sourcePosition;
					const targetPosChanged = prevTargetPosition.current !== node.targetPosition;
					if (typeChanged || sourcePosChanged || targetPosChanged) {
						prevType.current = nodeType;
						prevSourcePosition.current = node.sourcePosition;
						prevTargetPosition.current = node.targetPosition;
						store.getState().updateNodeInternals(new Map([[node.id, {
							id: node.id,
							nodeElement: nodeRef.current,
							force: true
						}]]));
					}
				}
			}, [
				node.id,
				nodeType,
				node.sourcePosition,
				node.targetPosition
			]);
			return nodeRef;
		}
		function NodeWrapper({ id, onClick, onMouseEnter, onMouseMove, onMouseLeave, onContextMenu, onDoubleClick, nodesDraggable, elementsSelectable, nodesConnectable, nodesFocusable, resizeObserver, noDragClassName, noPanClassName, disableKeyboardA11y, rfId, nodeTypes, nodeClickDistance, onError }) {
			const { node, internals, isParent } = useStore((s) => {
				const node = s.nodeLookup.get(id);
				const isParent = s.parentLookup.has(id);
				return {
					node,
					internals: node.internals,
					isParent
				};
			}, shallow$1);
			let nodeType = node.type || "default";
			let NodeComponent = nodeTypes?.[nodeType] || builtinNodeTypes[nodeType];
			if (NodeComponent === void 0) {
				onError?.("003", errorMessages["error003"](nodeType));
				nodeType = "default";
				NodeComponent = nodeTypes?.["default"] || builtinNodeTypes.default;
			}
			const isDraggable = !!(node.draggable || nodesDraggable && typeof node.draggable === "undefined");
			const isSelectable = !!(node.selectable || elementsSelectable && typeof node.selectable === "undefined");
			const isConnectable = !!(node.connectable || nodesConnectable && typeof node.connectable === "undefined");
			const isFocusable = !!(node.focusable || nodesFocusable && typeof node.focusable === "undefined");
			const store = useStoreApi();
			const hasDimensions = nodeHasDimensions(node);
			const nodeRef = useNodeObserver({
				node,
				nodeType,
				hasDimensions,
				resizeObserver
			});
			const dragging = useDrag({
				nodeRef,
				disabled: node.hidden || !isDraggable,
				noDragClassName,
				handleSelector: node.dragHandle,
				nodeId: id,
				isSelectable,
				nodeClickDistance
			});
			const moveSelectedNodes = useMoveSelectedNodes();
			if (node.hidden) return null;
			const nodeDimensions = getNodeDimensions(node);
			const inlineDimensions = getNodeInlineStyleDimensions(node);
			const hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave;
			const onMouseEnterHandler = onMouseEnter ? (event) => onMouseEnter(event, { ...internals.userNode }) : void 0;
			const onMouseMoveHandler = onMouseMove ? (event) => onMouseMove(event, { ...internals.userNode }) : void 0;
			const onMouseLeaveHandler = onMouseLeave ? (event) => onMouseLeave(event, { ...internals.userNode }) : void 0;
			const onContextMenuHandler = onContextMenu ? (event) => onContextMenu(event, { ...internals.userNode }) : void 0;
			const onDoubleClickHandler = onDoubleClick ? (event) => onDoubleClick(event, { ...internals.userNode }) : void 0;
			const onSelectNodeHandler = (event) => {
				const { selectNodesOnDrag, nodeDragThreshold } = store.getState();
				if (isSelectable && (!selectNodesOnDrag || !isDraggable || nodeDragThreshold > 0)) handleNodeClick({
					id,
					store,
					nodeRef
				});
				if (onClick) onClick(event, { ...internals.userNode });
			};
			const onKeyDown = (event) => {
				if (isInputDOMNode(event.nativeEvent) || disableKeyboardA11y) return;
				if (elementSelectionKeys.includes(event.key) && isSelectable) handleNodeClick({
					id,
					store,
					unselect: event.key === "Escape",
					nodeRef
				});
				else if (isDraggable && node.selected && Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
					event.preventDefault();
					const { ariaLabelConfig } = store.getState();
					store.setState({ ariaLiveMessage: ariaLabelConfig["node.a11yDescription.ariaLiveMessage"]({
						direction: event.key.replace("Arrow", "").toLowerCase(),
						x: ~~internals.positionAbsolute.x,
						y: ~~internals.positionAbsolute.y
					}) });
					moveSelectedNodes({
						direction: arrowKeyDiffs[event.key],
						factor: event.shiftKey ? 4 : 1
					});
				}
			};
			const onFocus = () => {
				if (disableKeyboardA11y || !nodeRef.current?.matches(":focus-visible")) return;
				const { transform, width, height, autoPanOnNodeFocus, setCenter } = store.getState();
				if (!autoPanOnNodeFocus) return;
				if (!(getNodesInside(new Map([[id, node]]), {
					x: 0,
					y: 0,
					width,
					height
				}, transform, true).length > 0)) setCenter(node.position.x + nodeDimensions.width / 2, node.position.y + nodeDimensions.height / 2, { zoom: transform[2] });
			};
			return (0, react_jsx_runtime.jsx)("div", {
				className: cc([
					"react-flow__node",
					`react-flow__node-${nodeType}`,
					{ [noPanClassName]: isDraggable },
					node.className,
					{
						selected: node.selected,
						selectable: isSelectable,
						parent: isParent,
						draggable: isDraggable,
						dragging
					}
				]),
				ref: nodeRef,
				style: {
					zIndex: internals.z,
					transform: `translate(${internals.positionAbsolute.x}px,${internals.positionAbsolute.y}px)`,
					pointerEvents: hasPointerEvents ? "all" : "none",
					visibility: hasDimensions ? "visible" : "hidden",
					...node.style,
					...inlineDimensions
				},
				"data-id": id,
				"data-testid": `rf__node-${id}`,
				onMouseEnter: onMouseEnterHandler,
				onMouseMove: onMouseMoveHandler,
				onMouseLeave: onMouseLeaveHandler,
				onContextMenu: onContextMenuHandler,
				onClick: onSelectNodeHandler,
				onDoubleClick: onDoubleClickHandler,
				onKeyDown: isFocusable ? onKeyDown : void 0,
				tabIndex: isFocusable ? 0 : void 0,
				onFocus: isFocusable ? onFocus : void 0,
				role: node.ariaRole ?? (isFocusable ? "group" : void 0),
				"aria-roledescription": "node",
				"aria-describedby": disableKeyboardA11y ? void 0 : `${ARIA_NODE_DESC_KEY}-${rfId}`,
				"aria-label": node.ariaLabel,
				...node.domAttributes,
				children: (0, react_jsx_runtime.jsx)(Provider, {
					value: id,
					children: (0, react_jsx_runtime.jsx)(NodeComponent, {
						id,
						data: node.data,
						type: nodeType,
						positionAbsoluteX: internals.positionAbsolute.x,
						positionAbsoluteY: internals.positionAbsolute.y,
						selected: node.selected ?? false,
						selectable: isSelectable,
						draggable: isDraggable,
						deletable: node.deletable ?? true,
						isConnectable,
						sourcePosition: node.sourcePosition,
						targetPosition: node.targetPosition,
						dragging,
						dragHandle: node.dragHandle,
						zIndex: internals.z,
						parentId: node.parentId,
						...nodeDimensions
					})
				})
			});
		}
		var NodeWrapper$1 = (0, react.memo)(NodeWrapper);
		const selector$a = (s) => ({
			nodesConnectable: s.nodesConnectable,
			nodesFocusable: s.nodesFocusable,
			elementsSelectable: s.elementsSelectable,
			onError: s.onError
		});
		function NodeRendererComponent(props) {
			const { nodesConnectable, nodesFocusable, elementsSelectable, onError } = useStore(selector$a, shallow$1);
			const nodeIds = useVisibleNodeIds(props.onlyRenderVisibleElements);
			const resizeObserver = useResizeObserver();
			return (0, react_jsx_runtime.jsx)("div", {
				className: "react-flow__nodes",
				style: containerStyle,
				children: nodeIds.map((nodeId) => {
					return (0, react_jsx_runtime.jsx)(NodeWrapper$1, {
						id: nodeId,
						nodeTypes: props.nodeTypes,
						nodeExtent: props.nodeExtent,
						onClick: props.onNodeClick,
						onMouseEnter: props.onNodeMouseEnter,
						onMouseMove: props.onNodeMouseMove,
						onMouseLeave: props.onNodeMouseLeave,
						onContextMenu: props.onNodeContextMenu,
						onDoubleClick: props.onNodeDoubleClick,
						noDragClassName: props.noDragClassName,
						noPanClassName: props.noPanClassName,
						rfId: props.rfId,
						disableKeyboardA11y: props.disableKeyboardA11y,
						resizeObserver,
						nodesDraggable: props.nodesDraggable ?? true,
						nodesConnectable,
						nodesFocusable,
						elementsSelectable,
						nodeClickDistance: props.nodeClickDistance,
						onError
					}, nodeId);
				})
			});
		}
		NodeRendererComponent.displayName = "NodeRenderer";
		const NodeRenderer = (0, react.memo)(NodeRendererComponent);
		/**
		* Hook for getting the visible edge ids from the store.
		*
		* @internal
		* @param onlyRenderVisible
		* @returns array with visible edge ids
		*/
		function useVisibleEdgeIds(onlyRenderVisible) {
			return useStore((0, react.useCallback)((s) => {
				if (!onlyRenderVisible) return s.edges.map((edge) => edge.id);
				const visibleEdgeIds = [];
				if (s.width && s.height) for (const edge of s.edges) {
					const sourceNode = s.nodeLookup.get(edge.source);
					const targetNode = s.nodeLookup.get(edge.target);
					if (sourceNode && targetNode && isEdgeVisible({
						sourceNode,
						targetNode,
						width: s.width,
						height: s.height,
						transform: s.transform
					})) visibleEdgeIds.push(edge.id);
				}
				return visibleEdgeIds;
			}, [onlyRenderVisible]), shallow$1);
		}
		const ArrowSymbol = ({ color = "none", strokeWidth = 1 }) => {
			return (0, react_jsx_runtime.jsx)("polyline", {
				className: "arrow",
				style: {
					strokeWidth,
					...color && { stroke: color }
				},
				strokeLinecap: "round",
				fill: "none",
				strokeLinejoin: "round",
				points: "-5,-4 0,0 -5,4"
			});
		};
		const ArrowClosedSymbol = ({ color = "none", strokeWidth = 1 }) => {
			return (0, react_jsx_runtime.jsx)("polyline", {
				className: "arrowclosed",
				style: {
					strokeWidth,
					...color && {
						stroke: color,
						fill: color
					}
				},
				strokeLinecap: "round",
				strokeLinejoin: "round",
				points: "-5,-4 0,0 -5,4 -5,-4"
			});
		};
		const MarkerSymbols = {
			[MarkerType.Arrow]: ArrowSymbol,
			[MarkerType.ArrowClosed]: ArrowClosedSymbol
		};
		function useMarkerSymbol(type) {
			const store = useStoreApi();
			return (0, react.useMemo)(() => {
				if (!Object.prototype.hasOwnProperty.call(MarkerSymbols, type)) {
					store.getState().onError?.("009", errorMessages["error009"](type));
					return null;
				}
				return MarkerSymbols[type];
			}, [type]);
		}
		const Marker = ({ id, type, color, width = 12.5, height = 12.5, markerUnits = "strokeWidth", strokeWidth, orient = "auto-start-reverse" }) => {
			const Symbol = useMarkerSymbol(type);
			if (!Symbol) return null;
			return (0, react_jsx_runtime.jsx)("marker", {
				className: "react-flow__arrowhead",
				id,
				markerWidth: `${width}`,
				markerHeight: `${height}`,
				viewBox: "-10 -10 20 20",
				markerUnits,
				orient,
				refX: "0",
				refY: "0",
				children: (0, react_jsx_runtime.jsx)(Symbol, {
					color,
					strokeWidth
				})
			});
		};
		const MarkerDefinitions = ({ defaultColor, rfId }) => {
			const edges = useStore((s) => s.edges);
			const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
			const markers = (0, react.useMemo)(() => {
				return createMarkerIds(edges, {
					id: rfId,
					defaultColor,
					defaultMarkerStart: defaultEdgeOptions?.markerStart,
					defaultMarkerEnd: defaultEdgeOptions?.markerEnd
				});
			}, [
				edges,
				defaultEdgeOptions,
				rfId,
				defaultColor
			]);
			if (!markers.length) return null;
			return (0, react_jsx_runtime.jsx)("svg", {
				className: "react-flow__marker",
				"aria-hidden": "true",
				children: (0, react_jsx_runtime.jsx)("defs", { children: markers.map((marker) => (0, react_jsx_runtime.jsx)(Marker, {
					id: marker.id,
					type: marker.type,
					color: marker.color,
					width: marker.width,
					height: marker.height,
					markerUnits: marker.markerUnits,
					strokeWidth: marker.strokeWidth,
					orient: marker.orient
				}, marker.id)) })
			});
		};
		MarkerDefinitions.displayName = "MarkerDefinitions";
		var MarkerDefinitions$1 = (0, react.memo)(MarkerDefinitions);
		function EdgeTextComponent({ x, y, label, labelStyle, labelShowBg = true, labelBgStyle, labelBgPadding = [2, 4], labelBgBorderRadius = 2, children, className, ...rest }) {
			const [edgeTextBbox, setEdgeTextBbox] = (0, react.useState)({
				x: 1,
				y: 0,
				width: 0,
				height: 0
			});
			const edgeTextClasses = cc(["react-flow__edge-textwrapper", className]);
			const edgeTextRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (edgeTextRef.current) {
					const textBbox = edgeTextRef.current.getBBox();
					setEdgeTextBbox({
						x: textBbox.x,
						y: textBbox.y,
						width: textBbox.width,
						height: textBbox.height
					});
				}
			}, [label]);
			if (!label) return null;
			return (0, react_jsx_runtime.jsxs)("g", {
				transform: `translate(${x - edgeTextBbox.width / 2} ${y - edgeTextBbox.height / 2})`,
				className: edgeTextClasses,
				visibility: edgeTextBbox.width ? "visible" : "hidden",
				...rest,
				children: [
					labelShowBg && (0, react_jsx_runtime.jsx)("rect", {
						width: edgeTextBbox.width + 2 * labelBgPadding[0],
						x: -labelBgPadding[0],
						y: -labelBgPadding[1],
						height: edgeTextBbox.height + 2 * labelBgPadding[1],
						className: "react-flow__edge-textbg",
						style: labelBgStyle,
						rx: labelBgBorderRadius,
						ry: labelBgBorderRadius
					}),
					(0, react_jsx_runtime.jsx)("text", {
						className: "react-flow__edge-text",
						y: edgeTextBbox.height / 2,
						dy: "0.3em",
						ref: edgeTextRef,
						style: labelStyle,
						children: label
					}),
					children
				]
			});
		}
		EdgeTextComponent.displayName = "EdgeText";
		/**
		* You can use the `<EdgeText />` component as a helper component to display text
		* within your custom edges.
		*
		* @public
		*
		* @example
		* ```jsx
		* import { EdgeText } from '@xyflow/react';
		*
		* export function CustomEdgeLabel({ label }) {
		*   return (
		*     <EdgeText
		*       x={100}
		*       y={100}
		*       label={label}
		*       labelStyle={{ fill: 'white' }}
		*       labelShowBg
		*       labelBgStyle={{ fill: 'red' }}
		*       labelBgPadding={[2, 4]}
		*       labelBgBorderRadius={2}
		*     />
		*   );
		* }
		*```
		*/
		const EdgeText = (0, react.memo)(EdgeTextComponent);
		/**
		* The `<BaseEdge />` component gets used internally for all the edges. It can be
		* used inside a custom edge and handles the invisible helper edge and the edge label
		* for you.
		*
		* @public
		* @example
		* ```jsx
		*import { BaseEdge } from '@xyflow/react';
		*
		*export function CustomEdge({ sourceX, sourceY, targetX, targetY, ...props }) {
		*  const [edgePath] = getStraightPath({
		*    sourceX,
		*    sourceY,
		*    targetX,
		*    targetY,
		*  });
		*
		*  return <BaseEdge path={edgePath} {...props} />;
		*}
		*```
		*
		* @remarks If you want to use an edge marker with the [`<BaseEdge />`](/api-reference/components/base-edge) component,
		* you can pass the `markerStart` or `markerEnd` props passed to your custom edge
		* through to the [`<BaseEdge />`](/api-reference/components/base-edge) component.
		* You can see all the props passed to a custom edge by looking at the [`EdgeProps`](/api-reference/types/edge-props) type.
		*/
		function BaseEdge({ path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, interactionWidth = 20, ...props }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("path", {
					...props,
					d: path,
					fill: "none",
					className: cc(["react-flow__edge-path", props.className])
				}),
				interactionWidth ? (0, react_jsx_runtime.jsx)("path", {
					d: path,
					fill: "none",
					strokeOpacity: 0,
					strokeWidth: interactionWidth,
					className: "react-flow__edge-interaction"
				}) : null,
				label && isNumeric(labelX) && isNumeric(labelY) ? (0, react_jsx_runtime.jsx)(EdgeText, {
					x: labelX,
					y: labelY,
					label,
					labelStyle,
					labelShowBg,
					labelBgStyle,
					labelBgPadding,
					labelBgBorderRadius
				}) : null
			] });
		}
		function getControl({ pos, x1, y1, x2, y2 }) {
			if (pos === Position.Left || pos === Position.Right) return [.5 * (x1 + x2), y1];
			return [x1, .5 * (y1 + y2)];
		}
		/**
		* The `getSimpleBezierPath` util returns everything you need to render a simple
		* bezier edge between two nodes.
		* @public
		* @returns
		* - `path`: the path to use in an SVG `<path>` element.
		* - `labelX`: the `x` position you can use to render a label for this edge.
		* - `labelY`: the `y` position you can use to render a label for this edge.
		* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
		* middle of this path.
		* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
		* middle of this path.
		*/
		function getSimpleBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top }) {
			const [sourceControlX, sourceControlY] = getControl({
				pos: sourcePosition,
				x1: sourceX,
				y1: sourceY,
				x2: targetX,
				y2: targetY
			});
			const [targetControlX, targetControlY] = getControl({
				pos: targetPosition,
				x1: targetX,
				y1: targetY,
				x2: sourceX,
				y2: sourceY
			});
			const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
				sourceX,
				sourceY,
				targetX,
				targetY,
				sourceControlX,
				sourceControlY,
				targetControlX,
				targetControlY
			});
			return [
				`M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
				labelX,
				labelY,
				offsetX,
				offsetY
			];
		}
		function createSimpleBezierEdge(params) {
			return (0, react.memo)(({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, interactionWidth }) => {
				const [path, labelX, labelY] = getSimpleBezierPath({
					sourceX,
					sourceY,
					sourcePosition,
					targetX,
					targetY,
					targetPosition
				});
				return (0, react_jsx_runtime.jsx)(BaseEdge, {
					id: params.isInternal ? void 0 : id,
					path,
					labelX,
					labelY,
					label,
					labelStyle,
					labelShowBg,
					labelBgStyle,
					labelBgPadding,
					labelBgBorderRadius,
					style,
					markerEnd,
					markerStart,
					interactionWidth
				});
			});
		}
		const SimpleBezierEdge = createSimpleBezierEdge({ isInternal: false });
		const SimpleBezierEdgeInternal = createSimpleBezierEdge({ isInternal: true });
		SimpleBezierEdge.displayName = "SimpleBezierEdge";
		SimpleBezierEdgeInternal.displayName = "SimpleBezierEdgeInternal";
		function createSmoothStepEdge(params) {
			return (0, react.memo)(({ id, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, sourcePosition = Position.Bottom, targetPosition = Position.Top, markerEnd, markerStart, pathOptions, interactionWidth }) => {
				const [path, labelX, labelY] = getSmoothStepPath({
					sourceX,
					sourceY,
					sourcePosition,
					targetX,
					targetY,
					targetPosition,
					borderRadius: pathOptions?.borderRadius,
					offset: pathOptions?.offset,
					stepPosition: pathOptions?.stepPosition
				});
				return (0, react_jsx_runtime.jsx)(BaseEdge, {
					id: params.isInternal ? void 0 : id,
					path,
					labelX,
					labelY,
					label,
					labelStyle,
					labelShowBg,
					labelBgStyle,
					labelBgPadding,
					labelBgBorderRadius,
					style,
					markerEnd,
					markerStart,
					interactionWidth
				});
			});
		}
		/**
		* Component that can be used inside a custom edge to render a smooth step edge.
		*
		* @public
		* @example
		*
		* ```tsx
		* import { SmoothStepEdge } from '@xyflow/react';
		*
		* function CustomEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
		*   return (
		*     <SmoothStepEdge
		*       sourceX={sourceX}
		*       sourceY={sourceY}
		*       targetX={targetX}
		*       targetY={targetY}
		*       sourcePosition={sourcePosition}
		*       targetPosition={targetPosition}
		*     />
		*   );
		* }
		* ```
		*/
		const SmoothStepEdge = createSmoothStepEdge({ isInternal: false });
		/**
		* @internal
		*/
		const SmoothStepEdgeInternal = createSmoothStepEdge({ isInternal: true });
		SmoothStepEdge.displayName = "SmoothStepEdge";
		SmoothStepEdgeInternal.displayName = "SmoothStepEdgeInternal";
		function createStepEdge(params) {
			return (0, react.memo)(({ id, ...props }) => {
				const _id = params.isInternal ? void 0 : id;
				return (0, react_jsx_runtime.jsx)(SmoothStepEdge, {
					...props,
					id: _id,
					pathOptions: (0, react.useMemo)(() => ({
						borderRadius: 0,
						offset: props.pathOptions?.offset
					}), [props.pathOptions?.offset])
				});
			});
		}
		/**
		* Component that can be used inside a custom edge to render a step edge.
		*
		* @public
		* @example
		*
		* ```tsx
		* import { StepEdge } from '@xyflow/react';
		*
		* function CustomEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
		*   return (
		*     <StepEdge
		*       sourceX={sourceX}
		*       sourceY={sourceY}
		*       targetX={targetX}
		*       targetY={targetY}
		*       sourcePosition={sourcePosition}
		*       targetPosition={targetPosition}
		*     />
		*   );
		* }
		* ```
		*/
		const StepEdge = createStepEdge({ isInternal: false });
		/**
		* @internal
		*/
		const StepEdgeInternal = createStepEdge({ isInternal: true });
		StepEdge.displayName = "StepEdge";
		StepEdgeInternal.displayName = "StepEdgeInternal";
		function createStraightEdge(params) {
			return (0, react.memo)(({ id, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, interactionWidth }) => {
				const [path, labelX, labelY] = getStraightPath({
					sourceX,
					sourceY,
					targetX,
					targetY
				});
				return (0, react_jsx_runtime.jsx)(BaseEdge, {
					id: params.isInternal ? void 0 : id,
					path,
					labelX,
					labelY,
					label,
					labelStyle,
					labelShowBg,
					labelBgStyle,
					labelBgPadding,
					labelBgBorderRadius,
					style,
					markerEnd,
					markerStart,
					interactionWidth
				});
			});
		}
		/**
		* Component that can be used inside a custom edge to render a straight line.
		*
		* @public
		* @example
		*
		* ```tsx
		* import { StraightEdge } from '@xyflow/react';
		*
		* function CustomEdge({ sourceX, sourceY, targetX, targetY }) {
		*   return (
		*     <StraightEdge
		*       sourceX={sourceX}
		*       sourceY={sourceY}
		*       targetX={targetX}
		*       targetY={targetY}
		*     />
		*   );
		* }
		* ```
		*/
		const StraightEdge = createStraightEdge({ isInternal: false });
		/**
		* @internal
		*/
		const StraightEdgeInternal = createStraightEdge({ isInternal: true });
		StraightEdge.displayName = "StraightEdge";
		StraightEdgeInternal.displayName = "StraightEdgeInternal";
		function createBezierEdge(params) {
			return (0, react.memo)(({ id, sourceX, sourceY, targetX, targetY, sourcePosition = Position.Bottom, targetPosition = Position.Top, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, pathOptions, interactionWidth }) => {
				const [path, labelX, labelY] = getBezierPath({
					sourceX,
					sourceY,
					sourcePosition,
					targetX,
					targetY,
					targetPosition,
					curvature: pathOptions?.curvature
				});
				return (0, react_jsx_runtime.jsx)(BaseEdge, {
					id: params.isInternal ? void 0 : id,
					path,
					labelX,
					labelY,
					label,
					labelStyle,
					labelShowBg,
					labelBgStyle,
					labelBgPadding,
					labelBgBorderRadius,
					style,
					markerEnd,
					markerStart,
					interactionWidth
				});
			});
		}
		/**
		* Component that can be used inside a custom edge to render a bezier curve.
		*
		* @public
		* @example
		*
		* ```tsx
		* import { BezierEdge } from '@xyflow/react';
		*
		* function CustomEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
		*   return (
		*     <BezierEdge
		*       sourceX={sourceX}
		*       sourceY={sourceY}
		*       targetX={targetX}
		*       targetY={targetY}
		*       sourcePosition={sourcePosition}
		*       targetPosition={targetPosition}
		*     />
		*   );
		* }
		* ```
		*/
		const BezierEdge = createBezierEdge({ isInternal: false });
		/**
		* @internal
		*/
		const BezierEdgeInternal = createBezierEdge({ isInternal: true });
		BezierEdge.displayName = "BezierEdge";
		BezierEdgeInternal.displayName = "BezierEdgeInternal";
		const builtinEdgeTypes = {
			default: BezierEdgeInternal,
			straight: StraightEdgeInternal,
			step: StepEdgeInternal,
			smoothstep: SmoothStepEdgeInternal,
			simplebezier: SimpleBezierEdgeInternal
		};
		const nullPosition = {
			sourceX: null,
			sourceY: null,
			targetX: null,
			targetY: null,
			sourcePosition: null,
			targetPosition: null,
			zIndex: void 0
		};
		const shiftX = (x, shift, position) => {
			if (position === Position.Left) return x - shift;
			if (position === Position.Right) return x + shift;
			return x;
		};
		const shiftY = (y, shift, position) => {
			if (position === Position.Top) return y - shift;
			if (position === Position.Bottom) return y + shift;
			return y;
		};
		const EdgeUpdaterClassName = "react-flow__edgeupdater";
		/**
		* @internal
		*/
		function EdgeAnchor({ position, centerX, centerY, radius = 10, onMouseDown, onMouseEnter, onMouseOut, type }) {
			return (0, react_jsx_runtime.jsx)("circle", {
				onMouseDown,
				onMouseEnter,
				onMouseOut,
				className: cc([EdgeUpdaterClassName, `${EdgeUpdaterClassName}-${type}`]),
				cx: shiftX(centerX, radius, position),
				cy: shiftY(centerY, radius, position),
				r: radius,
				stroke: "transparent",
				fill: "transparent"
			});
		}
		function EdgeUpdateAnchors({ isReconnectable, reconnectRadius, edge, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, onReconnect, onReconnectStart, onReconnectEnd, setReconnecting, setUpdateHover }) {
			const store = useStoreApi();
			const handleEdgeUpdater = (event, oppositeHandle) => {
				if (event.button !== 0) return;
				const { autoPanOnConnect, domNode, connectionMode, connectionRadius, lib, onConnectStart, cancelConnection, nodeLookup, rfId: flowId, panBy, updateConnection } = store.getState();
				const isTarget = oppositeHandle.type === "target";
				const _onReconnectEnd = (evt, connectionState) => {
					setReconnecting(false);
					onReconnectEnd?.(evt, edge, oppositeHandle.type, connectionState);
				};
				const onConnectEdge = (connection) => onReconnect?.(edge, connection);
				const _onConnectStart = (_event, params) => {
					setReconnecting(true);
					onReconnectStart?.(event, edge, oppositeHandle.type);
					onConnectStart?.(_event, params);
				};
				XYHandle.onPointerDown(event.nativeEvent, {
					autoPanOnConnect,
					connectionMode,
					connectionRadius,
					domNode,
					handleId: oppositeHandle.id,
					nodeId: oppositeHandle.nodeId,
					nodeLookup,
					isTarget,
					edgeUpdaterType: oppositeHandle.type,
					lib,
					flowId,
					cancelConnection,
					panBy,
					isValidConnection: (...args) => store.getState().isValidConnection?.(...args) ?? true,
					onConnect: onConnectEdge,
					onConnectStart: _onConnectStart,
					onConnectEnd: (...args) => store.getState().onConnectEnd?.(...args),
					onReconnectEnd: _onReconnectEnd,
					updateConnection,
					getTransform: () => store.getState().transform,
					getFromHandle: () => store.getState().connection.fromHandle,
					dragThreshold: store.getState().connectionDragThreshold,
					handleDomNode: event.currentTarget
				});
			};
			const onReconnectSourceMouseDown = (event) => handleEdgeUpdater(event, {
				nodeId: edge.target,
				id: edge.targetHandle ?? null,
				type: "target"
			});
			const onReconnectTargetMouseDown = (event) => handleEdgeUpdater(event, {
				nodeId: edge.source,
				id: edge.sourceHandle ?? null,
				type: "source"
			});
			const onReconnectMouseEnter = () => setUpdateHover(true);
			const onReconnectMouseOut = () => setUpdateHover(false);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(isReconnectable === true || isReconnectable === "source") && (0, react_jsx_runtime.jsx)(EdgeAnchor, {
				position: sourcePosition,
				centerX: sourceX,
				centerY: sourceY,
				radius: reconnectRadius,
				onMouseDown: onReconnectSourceMouseDown,
				onMouseEnter: onReconnectMouseEnter,
				onMouseOut: onReconnectMouseOut,
				type: "source"
			}), (isReconnectable === true || isReconnectable === "target") && (0, react_jsx_runtime.jsx)(EdgeAnchor, {
				position: targetPosition,
				centerX: targetX,
				centerY: targetY,
				radius: reconnectRadius,
				onMouseDown: onReconnectTargetMouseDown,
				onMouseEnter: onReconnectMouseEnter,
				onMouseOut: onReconnectMouseOut,
				type: "target"
			})] });
		}
		function EdgeWrapper({ id, edgesFocusable, edgesReconnectable, elementsSelectable, onClick, onDoubleClick, onContextMenu, onMouseEnter, onMouseMove, onMouseLeave, reconnectRadius, onReconnect, onReconnectStart, onReconnectEnd, rfId, edgeTypes, noPanClassName, onError, disableKeyboardA11y }) {
			let edge = useStore((s) => s.edgeLookup.get(id));
			const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
			edge = defaultEdgeOptions ? {
				...defaultEdgeOptions,
				...edge
			} : edge;
			let edgeType = edge.type || "default";
			let EdgeComponent = edgeTypes?.[edgeType] || builtinEdgeTypes[edgeType];
			if (EdgeComponent === void 0) {
				onError?.("011", errorMessages["error011"](edgeType));
				edgeType = "default";
				EdgeComponent = edgeTypes?.["default"] || builtinEdgeTypes.default;
			}
			const isFocusable = !!(edge.focusable || edgesFocusable && typeof edge.focusable === "undefined");
			const isReconnectable = typeof onReconnect !== "undefined" && (edge.reconnectable || edgesReconnectable && typeof edge.reconnectable === "undefined");
			const isSelectable = !!(edge.selectable || elementsSelectable && typeof edge.selectable === "undefined");
			const edgeRef = (0, react.useRef)(null);
			const [updateHover, setUpdateHover] = (0, react.useState)(false);
			const [reconnecting, setReconnecting] = (0, react.useState)(false);
			const store = useStoreApi();
			const { zIndex = edge.zIndex, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = useStore((0, react.useCallback)((store) => {
				const sourceNode = store.nodeLookup.get(edge.source);
				const targetNode = store.nodeLookup.get(edge.target);
				if (!sourceNode || !targetNode) return nullPosition;
				const edgePosition = getEdgePosition({
					id,
					sourceNode,
					targetNode,
					sourceHandle: edge.sourceHandle || null,
					targetHandle: edge.targetHandle || null,
					connectionMode: store.connectionMode,
					onError
				});
				const zIndex = getElevatedEdgeZIndex({
					selected: edge.selected,
					zIndex: edge.zIndex,
					sourceNode,
					targetNode,
					elevateOnSelect: store.elevateEdgesOnSelect,
					zIndexMode: store.zIndexMode
				});
				return {
					...edgePosition || nullPosition,
					zIndex
				};
			}, [
				edge.source,
				edge.target,
				edge.sourceHandle,
				edge.targetHandle,
				edge.selected,
				edge.zIndex,
				onError
			]), shallow$1);
			const markerStartUrl = (0, react.useMemo)(() => edge.markerStart ? `url('#${getMarkerId(edge.markerStart, rfId)}')` : void 0, [edge.markerStart, rfId]);
			const markerEndUrl = (0, react.useMemo)(() => edge.markerEnd ? `url('#${getMarkerId(edge.markerEnd, rfId)}')` : void 0, [edge.markerEnd, rfId]);
			if (edge.hidden || sourceX === null || sourceY === null || targetX === null || targetY === null) return null;
			const onEdgeClick = (event) => {
				const { addSelectedEdges, unselectNodesAndEdges, multiSelectionActive } = store.getState();
				if (isSelectable) {
					store.setState({ nodesSelectionActive: false });
					if (edge.selected && multiSelectionActive) {
						unselectNodesAndEdges({
							nodes: [],
							edges: [edge]
						});
						edgeRef.current?.blur();
					} else addSelectedEdges([id]);
				}
				if (onClick) onClick(event, edge);
			};
			const onEdgeDoubleClick = onDoubleClick ? (event) => {
				onDoubleClick(event, { ...edge });
			} : void 0;
			const onEdgeContextMenu = onContextMenu ? (event) => {
				onContextMenu(event, { ...edge });
			} : void 0;
			const onEdgeMouseEnter = onMouseEnter ? (event) => {
				onMouseEnter(event, { ...edge });
			} : void 0;
			const onEdgeMouseMove = onMouseMove ? (event) => {
				onMouseMove(event, { ...edge });
			} : void 0;
			const onEdgeMouseLeave = onMouseLeave ? (event) => {
				onMouseLeave(event, { ...edge });
			} : void 0;
			const onKeyDown = (event) => {
				if (!disableKeyboardA11y && elementSelectionKeys.includes(event.key) && isSelectable) {
					const { unselectNodesAndEdges, addSelectedEdges } = store.getState();
					if (event.key === "Escape") {
						edgeRef.current?.blur();
						unselectNodesAndEdges({ edges: [edge] });
					} else addSelectedEdges([id]);
				}
			};
			return (0, react_jsx_runtime.jsx)("svg", {
				style: { zIndex },
				children: (0, react_jsx_runtime.jsxs)("g", {
					className: cc([
						"react-flow__edge",
						`react-flow__edge-${edgeType}`,
						edge.className,
						noPanClassName,
						{
							selected: edge.selected,
							animated: edge.animated,
							inactive: !isSelectable && !onClick,
							updating: updateHover,
							selectable: isSelectable
						}
					]),
					onClick: onEdgeClick,
					onDoubleClick: onEdgeDoubleClick,
					onContextMenu: onEdgeContextMenu,
					onMouseEnter: onEdgeMouseEnter,
					onMouseMove: onEdgeMouseMove,
					onMouseLeave: onEdgeMouseLeave,
					onKeyDown: isFocusable ? onKeyDown : void 0,
					tabIndex: isFocusable ? 0 : void 0,
					role: edge.ariaRole ?? (isFocusable ? "group" : "img"),
					"aria-roledescription": "edge",
					"data-id": id,
					"data-testid": `rf__edge-${id}`,
					"aria-label": edge.ariaLabel === null ? void 0 : edge.ariaLabel || `Edge from ${edge.source} to ${edge.target}`,
					"aria-describedby": isFocusable ? `${ARIA_EDGE_DESC_KEY}-${rfId}` : void 0,
					ref: edgeRef,
					...edge.domAttributes,
					children: [!reconnecting && (0, react_jsx_runtime.jsx)(EdgeComponent, {
						id,
						source: edge.source,
						target: edge.target,
						type: edge.type,
						selected: edge.selected,
						animated: edge.animated,
						selectable: isSelectable,
						deletable: edge.deletable ?? true,
						label: edge.label,
						labelStyle: edge.labelStyle,
						labelShowBg: edge.labelShowBg,
						labelBgStyle: edge.labelBgStyle,
						labelBgPadding: edge.labelBgPadding,
						labelBgBorderRadius: edge.labelBgBorderRadius,
						sourceX,
						sourceY,
						targetX,
						targetY,
						sourcePosition,
						targetPosition,
						data: edge.data,
						style: edge.style,
						sourceHandleId: edge.sourceHandle,
						targetHandleId: edge.targetHandle,
						markerStart: markerStartUrl,
						markerEnd: markerEndUrl,
						pathOptions: "pathOptions" in edge ? edge.pathOptions : void 0,
						interactionWidth: edge.interactionWidth
					}), isReconnectable && (0, react_jsx_runtime.jsx)(EdgeUpdateAnchors, {
						edge,
						isReconnectable,
						reconnectRadius,
						onReconnect,
						onReconnectStart,
						onReconnectEnd,
						sourceX,
						sourceY,
						targetX,
						targetY,
						sourcePosition,
						targetPosition,
						setUpdateHover,
						setReconnecting
					})]
				})
			});
		}
		var EdgeWrapper$1 = (0, react.memo)(EdgeWrapper);
		const selector$9 = (s) => ({
			edgesFocusable: s.edgesFocusable,
			edgesReconnectable: s.edgesReconnectable,
			elementsSelectable: s.elementsSelectable,
			connectionMode: s.connectionMode,
			onError: s.onError
		});
		function EdgeRendererComponent({ defaultMarkerColor, onlyRenderVisibleElements, rfId, edgeTypes, noPanClassName, onReconnect, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeClick, reconnectRadius, onEdgeDoubleClick, onReconnectStart, onReconnectEnd, disableKeyboardA11y }) {
			const { edgesFocusable, edgesReconnectable, elementsSelectable, onError } = useStore(selector$9, shallow$1);
			const edgeIds = useVisibleEdgeIds(onlyRenderVisibleElements);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "react-flow__edges",
				children: [(0, react_jsx_runtime.jsx)(MarkerDefinitions$1, {
					defaultColor: defaultMarkerColor,
					rfId
				}), edgeIds.map((id) => {
					return (0, react_jsx_runtime.jsx)(EdgeWrapper$1, {
						id,
						edgesFocusable,
						edgesReconnectable,
						elementsSelectable,
						noPanClassName,
						onReconnect,
						onContextMenu: onEdgeContextMenu,
						onMouseEnter: onEdgeMouseEnter,
						onMouseMove: onEdgeMouseMove,
						onMouseLeave: onEdgeMouseLeave,
						onClick: onEdgeClick,
						reconnectRadius,
						onDoubleClick: onEdgeDoubleClick,
						onReconnectStart,
						onReconnectEnd,
						rfId,
						onError,
						edgeTypes,
						disableKeyboardA11y
					}, id);
				})]
			});
		}
		EdgeRendererComponent.displayName = "EdgeRenderer";
		const EdgeRenderer = (0, react.memo)(EdgeRendererComponent);
		const toTransformString = (transform) => `translate(${transform[0]}px,${transform[1]}px) scale(${transform[2]})`;
		function Viewport({ children }) {
			const store = useStoreApi();
			const viewportRef = (0, react.useRef)(null);
			const [initialTransform] = (0, react.useState)(() => store.getState().transform);
			useIsomorphicLayoutEffect(() => {
				let prevTransform = null;
				const applyTransform = () => {
					const transform = store.getState().transform;
					if (prevTransform && transform[0] === prevTransform[0] && transform[1] === prevTransform[1] && transform[2] === prevTransform[2]) return;
					prevTransform = transform;
					if (viewportRef.current) viewportRef.current.style.transform = toTransformString(transform);
				};
				applyTransform();
				return store.subscribe(applyTransform);
			}, [store]);
			return (0, react_jsx_runtime.jsx)("div", {
				ref: viewportRef,
				className: "react-flow__viewport xyflow__viewport react-flow__container",
				style: { transform: toTransformString(initialTransform) },
				children
			});
		}
		/**
		* Hook for calling onInit handler.
		*
		* @internal
		*/
		function useOnInitHandler(onInit) {
			const rfInstance = useReactFlow();
			const isInitialized = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (!isInitialized.current && rfInstance.viewportInitialized && onInit) {
					setTimeout(() => onInit(rfInstance), 1);
					isInitialized.current = true;
				}
			}, [onInit, rfInstance.viewportInitialized]);
		}
		const selector$8 = (state) => state.panZoom?.syncViewport;
		/**
		* Hook for syncing the viewport with the panzoom instance.
		*
		* @internal
		* @param viewport
		*/
		function useViewportSync(viewport) {
			const syncViewport = useStore(selector$8);
			const store = useStoreApi();
			(0, react.useEffect)(() => {
				if (viewport) {
					syncViewport?.(viewport);
					store.setState({ transform: [
						viewport.x,
						viewport.y,
						viewport.zoom
					] });
				}
			}, [viewport, syncViewport]);
			return null;
		}
		function storeSelector$1(s) {
			return s.connection.inProgress ? {
				...s.connection,
				to: pointToRendererPoint(s.connection.to, s.transform)
			} : { ...s.connection };
		}
		function getSelector(connectionSelector) {
			if (connectionSelector) {
				const combinedSelector = (s) => {
					return connectionSelector(storeSelector$1(s));
				};
				return combinedSelector;
			}
			return storeSelector$1;
		}
		/**
		* The `useConnection` hook returns the current connection when there is an active
		* connection interaction. If no connection interaction is active, it returns null
		* for every property. A typical use case for this hook is to colorize handles
		* based on a certain condition (e.g. if the connection is valid or not).
		*
		* @public
		* @param connectionSelector - An optional selector function used to extract a slice of the
		* `ConnectionState` data. Using a selector can prevent component re-renders where data you don't
		* otherwise care about might change. If a selector is not provided, the entire `ConnectionState`
		* object is returned unchanged.
		* @example
		*
		* ```tsx
		*import { useConnection } from '@xyflow/react';
		*
		*function App() {
		*  const connection = useConnection();
		*
		*  return (
		*    <div> {connection ? `Someone is trying to make a connection from ${connection.fromNode} to this one.` : 'There are currently no incoming connections!'}
		*
		*   </div>
		*   );
		* }
		* ```
		*
		* @returns ConnectionState
		*/
		function useConnection(connectionSelector) {
			return useStore(getSelector(connectionSelector), shallow$1);
		}
		const selector$7 = (s) => ({
			nodesConnectable: s.nodesConnectable,
			isValid: s.connection.isValid,
			inProgress: s.connection.inProgress,
			width: s.width,
			height: s.height
		});
		function ConnectionLineWrapper({ containerStyle, style, type, component }) {
			const { nodesConnectable, width, height, isValid, inProgress } = useStore(selector$7, shallow$1);
			if (!!!(width && nodesConnectable && inProgress)) return null;
			return (0, react_jsx_runtime.jsx)("svg", {
				style: containerStyle,
				width,
				height,
				className: "react-flow__connectionline react-flow__container",
				children: (0, react_jsx_runtime.jsx)("g", {
					className: cc(["react-flow__connection", getConnectionStatus(isValid)]),
					children: (0, react_jsx_runtime.jsx)(ConnectionLine, {
						style,
						type,
						CustomComponent: component,
						isValid
					})
				})
			});
		}
		const ConnectionLine = ({ style, type = ConnectionLineType.Bezier, CustomComponent, isValid }) => {
			const { inProgress, from, fromNode, fromHandle, fromPosition, to, toNode, toHandle, toPosition, pointer } = useConnection();
			if (!inProgress) return;
			if (CustomComponent) return (0, react_jsx_runtime.jsx)(CustomComponent, {
				connectionLineType: type,
				connectionLineStyle: style,
				fromNode,
				fromHandle,
				fromX: from.x,
				fromY: from.y,
				toX: to.x,
				toY: to.y,
				fromPosition,
				toPosition,
				connectionStatus: getConnectionStatus(isValid),
				toNode,
				toHandle,
				pointer
			});
			let path = "";
			const pathParams = {
				sourceX: from.x,
				sourceY: from.y,
				sourcePosition: fromPosition,
				targetX: to.x,
				targetY: to.y,
				targetPosition: toPosition
			};
			switch (type) {
				case ConnectionLineType.Bezier:
					[path] = getBezierPath(pathParams);
					break;
				case ConnectionLineType.SimpleBezier:
					[path] = getSimpleBezierPath(pathParams);
					break;
				case ConnectionLineType.Step:
					[path] = getSmoothStepPath({
						...pathParams,
						borderRadius: 0
					});
					break;
				case ConnectionLineType.SmoothStep:
					[path] = getSmoothStepPath(pathParams);
					break;
				default: [path] = getStraightPath(pathParams);
			}
			return (0, react_jsx_runtime.jsx)("path", {
				d: path,
				fill: "none",
				className: "react-flow__connection-path",
				style
			});
		};
		ConnectionLine.displayName = "ConnectionLine";
		const emptyTypes = {};
		function useNodeOrEdgeTypesWarning(nodeOrEdgeTypes = emptyTypes) {
			(0, react.useRef)(nodeOrEdgeTypes);
			useStoreApi();
			(0, react.useEffect)(() => {}, [nodeOrEdgeTypes]);
		}
		function useStylesLoadedWarning() {
			useStoreApi();
			(0, react.useRef)(false);
			(0, react.useEffect)(() => {}, []);
		}
		function GraphViewComponent({ nodeTypes, edgeTypes, onInit, onNodeClick, onEdgeClick, onNodeDoubleClick, onEdgeDoubleClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onSelectionContextMenu, onSelectionStart, onSelectionEnd, connectionLineType, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, selectionKeyCode, selectionOnDrag, selectionMode, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, deleteKeyCode, onlyRenderVisibleElements, elementsSelectable, defaultViewport, translateExtent, minZoom, maxZoom, preventScrolling, defaultMarkerColor, zoomOnScroll, zoomOnPinch, panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag, autoPanOnSelection, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, paneClickDistance, nodeClickDistance, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius, onReconnect, onReconnectStart, onReconnectEnd, noDragClassName, noWheelClassName, noPanClassName, disableKeyboardA11y, nodeExtent, rfId, viewport, onViewportChange, nodesDraggable }) {
			useNodeOrEdgeTypesWarning(nodeTypes);
			useNodeOrEdgeTypesWarning(edgeTypes);
			useStylesLoadedWarning();
			useOnInitHandler(onInit);
			useViewportSync(viewport);
			return (0, react_jsx_runtime.jsx)(FlowRenderer, {
				onPaneClick,
				onPaneMouseEnter,
				onPaneMouseMove,
				onPaneMouseLeave,
				onPaneContextMenu,
				onPaneScroll,
				paneClickDistance,
				deleteKeyCode,
				selectionKeyCode,
				selectionOnDrag,
				selectionMode,
				onSelectionStart,
				onSelectionEnd,
				multiSelectionKeyCode,
				panActivationKeyCode,
				zoomActivationKeyCode,
				elementsSelectable,
				zoomOnScroll,
				zoomOnPinch,
				zoomOnDoubleClick,
				panOnScroll,
				panOnScrollSpeed,
				panOnScrollMode,
				panOnDrag,
				autoPanOnSelection,
				defaultViewport,
				translateExtent,
				minZoom,
				maxZoom,
				onSelectionContextMenu,
				preventScrolling,
				noDragClassName,
				noWheelClassName,
				noPanClassName,
				disableKeyboardA11y,
				onViewportChange,
				isControlledViewport: !!viewport,
				children: (0, react_jsx_runtime.jsxs)(Viewport, { children: [
					(0, react_jsx_runtime.jsx)(EdgeRenderer, {
						edgeTypes,
						onEdgeClick,
						onEdgeDoubleClick,
						onReconnect,
						onReconnectStart,
						onReconnectEnd,
						onlyRenderVisibleElements,
						onEdgeContextMenu,
						onEdgeMouseEnter,
						onEdgeMouseMove,
						onEdgeMouseLeave,
						reconnectRadius,
						defaultMarkerColor,
						noPanClassName,
						disableKeyboardA11y,
						rfId
					}),
					(0, react_jsx_runtime.jsx)(ConnectionLineWrapper, {
						style: connectionLineStyle,
						type: connectionLineType,
						component: connectionLineComponent,
						containerStyle: connectionLineContainerStyle
					}),
					(0, react_jsx_runtime.jsx)("div", { className: "react-flow__edgelabel-renderer" }),
					(0, react_jsx_runtime.jsx)(NodeRenderer, {
						nodeTypes,
						onNodeClick,
						onNodeDoubleClick,
						onNodeMouseEnter,
						onNodeMouseMove,
						onNodeMouseLeave,
						onNodeContextMenu,
						nodeClickDistance,
						onlyRenderVisibleElements,
						noPanClassName,
						noDragClassName,
						disableKeyboardA11y,
						nodeExtent,
						rfId,
						nodesDraggable
					}),
					(0, react_jsx_runtime.jsx)("div", { className: "react-flow__viewport-portal" })
				] })
			});
		}
		GraphViewComponent.displayName = "GraphView";
		const GraphView = (0, react.memo)(GraphViewComponent);
		const devWarn = createDevWarn("React Flow", "https://reactflow.dev/");
		const getInitialState = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom = .5, maxZoom = 2, nodeOrigin, nodeExtent, zIndexMode = "basic" } = {}) => {
			const nodeLookup = /* @__PURE__ */ new Map();
			const parentLookup = /* @__PURE__ */ new Map();
			const connectionLookup = /* @__PURE__ */ new Map();
			const edgeLookup = /* @__PURE__ */ new Map();
			const storeEdges = defaultEdges ?? edges ?? [];
			const storeNodes = defaultNodes ?? nodes ?? [];
			const storeNodeOrigin = nodeOrigin ?? [0, 0];
			const storeNodeExtent = nodeExtent ?? infiniteExtent;
			updateConnectionLookup(connectionLookup, edgeLookup, storeEdges);
			const { nodesInitialized } = adoptUserNodes(storeNodes, nodeLookup, parentLookup, {
				nodeOrigin: storeNodeOrigin,
				nodeExtent: storeNodeExtent,
				zIndexMode
			});
			let transform = [
				0,
				0,
				1
			];
			if (fitView && width && height) {
				const { x, y, zoom } = getViewportForBounds(getInternalNodesBounds(nodeLookup, { filter: (node) => !!((node.width || node.initialWidth) && (node.height || node.initialHeight)) }), width, height, minZoom, maxZoom, fitViewOptions?.padding ?? .1);
				transform = [
					x,
					y,
					zoom
				];
			}
			return {
				rfId: "1",
				width: width ?? 0,
				height: height ?? 0,
				transform,
				nodes: storeNodes,
				nodesInitialized,
				nodeLookup,
				parentLookup,
				edges: storeEdges,
				edgeLookup,
				connectionLookup,
				onNodesChange: null,
				onEdgesChange: null,
				hasDefaultNodes: defaultNodes !== void 0,
				hasDefaultEdges: defaultEdges !== void 0,
				panZoom: null,
				minZoom,
				maxZoom,
				translateExtent: infiniteExtent,
				nodeExtent: storeNodeExtent,
				nodesSelectionActive: false,
				userSelectionActive: false,
				userSelectionRect: null,
				connectionMode: ConnectionMode.Strict,
				domNode: null,
				paneDragging: false,
				noPanClassName: "nopan",
				nodeOrigin: storeNodeOrigin,
				nodeDragThreshold: 1,
				connectionDragThreshold: 1,
				snapGrid: [15, 15],
				snapToGrid: false,
				nodesDraggable: true,
				nodesConnectable: true,
				nodesFocusable: true,
				edgesFocusable: true,
				edgesReconnectable: true,
				elementsSelectable: true,
				elevateNodesOnSelect: true,
				elevateEdgesOnSelect: true,
				selectNodesOnDrag: true,
				multiSelectionActive: false,
				fitViewQueued: fitView ?? false,
				fitViewOptions,
				fitViewResolver: null,
				connection: { ...initialConnection },
				connectionClickStartHandle: null,
				connectOnClick: true,
				ariaLiveMessage: "",
				autoPanOnConnect: true,
				autoPanOnNodeDrag: true,
				autoPanOnNodeFocus: true,
				autoPanSpeed: 15,
				connectionRadius: 20,
				onError: devWarn,
				isValidConnection: void 0,
				onSelectionChangeHandlers: [],
				lib: "react",
				debug: false,
				ariaLabelConfig: defaultAriaLabelConfig,
				zIndexMode,
				onNodesChangeMiddlewareMap: /* @__PURE__ */ new Map(),
				onEdgesChangeMiddlewareMap: /* @__PURE__ */ new Map()
			};
		};
		const createStore = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom, maxZoom, nodeOrigin, nodeExtent, zIndexMode }) => createWithEqualityFn((set, get) => {
			async function resolveFitView() {
				const { nodeLookup, panZoom, fitViewOptions, fitViewResolver, width, height, minZoom, maxZoom } = get();
				if (!panZoom) return;
				await fitViewport({
					nodes: nodeLookup,
					width,
					height,
					panZoom,
					minZoom,
					maxZoom
				}, fitViewOptions);
				fitViewResolver?.resolve(true);
				/**
				* wait for the fitViewport to resolve before deleting the resolver,
				* we want to reuse the old resolver if the user calls fitView again in the mean time
				*/
				set({ fitViewResolver: null });
			}
			return {
				...getInitialState({
					nodes,
					edges,
					width,
					height,
					fitView,
					fitViewOptions,
					minZoom,
					maxZoom,
					nodeOrigin,
					nodeExtent,
					defaultNodes,
					defaultEdges,
					zIndexMode
				}),
				setNodes: (nodes) => {
					const { nodeLookup, parentLookup, nodeOrigin, nodeExtent, elevateNodesOnSelect, fitViewQueued, zIndexMode, nodesSelectionActive } = get();
					const { nodesInitialized, hasSelectedNodes } = adoptUserNodes(nodes, nodeLookup, parentLookup, {
						nodeOrigin,
						nodeExtent,
						elevateNodesOnSelect,
						checkEquality: true,
						zIndexMode
					});
					const nextNodesSelectionActive = nodesSelectionActive && hasSelectedNodes;
					if (fitViewQueued && nodesInitialized) {
						resolveFitView();
						set({
							nodes,
							nodesInitialized,
							fitViewQueued: false,
							fitViewOptions: void 0,
							nodesSelectionActive: nextNodesSelectionActive
						});
					} else set({
						nodes,
						nodesInitialized,
						nodesSelectionActive: nextNodesSelectionActive
					});
				},
				setEdges: (edges) => {
					const { connectionLookup, edgeLookup } = get();
					updateConnectionLookup(connectionLookup, edgeLookup, edges);
					set({ edges });
				},
				setDefaultNodesAndEdges: (nodes, edges) => {
					if (nodes) {
						const { setNodes } = get();
						setNodes(nodes);
						set({ hasDefaultNodes: true });
					}
					if (edges) {
						const { setEdges } = get();
						setEdges(edges);
						set({ hasDefaultEdges: true });
					}
				},
				updateNodeInternals: (updates) => {
					const { triggerNodeChanges, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent, debug, fitViewQueued, zIndexMode } = get();
					const { changes, updatedInternals } = updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent, zIndexMode);
					if (!updatedInternals) return;
					updateAbsolutePositions(nodeLookup, parentLookup, {
						nodeOrigin,
						nodeExtent,
						zIndexMode
					});
					if (fitViewQueued) {
						resolveFitView();
						set({
							fitViewQueued: false,
							fitViewOptions: void 0
						});
					} else set({});
					if (changes?.length > 0) {
						if (debug) console.log("React Flow: trigger node changes", changes);
						triggerNodeChanges?.(changes);
					}
				},
				updateNodePositions: (nodeDragItems, dragging = false) => {
					const parentExpandChildren = [];
					let changes = [];
					const { nodeLookup, triggerNodeChanges, connection, updateConnection, onNodesChangeMiddlewareMap } = get();
					for (const [id, dragItem] of nodeDragItems) {
						const node = nodeLookup.get(id);
						const expandParent = !!(node?.expandParent && node?.parentId && dragItem?.position);
						const change = {
							id,
							type: "position",
							position: expandParent ? {
								x: Math.max(0, dragItem.position.x),
								y: Math.max(0, dragItem.position.y)
							} : dragItem.position,
							dragging
						};
						if (node && connection.inProgress && connection.fromNode.id === node.id) {
							const updatedFrom = getHandlePosition(node, connection.fromHandle, Position.Left, true);
							updateConnection({
								...connection,
								from: updatedFrom
							});
						}
						if (expandParent && node.parentId) parentExpandChildren.push({
							id,
							parentId: node.parentId,
							rect: {
								...dragItem.internals.positionAbsolute,
								width: dragItem.measured.width ?? 0,
								height: dragItem.measured.height ?? 0
							}
						});
						changes.push(change);
					}
					if (parentExpandChildren.length > 0) {
						const { parentLookup, nodeOrigin } = get();
						const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin);
						changes.push(...parentExpandChanges);
					}
					for (const middleware of onNodesChangeMiddlewareMap.values()) changes = middleware(changes);
					triggerNodeChanges(changes);
				},
				triggerNodeChanges: (changes) => {
					const { onNodesChange, setNodes, nodes, hasDefaultNodes, debug } = get();
					if (changes?.length) {
						if (hasDefaultNodes) setNodes(applyNodeChanges(changes, nodes));
						if (debug) console.log("React Flow: trigger node changes", changes);
						onNodesChange?.(changes);
					}
				},
				triggerEdgeChanges: (changes) => {
					const { onEdgesChange, setEdges, edges, hasDefaultEdges, debug } = get();
					if (changes?.length) {
						if (hasDefaultEdges) setEdges(applyEdgeChanges(changes, edges));
						if (debug) console.log("React Flow: trigger edge changes", changes);
						onEdgesChange?.(changes);
					}
				},
				addSelectedNodes: (selectedNodeIds) => {
					const { multiSelectionActive, edgeLookup, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get();
					if (multiSelectionActive) {
						triggerNodeChanges(selectedNodeIds.map((nodeId) => createSelectionChange(nodeId, true)));
						return;
					}
					triggerNodeChanges(getSelectionChanges(nodeLookup, new Set([...selectedNodeIds]), true));
					triggerEdgeChanges(getSelectionChanges(edgeLookup));
				},
				addSelectedEdges: (selectedEdgeIds) => {
					const { multiSelectionActive, edgeLookup, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get();
					if (multiSelectionActive) {
						triggerEdgeChanges(selectedEdgeIds.map((edgeId) => createSelectionChange(edgeId, true)));
						return;
					}
					triggerEdgeChanges(getSelectionChanges(edgeLookup, new Set([...selectedEdgeIds])));
					triggerNodeChanges(getSelectionChanges(nodeLookup, /* @__PURE__ */ new Set(), true));
				},
				unselectNodesAndEdges: ({ nodes, edges } = {}) => {
					const { edges: storeEdges, nodes: storeNodes, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get();
					const nodesToUnselect = nodes ? nodes : storeNodes;
					const edgesToUnselect = edges ? edges : storeEdges;
					const nodeChanges = [];
					for (const node of nodesToUnselect) {
						if (!node.selected) continue;
						const internalNode = nodeLookup.get(node.id);
						if (internalNode) internalNode.selected = false;
						nodeChanges.push(createSelectionChange(node.id, false));
					}
					const edgeChanges = [];
					for (const edge of edgesToUnselect) {
						if (!edge.selected) continue;
						edgeChanges.push(createSelectionChange(edge.id, false));
					}
					triggerNodeChanges(nodeChanges);
					triggerEdgeChanges(edgeChanges);
				},
				setMinZoom: (minZoom) => {
					const { panZoom, maxZoom } = get();
					panZoom?.setScaleExtent([minZoom, maxZoom]);
					set({ minZoom });
				},
				setMaxZoom: (maxZoom) => {
					const { panZoom, minZoom } = get();
					panZoom?.setScaleExtent([minZoom, maxZoom]);
					set({ maxZoom });
				},
				setTranslateExtent: (translateExtent) => {
					get().panZoom?.setTranslateExtent(translateExtent);
					set({ translateExtent });
				},
				resetSelectedElements: () => {
					const { edges, nodes, triggerNodeChanges, triggerEdgeChanges, elementsSelectable } = get();
					if (!elementsSelectable) return;
					const nodeChanges = nodes.reduce((res, node) => node.selected ? [...res, createSelectionChange(node.id, false)] : res, []);
					const edgeChanges = edges.reduce((res, edge) => edge.selected ? [...res, createSelectionChange(edge.id, false)] : res, []);
					triggerNodeChanges(nodeChanges);
					triggerEdgeChanges(edgeChanges);
				},
				setNodeExtent: (nextNodeExtent) => {
					const { nodes, nodeLookup, parentLookup, nodeOrigin, elevateNodesOnSelect, nodeExtent, zIndexMode } = get();
					if (nextNodeExtent[0][0] === nodeExtent[0][0] && nextNodeExtent[0][1] === nodeExtent[0][1] && nextNodeExtent[1][0] === nodeExtent[1][0] && nextNodeExtent[1][1] === nodeExtent[1][1]) return;
					adoptUserNodes(nodes, nodeLookup, parentLookup, {
						nodeOrigin,
						nodeExtent: nextNodeExtent,
						elevateNodesOnSelect,
						checkEquality: false,
						zIndexMode
					});
					set({ nodeExtent: nextNodeExtent });
				},
				panBy: (delta) => {
					const { transform, width, height, panZoom, translateExtent } = get();
					return panBy({
						delta,
						panZoom,
						transform,
						translateExtent,
						width,
						height
					});
				},
				setCenter: async (x, y, options) => {
					const { width, height, maxZoom, panZoom } = get();
					if (!panZoom) return false;
					const nextZoom = typeof options?.zoom !== "undefined" ? options.zoom : maxZoom;
					await panZoom.setViewport({
						x: width / 2 - x * nextZoom,
						y: height / 2 - y * nextZoom,
						zoom: nextZoom
					}, {
						duration: options?.duration,
						ease: options?.ease,
						interpolate: options?.interpolate
					});
					return true;
				},
				cancelConnection: () => {
					set({ connection: { ...initialConnection } });
				},
				updateConnection: (connection) => {
					set({ connection });
				},
				reset: () => set({ ...getInitialState() })
			};
		}, Object.is);
		/**
		* The `<ReactFlowProvider />` component is a [context provider](https://react.dev/learn/passing-data-deeply-with-context#)
		* that makes it possible to access a flow's internal state outside of the
		* [`<ReactFlow />`](/api-reference/react-flow) component. Many of the hooks we
		* provide rely on this component to work.
		* @public
		*
		* @example
		* ```tsx
		*import { ReactFlow, ReactFlowProvider, useNodes } from '@xyflow/react'
		*
		*export default function Flow() {
		*  return (
		*    <ReactFlowProvider>
		*      <ReactFlow nodes={...} edges={...} />
		*      <Sidebar />
		*    </ReactFlowProvider>
		*  );
		*}
		*
		*function Sidebar() {
		*  // This hook will only work if the component it's used in is a child of a
		*  // <ReactFlowProvider />.
		*  const nodes = useNodes()
		*
		*  return <aside>do something with nodes</aside>;
		*}
		*```
		*
		* @remarks If you're using a router and want your flow's state to persist across routes,
		* it's vital that you place the `<ReactFlowProvider />` component _outside_ of
		* your router. If you have multiple flows on the same page you will need to use a separate
		* `<ReactFlowProvider />` for each flow.
		*/
		function ReactFlowProvider({ initialNodes: nodes, initialEdges: edges, defaultNodes, defaultEdges, initialWidth: width, initialHeight: height, initialMinZoom: minZoom, initialMaxZoom: maxZoom, initialFitViewOptions: fitViewOptions, fitView, nodeOrigin, nodeExtent, zIndexMode, children }) {
			const [store] = (0, react.useState)(() => createStore({
				nodes,
				edges,
				defaultNodes,
				defaultEdges,
				width,
				height,
				fitView,
				minZoom,
				maxZoom,
				fitViewOptions,
				nodeOrigin,
				nodeExtent,
				zIndexMode
			}));
			return (0, react_jsx_runtime.jsx)(Provider$1, {
				value: store,
				children: (0, react_jsx_runtime.jsx)(BatchProvider, { children: (0, react_jsx_runtime.jsx)(HandleConfigProvider, { children }) })
			});
		}
		function Wrapper({ children, nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom, maxZoom, nodeOrigin, nodeExtent, zIndexMode }) {
			if ((0, react.useContext)(StoreContext)) return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children });
			return (0, react_jsx_runtime.jsx)(ReactFlowProvider, {
				initialNodes: nodes,
				initialEdges: edges,
				defaultNodes,
				defaultEdges,
				initialWidth: width,
				initialHeight: height,
				fitView,
				initialFitViewOptions: fitViewOptions,
				initialMinZoom: minZoom,
				initialMaxZoom: maxZoom,
				nodeOrigin,
				nodeExtent,
				zIndexMode,
				children
			});
		}
		const wrapperStyle = {
			width: "100%",
			height: "100%",
			overflow: "hidden",
			position: "relative",
			zIndex: 0
		};
		function ReactFlow({ nodes, edges, defaultNodes, defaultEdges, className, nodeTypes, edgeTypes, onNodeClick, onEdgeClick, onInit, onMove, onMoveStart, onMoveEnd, onConnect, onConnectStart, onConnectEnd, onClickConnectStart, onClickConnectEnd, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onNodeDoubleClick, onNodeDragStart, onNodeDrag, onNodeDragStop, onNodesDelete, onEdgesDelete, onDelete, onSelectionChange, onSelectionDragStart, onSelectionDrag, onSelectionDragStop, onSelectionContextMenu, onSelectionStart, onSelectionEnd, onBeforeDelete, connectionMode, connectionLineType = ConnectionLineType.Bezier, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, deleteKeyCode = "Backspace", selectionKeyCode = "Shift", selectionOnDrag = false, selectionMode = SelectionMode.Full, panActivationKeyCode = "Space", multiSelectionKeyCode = isMacOs() ? "Meta" : "Control", zoomActivationKeyCode = isMacOs() ? "Meta" : "Control", snapToGrid, snapGrid, onlyRenderVisibleElements = false, selectNodesOnDrag, nodesDraggable, autoPanOnNodeFocus, nodesConnectable, nodesFocusable, nodeOrigin = defaultNodeOrigin, edgesFocusable, edgesReconnectable, elementsSelectable = true, defaultViewport: defaultViewport$1 = defaultViewport, minZoom = .5, maxZoom = 2, translateExtent = infiniteExtent, preventScrolling = true, nodeExtent, defaultMarkerColor = "#b1b1b7", zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panOnScrollSpeed = .5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, paneClickDistance = 1, nodeClickDistance = 0, children, onReconnect, onReconnectStart, onReconnectEnd, onEdgeContextMenu, onEdgeDoubleClick, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius = 10, onNodesChange, onEdgesChange, noDragClassName = "nodrag", noWheelClassName = "nowheel", noPanClassName = "nopan", fitView, fitViewOptions, connectOnClick, attributionPosition, proOptions, defaultEdgeOptions, elevateNodesOnSelect = true, elevateEdgesOnSelect = false, disableKeyboardA11y = false, autoPanOnConnect, autoPanOnNodeDrag, autoPanOnSelection = true, autoPanSpeed, connectionRadius, isValidConnection, onError, style, id, nodeDragThreshold, connectionDragThreshold, viewport, onViewportChange, width, height, colorMode = "light", debug, onScroll, ariaLabelConfig, zIndexMode = "basic", ...rest }, ref) {
			const rfId = id || "1";
			const colorModeClassName = useColorModeClass(colorMode);
			const wrapperOnScroll = (0, react.useCallback)((e) => {
				e.currentTarget.scrollTo({
					top: 0,
					left: 0,
					behavior: "instant"
				});
				onScroll?.(e);
			}, [onScroll]);
			return (0, react_jsx_runtime.jsx)("div", {
				"data-testid": "rf__wrapper",
				...rest,
				onScroll: wrapperOnScroll,
				style: {
					...style,
					...wrapperStyle
				},
				ref,
				className: cc([
					"react-flow",
					className,
					colorModeClassName
				]),
				id,
				role: "application",
				children: (0, react_jsx_runtime.jsxs)(Wrapper, {
					nodes,
					edges,
					width,
					height,
					fitView,
					fitViewOptions,
					minZoom,
					maxZoom,
					nodeOrigin,
					nodeExtent,
					zIndexMode,
					children: [
						(0, react_jsx_runtime.jsx)(StoreUpdater, {
							nodes,
							edges,
							defaultNodes,
							defaultEdges,
							onConnect,
							onConnectStart,
							onConnectEnd,
							onClickConnectStart,
							onClickConnectEnd,
							nodesDraggable,
							autoPanOnNodeFocus,
							nodesConnectable,
							nodesFocusable,
							edgesFocusable,
							edgesReconnectable,
							elementsSelectable,
							elevateNodesOnSelect,
							elevateEdgesOnSelect,
							minZoom,
							maxZoom,
							nodeExtent,
							onNodesChange,
							onEdgesChange,
							snapToGrid,
							snapGrid,
							connectionMode,
							translateExtent,
							connectOnClick,
							defaultEdgeOptions,
							fitView,
							fitViewOptions,
							onNodesDelete,
							onEdgesDelete,
							onDelete,
							onNodeDragStart,
							onNodeDrag,
							onNodeDragStop,
							onSelectionDrag,
							onSelectionDragStart,
							onSelectionDragStop,
							onMove,
							onMoveStart,
							onMoveEnd,
							noPanClassName,
							nodeOrigin,
							rfId,
							autoPanOnConnect,
							autoPanOnNodeDrag,
							autoPanSpeed,
							onError,
							connectionRadius,
							isValidConnection,
							selectNodesOnDrag,
							nodeDragThreshold,
							connectionDragThreshold,
							onBeforeDelete,
							debug,
							ariaLabelConfig,
							zIndexMode
						}),
						(0, react_jsx_runtime.jsx)(GraphView, {
							onInit,
							onNodeClick,
							onEdgeClick,
							onNodeMouseEnter,
							onNodeMouseMove,
							onNodeMouseLeave,
							onNodeContextMenu,
							onNodeDoubleClick,
							nodeTypes,
							edgeTypes,
							connectionLineType,
							connectionLineStyle,
							connectionLineComponent,
							connectionLineContainerStyle,
							selectionKeyCode,
							selectionOnDrag,
							selectionMode,
							deleteKeyCode,
							multiSelectionKeyCode,
							panActivationKeyCode,
							zoomActivationKeyCode,
							onlyRenderVisibleElements,
							defaultViewport: defaultViewport$1,
							translateExtent,
							minZoom,
							maxZoom,
							preventScrolling,
							zoomOnScroll,
							zoomOnPinch,
							zoomOnDoubleClick,
							panOnScroll,
							panOnScrollSpeed,
							panOnScrollMode,
							panOnDrag,
							autoPanOnSelection,
							onPaneClick,
							onPaneMouseEnter,
							onPaneMouseMove,
							onPaneMouseLeave,
							onPaneScroll,
							onPaneContextMenu,
							paneClickDistance,
							nodeClickDistance,
							onSelectionContextMenu,
							onSelectionStart,
							onSelectionEnd,
							onReconnect,
							onReconnectStart,
							onReconnectEnd,
							onEdgeContextMenu,
							onEdgeDoubleClick,
							onEdgeMouseEnter,
							onEdgeMouseMove,
							onEdgeMouseLeave,
							reconnectRadius,
							defaultMarkerColor,
							noDragClassName,
							noWheelClassName,
							noPanClassName,
							rfId,
							disableKeyboardA11y,
							nodeExtent,
							viewport,
							onViewportChange,
							nodesDraggable
						}),
						(0, react_jsx_runtime.jsx)(SelectionListener, { onSelectionChange }),
						children,
						(0, react_jsx_runtime.jsx)(Attribution, {
							proOptions,
							position: attributionPosition
						}),
						(0, react_jsx_runtime.jsx)(A11yDescriptions, {
							rfId,
							disableKeyboardA11y
						})
					]
				})
			});
		}
		/**
		* The `<ReactFlow />` component is the heart of your React Flow application.
		* It renders your nodes and edges and handles user interaction
		*
		* @public
		*
		* @example
		* ```tsx
		*import { ReactFlow } from '@xyflow/react'
		*
		*export default function Flow() {
		*  return (<ReactFlow
		*    nodes={...}
		*    edges={...}
		*    onNodesChange={...}
		*    ...
		*  />);
		*}
		*```
		*/
		var index = fixedForwardRef(ReactFlow);
		const selector$6 = (s) => s.domNode?.querySelector(".react-flow__edgelabel-renderer");
		/**
		* Edges are SVG-based. If you want to render more complex labels you can use the
		* `<EdgeLabelRenderer />` component to access a div based renderer. This component
		* is a portal that renders the label in a `<div />` that is positioned on top of
		* the edges. You can see an example usage of the component in the
		* [edge label renderer example](/examples/edges/edge-label-renderer).
		* @public
		*
		* @example
		* ```jsx
		* import React from 'react';
		* import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
		*
		* export function CustomEdge({ id, data, ...props }) {
		*   const [edgePath, labelX, labelY] = getBezierPath(props);
		*
		*   return (
		*     <>
		*       <BaseEdge id={id} path={edgePath} />
		*       <EdgeLabelRenderer>
		*         <div
		*           style={{
		*             position: 'absolute',
		*             transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
		*             background: '#ffcc00',
		*             padding: 10,
		*         }}
		*           className="nodrag nopan"
		*         >
		*          {data.label}
		*         </div>
		*       </EdgeLabelRenderer>
		*     </>
		*   );
		* };
		* ```
		*
		* @remarks The `<EdgeLabelRenderer />` has no pointer events by default. If you want to
		* add mouse interactions you need to set the style `pointerEvents: all` and add
		* the `nopan` class on the label or the element you want to interact with.
		*/
		function EdgeLabelRenderer({ children }) {
			const edgeLabelRenderer = useStore(selector$6);
			if (!edgeLabelRenderer) return null;
			return (0, react_dom.createPortal)(children, edgeLabelRenderer);
		}
		errorMessages["error014"]();
		function LinePattern({ dimensions, lineWidth, variant, className }) {
			return (0, react_jsx_runtime.jsx)("path", {
				strokeWidth: lineWidth,
				d: `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`,
				className: cc([
					"react-flow__background-pattern",
					variant,
					className
				])
			});
		}
		function DotPattern({ radius, className }) {
			return (0, react_jsx_runtime.jsx)("circle", {
				cx: radius,
				cy: radius,
				r: radius,
				className: cc([
					"react-flow__background-pattern",
					"dots",
					className
				])
			});
		}
		/**
		* The three variants are exported as an enum for convenience. You can either import
		* the enum and use it like `BackgroundVariant.Lines` or you can use the raw string
		* value directly.
		* @public
		*/
		var BackgroundVariant;
		(function(BackgroundVariant) {
			BackgroundVariant["Lines"] = "lines";
			BackgroundVariant["Dots"] = "dots";
			BackgroundVariant["Cross"] = "cross";
		})(BackgroundVariant || (BackgroundVariant = {}));
		const defaultSize = {
			[BackgroundVariant.Dots]: 1,
			[BackgroundVariant.Lines]: 1,
			[BackgroundVariant.Cross]: 6
		};
		const selector$3 = (s) => ({
			transform: s.transform,
			patternId: `pattern-${s.rfId}`
		});
		function BackgroundComponent({ id, variant = BackgroundVariant.Dots, gap = 20, size, lineWidth = 1, offset = 0, color, bgColor, style, className, patternClassName }) {
			const ref = (0, react.useRef)(null);
			const { transform, patternId } = useStore(selector$3, shallow$1);
			const patternSize = size || defaultSize[variant];
			const isDots = variant === BackgroundVariant.Dots;
			const isCross = variant === BackgroundVariant.Cross;
			const gapXY = Array.isArray(gap) ? gap : [gap, gap];
			const scaledGap = [gapXY[0] * transform[2] || 1, gapXY[1] * transform[2] || 1];
			const scaledSize = patternSize * transform[2];
			const offsetXY = Array.isArray(offset) ? offset : [offset, offset];
			const patternDimensions = isCross ? [scaledSize, scaledSize] : scaledGap;
			const scaledOffset = [offsetXY[0] * transform[2] + patternDimensions[0] / 2, offsetXY[1] * transform[2] + patternDimensions[1] / 2];
			const _patternId = `${patternId}${id ? id : ""}`;
			return (0, react_jsx_runtime.jsxs)("svg", {
				className: cc(["react-flow__background", className]),
				style: {
					...style,
					...containerStyle,
					"--xy-background-color-props": bgColor,
					"--xy-background-pattern-color-props": color
				},
				ref,
				"data-testid": "rf__background",
				children: [(0, react_jsx_runtime.jsx)("pattern", {
					id: _patternId,
					x: transform[0] % scaledGap[0],
					y: transform[1] % scaledGap[1],
					width: scaledGap[0],
					height: scaledGap[1],
					patternUnits: "userSpaceOnUse",
					patternTransform: `translate(-${scaledOffset[0]},-${scaledOffset[1]})`,
					children: isDots ? (0, react_jsx_runtime.jsx)(DotPattern, {
						radius: scaledSize / 2,
						className: patternClassName
					}) : (0, react_jsx_runtime.jsx)(LinePattern, {
						dimensions: patternDimensions,
						lineWidth,
						variant,
						className: patternClassName
					})
				}), (0, react_jsx_runtime.jsx)("rect", {
					x: "0",
					y: "0",
					width: "100%",
					height: "100%",
					fill: `url(#${_patternId})`
				})]
			});
		}
		BackgroundComponent.displayName = "Background";
		/**
		* The `<Background />` component makes it convenient to render different types of backgrounds common in node-based UIs. It comes with three variants: lines, dots and cross.
		*
		* @example
		*
		* A simple example of how to use the Background component.
		*
		* ```tsx
		* import { useState } from 'react';
		* import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
		*
		* export default function Flow() {
		*   return (
		*     <ReactFlow defaultNodes={[...]} defaultEdges={[...]}>
		*       <Background color="#ccc" variant={BackgroundVariant.Dots} />
		*     </ReactFlow>
		*   );
		* }
		* ```
		*
		* @example
		*
		* In this example you can see how to combine multiple backgrounds
		*
		* ```tsx
		* import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
		* import '@xyflow/react/dist/style.css';
		*
		* export default function Flow() {
		*   return (
		*     <ReactFlow defaultNodes={[...]} defaultEdges={[...]}>
		*       <Background
		*         id="1"
		*         gap={10}
		*         color="#f1f1f1"
		*         variant={BackgroundVariant.Lines}
		*       />
		*       <Background
		*         id="2"
		*         gap={100}
		*         color="#ccc"
		*         variant={BackgroundVariant.Lines}
		*       />
		*     </ReactFlow>
		*   );
		* }
		* ```
		*
		* @remarks
		*
		* When combining multiple <Background /> components it’s important to give each of them a unique id prop!
		*
		*/
		const Background = (0, react.memo)(BackgroundComponent);
		function PlusIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 32 32",
				children: (0, react_jsx_runtime.jsx)("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" })
			});
		}
		function MinusIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 32 5",
				children: (0, react_jsx_runtime.jsx)("path", { d: "M0 0h32v4.2H0z" })
			});
		}
		function FitViewIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 32 30",
				children: (0, react_jsx_runtime.jsx)("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" })
			});
		}
		function LockIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 25 32",
				children: (0, react_jsx_runtime.jsx)("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" })
			});
		}
		function UnlockIcon() {
			return (0, react_jsx_runtime.jsx)("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 25 32",
				children: (0, react_jsx_runtime.jsx)("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" })
			});
		}
		/**
		* You can add buttons to the control panel by using the `<ControlButton />` component
		* and pass it as a child to the [`<Controls />`](/api-reference/components/controls) component.
		*
		* @public
		* @example
		*```jsx
		*import { MagicWand } from '@radix-ui/react-icons'
		*import { ReactFlow, Controls, ControlButton } from '@xyflow/react'
		*
		*export default function Flow() {
		*  return (
		*    <ReactFlow nodes={[...]} edges={[...]}>
		*      <Controls>
		*        <ControlButton onClick={() => alert('Something magical just happened. ✨')}>
		*          <MagicWand />
		*        </ControlButton>
		*      </Controls>
		*    </ReactFlow>
		*  )
		*}
		*```
		*/
		function ControlButton({ children, className, ...rest }) {
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: cc(["react-flow__controls-button", className]),
				...rest,
				children
			});
		}
		const selector$2 = (s) => ({
			isInteractive: s.nodesDraggable || s.nodesConnectable || s.elementsSelectable,
			minZoomReached: s.transform[2] <= s.minZoom,
			maxZoomReached: s.transform[2] >= s.maxZoom,
			ariaLabelConfig: s.ariaLabelConfig
		});
		function ControlsComponent({ style, showZoom = true, showFitView = true, showInteractive = true, fitViewOptions, onZoomIn, onZoomOut, onFitView, onInteractiveChange, className, children, position = "bottom-left", orientation = "vertical", "aria-label": ariaLabel }) {
			const store = useStoreApi();
			const { isInteractive, minZoomReached, maxZoomReached, ariaLabelConfig } = useStore(selector$2, shallow$1);
			const { zoomIn, zoomOut, fitView } = useReactFlow();
			const onZoomInHandler = () => {
				zoomIn();
				onZoomIn?.();
			};
			const onZoomOutHandler = () => {
				zoomOut();
				onZoomOut?.();
			};
			const onFitViewHandler = () => {
				fitView(fitViewOptions);
				onFitView?.();
			};
			const onToggleInteractivity = () => {
				store.setState({
					nodesDraggable: !isInteractive,
					nodesConnectable: !isInteractive,
					elementsSelectable: !isInteractive
				});
				onInteractiveChange?.(!isInteractive);
			};
			return (0, react_jsx_runtime.jsxs)(Panel, {
				className: cc([
					"react-flow__controls",
					orientation === "horizontal" ? "horizontal" : "vertical",
					className
				]),
				position,
				style,
				"data-testid": "rf__controls",
				"aria-label": ariaLabel ?? ariaLabelConfig["controls.ariaLabel"],
				children: [
					showZoom && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(ControlButton, {
						onClick: onZoomInHandler,
						className: "react-flow__controls-zoomin",
						title: ariaLabelConfig["controls.zoomIn.ariaLabel"],
						"aria-label": ariaLabelConfig["controls.zoomIn.ariaLabel"],
						disabled: maxZoomReached,
						children: (0, react_jsx_runtime.jsx)(PlusIcon, {})
					}), (0, react_jsx_runtime.jsx)(ControlButton, {
						onClick: onZoomOutHandler,
						className: "react-flow__controls-zoomout",
						title: ariaLabelConfig["controls.zoomOut.ariaLabel"],
						"aria-label": ariaLabelConfig["controls.zoomOut.ariaLabel"],
						disabled: minZoomReached,
						children: (0, react_jsx_runtime.jsx)(MinusIcon, {})
					})] }),
					showFitView && (0, react_jsx_runtime.jsx)(ControlButton, {
						className: "react-flow__controls-fitview",
						onClick: onFitViewHandler,
						title: ariaLabelConfig["controls.fitView.ariaLabel"],
						"aria-label": ariaLabelConfig["controls.fitView.ariaLabel"],
						children: (0, react_jsx_runtime.jsx)(FitViewIcon, {})
					}),
					showInteractive && (0, react_jsx_runtime.jsx)(ControlButton, {
						className: "react-flow__controls-interactive",
						onClick: onToggleInteractivity,
						title: ariaLabelConfig["controls.interactive.ariaLabel"],
						"aria-label": ariaLabelConfig["controls.interactive.ariaLabel"],
						children: isInteractive ? (0, react_jsx_runtime.jsx)(UnlockIcon, {}) : (0, react_jsx_runtime.jsx)(LockIcon, {})
					}),
					children
				]
			});
		}
		ControlsComponent.displayName = "Controls";
		/**
		* The `<Controls />` component renders a small panel that contains convenient
		* buttons to zoom in, zoom out, fit the view, and lock the viewport.
		*
		* @public
		* @example
		*```tsx
		*import { ReactFlow, Controls } from '@xyflow/react'
		*
		*export default function Flow() {
		*  return (
		*    <ReactFlow nodes={[...]} edges={[...]}>
		*      <Controls />
		*    </ReactFlow>
		*  )
		*}
		*```
		*
		* @remarks To extend or customise the controls, you can use the [`<ControlButton />`](/api-reference/components/control-button) component
		*
		*/
		const Controls = (0, react.memo)(ControlsComponent);
		function MiniMapNodeComponent({ id, x, y, width, height, style, color, strokeColor, strokeWidth, className, borderRadius, shapeRendering, selected, onClick }) {
			const { background, backgroundColor } = style || {};
			const fill = color || background || backgroundColor;
			return (0, react_jsx_runtime.jsx)("rect", {
				className: cc([
					"react-flow__minimap-node",
					{ selected },
					className
				]),
				x,
				y,
				rx: borderRadius,
				ry: borderRadius,
				width,
				height,
				style: {
					fill,
					stroke: strokeColor,
					strokeWidth
				},
				shapeRendering,
				onClick: onClick ? (event) => onClick(event, id) : void 0
			});
		}
		const MiniMapNode = (0, react.memo)(MiniMapNodeComponent);
		const selectorNodeIds = (s) => s.nodes.map((node) => node.id);
		const getAttrFunction = (func) => func instanceof Function ? func : () => func;
		function MiniMapNodes({ nodeStrokeColor, nodeColor, nodeClassName = "", nodeBorderRadius = 5, nodeStrokeWidth, nodeComponent: NodeComponent = MiniMapNode, onClick }) {
			const nodeIds = useStore(selectorNodeIds, shallow$1);
			const nodeColorFunc = getAttrFunction(nodeColor);
			const nodeStrokeColorFunc = getAttrFunction(nodeStrokeColor);
			const nodeClassNameFunc = getAttrFunction(nodeClassName);
			const shapeRendering = typeof window === "undefined" || !!window.chrome ? "crispEdges" : "geometricPrecision";
			return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: nodeIds.map((nodeId) => (0, react_jsx_runtime.jsx)(NodeComponentWrapper, {
				id: nodeId,
				nodeColorFunc,
				nodeStrokeColorFunc,
				nodeClassNameFunc,
				nodeBorderRadius,
				nodeStrokeWidth,
				NodeComponent,
				onClick,
				shapeRendering
			}, nodeId)) });
		}
		function NodeComponentWrapperInner({ id, nodeColorFunc, nodeStrokeColorFunc, nodeClassNameFunc, nodeBorderRadius, nodeStrokeWidth, shapeRendering, NodeComponent, onClick }) {
			const { node, x, y, width, height } = useStore((s) => {
				const node = s.nodeLookup.get(id);
				if (!node) return {
					node: void 0,
					x: 0,
					y: 0,
					width: 0,
					height: 0
				};
				const userNode = node.internals.userNode;
				const { x, y } = node.internals.positionAbsolute;
				const { width, height } = getNodeDimensions(userNode);
				return {
					node: userNode,
					x,
					y,
					width,
					height
				};
			}, shallow$1);
			if (!node || node.hidden || !nodeHasDimensions(node)) return null;
			return (0, react_jsx_runtime.jsx)(NodeComponent, {
				x,
				y,
				width,
				height,
				style: node.style,
				selected: !!node.selected,
				className: nodeClassNameFunc(node),
				color: nodeColorFunc(node),
				borderRadius: nodeBorderRadius,
				strokeColor: nodeStrokeColorFunc(node),
				strokeWidth: nodeStrokeWidth,
				shapeRendering,
				onClick,
				id: node.id
			});
		}
		const NodeComponentWrapper = (0, react.memo)(NodeComponentWrapperInner);
		var MiniMapNodes$1 = (0, react.memo)(MiniMapNodes);
		const defaultWidth = 200;
		const defaultHeight = 150;
		const filterHidden = (node) => !node.hidden;
		const selector$1 = (s) => {
			const viewBB = {
				x: -s.transform[0] / s.transform[2],
				y: -s.transform[1] / s.transform[2],
				width: s.width / s.transform[2],
				height: s.height / s.transform[2]
			};
			return {
				viewBB,
				boundingRect: s.nodeLookup.size > 0 ? getBoundsOfRects(getInternalNodesBounds(s.nodeLookup, { filter: filterHidden }), viewBB) : viewBB,
				rfId: s.rfId,
				panZoom: s.panZoom,
				translateExtent: s.translateExtent,
				flowWidth: s.width,
				flowHeight: s.height,
				ariaLabelConfig: s.ariaLabelConfig
			};
		};
		const rectEqual = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
		const areEqual = (a, b) => rectEqual(a.viewBB, b.viewBB) && rectEqual(a.boundingRect, b.boundingRect) && a.rfId === b.rfId && a.panZoom === b.panZoom && a.translateExtent === b.translateExtent && a.flowWidth === b.flowWidth && a.flowHeight === b.flowHeight && a.ariaLabelConfig === b.ariaLabelConfig;
		const ARIA_LABEL_KEY = "react-flow__minimap-desc";
		function MiniMapComponent({ style, className, nodeStrokeColor, nodeColor, nodeClassName = "", nodeBorderRadius = 5, nodeStrokeWidth, nodeComponent, bgColor, maskColor, maskStrokeColor, maskStrokeWidth, position = "bottom-right", onClick, onNodeClick, pannable = false, zoomable = false, ariaLabel, inversePan, zoomStep = 1, offsetScale = 5 }) {
			const store = useStoreApi();
			const svg = (0, react.useRef)(null);
			const { boundingRect, viewBB, rfId, panZoom, translateExtent, flowWidth, flowHeight, ariaLabelConfig } = useStore(selector$1, areEqual);
			const elementWidth = style?.width ?? defaultWidth;
			const elementHeight = style?.height ?? defaultHeight;
			const scaledWidth = boundingRect.width / elementWidth;
			const scaledHeight = boundingRect.height / elementHeight;
			const viewScale = Math.max(scaledWidth, scaledHeight);
			const viewWidth = viewScale * elementWidth;
			const viewHeight = viewScale * elementHeight;
			const offset = offsetScale * viewScale;
			const x = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
			const y = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
			const width = viewWidth + offset * 2;
			const height = viewHeight + offset * 2;
			const labelledBy = `${ARIA_LABEL_KEY}-${rfId}`;
			const viewScaleRef = (0, react.useRef)(0);
			const minimapInstance = (0, react.useRef)();
			viewScaleRef.current = viewScale;
			(0, react.useEffect)(() => {
				if (svg.current && panZoom) {
					minimapInstance.current = XYMinimap({
						domNode: svg.current,
						panZoom,
						getTransform: () => store.getState().transform,
						getViewScale: () => viewScaleRef.current
					});
					return () => {
						minimapInstance.current?.destroy();
					};
				}
			}, [panZoom]);
			(0, react.useEffect)(() => {
				minimapInstance.current?.update({
					translateExtent,
					width: flowWidth,
					height: flowHeight,
					inversePan,
					pannable,
					zoomStep,
					zoomable
				});
			}, [
				pannable,
				zoomable,
				inversePan,
				zoomStep,
				translateExtent,
				flowWidth,
				flowHeight
			]);
			const onSvgClick = onClick ? (event) => {
				const [x, y] = minimapInstance.current?.pointer(event) || [0, 0];
				onClick(event, {
					x,
					y
				});
			} : void 0;
			const onSvgNodeClick = onNodeClick ? (0, react.useCallback)((event, nodeId) => {
				const node = store.getState().nodeLookup.get(nodeId).internals.userNode;
				onNodeClick(event, node);
			}, []) : void 0;
			const _ariaLabel = ariaLabel ?? ariaLabelConfig["minimap.ariaLabel"];
			return (0, react_jsx_runtime.jsx)(Panel, {
				position,
				style: {
					...style,
					"--xy-minimap-background-color-props": typeof bgColor === "string" ? bgColor : void 0,
					"--xy-minimap-mask-background-color-props": typeof maskColor === "string" ? maskColor : void 0,
					"--xy-minimap-mask-stroke-color-props": typeof maskStrokeColor === "string" ? maskStrokeColor : void 0,
					"--xy-minimap-mask-stroke-width-props": typeof maskStrokeWidth === "number" ? maskStrokeWidth * viewScale : void 0,
					"--xy-minimap-node-background-color-props": typeof nodeColor === "string" ? nodeColor : void 0,
					"--xy-minimap-node-stroke-color-props": typeof nodeStrokeColor === "string" ? nodeStrokeColor : void 0,
					"--xy-minimap-node-stroke-width-props": typeof nodeStrokeWidth === "number" ? nodeStrokeWidth : void 0
				},
				className: cc(["react-flow__minimap", className]),
				"data-testid": "rf__minimap",
				children: (0, react_jsx_runtime.jsxs)("svg", {
					width: elementWidth,
					height: elementHeight,
					viewBox: `${x} ${y} ${width} ${height}`,
					className: "react-flow__minimap-svg",
					role: "img",
					"aria-labelledby": labelledBy,
					ref: svg,
					onClick: onSvgClick,
					children: [
						_ariaLabel && (0, react_jsx_runtime.jsx)("title", {
							id: labelledBy,
							children: _ariaLabel
						}),
						(0, react_jsx_runtime.jsx)(MiniMapNodes$1, {
							onClick: onSvgNodeClick,
							nodeColor,
							nodeStrokeColor,
							nodeBorderRadius,
							nodeClassName,
							nodeStrokeWidth,
							nodeComponent
						}),
						(0, react_jsx_runtime.jsx)("path", {
							className: "react-flow__minimap-mask",
							d: `M${x - offset},${y - offset}h${width + offset * 2}v${height + offset * 2}h${-width - offset * 2}z
        M${viewBB.x},${viewBB.y}h${viewBB.width}v${viewBB.height}h${-viewBB.width}z`,
							fillRule: "evenodd",
							pointerEvents: "none"
						})
					]
				})
			});
		}
		MiniMapComponent.displayName = "MiniMap";
		(0, react.memo)(MiniMapComponent);
		const scaleSelector = (calculateScale) => (store) => calculateScale ? `${Math.max(1 / store.transform[2], 1)}` : void 0;
		const defaultPositions = {
			[ResizeControlVariant.Line]: "right",
			[ResizeControlVariant.Handle]: "bottom-right"
		};
		function ResizeControl({ nodeId, position, variant = ResizeControlVariant.Handle, className, style = void 0, children, color, minWidth = 10, minHeight = 10, maxWidth = Number.MAX_VALUE, maxHeight = Number.MAX_VALUE, keepAspectRatio = false, resizeDirection, autoScale = true, shouldResize, onResizeStart, onResize, onResizeEnd }) {
			const contextNodeId = useNodeId();
			const id = typeof nodeId === "string" ? nodeId : contextNodeId;
			const store = useStoreApi();
			const resizeControlRef = (0, react.useRef)(null);
			const isHandleControl = variant === ResizeControlVariant.Handle;
			const scale = useStore((0, react.useCallback)(scaleSelector(isHandleControl && autoScale), [isHandleControl, autoScale]), shallow$1);
			const resizer = (0, react.useRef)(null);
			const controlPosition = position ?? defaultPositions[variant];
			(0, react.useEffect)(() => {
				if (!resizeControlRef.current || !id) return;
				if (!resizer.current) resizer.current = XYResizer({
					domNode: resizeControlRef.current,
					nodeId: id,
					getStoreItems: () => {
						const { nodeLookup, transform, snapGrid, snapToGrid, nodeOrigin, domNode } = store.getState();
						return {
							nodeLookup,
							transform,
							snapGrid,
							snapToGrid,
							nodeOrigin,
							paneDomNode: domNode
						};
					},
					onChange: (change, childChanges) => {
						const { triggerNodeChanges, nodeLookup, parentLookup, nodeOrigin } = store.getState();
						const changes = [];
						const nextPosition = {
							x: change.x,
							y: change.y
						};
						const node = nodeLookup.get(id);
						if (node && node.expandParent && node.parentId) {
							const origin = node.origin ?? nodeOrigin;
							const width = change.width ?? node.measured.width ?? 0;
							const height = change.height ?? node.measured.height ?? 0;
							const parentExpandChanges = handleExpandParent([{
								id: node.id,
								parentId: node.parentId,
								rect: {
									width,
									height,
									...evaluateAbsolutePosition({
										x: change.x ?? node.position.x,
										y: change.y ?? node.position.y
									}, {
										width,
										height
									}, node.parentId, nodeLookup, origin)
								}
							}], nodeLookup, parentLookup, nodeOrigin);
							changes.push(...parentExpandChanges);
							nextPosition.x = change.x ? Math.max(origin[0] * width, change.x) : void 0;
							nextPosition.y = change.y ? Math.max(origin[1] * height, change.y) : void 0;
						}
						if (nextPosition.x !== void 0 && nextPosition.y !== void 0) {
							const positionChange = {
								id,
								type: "position",
								position: { ...nextPosition }
							};
							changes.push(positionChange);
						}
						if (change.width !== void 0 && change.height !== void 0) {
							const dimensionChange = {
								id,
								type: "dimensions",
								resizing: true,
								setAttributes: !resizeDirection ? true : resizeDirection === "horizontal" ? "width" : "height",
								dimensions: {
									width: change.width,
									height: change.height
								}
							};
							changes.push(dimensionChange);
						}
						for (const childChange of childChanges) {
							const positionChange = {
								...childChange,
								type: "position"
							};
							changes.push(positionChange);
						}
						triggerNodeChanges(changes);
					},
					onEnd: ({ width, height }) => {
						const dimensionChange = {
							id,
							type: "dimensions",
							resizing: false,
							dimensions: {
								width,
								height
							}
						};
						store.getState().triggerNodeChanges([dimensionChange]);
					}
				});
				resizer.current.update({
					controlPosition,
					boundaries: {
						minWidth,
						minHeight,
						maxWidth,
						maxHeight
					},
					keepAspectRatio,
					resizeDirection,
					onResizeStart,
					onResize,
					onResizeEnd,
					shouldResize
				});
				return () => {
					resizer.current?.destroy();
				};
			}, [
				controlPosition,
				minWidth,
				minHeight,
				maxWidth,
				maxHeight,
				keepAspectRatio,
				onResizeStart,
				onResize,
				onResizeEnd,
				shouldResize
			]);
			return (0, react_jsx_runtime.jsx)("div", {
				className: cc([
					"react-flow__resize-control",
					"nodrag",
					...controlPosition.split("-"),
					variant,
					className
				]),
				ref: resizeControlRef,
				style: {
					...style,
					scale,
					...color && { [isHandleControl ? "backgroundColor" : "borderColor"]: color }
				},
				children
			});
		}
		(0, react.memo)(ResizeControl);
		//#endregion
		//#region \0dsh-raw-css:C:\Users\admin\Desktop\dsh\deepseek-harness\node_modules\.pnpm\@xyflow+react@12.11.3_@type_c8ad5535bc0eee7278731c29742ea953\node_modules\@xyflow\react\dist\style.css.mjs
		const css$6 = "/* this gets exported as style.css and can be used for the default theming */\n/* these are the necessary styles for React/Svelte Flow, they get used by base.css and style.css */\n.react-flow {\n  direction: ltr;\n\n  --xy-edge-stroke-default: #b1b1b7;\n  --xy-edge-stroke-width-default: 1;\n  --xy-edge-stroke-selected-default: #555;\n\n  --xy-connectionline-stroke-default: #b1b1b7;\n  --xy-connectionline-stroke-width-default: 1;\n\n  --xy-attribution-background-color-default: rgba(255, 255, 255, 0.5);\n\n  --xy-minimap-background-color-default: #fff;\n  --xy-minimap-mask-background-color-default: rgba(240, 240, 240, 0.6);\n  --xy-minimap-mask-stroke-color-default: transparent;\n  --xy-minimap-mask-stroke-width-default: 1;\n  --xy-minimap-node-background-color-default: #e2e2e2;\n  --xy-minimap-node-stroke-color-default: transparent;\n  --xy-minimap-node-stroke-width-default: 2;\n\n  --xy-background-color-default: transparent;\n  --xy-background-pattern-dots-color-default: #91919a;\n  --xy-background-pattern-lines-color-default: #eee;\n  --xy-background-pattern-cross-color-default: #e2e2e2;\n  background-color: var(--xy-background-color, var(--xy-background-color-default));\n  --xy-node-color-default: inherit;\n  --xy-node-border-default: 1px solid #1a192b;\n  --xy-node-background-color-default: #fff;\n  --xy-node-group-background-color-default: rgba(240, 240, 240, 0.25);\n  --xy-node-boxshadow-hover-default: 0 1px 4px 1px rgba(0, 0, 0, 0.08);\n  --xy-node-boxshadow-selected-default: 0 0 0 0.5px #1a192b;\n  --xy-node-border-radius-default: 3px;\n\n  --xy-handle-background-color-default: #1a192b;\n  --xy-handle-border-color-default: #fff;\n\n  --xy-selection-background-color-default: rgba(0, 89, 220, 0.08);\n  --xy-selection-border-default: 1px dotted rgba(0, 89, 220, 0.8);\n\n  --xy-controls-button-background-color-default: #fefefe;\n  --xy-controls-button-background-color-hover-default: #f4f4f4;\n  --xy-controls-button-color-default: inherit;\n  --xy-controls-button-color-hover-default: inherit;\n  --xy-controls-button-border-color-default: #eee;\n  --xy-controls-box-shadow-default: 0 0 2px 1px rgba(0, 0, 0, 0.08);\n\n  --xy-edge-label-background-color-default: #ffffff;\n  --xy-edge-label-color-default: inherit;\n  --xy-resize-background-color-default: #3367d9;\n}\n.react-flow.dark {\n  --xy-edge-stroke-default: #3e3e3e;\n  --xy-edge-stroke-width-default: 1;\n  --xy-edge-stroke-selected-default: #727272;\n\n  --xy-connectionline-stroke-default: #b1b1b7;\n  --xy-connectionline-stroke-width-default: 1;\n\n  --xy-attribution-background-color-default: rgba(150, 150, 150, 0.25);\n\n  --xy-minimap-background-color-default: #141414;\n  --xy-minimap-mask-background-color-default: rgba(60, 60, 60, 0.6);\n  --xy-minimap-mask-stroke-color-default: transparent;\n  --xy-minimap-mask-stroke-width-default: 1;\n  --xy-minimap-node-background-color-default: #2b2b2b;\n  --xy-minimap-node-stroke-color-default: transparent;\n  --xy-minimap-node-stroke-width-default: 2;\n\n  --xy-background-color-default: #141414;\n  --xy-background-pattern-dots-color-default: #555;\n  --xy-background-pattern-lines-color-default: #333;\n  --xy-background-pattern-cross-color-default: #333;\n  --xy-node-color-default: #f8f8f8;\n  --xy-node-border-default: 1px solid #3c3c3c;\n  --xy-node-background-color-default: #1e1e1e;\n  --xy-node-group-background-color-default: rgba(240, 240, 240, 0.25);\n  --xy-node-boxshadow-hover-default: 0 1px 4px 1px rgba(255, 255, 255, 0.08);\n  --xy-node-boxshadow-selected-default: 0 0 0 0.5px #999;\n\n  --xy-handle-background-color-default: #bebebe;\n  --xy-handle-border-color-default: #1e1e1e;\n\n  --xy-selection-background-color-default: rgba(200, 200, 220, 0.08);\n  --xy-selection-border-default: 1px dotted rgba(200, 200, 220, 0.8);\n\n  --xy-controls-button-background-color-default: #2b2b2b;\n  --xy-controls-button-background-color-hover-default: #3e3e3e;\n  --xy-controls-button-color-default: #f8f8f8;\n  --xy-controls-button-color-hover-default: #fff;\n  --xy-controls-button-border-color-default: #5b5b5b;\n  --xy-controls-box-shadow-default: 0 0 2px 1px rgba(0, 0, 0, 0.08);\n\n  --xy-edge-label-background-color-default: #141414;\n  --xy-edge-label-color-default: #f8f8f8;\n}\n.react-flow__background {\n  background-color: var(--xy-background-color-props, var(--xy-background-color, var(--xy-background-color-default)));\n  pointer-events: none;\n  z-index: -1;\n}\n.react-flow__container {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  top: 0;\n  left: 0;\n}\n.react-flow__pane {\n  z-index: 1;\n  touch-action: none;\n}\n.react-flow__pane.draggable {\n    cursor: grab;\n  }\n.react-flow__pane.dragging {\n    cursor: grabbing;\n  }\n.react-flow__pane.selection {\n    cursor: pointer;\n  }\n.react-flow__viewport {\n  transform-origin: 0 0;\n  z-index: 2;\n  pointer-events: none;\n}\n.react-flow__renderer {\n  z-index: 4;\n}\n.react-flow__selection {\n  z-index: 6;\n}\n.react-flow__nodesselection-rect:focus,\n.react-flow__nodesselection-rect:focus-visible {\n  outline: none;\n}\n.react-flow__edge-path {\n  stroke: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n  stroke-width: var(--xy-edge-stroke-width, var(--xy-edge-stroke-width-default));\n  fill: none;\n}\n.react-flow__connection-path {\n  stroke: var(--xy-connectionline-stroke, var(--xy-connectionline-stroke-default));\n  stroke-width: var(--xy-connectionline-stroke-width, var(--xy-connectionline-stroke-width-default));\n  fill: none;\n}\n.react-flow .react-flow__edges {\n  position: absolute;\n}\n.react-flow .react-flow__edges svg {\n    overflow: visible;\n    position: absolute;\n    pointer-events: none;\n  }\n.react-flow__edge {\n  pointer-events: visibleStroke;\n}\n.react-flow__edge.selectable {\n    cursor: pointer;\n  }\n.react-flow__edge.animated path {\n    stroke-dasharray: 5;\n    animation: dashdraw 0.5s linear infinite;\n  }\n.react-flow__edge.animated path.react-flow__edge-interaction {\n    stroke-dasharray: none;\n    animation: none;\n  }\n.react-flow__edge.inactive {\n    pointer-events: none;\n  }\n.react-flow__edge.selected,\n  .react-flow__edge:focus,\n  .react-flow__edge:focus-visible {\n    outline: none;\n  }\n.react-flow__edge.selected .react-flow__edge-path,\n  .react-flow__edge.selectable:focus .react-flow__edge-path,\n  .react-flow__edge.selectable:focus-visible .react-flow__edge-path {\n    stroke: var(--xy-edge-stroke-selected, var(--xy-edge-stroke-selected-default));\n  }\n.react-flow__edge-textwrapper {\n    pointer-events: all;\n  }\n.react-flow__edge .react-flow__edge-text {\n    pointer-events: none;\n    -webkit-user-select: none;\n       -moz-user-select: none;\n            user-select: none;\n  }\n/* Arrowhead marker styles - use CSS custom properties as default */\n.react-flow__arrowhead polyline {\n  stroke: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n}\n.react-flow__arrowhead polyline.arrowclosed {\n  fill: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n}\n.react-flow__connection {\n  pointer-events: none;\n}\n.react-flow__connection .animated {\n    stroke-dasharray: 5;\n    animation: dashdraw 0.5s linear infinite;\n  }\nsvg.react-flow__connectionline {\n  z-index: 1001;\n  overflow: visible;\n  position: absolute;\n}\n.react-flow__nodes {\n  pointer-events: none;\n  transform-origin: 0 0;\n}\n.react-flow__node {\n  position: absolute;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  pointer-events: all;\n  transform-origin: 0 0;\n  box-sizing: border-box;\n  cursor: default;\n}\n.react-flow__node.selectable {\n    cursor: pointer;\n  }\n.react-flow__node.draggable {\n    cursor: grab;\n    pointer-events: all;\n  }\n.react-flow__node.draggable.dragging {\n      cursor: grabbing;\n    }\n.react-flow__nodesselection {\n  z-index: 3;\n  transform-origin: left top;\n  pointer-events: none;\n}\n.react-flow__nodesselection-rect {\n    position: absolute;\n    pointer-events: all;\n    cursor: grab;\n  }\n.react-flow__handle {\n  position: absolute;\n  pointer-events: none;\n  min-width: 5px;\n  min-height: 5px;\n  width: 6px;\n  height: 6px;\n  background-color: var(--xy-handle-background-color, var(--xy-handle-background-color-default));\n  border: 1px solid var(--xy-handle-border-color, var(--xy-handle-border-color-default));\n  border-radius: 100%;\n}\n.react-flow__handle.connectingfrom {\n    pointer-events: all;\n  }\n.react-flow__handle.connectionindicator {\n    pointer-events: all;\n    cursor: crosshair;\n  }\n.react-flow__handle-bottom {\n    top: auto;\n    left: 50%;\n    bottom: 0;\n    transform: translate(-50%, 50%);\n  }\n.react-flow__handle-top {\n    top: 0;\n    left: 50%;\n    transform: translate(-50%, -50%);\n  }\n.react-flow__handle-left {\n    top: 50%;\n    left: 0;\n    transform: translate(-50%, -50%);\n  }\n.react-flow__handle-right {\n    top: 50%;\n    right: 0;\n    transform: translate(50%, -50%);\n  }\n.react-flow__edgeupdater {\n  cursor: move;\n  pointer-events: all;\n}\n.react-flow__pane.selection .react-flow__panel {\n  pointer-events: none;\n}\n.react-flow__panel {\n  position: absolute;\n  z-index: 5;\n  margin: 15px;\n}\n.react-flow__panel.top {\n    top: 0;\n  }\n.react-flow__panel.bottom {\n    bottom: 0;\n  }\n.react-flow__panel.top.center, .react-flow__panel.bottom.center {\n      left: 50%;\n      transform: translateX(-15px) translateX(-50%);\n    }\n.react-flow__panel.left {\n    left: 0;\n  }\n.react-flow__panel.right {\n    right: 0;\n  }\n.react-flow__panel.left.center, .react-flow__panel.right.center {\n      top: 50%;\n      transform: translateY(-15px) translateY(-50%);\n    }\n.react-flow__attribution {\n  font-size: 10px;\n  background: var(--xy-attribution-background-color, var(--xy-attribution-background-color-default));\n  padding: 2px 3px;\n  margin: 0;\n}\n.react-flow__attribution a {\n    text-decoration: none;\n    color: #999;\n  }\n@keyframes dashdraw {\n  from {\n    stroke-dashoffset: 10;\n  }\n}\n.react-flow__edgelabel-renderer {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  left: 0;\n  top: 0;\n}\n.react-flow__viewport-portal {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  left: 0;\n  top: 0;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n}\n.react-flow__minimap {\n  background: var(\n    --xy-minimap-background-color-props,\n    var(--xy-minimap-background-color, var(--xy-minimap-background-color-default))\n  );\n}\n.react-flow__minimap-svg {\n    display: block;\n  }\n.react-flow__minimap-mask {\n    fill: var(\n      --xy-minimap-mask-background-color-props,\n      var(--xy-minimap-mask-background-color, var(--xy-minimap-mask-background-color-default))\n    );\n    stroke: var(\n      --xy-minimap-mask-stroke-color-props,\n      var(--xy-minimap-mask-stroke-color, var(--xy-minimap-mask-stroke-color-default))\n    );\n    stroke-width: var(\n      --xy-minimap-mask-stroke-width-props,\n      var(--xy-minimap-mask-stroke-width, var(--xy-minimap-mask-stroke-width-default))\n    );\n  }\n.react-flow__minimap-node {\n    fill: var(\n      --xy-minimap-node-background-color-props,\n      var(--xy-minimap-node-background-color, var(--xy-minimap-node-background-color-default))\n    );\n    stroke: var(\n      --xy-minimap-node-stroke-color-props,\n      var(--xy-minimap-node-stroke-color, var(--xy-minimap-node-stroke-color-default))\n    );\n    stroke-width: var(\n      --xy-minimap-node-stroke-width-props,\n      var(--xy-minimap-node-stroke-width, var(--xy-minimap-node-stroke-width-default))\n    );\n  }\n.react-flow__background-pattern.dots {\n    fill: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-dots-color-default))\n    );\n  }\n.react-flow__background-pattern.lines {\n    stroke: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-lines-color-default))\n    );\n  }\n.react-flow__background-pattern.cross {\n    stroke: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-cross-color-default))\n    );\n  }\n.react-flow__controls {\n  display: flex;\n  flex-direction: column;\n  box-shadow: var(--xy-controls-box-shadow, var(--xy-controls-box-shadow-default));\n}\n.react-flow__controls.horizontal {\n    flex-direction: row;\n  }\n.react-flow__controls-button {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    height: 26px;\n    width: 26px;\n    padding: 4px;\n    border: none;\n    background: var(--xy-controls-button-background-color, var(--xy-controls-button-background-color-default));\n    border-bottom: 1px solid\n      var(\n        --xy-controls-button-border-color-props,\n        var(--xy-controls-button-border-color, var(--xy-controls-button-border-color-default))\n      );\n    color: var(\n      --xy-controls-button-color-props,\n      var(--xy-controls-button-color, var(--xy-controls-button-color-default))\n    );\n    cursor: pointer;\n    -webkit-user-select: none;\n       -moz-user-select: none;\n            user-select: none;\n  }\n.react-flow__controls-button svg {\n      width: 100%;\n      max-width: 12px;\n      max-height: 12px;\n      fill: currentColor;\n    }\n.react-flow__edge.updating .react-flow__edge-path {\n      stroke: #777;\n    }\n.react-flow__edge-text {\n    font-size: 10px;\n  }\n.react-flow__node.selectable:focus,\n  .react-flow__node.selectable:focus-visible {\n    outline: none;\n  }\n.react-flow__node-input,\n.react-flow__node-default,\n.react-flow__node-output,\n.react-flow__node-group {\n  padding: 10px;\n  border-radius: var(--xy-node-border-radius, var(--xy-node-border-radius-default));\n  width: 150px;\n  font-size: 12px;\n  color: var(--xy-node-color, var(--xy-node-color-default));\n  text-align: center;\n  border: var(--xy-node-border, var(--xy-node-border-default));\n  background-color: var(--xy-node-background-color, var(--xy-node-background-color-default));\n}\n.react-flow__node-input.selectable:hover, .react-flow__node-default.selectable:hover, .react-flow__node-output.selectable:hover, .react-flow__node-group.selectable:hover {\n      box-shadow: var(--xy-node-boxshadow-hover, var(--xy-node-boxshadow-hover-default));\n    }\n.react-flow__node-input.selectable.selected,\n    .react-flow__node-input.selectable:focus,\n    .react-flow__node-input.selectable:focus-visible,\n    .react-flow__node-default.selectable.selected,\n    .react-flow__node-default.selectable:focus,\n    .react-flow__node-default.selectable:focus-visible,\n    .react-flow__node-output.selectable.selected,\n    .react-flow__node-output.selectable:focus,\n    .react-flow__node-output.selectable:focus-visible,\n    .react-flow__node-group.selectable.selected,\n    .react-flow__node-group.selectable:focus,\n    .react-flow__node-group.selectable:focus-visible {\n      box-shadow: var(--xy-node-boxshadow-selected, var(--xy-node-boxshadow-selected-default));\n    }\n.react-flow__node-group {\n  background-color: var(--xy-node-group-background-color, var(--xy-node-group-background-color-default));\n}\n.react-flow__nodesselection-rect,\n.react-flow__selection {\n  background: var(--xy-selection-background-color, var(--xy-selection-background-color-default));\n  border: var(--xy-selection-border, var(--xy-selection-border-default));\n}\n.react-flow__nodesselection-rect:focus,\n  .react-flow__nodesselection-rect:focus-visible,\n  .react-flow__selection:focus,\n  .react-flow__selection:focus-visible {\n    outline: none;\n  }\n.react-flow__controls-button:hover {\n      background: var(\n        --xy-controls-button-background-color-hover-props,\n        var(--xy-controls-button-background-color-hover, var(--xy-controls-button-background-color-hover-default))\n      );\n      color: var(\n        --xy-controls-button-color-hover-props,\n        var(--xy-controls-button-color-hover, var(--xy-controls-button-color-hover-default))\n      );\n    }\n.react-flow__controls-button:disabled {\n      pointer-events: none;\n    }\n.react-flow__controls-button:disabled svg {\n        fill-opacity: 0.4;\n      }\n.react-flow__controls-button:last-child {\n    border-bottom: none;\n  }\n.react-flow__controls.horizontal .react-flow__controls-button {\n    border-bottom: none;\n    border-right: 1px solid\n      var(\n        --xy-controls-button-border-color-props,\n        var(--xy-controls-button-border-color, var(--xy-controls-button-border-color-default))\n      );\n  }\n.react-flow__controls.horizontal .react-flow__controls-button:last-child {\n    border-right: none;\n  }\n.react-flow__resize-control {\n  position: absolute;\n}\n.react-flow__resize-control.left,\n.react-flow__resize-control.right {\n  cursor: ew-resize;\n}\n.react-flow__resize-control.top,\n.react-flow__resize-control.bottom {\n  cursor: ns-resize;\n}\n.react-flow__resize-control.top.left,\n.react-flow__resize-control.bottom.right {\n  cursor: nwse-resize;\n}\n.react-flow__resize-control.bottom.left,\n.react-flow__resize-control.top.right {\n  cursor: nesw-resize;\n}\n/* handle styles */\n.react-flow__resize-control.handle {\n  width: 5px;\n  height: 5px;\n  border: 1px solid #fff;\n  border-radius: 1px;\n  background-color: var(--xy-resize-background-color, var(--xy-resize-background-color-default));\n  translate: -50% -50%;\n}\n.react-flow__resize-control.handle.left {\n  left: 0;\n  top: 50%;\n}\n.react-flow__resize-control.handle.right {\n  left: 100%;\n  top: 50%;\n}\n.react-flow__resize-control.handle.top {\n  left: 50%;\n  top: 0;\n}\n.react-flow__resize-control.handle.bottom {\n  left: 50%;\n  top: 100%;\n}\n.react-flow__resize-control.handle.top.left {\n  left: 0;\n}\n.react-flow__resize-control.handle.bottom.left {\n  left: 0;\n}\n.react-flow__resize-control.handle.top.right {\n  left: 100%;\n}\n.react-flow__resize-control.handle.bottom.right {\n  left: 100%;\n}\n/* line styles */\n.react-flow__resize-control.line {\n  border-color: var(--xy-resize-background-color, var(--xy-resize-background-color-default));\n  border-width: 0;\n  border-style: solid;\n}\n.react-flow__resize-control.line.left,\n.react-flow__resize-control.line.right {\n  width: 1px;\n  transform: translate(-50%, 0);\n  top: 0;\n  height: 100%;\n}\n.react-flow__resize-control.line.left {\n  left: 0;\n  border-left-width: 1px;\n}\n.react-flow__resize-control.line.right {\n  left: 100%;\n  border-right-width: 1px;\n}\n.react-flow__resize-control.line.top,\n.react-flow__resize-control.line.bottom {\n  height: 1px;\n  transform: translate(0, -50%);\n  left: 0;\n  width: 100%;\n}\n.react-flow__resize-control.line.top {\n  top: 0;\n  border-top-width: 1px;\n}\n.react-flow__resize-control.line.bottom {\n  border-bottom-width: 1px;\n  top: 100%;\n}\n.react-flow__edge-textbg {\n  fill: var(--xy-edge-label-background-color, var(--xy-edge-label-background-color-default));\n}\n.react-flow__edge-text {\n  fill: var(--xy-edge-label-color, var(--xy-edge-label-color-default));\n}\n";
		const tagId$6 = "dsh-stcs/raw";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/graph.ts
		/** Fixed graph-card dimensions; layout spacing must leave room around them. */
		const EXPLORE_NODE_SIZE = {
			width: 236,
			height: 120
		};
		const ASSET_NODE_SIZE = {
			width: 220,
			height: 100
		};
		/** The chain edge kinds (parent edges belong to the asset graph only). */
		const CHAIN_EDGE_KINDS = new Set([
			"spawns",
			"yields",
			"derived_from",
			"proves"
		]);
		/** Assign every reachable id a BFS depth from the roots; others hang below. */
		function depthsOf(roots, edges) {
			const depth = /* @__PURE__ */ new Map();
			const queue = [];
			for (const root of roots) {
				depth.set(root, 0);
				queue.push({
					id: root,
					level: 0
				});
			}
			for (const { id, level } of queue) for (const edge of edges) {
				if (edge.sourceId !== id || depth.has(edge.targetId)) continue;
				depth.set(edge.targetId, level + 1);
				queue.push({
					id: edge.targetId,
					level: level + 1
				});
			}
			return depth;
		}
		/** Stack items into columns by depth, assigning x/y positions. */
		function stackByDepth(items, depth, columnGap, rowGap) {
			const maxDepth = Math.max(0, ...depth.values());
			const rows = /* @__PURE__ */ new Map();
			for (const item of items) {
				const level = depth.get(item.id) ?? maxDepth + 1;
				const row = rows.get(level) ?? [];
				row.push(item);
				rows.set(level, row);
			}
			const placed = [];
			for (const [level, row] of [...rows.entries()].sort((a, b) => a[0] - b[0])) for (const [index, item] of row.entries()) placed.push({
				...item,
				x: level * columnGap,
				y: index * rowGap
			});
			return placed;
		}
		/** The display title of one folded node. */
		function titleOf(node) {
			switch (node.kind) {
				case "intent": return node.title;
				case "fact": return node.detail;
				case "finding": return node.title;
				// [local patch 2026-10-19] 压缩节点
				case "digest": return node.title;
			}
			return "";
		}
		/** The display detail line of one folded node. */
		function detailOf(node) {
			switch (node.kind) {
				case "intent": return node.detail !== void 0 && node.detail !== null && String(node.detail).trim() !== "" ? node.detail : (node.doneWhen || "");
				case "fact": return `${node.target === "" ? "" : `${node.target} `}[${node.factKind}] · ${node.confidence}`;
				case "finding": return node.description;
				// [local patch 2026-10-19] 压缩节点：显示折叠了多少条
				case "digest": return node.detail;
			}
			return "";
		}
		/**
		* Layered layout of the exploration chain: the goal at column 0, every node
		* one column per hop along its chain edges; nodes unreachable from the goal
		* hang in the last column. Parent edges are excluded.
		* @param projection - the standing pentest projection.
		* @returns the placed nodes and their chain edges.
		*/
		function normalizeLineageProjection(projection) {
			// Phase 4: the v3 ViewModel is the only read/lineage model. The browser
			// must not repair, collapse or re-derive lineage again.
			return projection;
		}

		function layoutExploration(projection) {
			const normalized = normalizeLineageProjection(projection);
			const rawEdges = normalized.edges.filter((edge) => CHAIN_EDGE_KINDS.has(edge.kind));
			const nodeById = new Map(normalized.nodes.map((node) => [node.id, node]));
			const factIds = new Set(normalized.nodes.filter((node) => node.kind === "fact").map((node) => node.id));
			// Assets belong to the 资产 tab; rendering them here produces blank
			// diamond cards (they have no intent/fact title fields).
			const assetIds = new Set(normalized.nodes.filter((node) => node.kind === "asset").map((node) => node.id));
			// [local patch 2026-10-25] 探索链路不再渲染事实：先从未过滤的边里
			// 提取 digest/intent 关系，再把 fact 节点和所有 fact 边一次性移除。
			const digestLinks = [];
			for (const digest of normalized.nodes) {
				if (digest.kind !== "digest") continue;
				const members = new Set(Array.isArray(digest.factIds) ? digest.factIds : (Array.isArray(digest.memberIds) ? digest.memberIds : []));
				const sources = new Set();
				for (const edge of rawEdges) {
					if (edge.kind !== "yields" || !members.has(edge.targetId)) continue;
					const source = nodeById.get(edge.sourceId);
					if (source?.kind === "intent") sources.add(edge.sourceId);
				}
				for (const sourceId of sources) {
					digestLinks.push({
						id: "fast-digest-link-" + digest.id + "-" + sourceId,
						kind: "yields",
						sourceId,
						targetId: digest.id,
						createdAt: Number(digest.createdAt) || 0
					});
				}
			}
			const chainLinks = [];
			for (const factId of factIds) {
				const sources = rawEdges.filter((edge) => edge.kind === "yields" && edge.targetId === factId && nodeById.get(edge.sourceId)?.kind === "intent");
				const targets = rawEdges.filter((edge) => edge.kind === "derived_from" && edge.sourceId === factId && nodeById.get(edge.targetId)?.kind === "intent");
				for (const source of sources) for (const target of targets) {
					chainLinks.push({
						id: "fast-intent-link-" + factId + "-" + source.sourceId + "-" + target.targetId,
						kind: "derived_from",
						sourceId: source.sourceId,
						targetId: target.targetId,
						createdAt: Number(target.createdAt) || 0
					});
				}
			}
			const edges = rawEdges.filter((edge) => !factIds.has(edge.sourceId) && !factIds.has(edge.targetId) && !assetIds.has(edge.sourceId) && !assetIds.has(edge.targetId)).concat(digestLinks, chainLinks);
			const nodes = normalized.nodes.filter((node) => node.kind !== "fact" && node.kind !== "asset" && !(node.kind === "intent" && node.intentKind === "planner"));
			const goalId = projection.goal === null || projection.goal === void 0 ? "goal-1" : projection.goal.id;
			const depth = depthsOf([goalId], edges);
			return {
				nodes: stackByDepth([{
					id: goalId,
					kind: "goal",
					title: projection.goal === null ? "" : projection.goal.target,
					detail: projection.goal === null ? "" : projection.goal.objective,
					severity: void 0,
					x: 0,
					y: 0
				}, ...nodes.map((node) => ({
					id: node.id,
					kind: node.kind,
					title: titleOf(node),
					detail: detailOf(node),
					severity: node.kind === "finding" ? node.severity : void 0,
					// [local patch 2026-10-25] digest 的成员/时间字段必须活着穿过布局，
					// 否则压缩卡片既显示「0 条事实」，也补不出 intent→digest 的边。
					...(node.kind === "digest" ? {
						factIds: Array.isArray(node.factIds) ? node.factIds : [],
						memberIds: Array.isArray(node.memberIds) ? node.memberIds : [],
						createdAt: Number(node.createdAt) || 0
					} : {})
				}))], depth, 320, 236),
				edges
			};
		}
		/**
		* Layered layout of the asset graph: roots (assets without a parent edge) at
		* column 0, children one column deeper per parent hop.
		* @param projection - the standing pentest projection.
		* @returns the placed asset nodes and their parent edges.
		*/
		// [local patch 2026-10-19] 资产覆盖图：力导向布局 + 已测/未测三态 + 折叠。
		// 原来资产图是分层树（父→子排成一列一列），资产一多就拉成长条；
		// 改成 ARTEX 那种力导向：节点是圆的，连线是父子关系，没测过的灰掉。
		/**
		 * 简易力导向（Fruchterman-Reingold 变体）。
		 * 斥力 O(n²)，所以只在 n 小的时候全量算；n 大就自动降迭代次数。
		 */
		function layoutForce(assets, parentEdges) {
			const n = assets.length;
			if (n === 0) return [];
			const index = new Map();
			assets.forEach((a, i) => index.set(a.id, i));
			// 初始：按类型分环，避免全挤在原点
			const typeOrder = ["root-domain", "subdomain", "ip", "service", "app", "endpoint"];
			const pos = assets.map((a, i) => {
				const ti = Math.max(0, typeOrder.indexOf(a.type));
				const ring = n <= 60 ? 480 + ti * 190 : 120 + ti * 130;
				const sameType = assets.filter((x) => x.type === a.type).length || 1;
				const k = assets.slice(0, i).filter((x) => x.type === a.type).length;
				const ang = (k / sameType) * Math.PI * 2 + ti * 0.7;
				return { x: Math.cos(ang) * ring, y: Math.sin(ang) * ring * 0.62 };
			});
			const links = [];
			for (const e of parentEdges) {
				const a = index.get(e.sourceId);
				const b = index.get(e.targetId);
				if (a !== void 0 && b !== void 0) links.push([a, b]);
			}
			// 每个节点的碰撞半径：圆半径 + 标签占位（标签比圆宽，所以横向要多留）
			const radii = assets.map((a) => {
				const size = a.foldCount > 0 ? 26 : (ASSET_NODE_SIZE_BY_TYPE[a.type] || 24);
				return size / 2 + 22;
			});
			const vel = pos.map(() => ({ x: 0, y: 0 }));
			const ITER = n > 260 ? 110 : n > 140 ? 160 : n > 60 ? 220 : 280;
			// [local patch 2026-10-19] 小图（<60）之前也用 38000/180，弹簧把节点全拉到 180px，
			// 5 个节点挤在 400x300 里，fitView 放大后看着像「缩在角落」。按规模分档。
			const REPULSE = n > 200 ? 60000 : n > 60 ? 38000 : 150000;
			const SPRING = n > 60 ? 0.012 : 0.008;
			const REST = n > 200 ? 150 : n > 60 ? 180 : 340;
			for (let it = 0; it < ITER; it++) {
				const cool = 1 - it / ITER;
				for (let i = 0; i < n; i++) {
					for (let j = i + 1; j < n; j++) {
						let dx = pos[i].x - pos[j].x;
						let dy = pos[i].y - pos[j].y;
						let d2 = dx * dx + dy * dy;
						if (d2 < 4) {
							dx = (i % 7 - 3) * 0.6 + 0.31;
							dy = (j % 7 - 3) * 0.6 + 0.27;
							d2 = dx * dx + dy * dy || 1;
						}
						const wi = assets[i].type === "endpoint" || assets[i].foldCount > 0 ? 0.35 : 1;
						const wj = assets[j].type === "endpoint" || assets[j].foldCount > 0 ? 0.35 : 1;
						const f = ((REPULSE * cool) / d2) * wi * wj;
						const d = Math.sqrt(d2);
						const fx = (dx / d) * f;
						const fy = (dy / d) * f;
						vel[i].x += fx; vel[i].y += fy;
						vel[j].x -= fx; vel[j].y -= fy;
					}
				}
				for (const [a, b] of links) {
					const dx = pos[b].x - pos[a].x;
					const dy = pos[b].y - pos[a].y;
					const d = Math.sqrt(dx * dx + dy * dy) || 1;
					const si = assets[a];
					const sj = assets[b];
					const rootLike = (x) => x.type === "root-domain" || x.type === "subdomain";
					const rest = rootLike(si) || rootLike(sj) ? REST * 1.55 : REST;
					const f = (d - rest) * SPRING;
					const fx = (dx / d) * f;
					const fy = (dy / d) * f;
					vel[a].x += fx; vel[a].y += fy;
					vel[b].x -= fx; vel[b].y -= fy;
				}
				for (let i = 0; i < n; i++) {
					vel[i].x = (vel[i].x - pos[i].x * 0.0078) * 0.82;
					vel[i].y = (vel[i].y - pos[i].y * 0.0078) * 0.82;
					pos[i].x += vel[i].x;
					pos[i].y += vel[i].y;
				}
				// [照 ARTEX d3-force 的 collide] 硬性推开重叠节点：
				// 半径取 (节点尺寸/2 + 标签半宽)，保证圆和圆下面的标签都不打架。
				for (let i = 0; i < n; i++) {
					for (let j = i + 1; j < n; j++) {
						let dx = pos[j].x - pos[i].x;
						let dy = pos[j].y - pos[i].y;
						let d = Math.sqrt(dx * dx + dy * dy);
						if (d < 0.01) { dx = 0.6; dy = 0.35; d = 0.7; }
						const minD = radii[i] + radii[j] + 10;
						if (d < minD) {
							const push = (minD - d) / 2;
							const ux = dx / d;
							const uy = dy / d;
							pos[i].x -= ux * push;
							pos[i].y -= uy * push;
							pos[j].x += ux * push;
							pos[j].y += uy * push;
						}
					}
				}
			}
			// 收尾：迭代里力和碰撞互相拉扯，结束时可能还有几对挨着。
			// 这里只推不拉，跑几轮直到没有重叠（不折叠时节点多，这步很关键）。
			for (let pass = 0; pass < 40; pass++) {
				let moved = false;
				for (let i = 0; i < n; i++) {
					for (let j = i + 1; j < n; j++) {
						let dx = pos[j].x - pos[i].x;
						let dy = pos[j].y - pos[i].y;
						let d = Math.sqrt(dx * dx + dy * dy);
						if (d < 0.01) { dx = 0.6; dy = 0.35; d = 0.7; }
						const minD = radii[i] + radii[j] + 10;
						if (d >= minD) continue;
						moved = true;
						const push = (minD - d) / 2 + 0.5;
						const ux = dx / d;
						const uy = dy / d;
						pos[i].x -= ux * push;
						pos[i].y -= uy * push;
						pos[j].x += ux * push;
						pos[j].y += uy * push;
					}
				}
				if (!moved) break;
			}
			return pos;
		}
		/** 哪些资产算「已测」：被 finding 指名，或被 fact 的 target 提到过。 */
		function testedAssetIds(projection) {
			const out = new Set();
			const byValue = new Map();
			for (const a of projection.assets) if (typeof a.value === "string" && a.value !== "") byValue.set(a.value, a.id);
			for (const node of projection.nodes) {
				if (node.kind === "finding") {
					if (typeof node.affectedAssetId === "string" && node.affectedAssetId !== "") out.add(node.affectedAssetId);
					continue;
				}
				if (node.kind !== "fact") continue;
				const target = String(node.target || "");
				if (target === "") continue;
				const direct = byValue.get(target);
				if (direct !== void 0) { out.add(direct); continue; }
				for (const [v, id] of byValue) {
					if (v.length >= 6 && target.indexOf(v) >= 0) { out.add(id); break; }
				}
			}
			return out;
		}
		/**
		 * 同类型超过 limit 个就折叠成一个「还有 N 个」节点（ARTEX 那种 [...]）。
		 * 返回 foldMap：被折叠资产 id → 折叠节点 id。这一步是必须的 ——
		 * 否则指向被折叠资产的边会因为「节点不存在」被 ReactFlow 整条丢掉，图上就没线了。
		 */
		// 不折叠：资产图显示全部节点（用户要求）。阈值调大等于关闭折叠。
		const ASSET_FOLD_LIMIT = 99999;
		// [照 ARTEX] 点「展示更多」时每次多放出来多少个
		const ASSET_FOLD_STEP = 20;
		function foldAssets(rows, limit) {
			const cap = limit === void 0 ? ASSET_FOLD_LIMIT : limit;
			const byType = new Map();
			for (const r of rows) {
				if (!byType.has(r.type)) byType.set(r.type, []);
				byType.get(r.type).push(r);
			}
			const out = [];
			const foldMap = new Map();
			const hidden = new Map();
			for (const [type, list] of byType) {
				if (list.length <= cap) {
					for (const r of list) out.push({ ...r, foldCount: 0 });
					continue;
				}
				for (const r of list.slice(0, cap)) out.push({ ...r, foldCount: 0 });
				const rest = list.slice(cap);
				const foldId = "__fold__" + type;
				for (const r of rest) foldMap.set(r.id, foldId);
				hidden.set(type, rest);
				out.push({ id: foldId, type: type, value: "", meta: "", parentValue: "", foldCount: rest.length });
			}
			return { nodes: out, foldMap: foldMap, hidden: hidden };
		}
		/** 把边的两端重定向到折叠节点，避免边因为端点消失被丢弃。 */
		function redirectEdges(parentEdges, foldMap) {
			if (foldMap.size === 0) return parentEdges;
			const out = [];
			for (const e of parentEdges) {
				const sourceId = foldMap.get(e.sourceId) || e.sourceId;
				const targetId = foldMap.get(e.targetId) || e.targetId;
				if (sourceId === targetId) continue;
				out.push(sourceId === e.sourceId && targetId === e.targetId ? e : {
					id: e.id + "-f",
					kind: e.kind,
					sourceId: sourceId,
					targetId: targetId
				});
			}
			return out;
		}
		function layoutAssets(projection) {
			const edges = projection.edges.filter((edge) => edge.kind === "parent");
			const children = new Set(edges.map((edge) => edge.targetId));
			const depth = depthsOf(projection.assets.filter((asset) => !children.has(asset.id)).map((asset) => asset.id), edges);
			return {
				nodes: stackByDepth(projection.assets, depth, 292, 132),
				edges
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\GraphDetailDrawer.module.css.mjs
		const css$5 = ".HGDNsa_layer{z-index:10;position:absolute;inset:0}.HGDNsa_backdrop{cursor:default;background:#0000002e;border:0;width:100%;position:absolute;inset:0}.HGDNsa_drawer{border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex-direction:column;width:min(360px,88%);display:flex;position:absolute;top:0;bottom:0;right:0;box-shadow:-8px 0 24px #00000024}.HGDNsa_header{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:flex-start;gap:12px;padding:16px;display:flex}.HGDNsa_title{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-primary);flex:auto;margin:0;font-size:15px;line-height:22px}.HGDNsa_close{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:4px;flex:none;padding:0;font-size:22px;line-height:28px}.HGDNsa_close:hover,.HGDNsa_close:focus-visible{background:var(--dsw-alias-bg-layer-2);outline:none}.HGDNsa_fields{flex-direction:column;gap:14px;margin:0;padding:16px;display:flex;overflow-y:auto}.HGDNsa_field{flex-direction:column;gap:4px;display:flex}.HGDNsa_field dt{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.HGDNsa_field dd{white-space:pre-line;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin:0;font-size:13px;line-height:20px}";
		const tagId$5 = "dsh-stcs/GraphDetailDrawer.module.css";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var GraphDetailDrawer_module_css_default = {
			"drawer": "HGDNsa_drawer",
			"layer": "HGDNsa_layer",
			"fields": "HGDNsa_fields",
			"field": "HGDNsa_field",
			"header": "HGDNsa_header",
			"close": "HGDNsa_close",
			"backdrop": "HGDNsa_backdrop",
			"title": "HGDNsa_title"
		};
		//#endregion
		//#region src/client/GraphDetailDrawer.tsx
		/** A graph-scoped right drawer that keeps complete node data available. */
		function GraphDetailDrawer({ title, fields, onClose, actions }) {
			(0, react.useEffect)(() => {
				const closeOnEscape = (event) => {
					if (event.key === "Escape") onClose();
				};
				window.addEventListener("keydown", closeOnEscape);
				return () => {
					window.removeEventListener("keydown", closeOnEscape);
				};
			}, [onClose]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: GraphDetailDrawer_module_css_default.layer,
				"data-testid": "graph-detail-drawer",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: GraphDetailDrawer_module_css_default.backdrop,
					"aria-hidden": "true",
					tabIndex: -1,
					onClick: onClose
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
					className: GraphDetailDrawer_module_css_default.drawer,
					"aria-label": "节点详情",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: GraphDetailDrawer_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: GraphDetailDrawer_module_css_default.title,
							children: title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: GraphDetailDrawer_module_css_default.close,
							"aria-label": "关闭详情",
							onClick: onClose,
							children: "×"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: GraphDetailDrawer_module_css_default.fields,
						children: fields.filter((field) => field.value !== "").map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GraphDetailDrawer_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: field.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: field.value })]
						}, field.label))
					})
					, actions !== void 0 && actions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { style: { flex: "none", marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 16px 16px", borderTop: "1px solid var(--dsw-alias-border-l2)" }, children: actions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { type: "button", onClick: action.onClick, style: { cursor: "pointer", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)", color: "var(--dsw-alias-label-primary)", padding: "6px 12px", fontSize: 13 }, children: action.label }, action.label)) })]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\AssetsView.module.css.mjs
		const css$4 = "._5Empva_root{flex-direction:column;flex:auto;gap:10px;min-height:0;display:flex}._5Empva_modeBar{flex:none;gap:4px;display:flex}._5Empva_modeButton{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:999px;padding:4px 12px;font-size:12px;line-height:20px}._5Empva_modeButton:hover{color:var(--dsw-alias-label-secondary)}._5Empva_modeButton[aria-pressed=true]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);font-weight:600}._5Empva_list{flex-direction:column;flex:auto;gap:12px;display:flex;overflow-y:auto}._5Empva_group{flex-direction:column;gap:4px;min-width:0;display:flex}._5Empva_groupTitle{color:var(--dsw-alias-label-tertiary);margin:0;padding-left:2px;font-size:12px;font-weight:600;line-height:20px}._5Empva_rows{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}._5Empva_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;align-items:baseline;gap:8px;min-width:0;padding:6px 10px;font-size:13px;line-height:20px;display:flex}._5Empva_rowValue{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-weight:500}._5Empva_rowMeta{color:var(--dsw-alias-label-tertiary)}._5Empva_rowParent{color:var(--dsw-alias-label-caption)}._5Empva_graph{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex:auto;min-height:320px;position:relative;overflow:hidden}._5Empva_graph .react-flow__controls{border:1px solid var(--dsw-alias-border-l2);box-shadow:none;background:var(--dsw-alias-bg-layer-1);border-radius:6px;overflow:hidden}._5Empva_graph .react-flow__controls-button{border-bottom-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}._5Empva_graph .react-flow__controls-button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}._5Empva_graph .react-flow__controls-button svg{fill:currentColor}._5Empva_empty{text-align:center;color:var(--dsw-alias-label-caption);margin:0;padding:24px 0;font-size:13px;line-height:20px}._5Empva_node{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;border-radius:8px;flex-direction:column;gap:4px;width:220px;min-height:100px;height:auto;padding:8px 10px;font-size:12px;line-height:18px;display:flex;overflow:visible}._5Empva_node:hover{border-color:var(--dsw-alias-border-l1)}._5Empva_nodeBadge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:999px;align-self:flex-start;padding:0 7px;font-size:10px;line-height:16px}._5Empva_node[data-type=root-domain] ._5Empva_nodeBadge{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-state-business-tertiary)}._5Empva_node[data-type=ip] ._5Empva_nodeBadge,._5Empva_node[data-type=service] ._5Empva_nodeBadge{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary)}._5Empva_nodeValue{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}._5Empva_nodeMeta{min-width:0;color:var(--dsw-alias-label-tertiary);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}._5Empva_handle{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:999px;width:8px;height:8px}._5Empva_edgeLabel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);pointer-events:none;white-space:nowrap;border-radius:999px;padding:2px 8px;font-size:11px;line-height:16px;position:absolute}._5Empva_filterBar{flex-wrap:wrap;flex:none;align-items:center;gap:6px;padding-bottom:2px;display:flex}._5Empva_search{flex:none;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);padding:0 10px;font-size:12px;line-height:28px}._5Empva_search:focus{outline:1px solid var(--dsw-alias-brand-primary)}._5Empva_tableWrap{align-items:flex-start;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);flex:auto;min-height:0;overflow:auto}._5Empva_table{border-collapse:collapse;width:100%;font-size:12px;line-height:18px}._5Empva_table thead th{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-caption);border-bottom:1px solid var(--dsw-alias-border-l2);text-align:left;white-space:nowrap;padding:9px 12px;font-size:11px;font-weight:500;letter-spacing:.02em;position:sticky;top:0;z-index:2}._5Empva_table tbody td{border-top:1px solid var(--dsw-alias-border-l2);vertical-align:middle;padding:8px 12px}._5Empva_table tbody tr[data-clickable]{cursor:pointer}._5Empva_table tbody tr:hover{background:var(--dsw-alias-bg-layer-1)}._5Empva_thMethod{width:96px}._5Empva_thParams{width:150px}._5Empva_thState{width:88px}._5Empva_thVuln{width:72px}._5Empva_tdState{white-space:nowrap}._5Empva_stateTested,._5Empva_stateUntested{display:inline-flex;align-items:center;gap:4px;font-size:11px}._5Empva_stateTested{color:#34d399}._5Empva_stateUntested{color:var(--dsw-alias-label-caption)}._5Empva_stateTested i{width:6px;height:6px;border-radius:50%;background:#34d399;display:block}._5Empva_stateUntested i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l1);display:block}._5Empva_vulnCount{color:#f87171;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}._5Empva_table thead th._5Empva_thUrl{padding-left:32px}._5Empva_table tbody td._5Empva_tdUrl{padding-left:32px;color:var(--dsw-alias-label-primary);word-break:break-all;font-size:11.5px}._5Empva_tdParams{white-space:normal}._5Empva_typeDot{border-radius:50%;flex:none;width:5px;height:5px;margin-right:7px;opacity:.75;vertical-align:middle;display:inline-block}._5Empva_method{border-radius:4px;justify-content:center;min-width:46px;padding:1px 6px;font-size:10px;font-weight:600;line-height:16px;display:inline-flex}._5Empva_method[data-method=GET]{background:#10b98124;color:#34d399}._5Empva_method[data-method=POST]{background:#3b82f624;color:#60a5fa}._5Empva_method[data-method=PUT]{background:#f59e0b24;color:#fbbf24}._5Empva_method[data-method=PATCH]{background:#8b5cf624;color:#a78bfa}._5Empva_method[data-method=DELETE]{background:#ef444424;color:#f87171}._5Empva_method[data-method=HEAD],._5Empva_method[data-method=OPTIONS]{background:#64748b24;color:#94a3b8}._5Empva_methodNone{color:var(--dsw-alias-label-caption);opacity:.55}._5Empva_param{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);white-space:nowrap;margin:1px 4px 1px 0;padding:0 6px;font-size:11px;line-height:18px;display:inline-block}._5Empva_param em{color:var(--dsw-alias-label-caption);margin-left:3px;font-style:normal;font-size:10px}._5Empva_param[data-where=path] em{color:#3b82f6}._5Empva_param[data-where=query] em{color:#10b981}._5Empva_param[data-where=body] em{color:#f59e0b}._5Empva_param[data-where=header] em{color:#8b5cf6}._5Empva_pager{flex:none;align-items:center;gap:10px;color:var(--dsw-alias-label-caption);justify-content:flex-end;font-size:11px;display:flex}._5Empva_pageBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0 10px;font-size:11px;line-height:22px}._5Empva_pageBtn:hover:not(:disabled){color:var(--dsw-alias-label-primary)}._5Empva_pageBtn:disabled{cursor:default;opacity:.4}._5Empva_coverWrap{flex:auto;min-height:0;position:relative;display:flex}._5Empva_coverWrap .react-flow{flex:auto;border-radius:10px;min-height:320px}._5Empva_coverWrap .react-flow__attribution{display:none}._5Empva_coverWrap>div{flex:auto}._5Empva_coverCard{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;flex-direction:column;gap:8px;width:272px;padding:12px;display:flex;position:absolute;top:12px;left:12px;z-index:5;box-shadow:0 4px 16px #0000002e}._5Empva_coverHead{align-items:center;color:var(--dsw-alias-label-secondary);justify-content:space-between;font-size:12px;display:flex}._5Empva_coverHead b{color:var(--dsw-alias-label-primary);font-weight:600}._5Empva_coverRefit{width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:5px;font-size:13px;line-height:1}._5Empva_coverRefit:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}._5Empva_coverLegend{flex-wrap:wrap;gap:3px 10px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);display:flex}._5Empva_coverLegendItem{white-space:nowrap;align-items:center;gap:3px;display:inline-flex}._5Empva_coverDot{border-radius:50%;width:8px;height:8px;margin-right:3px;display:inline-block}._5Empva_coverDot[data-state=tested]{background:#10b981}._5Empva_coverDot[data-state=untested]{background:#64748b;opacity:.6}._5Empva_coverDot[data-state=out]{background:0 0;border:1px dashed var(--dsw-alias-label-caption)}._5Empva_coverHint{margin:0;color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}._5Empva_coverNode{cursor:pointer;flex-direction:column;align-items:center;gap:2px;display:flex}._5Empva_coverHandle{opacity:0;pointer-events:none;width:1px;height:1px;min-width:0;min-height:0;border:0;background:0 0}._5Empva_coverIcon{box-sizing:border-box;align-items:center;justify-content:center;color:#fff;border:1.5px solid #ffffff2e;border-radius:9999px;flex:none;line-height:1;transition:transform .12s,box-shadow .12s;display:flex}._5Empva_coverNode[data-tested=1] ._5Empva_coverIcon{border-color:#ffffff59;box-shadow:0 0 0 2px #ffffff1f}._5Empva_coverNode[data-tested=0] ._5Empva_coverIcon{opacity:.82}._5Empva_coverNode:hover ._5Empva_coverIcon{transform:scale(1.18)}._5Empva_coverNode[data-inscope='0'] ._5Empva_coverIcon{opacity:.45;border-style:dashed;border-color:var(--dsw-alias-border-l1)}._5Empva_coverNode[data-inscope='0'] ._5Empva_coverLabel{opacity:.5}._5Empva_coverNode[data-inscope='0']{cursor:default}._5Empva_coverLabel{color:var(--dsw-alias-label-secondary);text-align:center;word-break:break-all;-webkit-line-clamp:1;-webkit-box-orient:vertical;background:var(--dsw-alias-bg-base);opacity:.92;border-radius:3px;max-width:84px;padding:0 3px;font-size:9.5px;line-height:13px;display:-webkit-box;overflow:hidden}._5Empva_coverFold{flex-direction:column;align-items:center;gap:2px;display:flex}._5Empva_coverFoldNum{box-sizing:border-box;align-items:center;justify-content:center;border:1px dashed var(--dsw-alias-border-l1);color:var(--dsw-alias-label-caption);border-radius:9999px;flex:none;font-size:10px;display:flex}";
		const tagId$4 = "dsh-stcs/AssetsView.module.css";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var AssetsView_module_css_default = {
			"rows": "_5Empva_rows",
			"list": "_5Empva_list",
			"rowParent": "_5Empva_rowParent",
			"nodeValue": "_5Empva_nodeValue",
			"handle": "_5Empva_handle",
			"edgeLabel": "_5Empva_edgeLabel",
			"root": "_5Empva_root",
			"node": "_5Empva_node",
			"nodeMeta": "_5Empva_nodeMeta",
			"group": "_5Empva_group",
			"modeButton": "_5Empva_modeButton",
			"nodeBadge": "_5Empva_nodeBadge",
			"groupTitle": "_5Empva_groupTitle",
			"modeBar": "_5Empva_modeBar",
			"rowMeta": "_5Empva_rowMeta",
			"empty": "_5Empva_empty",
			"rowValue": "_5Empva_rowValue",
			"row": "_5Empva_row",
			"graph": "_5Empva_graph",
			"filterBar": "_5Empva_filterBar",
			"search": "_5Empva_search",
			"tableWrap": "_5Empva_tableWrap",
			"table": "_5Empva_table",
						"thMethod": "_5Empva_thMethod",
			"thParams": "_5Empva_thParams",
			"thUrl": "_5Empva_thUrl",
			"thState": "_5Empva_thState",
			"thVuln": "_5Empva_thVuln",
			"tdState": "_5Empva_tdState",
			"stateTested": "_5Empva_stateTested",
			"stateUntested": "_5Empva_stateUntested",
			"vulnCount": "_5Empva_vulnCount",
			"tdUrl": "_5Empva_tdUrl",
			"tdParams": "_5Empva_tdParams",
			"typeDot": "_5Empva_typeDot",
			"method": "_5Empva_method",
			"methodNone": "_5Empva_methodNone",
			"param": "_5Empva_param",
			"pager": "_5Empva_pager",
			"pageBtn": "_5Empva_pageBtn",
			"coverWrap": "_5Empva_coverWrap",
			"coverCard": "_5Empva_coverCard",
			"coverHead": "_5Empva_coverHead",
			"coverRefit": "_5Empva_coverRefit",
			"coverLegend": "_5Empva_coverLegend",
			"coverLegendItem": "_5Empva_coverLegendItem",
			"coverDot": "_5Empva_coverDot",
			"coverHint": "_5Empva_coverHint",
			"coverNode": "_5Empva_coverNode",
			"coverIcon": "_5Empva_coverIcon",
			"coverLabel": "_5Empva_coverLabel",
			"coverFold": "_5Empva_coverFold",
			"coverFoldNum": "_5Empva_coverFoldNum",
			"coverHandle": "_5Empva_coverHandle"
		};
		//#endregion
		//#region src/client/AssetsView.tsx
		/**
		* AssetsView: the 资产 sub-tab of the 渗透 view, with a 列表/图 mode toggle.
		* List mode groups assets by type (root domain → subdomain → ip → service →
		* app → endpoint) and shows each parent link inline; graph mode renders the
		* parent-child asset tree with @xyflow/react (positions from the pure
		* `layoutAssets` helper).
		*/
		/** Asset type label keys, in display order. */
		const ASSET_TYPES = [
			"root-domain",
			"subdomain",
			"ip",
			"service",
			"app",
			"endpoint"
		];
		/** Asset type badge label keys. */
		const TYPE_LABELS = {
			"root-domain": "asset.type.root-domain",
			"subdomain": "asset.type.subdomain",
			"ip": "asset.type.ip",
			"service": "asset.type.service",
			"app": "asset.type.app",
			"endpoint": "asset.type.endpoint"
		};
		/** Resolve the parent value of every asset from the parent edges. */
		function rowsOf(projection) {
			return projection.assets.map((asset) => {
				const parentEdge = projection.edges.find((edge) => edge.kind === "parent" && edge.targetId === asset.id);
				const parent = parentEdge === void 0 ? void 0 : projection.assets.find((candidate) => candidate.id === parentEdge.sourceId);
				return {
					id: asset.id,
					type: asset.type,
					value: asset.value,
					meta: asset.meta,
					parentValue: parent?.value ?? ""
				};
			});
		}
		/** Group asset rows by type in display order. */
		function groupByType(rows) {
			return ASSET_TYPES.map((type) => ({
				type,
				rows: rows.filter((row) => row.type === type)
			})).filter((group) => group.rows.length > 0);
		}
		/** List mode: sections per asset type with inline parent links. */
		// [照 ARTEX coverage-graph-tab] 节点尺寸按层级递减：根域名最大，端点最小。
		// 端点数最多所以最小，这样整张图有层次感，不会所有点一样大糊成一片。
		const ASSET_NODE_SIZE_BY_TYPE = {
			"root-domain": 38,
			subdomain: 30,
			ip: 28,
			service: 26,
			app: 26,
			endpoint: 20
		};
		const ASSET_FOLD_SIZE = 26;
		// 已测 = 类型色实心；未测 = 统一中灰（ARTEX 的 nodeFill 逻辑）。
		const ASSET_UNTESTED_FILL = "#64748b";
		// 意图/目标生命周期状态 → 文案 + 颜色（照 dsh-pentest-plus 的 STATE_MEANING）
		const NODE_STATE_LABELS = {
			open: "state.open",
			running: "state.running",
			done: "state.done",
			exhausted: "state.exhausted",
			blocked: "state.blocked",
			stopped: "state.stopped"
		};
		const NODE_STATE_HEX = {
			open: "#94a3b8",
			running: "#3b82f6",
			done: "#10b981",
			exhausted: "#f59e0b",
			blocked: "#ef4444",
			stopped: "#64748b"
		};
		// 资产类型图标：单色线性 SVG（16×16，stroke 用 currentColor 跟随文字色）。
		// 不用 emoji —— 彩色图标在深色界面上又杂又跳，这里只要一个淡淡的轮廓。
		const ASSET_ICON_SHAPES = {
			"root-domain": [
				["circle", { cx: 8, cy: 8, r: 5.6 }],
				["path", { d: "M2.4 8h11.2M8 2.4c1.9 1.9 1.9 9.3 0 11.2M8 2.4c-1.9 1.9-1.9 9.3 0 11.2" }]
			],
			subdomain: [
				["circle", { cx: 8, cy: 8, r: 5.6 }],
				["path", { d: "M2.4 8h11.2" }],
				["circle", { cx: 8, cy: 8, r: 1.3, fill: "currentColor", stroke: "none" }]
			],
			ip: [
				["rect", { x: 2.6, y: 3.2, width: 10.8, height: 9.6, rx: 1.6 }],
				["path", { d: "M2.6 8h10.8M5.6 5.6h.01M5.6 10.4h.01M8 5.6h.01M8 10.4h.01" }]
			],
			service: [
				["circle", { cx: 8, cy: 8, r: 2.4 }],
				["path", { d: "M8 1.6v2.2M8 12.2v2.2M1.6 8h2.2M12.2 8h2.2M3.4 3.4l1.6 1.6M11 11l1.6 1.6M12.6 3.4L11 5M5 11l-1.6 1.6" }]
			],
			app: [
				["rect", { x: 2.4, y: 3.4, width: 11.2, height: 9.2, rx: 1.6 }],
				["path", { d: "M2.4 6.4h11.2" }]
			],
			endpoint: [
				["path", { d: "M6.4 9.6a2.9 2.9 0 0 0 4.1 0l1.6-1.6a2.9 2.9 0 0 0-4.1-4.1l-.9.9" }],
				["path", { d: "M9.6 6.4a2.9 2.9 0 0 0-4.1 0L3.9 8a2.9 2.9 0 0 0 4.1 4.1l.9-.9" }]
			]
		};
		function AssetTypeIcon({ type, size }) {
			const shapes = ASSET_ICON_SHAPES[type];
			if (shapes === void 0) return null;
			const dim = size === void 0 ? 12 : size;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: dim,
				height: dim,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.4,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				style: { flex: "none", display: "block" },
				children: shapes.map((sh, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(sh[0], { ...sh[1], key: i }))
			});
		}
		// 资产类型色（筛选 chip 的激活色 + 表格里的类型点）
		const ASSET_TYPE_HEX = {
			"root-domain": "#10b981",
			subdomain: "#22c55e",
			ip: "#3b82f6",
			service: "#8b5cf6",
			app: "#f59e0b",
			endpoint: "#06b6d4"
		};
		// [local patch 2026-10-19] 资产表改成 ARTEX 风格：方法徽章 / 完整地址 / 参数（带位置）。
		// 资产记录本身只有 value + 自由文本 meta，所以 method 和参数都从现有数据里解析：
		//   method ← meta 里的 GET/POST/...
		//   path 参数 ← URL 里的 {id} 或 %7Bid%7D
		//   query 参数 ← URL 里的 ?a=1&b=2
		//   body 参数 ← meta 里的 @RequestBody Xxx
		// 实测数据里 endpoint 的 value 有三种写法混着（5630 条里：完整 URL 69%、纯路径 18%、
		// 「方法 + 路径」11%），而且方法字样经常写在 **value 开头**而不是 meta 里。
		// 所以统一走 splitEndpoint：先剥方法前缀，纯路径再用 parent 补 host。
		const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
		const METHOD_PREFIX_RE = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S[\s\S]*)$/i;
		const METHOD_WORD_RE = /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/i;
		function looksLikeHost(v) {
			const t = String(v || "").trim();
			if (/^https?:\/\/[^\s]+$/i.test(t)) return true;
			if (/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/.test(t)) return true;
			if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?::\d+)?$/i.test(t)) return true;
			return false;
		}
		function splitEndpoint(asset) {
			const raw = String(asset.value || "").trim();
			let method = "";
			let url = raw;
			const m = raw.match(METHOD_PREFIX_RE);
			if (m !== null) {
				method = m[1].toUpperCase();
				url = m[2].trim();
			} else {
				const mm = String(asset.meta || "").match(METHOD_WORD_RE);
				if (mm !== null) method = mm[1].toUpperCase();
			}
			// 纯路径 + parent 看起来像 host → 补全成可点的完整地址
			if (url.startsWith("/")) {
				const parent = String(asset.parentValue || "").trim();
				if (parent !== "" && looksLikeHost(parent)) {
					const base = parent.replace(/\/+$/, "");
					url = (/^https?:\/\//i.test(base) ? base : "http://" + base) + url;
				}
			}
			return { method: method, url: url };
		}
		function urlParams(url, meta) {
			const out = [];
			const seen = new Set();
			const add = (name, where) => {
				if (name === "" || seen.has(name + "@" + where)) return;
				seen.add(name + "@" + where);
				out.push({ name: name, where: where });
			};
			const pathRe = /\{(\w+)\}|%7B(\w+)%7D/gi;
			let mm;
			while ((mm = pathRe.exec(String(url || ""))) !== null) add(mm[1] || mm[2], "path");
			const qi = String(url || "").indexOf("?");
			if (qi >= 0) {
				const q = String(url).slice(qi + 1).split("#")[0];
				for (const kv of q.split("&")) {
					const n = kv.split("=")[0];
					if (n !== "") {
						try { add(decodeURIComponent(n), "query"); } catch (e) { add(n, "query"); }
					}
				}
			}
			const bm = String(meta || "").match(/@RequestBody\s+(?:public\s+)?(\w+)/);
			if (bm !== null) add(bm[1], "body");
			return out;
		}
		const ASSET_PAGE = 100;
		/**
		 * 资产详情侧栏：点列表某一行打开。
		 * 除了资产本身的字段，还把它「被哪些事实提到 / 是哪些漏洞的落点」列出来 ——
		 * 这是光看表格看不出来的信息（ARTEX 的列表也没有这个）。
		 */
		/**
		 * 资产详情侧栏：点列表某一行打开。
		 * 除了资产本身的字段，还把它「被哪些事实提到 / 是哪些漏洞的落点」列出来 ——
		 * 这是光看表格看不出来的信息（ARTEX 的列表也没有）。
		 */
		function AssetDetailPanel({ row, pentest, t, onClose }) {
			if (row === null || row === void 0) return null;
			const facts = [];
			const findings = [];
			const value = String(row.value || "");
			for (const node of pentest.nodes) {
				if (node.kind === "finding" && node.affectedAssetId === row.id) { findings.push(node); continue; }
				if (node.kind !== "fact") continue;
				const target = String(node.target || "");
				if (target === "") continue;
				if (target === value || (value.length >= 6 && target.indexOf(value) >= 0)) facts.push(node);
			}
			const ep = row.type === "endpoint" ? splitEndpoint(row) : null;
			const fields = [
				{ label: t("assets.detail.type"), value: t(TYPE_LABELS[row.type]) },
				{ label: t("assets.col.url"), value: row.value === "" ? "—" : row.value }
			];
			if (ep !== null && ep.method !== "") fields.push({ label: t("assets.col.method"), value: ep.method });
			if (row.meta !== "") fields.push({ label: t("assets.detail.meta"), value: row.meta });
			if (row.parentValue !== "") fields.push({ label: t("assets.detail.parent"), value: row.parentValue });
			fields.push({
				label: t("assets.detail.state"),
				value: facts.length > 0 || findings.length > 0 ? t("assets.state.tested") : t("assets.state.untested")
			});
			if (facts.length > 0) {
				fields.push({
					label: t("assets.relatedFacts") + " (" + facts.length + ")",
					value: facts.slice(0, 12).map((f) => "· " + String(f.detail || "").replace(/\s+/g, " ").slice(0, 120)).join("\n")
				});
			}
			if (findings.length > 0) {
				fields.push({
					label: t("assets.relatedFindings") + " (" + findings.length + ")",
					value: findings.map((f) => "· [" + t(SEVERITY_LABELS$1[f.severity]) + "] " + String(f.title || "")).join("\n")
				});
			}
			if (facts.length === 0 && findings.length === 0) {
				fields.push({ label: t("assets.relatedFacts"), value: t("assets.noRefs") });
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphDetailDrawer, {
				title: row.value === "" ? t(TYPE_LABELS[row.type]) : row.value,
				fields: fields,
				onClose: onClose
			});
		}
		function AssetList({ pentest, t }) {
			const [typeFilter, setTypeFilter] = (0, react.useState)(null);
			const [q, setQ] = (0, react.useState)("");
			const [page, setPage] = (0, react.useState)(0);
			// 点某一行 → 右侧抽屉看完整信息（含关联的事实/漏洞）
			const [detail, setDetail] = (0, react.useState)(null);
			// 已测集合（和覆盖图同一套判定）+ 每个资产命中的漏洞数 —— 这两列用来填满表格右侧
			const tested = (0, react.useMemo)(() => testedAssetIds(pentest), [pentest]);
			const vulnsOf = (0, react.useMemo)(() => {
				const map = new Map();
				for (const nd of pentest.nodes) {
					if (nd.kind !== "finding") continue;
					const aid = String(nd.affectedAssetId || "");
					if (aid === "") continue;
					map.set(aid, (map.get(aid) || 0) + 1);
				}
				return map;
			}, [pentest.nodes]);
			const rows = (0, react.useMemo)(() => rowsOf(pentest), [pentest]);
			const counts = (0, react.useMemo)(() => {
				const out = {};
				for (const r of rows) out[r.type] = (out[r.type] || 0) + 1;
				return out;
			}, [rows]);
			const filtered = (0, react.useMemo)(() => {
				let list = typeFilter === null ? rows : rows.filter((r) => typeFilter.includes(r.type));
				const kw = q.trim().toLowerCase();
				if (kw === "") return list;
				return list.filter((r) => {
					const ep = splitEndpoint(r);
					const hay = [ep.url, ep.method, r.meta, r.parentValue, r.value].filter((x) => typeof x === "string").join(" ").toLowerCase();
					return hay.indexOf(kw) >= 0;
				});
			}, [rows, typeFilter, q]);
			(0, react.useEffect)(() => { setPage(0); }, [typeFilter, q]);
			const pageCount = Math.max(1, Math.ceil(filtered.length / ASSET_PAGE));
			const at = Math.min(page, pageCount - 1);
			const shown = filtered.slice(at * ASSET_PAGE, (at + 1) * ASSET_PAGE);
			const chip = (key, label, color) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-testid": "pentest-asset-filter-" + key,
				onClick: () => {
					setTypeFilter((prev) => {
						const base = prev === null ? [] : prev.slice();
						const i = base.indexOf(key);
						if (i >= 0) base.splice(i, 1); else base.push(key);
						return base.length === 0 ? null : base;
					});
				},
				style: { cursor: "pointer", flex: "none", borderRadius: 999, padding: "0 10px", fontSize: 12, lineHeight: "22px",
					border: "1px solid " + (typeFilter !== null && typeFilter.includes(key) ? color : "var(--dsw-alias-border-l2)"),
					background: typeFilter !== null && typeFilter.includes(key) ? color : "var(--dsw-alias-bg-layer-2)",
					color: typeFilter !== null && typeFilter.includes(key) ? "#fff" : "var(--dsw-alias-label-secondary)",
					alignItems: "center", gap: 5, display: "inline-flex" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetTypeIcon, { type: key, size: 12 }), label]
			});
			const TYPE_ORDER = ["root-domain", "subdomain", "ip", "service", "app", "endpoint"];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AssetsView_module_css_default.list,
				"data-testid": "pentest-assets-list",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: AssetsView_module_css_default.filterBar,
						children: TYPE_ORDER.filter((k) => counts[k]).map((k) => chip(k, t(TYPE_LABELS[k]) + " " + counts[k], ASSET_TYPE_HEX[k] || "#94a3b8"))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "search",
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: t("assets.search"),
						"data-testid": "pentest-asset-search",
						className: AssetsView_module_css_default.search
					}),
					shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: AssetsView_module_css_default.empty,
						children: t("assets.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: AssetsView_module_css_default.tableWrap,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: AssetsView_module_css_default.table,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { className: AssetsView_module_css_default.thMethod, children: t("assets.col.method") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { className: AssetsView_module_css_default.thUrl, children: t("assets.col.url") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { className: AssetsView_module_css_default.thParams, children: t("assets.col.params") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { className: AssetsView_module_css_default.thState, children: t("assets.col.state") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { className: AssetsView_module_css_default.thVuln, children: t("assets.col.vuln") })
								] }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", {
									children: shown.map((row) => {
										const ep = splitEndpoint(row);
										const method = ep.method;
										const params = urlParams(ep.url, row.meta);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
											"data-testid": "pentest-asset-row",
											"data-clickable": "1",
											onClick: () => setDetail(row),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: method === ""
													? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: AssetsView_module_css_default.methodNone, children: "—" })
													: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: AssetsView_module_css_default.method,
														"data-method": method,
														children: method
													}) }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
													className: AssetsView_module_css_default.tdUrl,
													title: row.meta === "" ? ep.url : ep.url + " — " + row.meta,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: AssetsView_module_css_default.typeDot,
															style: { background: ASSET_TYPE_HEX[row.type] || "#94a3b8" },
															title: t(TYPE_LABELS[row.type])
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ep.url })
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
													className: AssetsView_module_css_default.tdParams,
													children: params.length === 0
														? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: AssetsView_module_css_default.methodNone, children: "—" })
														: params.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: AssetsView_module_css_default.param,
															"data-where": p.where,
															children: [p.name, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: p.where })]
														}, p.name + p.where))
												}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: AssetsView_module_css_default.tdState,
														children: tested.has(row.id)
															? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: AssetsView_module_css_default.stateTested, children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
																t("assets.state.tested")
															] })
															: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: AssetsView_module_css_default.stateUntested, children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
																t("assets.state.untested")
															] })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: AssetsView_module_css_default.tdVuln,
														children: (vulnsOf.get(row.id) || 0) > 0
															? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: AssetsView_module_css_default.vulnCount, children: vulnsOf.get(row.id) })
															: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: AssetsView_module_css_default.methodNone, children: "—" })
													})
											]
										}, row.id);
									})
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetDetailPanel, {
						row: detail,
						pentest: pentest,
						t: t,
						onClose: () => setDetail(null)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: AssetsView_module_css_default.pager,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								children: [filtered.length === 0 ? 0 : at * ASSET_PAGE + 1, "–", Math.min((at + 1) * ASSET_PAGE, filtered.length), " / ", filtered.length]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: at <= 0,
								onClick: () => setPage(at - 1),
								className: AssetsView_module_css_default.pageBtn,
								children: t("assets.prev")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: at >= pageCount - 1,
								onClick: () => setPage(at + 1),
								className: AssetsView_module_css_default.pageBtn,
								children: t("assets.next")
							})
						]
					})
				]
			});
		}

		/** One custom flow node: an asset-type badge over the value, with source/target handles. */
		function AssetFlowNode({ data, t }) {
			const asset = data.asset;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AssetsView_module_css_default.node,
				"data-type": asset.type,
				"data-testid": "explore-node-asset",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "target",
						position: Position.Left,
						className: AssetsView_module_css_default.handle
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetsView_module_css_default.nodeBadge,
						children: t(TYPE_LABELS[asset.type])
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetsView_module_css_default.nodeValue,
						title: asset.value,
						children: asset.value
					}),
					asset.meta !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetsView_module_css_default.nodeMeta,
						title: asset.meta,
						children: asset.meta
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "source",
						position: Position.Right,
						className: AssetsView_module_css_default.handle
					})
				]
			});
		}
		/** One custom edge: a bezier curve with a visible 隶属 pill at its midpoint. */
		function AssetEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }) {
			const [path, labelX, labelY] = getStraightPath({
				sourceX,
				sourceY,
				targetX,
				targetY
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaseEdge, {
				id,
				path
			}), label !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EdgeLabelRenderer, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: AssetsView_module_css_default.edgeLabel,
				style: { transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` },
				children: label
			}) })] });
		}
		/** Graph mode: the parent-child asset tree. */
		/**
		 * [照 ARTEX graphLabel] 图上显示的短标签：
		 * 端点只留 path（完整 URL 太长会把图撑爆），其余类型用原值。
		 */
		function graphAssetLabel(asset) {
			const raw = String(asset.value || "");
			if (asset.type !== "endpoint") return raw.length > 28 ? raw.slice(0, 27) + "…" : raw;
			const m = raw.match(/^(?:https?:\/\/[^\/]+)?(\/[^\s?#]*)?/i);
			let path = m === null || m[1] === void 0 ? "" : m[1];
			if (path === "") {
				const hm = raw.match(/^(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(?:https?:\/\/[^\/]+)?(\/\S*)?/i);
				path = hm === null || hm[1] === void 0 ? raw : hm[1];
			}
			if (path === "" || path === "/") path = raw;
			return path.length > 28 ? path.slice(0, 27) + "…" : path;
		}
		/** 覆盖图节点：圆形图标 + 下方标签；折叠节点显示成「还有 N 个」。 */
		function AssetCoverNode({ data }) {
			const asset = data.asset;
			if (asset.foldCount > 0) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: AssetsView_module_css_default.coverFold,
					"data-type": asset.type,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
							type: "target",
							position: Position.Top,
							className: AssetsView_module_css_default.coverHandle,
							isConnectable: false
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: AssetsView_module_css_default.coverFoldNum,
							style: { width: data.size, height: data.size },
							children: "+" + asset.foldCount
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: AssetsView_module_css_default.coverLabel, children: data.foldLabel }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
							type: "source",
							position: Position.Bottom,
							className: AssetsView_module_css_default.coverHandle,
							isConnectable: false
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AssetsView_module_css_default.coverNode,
				"data-type": asset.type,
				"data-tested": data.tested ? "1" : "0",
				"data-inscope": asset.inScope === false ? "0" : "1",
				children: [
					// 两个隐形 Handle：边必须有挂点，否则 ReactFlow 直接不画线
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "target",
						position: Position.Top,
						className: AssetsView_module_css_default.coverHandle,
						isConnectable: false
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetsView_module_css_default.coverIcon,
						"data-tested": data.tested ? "1" : "0",
						style: {
							width: data.size,
							height: data.size,
							background: data.tested ? (ASSET_TYPE_HEX[asset.type] || "#64748b") : ASSET_UNTESTED_FILL
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetTypeIcon, { type: asset.type, size: Math.max(11, Math.round(data.size * 0.55)) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetsView_module_css_default.coverLabel,
						title: asset.value + (asset.meta === "" ? "" : " — " + asset.meta),
						children: data.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "source",
						position: Position.Bottom,
						className: AssetsView_module_css_default.coverHandle,
						isConnectable: false
					})
				]
			});
		}
		/**
		 * [local patch 2026-10-19] 资产覆盖图（照 ARTEX）：力导向布局、圆形节点、
		 * 已测高亮/未测灰、左上浮动统计与图例。
		 */
		function AssetGraph({ pentest, t }) {
			const [selectedAsset, setSelectedAsset] = (0, react.useState)(null);
			// [照 ARTEX] 折叠节点可以展开：每点一次「展示更多」多放 20 个出来
			const [foldLimit, setFoldLimit] = (0, react.useState)(ASSET_FOLD_LIMIT);
			const [foldDetail, setFoldDetail] = (0, react.useState)(null);
			const flowRef = (0, react.useRef)(null);
			const base = (0, react.useMemo)(() => {
				const folded = foldAssets(rowsOf(pentest), foldLimit);
				const rawEdges = pentest.edges.filter((e) => e.kind === "parent");
				// 先重定向再布局：折叠掉的资产，边挂到折叠节点上
				const parentEdges = redirectEdges(rawEdges, folded.foldMap);
				const pos = layoutForce(folded.nodes, parentEdges);
				return {
					nodes: folded.nodes.map((r, i) => ({ ...r, x: pos[i].x, y: pos[i].y })),
					edges: parentEdges,
					tested: testedAssetIds(pentest),
					hidden: folded.hidden
				};
			}, [pentest, foldLimit]);
			const stats = (0, react.useMemo)(() => {
				const byType = {};
				let tested = 0;
				let total = 0;
				for (const n of base.nodes) {
					if (n.foldCount > 0) { total += n.foldCount + 1; continue; }
					total++;
					byType[n.type] = (byType[n.type] || 0) + 1;
					if (base.tested.has(n.id)) tested++;
				}
				return { byType: byType, tested: tested, total: total };
			}, [base]);
			const [rfNodes, setRfNodes] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				setRfNodes((prev) => {
					const prevMap = new Map(prev.map((n) => [n.id, n]));
					return base.nodes.map((node) => {
						const old = prevMap.get(node.id);
						return {
							id: node.id,
							type: "cover",
							position: old === void 0 ? { x: node.x, y: node.y } : old.position,
							data: {
								asset: node,
								tested: base.tested.has(node.id),
								hidden: base.hidden.get(node.type) || [],
								size: node.foldCount > 0 ? ASSET_FOLD_SIZE : (ASSET_NODE_SIZE_BY_TYPE[node.type] || 24),
								label: graphAssetLabel(node),
								foldLabel: t("assets.foldMore", { n: node.foldCount })
							}
						};
					});
				});
			}, [base, t]);
			// [local patch 2026-10-19] fitView 时序：首帧 rfNodes 还是空数组，
			// ReactFlow 初始化时没节点可 fit，队列被消费掉后就不再 fit ——
			// 结果是节点停在 layoutForce 的原始坐标（整体偏右上）。
			// 节点数变化时补一次 fitView。
			(0, react.useEffect)(() => {
				if (rfNodes.length === 0) return void 0;
				const timer = setTimeout(() => {
					if (flowRef.current !== null && flowRef.current !== void 0) flowRef.current.fitView({ padding: 0.12, duration: 200 });
				}, 60);
				return () => clearTimeout(timer);
			}, [rfNodes.length]);
			const onNodesChange = (0, react.useCallback)((changes) => {
				setRfNodes((prev) => applyNodeChanges(changes, prev));
			}, []);
			const flowEdges = (0, react.useMemo)(() => base.edges.map((edge) => ({
				id: edge.id,
				type: "cover",
				source: edge.sourceId,
				target: edge.targetId
			})), [base.edges]);
			const nodeTypes = (0, react.useMemo)(() => ({ cover: AssetCoverNode }), []);
			const edgeTypes = (0, react.useMemo)(() => ({ cover: AssetCoverEdge }), []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AssetsView_module_css_default.coverWrap,
				"data-testid": "pentest-assets-graph",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: AssetsView_module_css_default.coverCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: AssetsView_module_css_default.coverHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										children: [t("assets.scopeTotal"), " ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: stats.total }), " · ", t("assets.scopeTested"), " ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { style: { color: "#10b981" }, children: stats.tested })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => { if (flowRef.current) flowRef.current.fitView({ padding: 0.12, duration: 200 }); },
										className: AssetsView_module_css_default.coverRefit,
										children: "↻"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: AssetsView_module_css_default.coverLegend,
								children: ["root-domain", "subdomain", "ip", "service", "app", "endpoint"].filter((k) => stats.byType[k]).map((k) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: AssetsView_module_css_default.coverLegendItem,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetTypeIcon, { type: k, size: 11 }), " ", t(TYPE_LABELS[k]), " ", stats.byType[k]]
								}, k))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: AssetsView_module_css_default.coverLegend,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: AssetsView_module_css_default.coverLegendItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: AssetsView_module_css_default.coverDot, "data-state": "tested" }), t("assets.state.tested")]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: AssetsView_module_css_default.coverLegendItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: AssetsView_module_css_default.coverDot, "data-state": "untested" }), t("assets.state.untested")]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: AssetsView_module_css_default.coverLegendItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: AssetsView_module_css_default.coverDot, "data-state": "out" }), t("assets.state.outOfScope")]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: AssetsView_module_css_default.coverHint,
								children: t("assets.cover.hint")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(index, {
						// [local patch 2026-10-19] 节点数变化时重建：onInit 的 fitView 只有节点
						// 已存在才有效，首帧 rfNodes 是空数组会把 fitView 队列吃掉，之后再也不 fit。
						key: "cover-" + rfNodes.length,
						nodes: rfNodes,
						edges: flowEdges,
						onNodesChange,
						nodeTypes,
						edgeTypes,
						fitView: true,
						fitViewOptions: { padding: 0.12 },
						minZoom: 0.08,
						onInit: (inst) => {
							flowRef.current = inst;
							// 延迟一点：节点刚挂载还没测量尺寸，立刻 fit 会被忽略
							setTimeout(() => {
								if (inst !== null && inst !== void 0) inst.fitView({ padding: 0.12, duration: 150 });
							}, 80);
						},
						proOptions: { hideAttribution: true },
						onNodeClick: (_, flowNode) => {
							if (flowNode.data.asset.foldCount > 0) {
								setFoldDetail(flowNode.data);
								return;
							}
							setSelectedAsset(flowNode.data.asset);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Background, { gap: 16, size: 1, color: "var(--dsw-alias-border-l2)" })]
					}),
					selectedAsset !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphDetailDrawer, {
						title: selectedAsset.value,
						fields: [
							{ label: "资产类型", value: t(TYPE_LABELS[selectedAsset.type]) },
							{ label: "资产值", value: selectedAsset.value },
							{ label: "元数据", value: selectedAsset.meta === "" ? "—" : selectedAsset.meta },
							{ label: "上级", value: selectedAsset.parentValue === "" ? "—" : selectedAsset.parentValue },
							{ label: "测试状态", value: base.tested.has(selectedAsset.id) ? t("assets.state.tested") : t("assets.state.untested") }
						],
						onClose: () => setSelectedAsset(null)
					}), foldDetail !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphDetailDrawer, {
						title: "+" + foldDetail.asset.foldCount + " " + t(TYPE_LABELS[foldDetail.asset.type]),
						fields: foldDetail.hidden.map((a, idx) => ({ label: "#" + (idx + 1), value: a.value })),
						actions: [{
							label: t("assets.foldExpand", { n: ASSET_FOLD_STEP }),
							onClick: () => {
								setFoldLimit((prev) => prev + ASSET_FOLD_STEP);
								setFoldDetail(null);
							}
						}],
						onClose: () => setFoldDetail(null)
					})
				]
			});
		}
		/** 覆盖图连线：非常淡的灰线，不抢节点。 */
		function AssetCoverEdge({ id, sourceX, sourceY, targetX, targetY }) {
			// 直线连接：力导向下曲线会互相缠绕，直线能看清「谁连谁」。
			const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaseEdge, {
				id,
				path,
				style: { stroke: "#94a3b8", strokeWidth: 1, strokeOpacity: 0.45 }
			});
		}

		function AssetsView({ pentest, t }) {
			const [mode, setMode] = (0, react.useState)("list");
			if (pentest.assets.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: AssetsView_module_css_default.empty,
				"data-testid": "pentest-assets-empty",
				children: t("assets.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AssetsView_module_css_default.root,
				"data-testid": "pentest-assets",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: AssetsView_module_css_default.modeBar,
					children: ["list", "graph"].map((modeKey) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: AssetsView_module_css_default.modeButton,
						"aria-pressed": mode === modeKey,
						"data-testid": `pentest-assets-mode-${modeKey}`,
						onClick: () => {
							setMode(modeKey);
						},
						children: t(modeKey === "list" ? "assets.mode.list" : "assets.mode.graph")
					}, modeKey))
				}), mode === "list" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetList, {
					pentest,
					t
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetGraph, {
					pentest,
					t
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\ExploreView.module.css.mjs
		const css$3 = ".ZE7AWW_graph{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex:auto;min-height:320px;position:relative;overflow:hidden}.ZE7AWW_graph .react-flow__controls{border:1px solid var(--dsw-alias-border-l2);box-shadow:none;background:var(--dsw-alias-bg-layer-1);border-radius:6px;overflow:hidden}.ZE7AWW_graph .react-flow__controls-button{border-bottom-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}.ZE7AWW_graph .react-flow__controls-button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.ZE7AWW_graph .react-flow__controls-button svg{fill:currentColor}.ZE7AWW_empty{box-sizing:border-box;text-align:center;height:100%;color:var(--dsw-alias-label-caption);place-items:center;padding:24px;font-size:13px;line-height:20px;display:grid}.ZE7AWW_node{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;border-radius:8px;flex-direction:column;gap:4px;width:168px;min-height:38px;height:auto;padding:5px 7px;font-size:10px;line-height:14px;display:flex;overflow:visible}.ZE7AWW_node:hover{border-color:var(--dsw-alias-border-l1)}.ZE7AWW_node[data-kind=goal]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}.ZE7AWW_handle{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:999px;width:8px;height:8px}.ZE7AWW_edgeLabel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);pointer-events:none;white-space:nowrap;border-radius:999px;padding:0 5px;font-size:10px;line-height:14px;position:absolute;opacity:.82}.ZE7AWW_badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:999px;align-self:flex-start;padding:0 8px;font-size:11px;line-height:18px}.ZE7AWW_node[data-kind=goal] .ZE7AWW_badge{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-state-business-tertiary)}.ZE7AWW_node[data-kind=fact] .ZE7AWW_badge{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary)}.ZE7AWW_node[data-kind=finding] .ZE7AWW_badge{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary)}.ZE7AWW_title{min-width:0;color:var(--dsw-alias-label-primary);-webkit-line-clamp:1;-webkit-box-orient:vertical;display:-webkit-box;font-weight:600;overflow:hidden;white-space:normal}.ZE7AWW_detail{min-width:0;color:var(--dsw-alias-label-tertiary);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.ZE7AWW_severity{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:999px;align-self:flex-start;padding:0 8px;font-size:11px;line-height:18px}.ZE7AWW_severity[data-severity=critical]{color:#fff;background:#b91c1c;font-weight:600}.ZE7AWW_severity[data-severity=high]{color:#fff;background:#ef4444}.ZE7AWW_severity[data-severity=medium]{color:#fff;background:#f59e0b}.ZE7AWW_severity[data-severity=low]{color:#fff;background:#3b82f6}.ZE7AWW_severity[data-severity=info]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.ZE7AWW_nodeState{border:1px solid;border-radius:999px;flex:none;align-items:center;gap:4px;padding:0 6px;font-size:9px;line-height:14px;display:inline-flex}.ZE7AWW_nodeStateDot{border-radius:50%;width:4px;height:4px;background:currentColor;display:block}.ZE7AWW_nodeTypeName{color:var(--dsw-alias-label-secondary);flex:1;min-width:0;font-size:9.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ZE7AWW_nodePrio{border-radius:4px;flex:none;padding:0 4px;font-size:9px;font-weight:700;line-height:14px;font-variant-numeric:tabular-nums}.ZE7AWW_nodePrio[data-tone=red]{color:#f87171;background:#ef444424}.ZE7AWW_nodePrio[data-tone=amber]{color:#fbbf24;background:#f59e0b24}.ZE7AWW_nodePrio[data-tone=slate]{color:#94a3b8;background:#64748b24}.ZE7AWW_nodeFoot{flex-wrap:wrap;align-items:center;gap:4px;margin-top:2px;display:flex}.ZE7AWW_nodeOwner{color:var(--dsw-alias-label-caption);flex:none;max-width:80px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ZE7AWW_nodeHead{align-items:center;gap:4px;min-width:0;display:flex}.ZE7AWW_nodeIcon{align-items:center;justify-content:center;width:14px;height:14px;color:#fff;border-radius:3px;flex:none;display:flex}.ZE7AWW_nodeIcon[data-kind=goal]{background:#10b981}.ZE7AWW_nodeIcon[data-kind=intent]{background:#3b82f6}.ZE7AWW_nodeIcon[data-kind=fact]{background:#8b5cf6}.ZE7AWW_nodeIcon[data-kind=finding]{background:#f43f5e}.ZE7AWW_nodeIcon[data-kind=digest]{background:#14b8a6}.ZE7AWW_nodeId{margin-left:auto;color:var(--dsw-alias-label-caption);flex:none;font-size:10px;line-height:16px;font-variant-numeric:tabular-nums}.ZE7AWW_node[data-kind=goal]{box-shadow:inset 3px 0 0 #10b981}.ZE7AWW_node[data-kind=intent]{box-shadow:inset 3px 0 0 #3b82f6}.ZE7AWW_node[data-kind=fact]{box-shadow:inset 3px 0 0 #8b5cf6}.ZE7AWW_node[data-kind=finding]{box-shadow:inset 3px 0 0 #f43f5e}.ZE7AWW_node[data-kind=finding][data-severity=critical]{box-shadow:inset 4px 0 0 #b91c1c}.ZE7AWW_node[data-kind=finding][data-severity=high]{box-shadow:inset 4px 0 0 #ef4444}.ZE7AWW_node[data-kind=finding][data-severity=medium]{box-shadow:inset 4px 0 0 #f59e0b}.ZE7AWW_node[data-kind=finding][data-severity=low]{box-shadow:inset 4px 0 0 #3b82f6}.ZE7AWW_node[data-kind=finding][data-severity=info]{box-shadow:inset 4px 0 0 #94a3b8}.ZE7AWW_minimap{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;overflow:hidden}.ZE7AWW_legend{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;flex-direction:column;gap:5px;padding:6px 9px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);pointer-events:none;display:flex;position:absolute;bottom:10px;left:10px;z-index:5}.ZE7AWW_legendRow{align-items:center;gap:6px;flex-wrap:wrap;display:flex}.ZE7AWW_legendDot{border-radius:2px;flex:none;width:8px;height:8px}.ZE7AWW_legendLine{border-radius:1px;flex:none;width:14px;height:2px}.ZE7AWW_feed{flex-direction:column;min-height:0;height:100%;display:flex}.ZE7AWW_feedBar{flex-wrap:wrap;flex:none;align-items:center;gap:6px;padding:0 0 8px;display:flex}.ZE7AWW_feedList{flex:auto;flex-direction:column;gap:2px;min-height:0;padding-right:4px;display:flex;overflow-y:auto}.ZE7AWW_feedDay{color:var(--dsw-alias-label-caption);background:var(--dsw-alias-bg-base);z-index:1;padding:12px 0 4px;font-size:12px;line-height:20px;position:sticky;top:0}.ZE7AWW_feedRow{display:flex;align-items:flex-start;position:relative;border-radius:6px}.ZE7AWW_feedRow:hover{background:var(--dsw-alias-bg-layer-1)}.ZE7AWW_feedTime{width:74px;flex:none;flex-direction:column;align-items:flex-end;gap:1px;padding:6px 10px 0 0;display:flex}.ZE7AWW_feedClock{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}.ZE7AWW_feedAgo{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}.ZE7AWW_feedMain{flex:auto;min-width:0;border-left:1px solid var(--dsw-alias-border-l2);padding:6px 10px 8px 18px;position:relative}.ZE7AWW_feedMain:before{content:'';border:2px solid var(--dsw-alias-bg-base);border-radius:50%;width:9px;height:9px;position:absolute;top:11px;left:-5px}.ZE7AWW_feedRow[data-kind=goal] .ZE7AWW_feedMain:before{background:#10b981}.ZE7AWW_feedRow[data-kind=intent] .ZE7AWW_feedMain:before{background:#3b82f6}.ZE7AWW_feedRow[data-kind=fact] .ZE7AWW_feedMain:before{background:#8b5cf6}.ZE7AWW_feedRow[data-kind=finding] .ZE7AWW_feedMain:before{background:#ef4444}.ZE7AWW_feedRow[data-kind=finding][data-severity=critical] .ZE7AWW_feedMain:before{background:#b91c1c;width:11px;height:11px;left:-6px}.ZE7AWW_feedRow[data-kind=finding][data-severity=medium] .ZE7AWW_feedMain:before{background:#f59e0b}.ZE7AWW_feedRow[data-kind=finding][data-severity=low] .ZE7AWW_feedMain:before{background:#3b82f6}.ZE7AWW_feedHead{align-items:center;gap:6px;min-width:0;display:flex}.ZE7AWW_feedSeq{color:var(--dsw-alias-label-caption);flex:none;font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}.ZE7AWW_feedTitle{min-width:0;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ZE7AWW_feedBody{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px;white-space:pre-wrap;word-break:break-word;-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.ZE7AWW_feedBody[data-open=1]{-webkit-line-clamp:unset;display:block;overflow:visible}";
		const tagId$3 = "dsh-stcs/ExploreView.module.css";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var ExploreView_module_css_default = {
			"graph": "ZE7AWW_graph",
			"node": "ZE7AWW_node",
			"title": "ZE7AWW_title",
			"edgeLabel": "ZE7AWW_edgeLabel",
			"handle": "ZE7AWW_handle",
			"detail": "ZE7AWW_detail",
			"badge": "ZE7AWW_badge",
			"empty": "ZE7AWW_empty",
			"severity": "ZE7AWW_severity",
			"nodeHead": "ZE7AWW_nodeHead",
			"nodeIcon": "ZE7AWW_nodeIcon",
			"nodeId": "ZE7AWW_nodeId",
			"nodeState": "ZE7AWW_nodeState",
			"nodeStateDot": "ZE7AWW_nodeStateDot",
			"nodeTypeName": "ZE7AWW_nodeTypeName",
			"nodePrio": "ZE7AWW_nodePrio",
			"nodeFoot": "ZE7AWW_nodeFoot",
			"nodeOwner": "ZE7AWW_nodeOwner",
			"minimap": "ZE7AWW_minimap",
			"legend": "ZE7AWW_legend",
			"legendRow": "ZE7AWW_legendRow",
			"legendDot": "ZE7AWW_legendDot",
			"legendLine": "ZE7AWW_legendLine",
			"feed": "ZE7AWW_feed",
			"feedBar": "ZE7AWW_feedBar",
			"feedList": "ZE7AWW_feedList",
			"feedRow": "ZE7AWW_feedRow",
			"feedHead": "ZE7AWW_feedHead",
			"feedSeq": "ZE7AWW_feedSeq",
			"feedTitle": "ZE7AWW_feedTitle",
			"feedBody": "ZE7AWW_feedBody",
			"feedDay": "ZE7AWW_feedDay",
			"feedTime": "ZE7AWW_feedTime",
			"feedClock": "ZE7AWW_feedClock",
			"feedAgo": "ZE7AWW_feedAgo",
			"feedMain": "ZE7AWW_feedMain"
		};
		//#endregion
		//#region src/client/ExploreView.tsx
		/**
		* ExploreView: the 探索链路 sub-tab of the 渗透 view. Renders the
		* exploration chain (goal → intent → fact → derived intent → finding) as an
		* interactive graph with @xyflow/react; positions come from the pure
		* `layoutExploration` helper, nodes carry kind badges and connection handles,
		* and a custom edge renders a visible relationship pill on every chain edge
		* (意图链 / 产出 / 推导自 / 证实).
		*/
		/** Kind badge label keys per node kind. */
		const KIND_LABELS = {
			goal: "kind.goal",
			intent: "kind.intent",
			fact: "kind.fact",
			finding: "kind.finding",
			digest: "kind.digest"
		};
		/** Relationship label keys per chain edge kind (parent edges never reach this view). */
		const EDGE_LABELS = {
			spawns: "edge.spawns",
			yields: "edge.yields",
			derived_from: "edge.derived_from",
			// [local patch 2026-10-21] chain = 「隐藏事实时把 A→事实→B 重连成 A→B」的合成边。
			// 原来复用 derived_from，于是图上出现一条「意图#1 --推导自--> 意图#3」——
			// derived_from 的语义是「事实 → 意图」，两端都是意图时读不通。
			chain: "edge.chain",
			proves: "edge.proves",
			parent: "edge.parent"
		};
		/** Severity badge label keys. */
		const SEVERITY_LABELS$1 = {
			critical: "severity.critical",
			high: "severity.high",
			medium: "severity.medium",
			low: "severity.low",
			info: "severity.info"
		};
		// [local patch 2026-10-19] 链路图视觉编码（照 ARTEX）：边按关系着色、节点按类型给图标。
		// 客户端 bundle 里没有图标库（require 只有 react / jsx-runtime），所以图标是手写内联 SVG。
		const EDGE_COLORS = {
			spawns: "#10b981",
			derived_from: "#6366f1",
			chain: "#6366f1",
			yields: "#f59e0b",
			proves: "#ef4444",
			parent: "#94a3b8"
		};
		// 节点类型主色（MiniMap 和图标底色共用；用 hex 是因为 MiniMap 要真颜色值）
		// 严重等级色（图例和节点左缘共用；hex 而不是主题变量，保证五档能区分开）
		const SEV_HEX = {
			critical: "#b91c1c",
			high: "#ef4444",
			medium: "#f59e0b",
			low: "#3b82f6",
			info: "#94a3b8"
		};
		const KIND_HEX = {
			goal: "#10b981",
			intent: "#3b82f6",
			fact: "#8b5cf6",
			finding: "#f43f5e",
			digest: "#14b8a6"
		};
		const svgProps = { viewBox: "0 0 16 16", width: 12, height: 12, "aria-hidden": "true" };
		const KIND_ICONS = {
			// [local patch 2026-10-19] 压缩节点：三个叠起来的方块（表示「多条折叠成一条」）
			digest: () => react_jsx_runtime.jsxs("svg", {
				...svgProps,
				children: [
					react_jsx_runtime.jsx("rect", { x: 2.5, y: 2.5, width: 9, height: 9, rx: 1.5, fill: "none", stroke: "currentColor", strokeWidth: 1.4 }),
					react_jsx_runtime.jsx("path", { d: "M6 6h7m-7 3h7m-9 4h9", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" })
				]
			}),
			goal: () => react_jsx_runtime.jsxs("svg", {
				...svgProps,
				children: [
					react_jsx_runtime.jsx("circle", { cx: 8, cy: 8, r: 6, fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
					react_jsx_runtime.jsx("circle", { cx: 8, cy: 8, r: 2, fill: "currentColor" })
				]
			}),
			intent: () => react_jsx_runtime.jsx("svg", {
				...svgProps,
				children: react_jsx_runtime.jsx("path", { d: "M8 1.5 L13.5 8 L8 14.5 L2.5 8 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" })
			}),
			fact: () => react_jsx_runtime.jsxs("svg", {
				...svgProps,
				children: [
					react_jsx_runtime.jsx("path", { d: "M6.5 1.5h3v4l3.5 6.5a2 2 0 0 1-1.7 3H4.7A2 2 0 0 1 3 12L6.5 5.5z", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
					react_jsx_runtime.jsx("path", { d: "M5.6 9.5h4.8", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })
				]
			}),
			finding: () => react_jsx_runtime.jsxs("svg", {
				...svgProps,
				children: [
					react_jsx_runtime.jsx("path", { d: "M8 1.8 14.6 13.4H1.4z", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" }),
					react_jsx_runtime.jsx("path", { d: "M8 5.8v3.4", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }),
					react_jsx_runtime.jsx("circle", { cx: 8, cy: 11.4, r: .8, fill: "currentColor" })
				]
			})
		};
		const KIND_LEGEND = ["goal", "intent", "fact", "finding", "digest"];

		/** One custom flow node: a kind badge over the title and detail line, with source/target handles. */
		function ChainNode({ data, t }) {
			const node = data.node;
			const split = node.kind === "finding" ? splitFindingText(node.detail) : { desc: "", impact: "" };
			const Icon = KIND_ICONS[node.kind] || KIND_ICONS.intent;
			const stateHex = node.state === void 0 ? "" : (NODE_STATE_HEX[node.state] || "#94a3b8");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ExploreView_module_css_default.node,
				"data-kind": node.kind,
				"data-severity": node.severity,
				"data-testid": "explore-node-" + node.kind,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "target",
						position: Position.Left,
						className: ExploreView_module_css_default.handle
					}),
					// 头部：图标 + 类型名（文字不是胶囊）+ 优先级 + 编号靠右
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ExploreView_module_css_default.nodeHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ExploreView_module_css_default.nodeIcon,
								"data-kind": node.kind,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ExploreView_module_css_default.nodeTypeName,
								children: t(KIND_LABELS[node.kind])
							}),
							node.priority !== void 0 && node.priority > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ExploreView_module_css_default.nodePrio,
								"data-tone": node.priority >= 8 ? "red" : node.priority >= 5 ? "amber" : "slate",
								children: ["P", node.priority]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ExploreView_module_css_default.nodeId,
								children: "#" + String(node.id || "").replace(/^[a-z]+-/, "")
							})
						]
					}),
					// 标题（1 行）
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ExploreView_module_css_default.title,
						title: node.title,
						children: node.title
					}),
					// 摘要（2 行）
					node.kind === "digest" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ExploreView_module_css_default.detail,
						title: node.detail === "" ? "" : node.detail,
						children: t("explore.digestMembers", { n: (Array.isArray(node.memberIds) ? node.memberIds : (Array.isArray(node.factIds) ? node.factIds : [])).length }) + (node.detail === "" ? "" : " · " + node.detail)
					}) : node.kind === "finding" ? (split.desc !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ExploreView_module_css_default.detail,
						title: split.desc,
						children: split.desc
					})) : (node.detail !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ExploreView_module_css_default.detail,
						title: node.detail,
						children: node.detail
					})),
					// 底部：状态 / 等级 / owner
					(node.state !== void 0 && node.state !== "" && (node.kind === "intent" || node.kind === "goal")) || node.severity !== void 0 || (data.owner !== void 0 && data.owner !== "") ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ExploreView_module_css_default.nodeFoot,
						children: [
							node.state !== void 0 && node.state !== "" && (node.kind === "intent" || node.kind === "goal") ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ExploreView_module_css_default.nodeState,
								"data-state": node.state,
								style: { color: stateHex, borderColor: stateHex + "66" },
								children: [
									node.state === "running" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: ExploreView_module_css_default.nodeStateDot }) : null,
									t(NODE_STATE_LABELS[node.state] || "state.open")
								]
							}) : null,
							node.severity !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ExploreView_module_css_default.severity,
								"data-severity": node.severity,
								children: t(SEVERITY_LABELS$1[node.severity])
							}) : null,
							data.owner !== void 0 && data.owner !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ExploreView_module_css_default.nodeOwner,
								title: data.owner,
								children: data.owner
							}) : null
						]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Handle, {
						type: "source",
						position: Position.Right,
						className: ExploreView_module_css_default.handle
					})
				]
			});
		}
		/** One custom edge: a bezier curve with a visible relationship pill at its midpoint. */
		function ChainEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, style, data }) {
			const [path, labelX, labelY] = getStraightPath({
				sourceX,
				sourceY,
				targetX,
				targetY
			});
			// [local patch 2026-10-19] 边按关系着色：FlowEdge 上带的 style.stroke 传进来给 BaseEdge 用。
			const stroke = style !== void 0 && style.stroke !== void 0 ? style.stroke : (data !== void 0 && data.color !== void 0 ? data.color : void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaseEdge, {
				id,
				path,
				style: stroke === void 0 ? void 0 : { stroke: stroke, strokeWidth: 1.6, strokeOpacity: .75 }
			}), label !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EdgeLabelRenderer, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ExploreView_module_css_default.edgeLabel,
				style: { transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, borderColor: stroke, color: stroke },
				children: label
			}) })] });
		}
		/** HOTFIX(local): split a finding description into 漏洞描述 / 风险分析（按协议两行格式；不匹配就原样）。 */
				// 报告/详情统一口径：客户报告只要一两句话，不要把整段推理搬进去。
		function conciseSentences(value, maxSentences = 2, maxChars = 260) {
			let text = String(value || "").replace(/\s+/g, " ").trim();
			if (text === "") return "";
			const parts = text.match(/[^。！？!?]+[。！？!?]?/g) || [text];
			let out = parts.slice(0, maxSentences).join("").trim();
			if (out.length > maxChars) out = out.slice(0, maxChars - 1).replace(/[，,；;、\s]+$/, "") + "…";
			return out;
		}
		function conciseRemediation(value, maxItems = 3) {
			const raw = String(value || "").trim();
			if (raw === "") return [];
			let items = raw.split(/\n+|(?=\d+[)）.、]\s*)/).map((s) => s.trim()).filter(Boolean);
			if (items.length <= 1) items = raw.match(/[^；;。!?！？]+[；;。!?！？]?/g) || [raw];
			return items.slice(0, maxItems).map((s) => s.replace(/^\d+[)）.、]\s*/, "").replace(/^[-*]\s+/, "").trim()).filter(Boolean);
		}
		/** 完整修复建议：不截断条数，报告/详情都应展示全文。 */
		function allRemediationItems(value) {
			const raw = String(value || "").trim();
			if (raw === "") return [];
			let items = raw.split(/\n+|(?=\d+[)）.、]\s*)/).map((s) => s.trim()).filter(Boolean);
			if (items.length <= 1) items = raw.match(/[^；;。!?！？]+[；;。!?！？]?/g) || [raw];
			return items
				.map((s) => s.replace(/^\d+[)）.、]\s*/, "").replace(/^[-*]\s+/, "").trim())
				.filter(Boolean);
		}

		/** 兼容 affectedAssetId 与 affectedAssets（id / 完整 URL / 裸域名）三种关联方式。 */
		function assetHost(value) {
			const raw = String(value || "").trim();
			if (raw === "") return "";
			try {
				return new URL(raw.includes("://") ? raw : "http://" + raw).hostname.toLowerCase();
			} catch (error) {
				return "";
			}
		}

		function assetsForFinding(finding, assets) {
			const list = Array.isArray(assets) ? assets : [];
			const keys = /* @__PURE__ */ new Set();
			if (typeof finding?.affectedAssetId === "string" && finding.affectedAssetId !== "") keys.add(finding.affectedAssetId);
			for (const item of Array.isArray(finding?.affectedAssets) ? finding.affectedAssets : []) {
				if (typeof item === "string" && item !== "") keys.add(item);
			}
			const keyHosts = new Set([...keys].map(assetHost).filter(Boolean));
			return list.filter((asset) => {
				if (keys.has(asset?.id) || keys.has(asset?.value)) return true;
				const host = assetHost(asset?.value);
				if (host !== "" && keyHosts.has(host)) return true;
				const value = String(asset?.value || "");
				return [...keys].some((key) => key.length >= 4 && (value.includes(key) || String(asset?.id || "").includes(key)));
			});
		}

		function splitFindingText(text) {
			const raw = typeof text === "string" ? text.trim() : "";
			if (raw === "") return { desc: "", impact: "" };
			const cut = raw.search(/(?:\n|^)\s*(?:\(2\)|2[.、)])\s*(?:风险分析\/影响|风险分析|影响)|(?<=^|[\n。；;，,）)】])\s*(?:风险分析\/影响|风险分析|影响)\s*[:：]/);
			const head = cut < 0 ? raw : raw.slice(0, cut);
			const tail = cut < 0 ? "" : raw.slice(cut);
			const desc = head.replace(/^\s*(?:\(1\)|1[.、)])\s*/, "").replace(/^\s*(?:漏洞描述|描述)\s*[:：]?\s*/, "").replace(/[\s。；;，,]+$/, "").trim();
			const impact = tail.replace(/^\s*(?:\(2\)|2[.、)])\s*/, "").replace(/^\s*(?:风险分析\/影响|风险分析|影响)\s*[:：]?\s*/, "").trim();
			return { desc: desc, impact: impact };
		}
		/**
		 * HOTFIX(local): 把「预期」拆成多行，避免「均 200；shadow 约 501B，environ 约 455B，
		 * 特征串含 A、B、C」这种并列断言糊成一大坨。
		 * 带 JSON 片段时不按逗号拆（会把 {"a":1,"b":2} 拆烂），只拆分号。
		 */
		function formatExpectLine(text) {
			const raw = typeof text === "string" ? text.trim() : "";
			if (raw === "") return "";
			const hasJson = /[{\[]/.test(raw);
			const parts = raw.split(hasJson ? /[；;]\s*/ : /[；;，]\s*/).map((s) => s.trim()).filter((s) => s !== "");
			if (parts.length <= 1) return raw;
			return parts.join("\n");
		}
		/**
		 * HOTFIX(local): 把模型写的一句话变成报告里的自然过渡句。
		 * 绿盟报告的测试过程是「一句话 + 请求包 + 一句结果」，句子本身就是口语，
		 * 不写「步骤1」「预期」「请求包如下」。这里只做最小润色：
		 *   「写入恶意路由」            → 「写入恶意路由，发送请求包：」
		 *   「以下为 tenantid 为 318 的原始请求包」 → 「以下为 tenantid 为 318 的原始请求包：」
		 *   「成功越权读取其他账号订单」  → 原样（纯陈述，不是动作）
		 */
		const NATURAL_VERB = /(?:写入|刷新|发送|提交|上传|下载|访问|请求|抓取|构造|修改|替换|删除|创建|调用|登录|导入|注入|回显|重放|放包|拦截|触发)/;
		const ALREADY_TAIL = /[:：,，。；;]$|(?:如下|请求包|报文|发送|原始请求包)[:：]?$/;
		function naturalStepNote(note, index) {
			const raw = typeof note === "string" ? note.trim() : "";
			if (raw === "") return index === 0 ? "以下为原始请求包：" : "发送请求包：";
			// 已经带「：」或「请求包」字样的直接用
			if (ALREADY_TAIL.test(raw)) return raw.indexOf("：") >= 0 || raw.indexOf(":") >= 0 ? raw : raw + "：";
			// 动作句 → 补「，发送请求包：」
			if (NATURAL_VERB.test(raw)) return raw + "，发送请求包：";
			// 陈述句 → 补冒号（后面跟报文时读起来自然）
			return raw + "：";
		}
		/**
		 * HOTFIX(local): 判断一条 step 是「内部操作」还是「漏洞复现步骤」。
		 * 背景：实测 319 个步骤里约 20% 是落盘 / 统计 / 对照验证 / 清理现场这类内部动作，
		 * 出现在报告的「测试过程」里等于把工作痕迹交给客户（还会冒出 lead_verify_*.json
		 * 这种文件名）。报告只该有「别人照做就能复现」的最小步骤。
		 * 这里只做识别：UI 灰显标注，Markdown 导出时跳过；数据本身不改。
		 */
		// 强语义：步骤开头就是内部动作 —— 有没有报文都过滤。
		// （对照验证写进风险分析、清理现场记进 fact，都不该占报告的一步）
		const AUX_LEADING = [
			/^(?:对照验证|对照实验|对比验证|反证|补充验证|交叉验证)/,
			/^(?:清理现场|还原现场|还原|恢复现场|删除测试数据|收尾)/,
			/^(?:统计(?:泄露)?规模|统计规模|条数统计|数量统计)/,
			/^(?:命令行一键复现|一键复现|命令行复现)/,
			/^(?:保存响应|落盘|导出响应|写入文件)/,
			/^(?:准备环境|环境准备|安装工具|建立目录|起\s*VPS)/,
			// 内部工作区留档：报告里不该出现客户看不到的文件路径
			/^(?:证据路径|证据清单|证据文件|落盘路径|输出路径|导出路径|留档路径|原始报文路径)/,
			// 代码审计结论：写进「问题描述」或「风险分析」，不是复现步骤
			/^(?:源码定位|源码分析|源码级定位|代码审计|根因分析|成因分析|原理分析|漏洞成因)/,
			// 静态确认 / 静态分析：对着本地 bundle 找特征串，属于分析结论
			/^(?:静态确认|静态验证|静态分析|代码确认|源码确认|特征串确认|bundle\s*分析)/
		];
		// 弱特征：脚本 / 落盘 / 内部文件名痕迹 ——
		// 仅当整步【没有】HTTP 请求行时才算内部操作，避免把
		// 「正常请求报文 + 括号里一句保存注记」整步误杀。
		const AUX_SCRIPT = [
			// 只认「落盘」：curl -o 到真实文件。
			// 排除 -o NUL / -o /dev/null（丢弃输出，正常探测用法，实测 370 步误杀）。
			/\bcurl(?:\.exe)?\b[^\n]*?\s-o\s+(?!NUL\b|nul\b|\/dev\/null\b)\S+/i,
			/\bwget\s+-O\s|\|\s*tee\s|\bOut-File\b|\bSet-Content\b/i,
			/System\.(?:Text|IO)\.|\[regex\]|ReadAllBytes|Get-Content/i,
			/\b(?:lead|worker|agent|tmp|temp|probe)_[\w.-]+\.(?:json|txt|log|html|xml)/i,
			/统计(?:泄露)?规模|条数统计|共\s*\d+\s*条|Matches\(/i,
			/落盘|保存(?:响应|到文件)|导出到本地/,
			// 内部工作区路径：<目标>_<端口>-<MMDD>-<HHMM> 目录（IP 或域名，正反斜杠都可能）
			/\b[\w.-]+_\d+-\d{4}-\d{4}[\\/]/,
			// Windows 绝对路径 / 本地留档目录
			/[A-Za-z]:\\Users\\|[A-Za-z]:\\Documents\\|[A-Za-z]:\\Temp\\/i,
			// findstr / grep 扫本地文件的痕迹
			/\bfindstr\b|\bgrep\s+-[a-zA-Z]*\s+[\w./\\-]+/i,
		];
		const HTTP_REQUEST_LINE = /(?:^|\n)\s*(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\s+\S+\s+HTTP\/[\d.]+/;
		function isAuxiliaryStep(text) {
			const raw = typeof text === "string" ? text : "";
			if (raw === "") return false;
			const body = raw.replace(/^\s*步骤\s*\d+\s*/, "").trim();
			if (body === "") return false;
			// 1) 开头就是内部动作：无论带不带报文都算（对照验证/清理现场/统计/落盘…）
			for (const re of AUX_LEADING) if (re.test(body)) return true;
			// 2) 脚本痕迹：只有整步没有 HTTP 请求行时才判内部操作。
			//    否则会把「正常请求报文 + 括号里一句保存注记」整步误杀（实测有过）。
			if (!HTTP_REQUEST_LINE.test(body)) {
				for (const re of AUX_SCRIPT) if (re.test(body)) return true;
			}
			return false;
		}
		/**
		 * HOTFIX(local): 报告用的步骤清单 —— 滤掉内部操作。
		 * 若滤完一步不剩（极少数全内部操作的 finding），退回原始步骤，
		 * 以免报告的「测试过程」整段空掉。
		 */
		function stepsForReport(steps) {
			const all = Array.isArray(steps) ? steps : [];
			const kept = all.filter((step) => !isAuxiliaryStep(step));
			return kept.length === 0 ? all : kept;
		}
		/**
		 * HOTFIX(local): 把一个可复现步骤拆成 说明 / 预期 / 请求包 / 响应包。
		 * steps 里既能是纯说明句，也能是「说明 + 完整 HTTP 报文 + 实际响应体」，
		 * 后者在详情视图里要渲染成可复制的代码块。
		 */
		function splitStepText(text) {
			const raw = typeof text === "string" ? text : "";
			const body = raw.replace(/^\s*步骤\s*\d+\s*/, "").trim();
			if (body === "") return { note: "", expect: "", request: "", response: "" };
			// 1) 先切出 HTTP 请求报文（报文之后的所有内容进 tail 再细分）
			const reqMark = /(?:\n|^)\s*((?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\s+\S+\s+HTTP\/[\d.]+[\s\S]*)$/;
			const qm = body.match(reqMark);
			let head = body;
			let tail = "";
			if (qm !== null && typeof qm.index === "number") {
				head = body.slice(0, qm.index);
				tail = qm[1].trim();
			}
			// 2) 从说明里抽「（预期 …）」括号。
			//    必须贪婪到最后一个右括号：预期内容里常含 "uid=0(root)" 这类自己的括号，
			//    非贪婪会在那里提前截断（实测踩过）。优先匹配「括号在说明末尾」的规范形态，
			//    不中再放宽到句中，避免漏掉「…（预期 A）补充说明：」这种写法。
			let expect = "";
			const emEnd = head.match(/[（(]\s*预期\s*([\s\S]*)[）)]\s*[:：]?\s*$/);
			// 「（SCOPE 红线要求，预期 204 No Content）」这种：预期不在括号开头，
			// 也要抽出来，否则会整段留在说明里，读起来很别扭。
			const emLoose = emEnd === null ? head.match(/[（(][^（()）]*预期\s*([\s\S]*)[）)]\s*[:：]?\s*$/) : null;
			const emAny = (emEnd === null && emLoose === null) ? head.match(/[（(]\s*预期\s*([\s\S]*)[）)]/) : null;
			const em = emEnd !== null ? emEnd : (emLoose !== null ? emLoose : emAny);
			if (em !== null && typeof em.index === "number") {
				expect = em[1].trim();
				head = emEnd !== null
					? head.slice(0, em.index).trim()
					: (head.slice(0, em.index) + " " + head.slice(em.index + em[0].length)).trim();
			}
			const note = head.trim().replace(/[:：]\s*$/, "").trim();
			// 3) 报文之后：显式响应标记 → 响应包；「预期/返回」说明 → 补充到预期
			let request = tail;
			let response = "";
			if (tail !== "") {
				const respMark = /(?:\n|^)\s*(?:(?:实际响应体|实际响应|响应内容|响应体)\s*[:：]|响应\s+(?=[A-Za-z_]))\s*/;
				const rm = tail.match(respMark);
				if (rm !== null && typeof rm.index === "number") {
					request = tail.slice(0, rm.index).trim();
					response = tail.slice(rm.index + rm[0].length).trim();
				} else {
					const em2 = tail.match(/(?:\n|^)\s*(?:预期|返回)\s*([\s\S]*)$/);
					if (em2 !== null && typeof em2.index === "number") {
						request = tail.slice(0, em2.index).trim();
						const extra = em2[1].trim();
						expect = expect === "" ? extra : expect + "；" + extra;
					}
				}
			}
			// 模型常把响应直接贴在请求包后面的空行里（没有「响应」标记）。
			// 把末尾的 HTTP/1.x NNN 状态行切开，详情和报告才能分成请求/响应两块。
			const trailingResponse = request.match(/(?:\n|^)\s*(HTTP\/1\.[01]\s+[1-5]\d\d[\s\S]*)$/);
			if (response === "" && trailingResponse !== null && typeof trailingResponse.index === "number") {
				response = trailingResponse[1].trim();
				request = request.slice(0, trailingResponse.index).trim();
			}
			return { note: note, expect: expect, request: request, response: response };
		}
		/** HOTFIX(local): 详情视图里的只读代码块（带复制按钮）。 */
		function FindingCodeBlock({ label, text, t }) {
			const [copied, setCopied] = react.useState(false);
			const doCopy = () => {
				try {
					const nav = typeof navigator === "undefined" ? void 0 : navigator;
					if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
						nav.clipboard.writeText(text).then(() => {
							setCopied(true);
							setTimeout(() => setCopied(false), 1500);
						}).catch(() => {});
					}
				} catch (err) {
					/* 复制失败静默：不打断查看 */
				}
			};
			return react_jsx_runtime.jsxs("div", {
				className: "OTfrDG_code",
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "OTfrDG_codeHead",
						children: [
							react_jsx_runtime.jsx("span", { className: "OTfrDG_codeLabel", children: label }),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "OTfrDG_copyBtn",
								onClick: doCopy,
								children: copied ? t("finding.detail.copied") : t("finding.detail.copy")
							})
						]
					}),
					react_jsx_runtime.jsx("pre", { className: "OTfrDG_codePre", children: text })
				]
			});
		}
		/** HOTFIX(local): 详情视图里的一个信息块。 */
		function FindingBlock({ label, text }) {
			return react_jsx_runtime.jsxs("div", {
				className: "OTfrDG_block",
				children: [
					react_jsx_runtime.jsx("span", { className: "OTfrDG_blockLabel", children: label }),
					react_jsx_runtime.jsx("p", { className: "OTfrDG_blockValue", children: text })
				]
			});
		}
		/**
		 * HOTFIX(local): 把「预期」改写成报告里的结果陈述。
		 * 参考绿盟（NSFOCUS）报告惯例：测试过程里不写「预期」，直接陈述结果——
		 * 「返回 201 Created」「均返回 200」「成功越权创建组织」。
		 */
		function expectAsResult(expect) {
			const raw = typeof expect === "string" ? expect.trim() : "";
			if (raw === "") return "";
			const lines = raw.split("\n").map((s) => s.trim()).filter((s) => s !== "");
			return lines.map((line) => {
				let m = line.match(/^HTTP\/[\d.]+\s+([\s\S]+)$/);
				if (m !== null) return "返回 " + m[1];
				if (/^\d{3}(?:\s|$)/.test(line)) return "返回 " + line;
				m = line.match(/^(均)\s*(\d{3}[\s\S]*)$/);
				if (m !== null) return m[1] + "返回 " + m[2];
				m = line.match(/^(全部)\s*(\d{3}[\s\S]*)$/);
				if (m !== null) return m[1] + "返回 " + m[2];
				return line;
			}).join("；");
		}
		/**
		 * HOTFIX(local): 报告里响应包只保留关键。
		 * 绿盟报告的测试过程用 BP 截图做证据，贴完整响应体没价值、只会让报告变长。
		 * 裁剪后附一句提示，提醒写报告的人用截图替换。
		 */
		const RESPONSE_KEEP_CHARS = 600;
		function trimResponseText(text) {
			const raw = typeof text === "string" ? text.trim() : "";
			if (raw === "") return "";
			if (raw.length <= RESPONSE_KEEP_CHARS) return raw;
			return raw.slice(0, RESPONSE_KEEP_CHARS).trimEnd() + "\n…（响应体已截断，报告建议用 BP 截图替换）";
		}
		/**
		 * HOTFIX(local): 生成一条漏洞的 Markdown 章节。
		 * 结构对齐绿盟（NSFOCUS）渗透测试报告模板：
		 *   漏洞名称（风险程度：X）
		 *   问题描述 / 测试过程（漏洞位置 + 一步步做 + 请求包 + 结果）/ 风险分析 / 修复建议
		 * 测试过程不写「预期」「步骤N」，用「做什么，请求包如下：」+「返回…」的叙述口吻。
		 * 请求包原样输出（要能直接粘进 Burp Repeater），响应包裁剪到关键部分。
		 * opts.level: 标题层级（默认 3）；opts.seq: 章节序号（报告里显示「### 1. xxx」）。
		 */
		/** 兜底说明：只说这一步做什么、看什么；不复述漏洞全名、不套模板。 */
		function fallbackStepNoteMarkdown(finding, index, step) {
			const raw = typeof step === "string" ? step : "";
			const line = raw.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+(\S+)\s+HTTP\b/i);
			const host = raw.match(/^Host:\s*(\S+)/mi);
			const target = [host ? host[1] : "", line ? line[2] : ""].filter(Boolean).join("");
			if (!line || !target) return index === 0 ? "记录本次请求与响应。" : "继续检查下一步返回。";
			const method = line[1].toUpperCase();
			const path = line[2];
			if (index === 0) return "先请求 " + target + "，记下返回状态和内容，作为后续判断的基线。";
			if (method === "POST" || method === "PUT" || method === "PATCH") return "对 " + path + " 提交上面的数据，看服务端是否接受并返回结果。";
			if (method === "DELETE") return "尝试删除 " + path + "，确认接口是否真的执行。";
			return "再请求 " + path + "，核对返回是否与上一步一致。";
		}
		/** 详情/报告共用：优先用真实 stepNotes，缺失才用上面的短兜底。
		 *  「（预期 …）」是猜测，不该出现；真实结果由下面的响应包给出。 */
		function stepNoteFor(finding, index, rawStep, split) {
			const notes = Array.isArray(finding && finding.stepNotes) ? finding.stepNotes : [];
			const fromNotes = String(notes[index] || "").trim();
			const fromStep = String(split && split.note || "").trim();
			const clean = (text) => text
				.replace(/[（(]?\s*预期\s*[^）)]*[）)]?/g, "")
				.replace(/([，,。；;])\1+/g, "$1")
				.replace(/[，,。；;\s]+$/, "")
				.trim();
			const a = clean(fromNotes);
			const b = clean(fromStep);
			if (a !== "" && !/^(步骤\s*\d+)?$/.test(a)) return a;
			if (b !== "" && !/^(步骤\s*\d+)?$/.test(b)) return b;
			return fallbackStepNoteMarkdown(finding, index, rawStep);
		}
		/** 报告用：接口来源（JS bundle / 源文件 / 路由定义）。 */
		function interfaceSourcesOfFinding(finding) {
			const out = [];
			const add = (value) => {
				const item = typeof value === "string" ? value.trim() : "";
				if (item !== "" && out.indexOf(item) < 0) out.push(item);
			};
			for (const key of ["apiSources", "interfaceSources", "sourceFiles", "sources"]) {
				const list = Array.isArray(finding && finding[key]) ? finding[key] : [];
				for (const item of list) add(item);
			}
			add(finding && finding.apiSource);
			add(finding && finding.interfaceSource);
			const refs = (Array.isArray(finding && finding.evidenceRefs) ? finding.evidenceRefs : []).concat(String(finding && finding.trafficRef ? finding.trafficRef : ""));
			for (const ref of refs) if (/(?:\.js|\.mjs|\.ts|\.tsx|\.map|bundle|sourcemap|static[\\/]js|assets[\\/]index-)/i.test(String(ref))) add(ref);
			return out;
		}
				function findingSectionMarkdown(finding, pentest, t, opts) {
			const L = [];
			const o = opts === void 0 ? {} : opts;
			const level = typeof o.level === "number" ? o.level : 3;
			const hashes = "#".repeat(level);
			const sub = "#".repeat(level + 1);
			const seq = typeof o.seq === "number" ? String(o.seq + 1) + ". " : "";
			const split = splitFindingText(finding.description);
			const desc = String(split.desc || "").trim();
			const risk = String(typeof finding.riskAnalysis === "string" && finding.riskAnalysis.trim() !== "" ? finding.riskAnalysis.trim() : split.impact || "").trim();
			const fixItems = allRemediationItems(finding.remediation);
			const linkedAssets = assetsForFinding(finding, pentest.assets);
			const lineagePentest = normalizeLineageProjection(pentest);
			const lineageFinding = (Array.isArray(lineagePentest.findings) ? lineagePentest.findings.find((f) => f.id === finding.id) : void 0) || finding;
			const lineageIntent = lineageFinding.intentId === void 0 ? void 0 : (Array.isArray(lineagePentest.nodes) ? lineagePentest.nodes.find((n) => n.id === lineageFinding.intentId) : void 0);
			const lineageIntentTitle = String(lineageFinding.lineageIntentTitle || "") || (lineageIntent !== void 0 ? String(lineageIntent.title || lineageIntent.id || "") : (pentest.goal !== null && pentest.goal !== void 0 && lineageFinding.intentId === pentest.goal.id ? t("kind.goal") + ": " + String(pentest.goal.target || pentest.goal.id || "") : ""));
			// 报告只留「别人照做就能复现」的最小步骤，跳过落盘/统计/对照/清理这类内部操作。
			const rawSteps = Array.isArray(finding.steps) ? finding.steps : [];
			const stepNotes = Array.isArray(finding.stepNotes) ? finding.stepNotes : [];
			const stepEntries = rawSteps.map((step, index) => ({ step, note: String(stepNotes[index] || "").trim() }));
			const keptEntries = stepEntries.filter((entry) => !isAuxiliaryStep(entry.step));
			const steps = keptEntries.length > 0 ? keptEntries : stepEntries;
			const apiSources = interfaceSourcesOfFinding(finding);
			const sev = t(SEVERITY_LABELS[finding.severity]);
			L.push(hashes + " " + seq + String(finding.title || "") + "（风险程度：" + sev + "）");
			L.push("");
			if (desc !== "") {
				L.push(sub + " 漏洞描述");
				L.push("");
				L.push(desc);
				L.push("");
			}
			L.push(sub + " 接口来源");
			L.push("");
			if (apiSources.length === 0) {
				L.push("- 未记录（请用 pentest_update_finding 补充 apiSources：JS bundle / 源文件 / 路由定义位置）");
			} else {
				for (const source of apiSources) L.push("- " + source);
			}
			L.push("");
			L.push(sub + " 测试过程");
			L.push("");
			if (lineageIntentTitle !== "") {
				L.push("功能点：" + lineageIntentTitle);
				L.push("");
			}
			for (const linked of linkedAssets) {
				if (String(linked?.value || "") === "") continue;
				L.push("漏洞链接：[" + String(linked.type || "") + "] " + String(linked.value || ""));
				L.push("");
			}
			// 绿盟式写法：一句话（口语） + 原始请求包 + 一句结果。不出现「步骤N」「请求包如下」
			// 「实际响应体：」这类机器标签 —— 这些标签一出现，报告立刻不像人写的。
			steps.forEach((entry, i) => {
				const step = entry.step;
				const sp = splitStepText(step);
				if (sp.request !== "") {
					// 有报文时才润色成过渡句（「写入恶意路由，发送请求包：」）
					const noteText = stepNoteFor(finding, i, step, sp)
						.replace(/^\s*(?:步骤\s*\d+\s*[:：]?\s*|\d+\s*[)）.、]\s*)/, "").trim();
					const note = naturalStepNote(noteText, i);
					// 请求包原样输出：要能直接粘进 Burp Repeater 就发，不做任何裁剪。
					L.push(note);
					L.push("");
					L.push("```http");
					L.push(sp.request);
					L.push("```");
					L.push("");
					if (sp.response !== "") {
						// 响应只留关键：报告里这段通常贴 BP 截图。
						L.push("返回：");
						L.push("");
						L.push("```");
						L.push(trimResponseText(sp.response));
						L.push("```");
						L.push("");
					} else if (sp.expect !== "") {
						L.push(expectAsResult(sp.expect));
						L.push("");
					}
				} else {
					// 纯陈述步骤（没报文）：原样输出，不加任何标签或冒号。
					const plainRaw = String(entry.note || "").trim() || (sp.note !== "" ? sp.note : fallbackStepNoteMarkdown(finding, i, step));
					const plain = plainRaw.replace(/^\s*(?:步骤\s*\d+\s*[:：]?\s*|\d+\s*[)）.、]\s*)/, "").trim();
					const tail = sp.expect === "" ? "" : "，" + expectAsResult(sp.expect);
					L.push(plain + tail);
					L.push("");
				}
			});
			if (risk !== "") {
				L.push(sub + " 风险分析");
				L.push("");
				L.push(risk);
				L.push("");
			}
			L.push(sub + " 修复建议");
			L.push("");
			if (fixItems.length === 0) L.push("（待补充）");
			else fixItems.forEach((item) => L.push("- " + item));
			L.push("");
			return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
		}
		/** 单条漏洞复制（详情页「复制 Markdown」用）。 */
		function findingToMarkdown(finding, pentest, t) {
			return findingSectionMarkdown(finding, pentest, t, { level: 3 });
		}
		/**
		 * HOTFIX(local): 「漏洞」tab 的详情视图。
		 * 列表 ↔ 详情在同一个 tab 内切换（不弹遮罩、不用抽屉），参考 ARTEX 的独立详情页：
		 * 顶部返回 + 上一条/下一条，正文分块给 基本信息 / 功能点 / 漏洞链接 / 完整测试过程，
		 * 报文用等宽代码块渲染并带复制。
		 */
		function FindingDetailView({ pentest, t, finding, findings, onBack, onSelect }) {
			const idx = findings.findIndex((f) => f.id === finding.id);
			const prev = idx > 0 ? findings[idx - 1] : void 0;
			const next = idx >= 0 && idx < findings.length - 1 ? findings[idx + 1] : void 0;
			const split = splitFindingText(finding.description);
			// 详情页展示完整描述，不再截成 1-2 句；列表卡片仍保留摘要。
			const desc = String(split.desc || finding.description || "").trim();
			const risk = String(typeof finding.riskAnalysis === "string" && finding.riskAnalysis.trim() !== "" ? finding.riskAnalysis.trim() : split.impact || "").trim();
			const fixItems = allRemediationItems(finding.remediation);
			const lineagePentest = normalizeLineageProjection(pentest);
			const lineageFinding = (Array.isArray(lineagePentest.findings) ? lineagePentest.findings.find((f) => f.id === finding.id) : void 0) || finding;
			const linkedAssets = assetsForFinding(finding, pentest.assets);
			const intent = lineageFinding.intentId === void 0 ? void 0 : (Array.isArray(lineagePentest.nodes) ? lineagePentest.nodes.find((n) => n.id === lineageFinding.intentId) : void 0);
			const intentTitle = intent !== void 0 ? String(intent.title || intent.id || "") : (String(lineageFinding.lineageIntentTitle || "") || (pentest.goal !== null && pentest.goal !== void 0 && lineageFinding.intentId === pentest.goal.id ? t("kind.goal") + ": " + String(pentest.goal.target || pentest.goal.id || "") : ""));
			const goal = pentest.goal === null || pentest.goal === void 0 ? void 0 : pentest.goal;
			// 详情视图与报告口径一致：内部操作（落盘/统计/对照/清理/证据路径/源码定位）不显示。
			// stepsForReport 在滤完为空时会退回原始步骤，避免整段空掉。
			const steps = stepsForReport(finding.steps);
			const validationVerdict = finding.validation && typeof finding.validation === "object"
				? (finding.validation.verdict === "reproduced" ? "已复现" : finding.validation.verdict === "not_reproduced" ? "未复现" : finding.validation.verdict === "inconclusive" ? "待确认" : String(finding.validation.verdict || ""))
				: "";
			const subParts = [];
			if (goal !== void 0) subParts.push(t("kind.goal") + ": " + String(goal.target || goal.title || goal.id || ""));
			for (const linked of linkedAssets) {
				if (String(linked?.value || "") === "") continue;
				subParts.push("[" + String(linked.type || "") + "] " + String(linked.value || ""));
			}
			// HOTFIX(local): 一键复制成 Markdown（写报告用）。
			const [copiedMd, setCopiedMd] = react.useState(false);
			const copyMd = () => {
				try {
					const text = findingToMarkdown(finding, pentest, t);
					const nav = typeof navigator === "undefined" ? void 0 : navigator;
					if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
						nav.clipboard.writeText(text).then(() => {
							setCopiedMd(true);
							setTimeout(() => setCopiedMd(false), 1600);
						}).catch(() => {});
					}
				} catch (err) {
					/* 复制失败静默 */
				}
			};
			return react_jsx_runtime.jsxs("div", {
				className: "OTfrDG_detailRoot",
				"data-testid": "pentest-finding-detail",
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "OTfrDG_detailBar",
						children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "OTfrDG_detailBarBtn",
								onClick: onBack,
								children: "← " + t("finding.detail.back")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "OTfrDG_detailBarBtn",
								disabled: prev === void 0,
								onClick: () => {
									if (prev !== void 0) onSelect(prev.id);
								},
								children: t("finding.detail.prev")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "OTfrDG_detailBarBtn",
								disabled: next === void 0,
								onClick: () => {
									if (next !== void 0) onSelect(next.id);
								},
								children: t("finding.detail.next")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "OTfrDG_detailBarBtn",
								"data-testid": "pentest-finding-copy-md",
								onClick: copyMd,
								children: copiedMd ? t("finding.detail.copyMdDone") : t("finding.detail.copyMd")
							}),
							react_jsx_runtime.jsx("span", {
								className: "OTfrDG_detailPos",
								children: (idx + 1) + " / " + findings.length
							})
						]
					}),
					react_jsx_runtime.jsxs("div", {
						className: "OTfrDG_detailBody",
						style: { display: "flex", flexDirection: "column" },
						children: [
							react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_detailHead",
								children: [
									react_jsx_runtime.jsxs("div", {
										className: "OTfrDG_header",
										children: [
											react_jsx_runtime.jsx("span", {
												className: "OTfrDG_severity",
												"data-severity": finding.severity,
												"data-category": finding.category,
												children: findingBadgeLabel(finding, t)
											}),
											finding.evidenceStatus !== void 0 && finding.evidenceStatus !== "confirmed" && finding.evidenceStatus !== "已验证" ? react_jsx_runtime.jsx("span", {
												className: "OTfrDG_evidence",
												"data-status": finding.evidenceStatus,
												children: t(finding.evidenceStatus === "likely" ? "evidence.likely" : "evidence.unverified")
											}) : null,
												react_jsx_runtime.jsx("span", { className: "OTfrDG_id", children: finding.id })
										]
									}),
									react_jsx_runtime.jsx("h3", { className: "OTfrDG_detailTitle", children: shortFindingTitle(finding) }),
									subParts.length === 0 ? null : react_jsx_runtime.jsx("p", {
										className: "OTfrDG_detailSub",
										children: subParts.join(" · ")
									})
								]
							}),
							desc === "" ? null : react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_para",
								style: { order: 1 },
								children: [
									react_jsx_runtime.jsx("div", { className: "OTfrDG_paraLabel", children: t("explore.desc") }),
									react_jsx_runtime.jsx("p", { className: "OTfrDG_paraText", children: desc })
								]
							}),
							risk === "" ? null : react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_para",
								style: { order: 3 },
								children: [
									react_jsx_runtime.jsx("div", { className: "OTfrDG_paraLabel", children: "风险分析" }),
									react_jsx_runtime.jsx("p", { className: "OTfrDG_paraText", children: risk })
								]
							}),
							fixItems.length === 0 ? null : react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_para",
								style: { order: 4 },
								children: [
									react_jsx_runtime.jsx("div", { className: "OTfrDG_paraLabel", children: "修复建议" }),
									fixItems.map((item, i) => react_jsx_runtime.jsx("p", {
										className: "OTfrDG_paraText",
										style: { margin: "2px 0" },
										children: i + 1 + ". " + item
									}, i))
								]
							}),
							react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_block",
								style: { order: 2 },
								children: [
									react_jsx_runtime.jsx("span", {
										className: "OTfrDG_blockLabel",
										children: t("finding.detail.process") + " (" + steps.length + ")"
									}),
							react_jsx_runtime.jsxs("div", {
								className: "OTfrDG_kvList",
								children: [
									react_jsx_runtime.jsxs("div", {
										className: "OTfrDG_kv",
										children: [
											react_jsx_runtime.jsx("span", { className: "OTfrDG_kvLabel", children: t("finding.detail.func") }),
											react_jsx_runtime.jsx("span", {
												className: "OTfrDG_kvValue",
												children: intentTitle === "" ? t("finding.detail.nointent") : intentTitle
											})
										]
									}),
									react_jsx_runtime.jsxs("div", {
										className: "OTfrDG_kv",
										children: [
											react_jsx_runtime.jsx("span", { className: "OTfrDG_kvLabel", children: t("finding.detail.link") }),
											react_jsx_runtime.jsx("span", {
												className: "OTfrDG_kvValue",
												children: linkedAssets.length === 0 ? t("finding.detail.noasset") : linkedAssets.map((asset) => "[" + String(asset.type || "") + "] " + String(asset.value || "")).join(" · ")
											})
										]
									})
								]
							}),
									validationVerdict === "" ? null : react_jsx_runtime.jsx("p", {
										className: "OTfrDG_blockValue",
										children: "验证结论：" + validationVerdict
									}),
									steps.length === 0
										? react_jsx_runtime.jsx("p", { className: "OTfrDG_blockValue", children: t("finding.detail.noSteps") })
										: steps.map((step, i) => {
											const sp = splitStepText(step);
											const note = stepNoteFor(finding, i, step, sp);
											const response = trimResponseText(sp.response);
											const result = sp.response === "" && sp.expect !== "" ? expectAsResult(formatExpectLine(sp.expect)) : "";
											// 参考绿盟报告：一步 = 「做什么/为什么」+ 请求包 + 响应关键部分。
											// 不再出现空的「步骤 N」标题。
											return react_jsx_runtime.jsxs("div", {
												className: "OTfrDG_step",
												children: [
													react_jsx_runtime.jsx("p", {
														className: "OTfrDG_stepNote",
														"data-testid": "pentest-step-note",
														children: note
													}),
													sp.request === "" ? null : react_jsx_runtime.jsx(FindingCodeBlock, {
														label: t("finding.detail.request"),
														text: sp.request,
														t: t
													}),
													response !== "" ? react_jsx_runtime.jsx(FindingCodeBlock, {
														label: t("finding.detail.response"),
														text: response,
														t: t
													}) : (result === "" ? null : react_jsx_runtime.jsx("p", {
														className: "OTfrDG_stepResult",
														children: result
													}))
												]
											});
										})
								]
							})
						]
					})
				]
			});
		}
		/** HOTFIX(local): chain view — 默认隐藏事实，保留 目标→意图→漏洞；漏洞可按等级筛选（severities=null 即全部）。 */
		// [local patch 2026-10-19] 链路图布局：照 ARTEX computeLayout 的做法重写。
		// 原来用 depthsOf(BFS 首次到达定层) + stackByDepth(按层堆叠)，两个问题：
		//   1) 菱形依赖时后到的边必然反向跨层（goal→intent-1 和 goal→intent-2→fact-1→intent-1
		//      会让 intent-1 定在 level 1，那条 fact-1→intent-1 画成回头箭头）
		//   2) 层内按插入顺序排，边交叉成一团；也不做垂直居中，图偏上
		// 现在：DFS 破环 → 拓扑最长路径定层 → barycenter 4 轮排序 → 垂直居中。
		// 节点宽 260，列间距 360 = 260 + 100 间隙（原来 320 只留 60，节点几乎贴在一起）。
		// 节点渲染高度约 96~130，行间距 160 = 节点高 + 30~60 间隙（原来 236 太空）。
		const CHAIN_COL_W = 212;
		const CHAIN_ROW_H = 110;
		// 每个子列最多放几个节点；超过就折到右边一个子列（避免「一列 30 个」堆成竖线）。
		// 每列上限：DSH 的意图是 goal 的星形子节点（不像 ARTEX 有分叉），
		// 全堆一列会有 1500px 高、右边大片空白；6 又会拆出一堆窄列。10 是折中。
		// [local patch 2026-10-21] 7 → 10。
  // 7 的时候，39 条事实会折成 6 个子列、横铺 1272px，视觉上「事实飘到右边去了」。
  // 10 之后同样 39 条只折 4 列，事实能贴着各自的意图排，边也短一半。
  const CHAIN_WRAP = 7;
	// [local patch 2026-10-21] 叶子层（事实/漏洞）单独一套折列与行高。
	// 实测 41 个叶子（39 事实 + 2 漏洞）按 CHAIN_WRAP=10 折成 5 列、横铺 1060px，
	// 意图只占 212px —— 事实看起来「飞到了右边」。叶子层内容短，可以排得更密：
	// 每列 12 个、行高 96，3-4 列就能装下，横向不再超出意图太多。
	const CHAIN_WRAP_LEAF = 7;
	const CHAIN_ROW_LEAF = 96;
		function pushInto(map, k, v) {
			const cur = map.get(k);
			if (cur !== void 0) cur.push(v); else map.set(k, [v]);
		}
		function computeChainLayout(nodes, edges) {
			const order = nodes.map((n) => n.id);
			const idset = new Set(order);
			// 边方向都是前进方向（addNode 里 target 永远是新建节点）：
			//   spawns: goal→intent   yields: intent→fact
			//   derived_from: fact→intent   proves: intent→finding
			// parent 是资产图的边（asset→asset），这里节点集不含资产，自然被下面过滤掉。
			const valid = edges.filter((e) => idset.has(e.sourceId) && idset.has(e.targetId));
			const ekey = (a, b) => a + "->" + b;
			// 1) DFS 找 back edge（真正的环）
			const out = new Map();
			for (const e of valid) pushInto(out, e.sourceId, e.targetId);
			const seen = new Map();
			const back = new Set();
			for (const root of order) {
				if ((seen.get(root) || 0) !== 0) continue;
				const stack = [{ u: root, i: 0 }];
				seen.set(root, 1);
				while (stack.length > 0) {
					const top = stack[stack.length - 1];
					const nbrs = out.get(top.u) || [];
					if (top.i >= nbrs.length) { seen.set(top.u, 2); stack.pop(); continue; }
					const v = nbrs[top.i++];
					const st = seen.get(v) || 0;
					if (st === 1) back.add(ekey(top.u, v));
					else if (st === 0) { seen.set(v, 1); stack.push({ u: v, i: 0 }); }
				}
			}
			// 2) 去掉回边做拓扑，取最长路径定层
			//
			// [local patch 2026-10-21] 分层只认 spawns / yields / proves，**跳过 derived_from**。
			//
			// derived_from 是 fact → intent 的「回头边」：从某条事实派生出下一个意图。
			// 它一旦参与分层，意图链就变成阶梯 —— intent1(col1) → fact(col2) →
			// intent2(col3) → fact(col4) → intent3(col5)…，跨 5-6 列。
			// 而 goal -spawns-> 每个 intent 的边就从 col0 拉向各处，
			// 整张图变成一把扇形长斜线（实测截图：目标在左上，意图散在中上，事实飘在右侧）。
			//
			// 跳过它之后：goal(col0) / intent(col1) / fact+找洞(col2)，
			// 意图回到同一竖列，事实贴着各自的意图，回头边只作为一条短的后向线存在。
			const succ = new Map();
			const indeg = new Map(order.map((id) => [id, 0]));
			for (const e of valid) {
				if (back.has(ekey(e.sourceId, e.targetId))) continue;
				if (e.kind === "derived_from") continue;
				pushInto(succ, e.sourceId, e.targetId);
				indeg.set(e.targetId, (indeg.get(e.targetId) || 0) + 1);
			}
			const layer = new Map(order.map((id) => [id, 0]));
			const queue = order.filter((id) => (indeg.get(id) || 0) === 0);
			for (let qi = 0; qi < queue.length; qi++) {
				const u = queue[qi];
				const nexts = succ.get(u) || [];
				for (const v of nexts) {
					layer.set(v, Math.max(layer.get(v) || 0, (layer.get(u) || 0) + 1));
					const d = (indeg.get(v) || 0) - 1;
					indeg.set(v, d);
					if (d === 0) queue.push(v);
				}
			}
			// [local patch 2026-10-21] 有 goal 时把所有意图压到第 1 层。
			// 跳过 derived_from 之后，没有 spawns 边的意图会落在第 0 层、和目标挤在一列；
			// 这里统一抬到第 1 层，保证「目标 → 意图 → 事实/漏洞」三列结构稳定。
			const kindOfNode2 = new Map(nodes.map((n) => [n.id, n.kind]));
			const hasGoalNode = nodes.some((n) => n.kind === "goal");
			if (hasGoalNode) {
				for (const id of order) {
					if (kindOfNode2.get(id) === "intent" && (layer.get(id) || 0) < 1) layer.set(id, 1);
				}
			}
			// finding 必须排在它的验证卡后面（右边），不能和 fact 一起被塞在
			// 同一列下方。对每个 finding 取所有入边的最大层 + 1；显示事实时
			// 自然落到 fact 列的右侧，隐藏事实时落到 verify 列的右侧。
			for (const id of order) {
				if (kindOfNode2.get(id) !== "finding") continue;
				let parentMax = -1;
				for (const edge of valid) {
					if (edge.targetId !== id) continue;
					parentMax = Math.max(parentMax, layer.get(edge.sourceId) || 0);
				}
				if (parentMax >= 0) layer.set(id, parentMax + 1);
			}

			// 3) 分列 + barycenter 4 轮（正反交替）减少边交叉
			const maxLayer = Math.max(0, ...layer.values());
			const columns = Array.from({ length: maxLayer + 1 }, () => []);
			for (const id of order) columns[layer.get(id) || 0].push(id);
			const colIndexOf = new Map();
			columns.forEach((ids, c) => ids.forEach((id) => colIndexOf.set(id, c)));
			const neighbors = new Map();
			for (const e of valid) {
				const cs = colIndexOf.get(e.sourceId);
				const cd = colIndexOf.get(e.targetId);
				if (cs === void 0 || cd === void 0 || Math.abs(cs - cd) !== 1) continue;
				pushInto(neighbors, e.sourceId, e.targetId);
				pushInto(neighbors, e.targetId, e.sourceId);
			}
			const sweep = (dir) => {
				const start = dir === 1 ? 1 : columns.length - 2;
				const end = dir === 1 ? columns.length : -1;
				for (let c = start; c !== end; c += dir) {
					const ref = c - dir;
					const refIndex = new Map(columns[ref].map((id, i) => [id, i]));
					const scored = columns[c].map((id, i) => {
						const ns = (neighbors.get(id) || []).map((nid) => refIndex.get(nid)).filter((v) => v !== void 0);
						const bary = ns.length === 0 ? i : ns.reduce((a, b) => a + b, 0) / ns.length;
						return { id: id, bary: bary, i: i };
					});
					scored.sort((a, b) => (a.bary - b.bary) || (a.i - b.i));
					columns[c] = scored.map((x) => x.id);
				}
			};
			for (let iter = 0; iter < 4; iter++) { sweep(1); sweep(-1); }
			// 4) 层内换行 + 垂直居中
			// 真实数据是「宽而浅」：1 个 goal 扇出 30 个 intent、每个 intent 再出 finding。
			// 纯分层会让每列垂直堆 30 个节点，整张图缩成一条竖线（实测截图）。
			// 这里每列超过 CHAIN_WRAP 个就折成子列，横向铺开，保持从左到右的层级次序。
			// [local patch 2026-10-21] 折列宽度按列决定：事实列永远不折。
			//
			// 事实是叶子层（intent --yields--> fact），折列只会把它横向推远：
			// 17 条事实按 7 折 3 列后，最后一列离意图 400px+，连线拉成长斜线，
			// 视觉上就是「事实飞出去了」。单列竖排虽然高，但始终贴着意图，边也短。
			// 其它层（意图扇出、漏洞）保持 CHAIN_WRAP，避免竖成一条线。
			const kindOfNode = new Map(nodes.map((n) => [n.id, n.kind]));
			// 叶子层 = 整层都是 fact/finding（没有 goal/intent）。
			// 原来是「全是 fact」才不折 —— 但 finding 和 fact 同层（都是 intent 的产出），
			// 只要有一个 finding，判断就失效，整层退回 CHAIN_WRAP 折成 5 列。
			const isLeafColumn = (ids) => ids.length > 0 && ids.every((id) => {
				const k = kindOfNode.get(id);
				return k === "fact" || k === "finding";
			});
			// 叶子层折列宽度用固定 CHAIN_WRAP_LEAF。
			//
			// 试过按父层跨度动态算（每列 ≈ 父跨度/行高）：纵向偏差 202→139px，
			// 但 39 条事实被折成 7 列，横向从 1060 涨到 1484px —— 边反而更长。
			// 横向距离比纵向偏差更伤可读性（视线要横扫整屏），所以回退固定值。
			// 真正的解法不是布局，是默认隐藏事实（hideFacts 初始 true）。
			const wrapOfColumn = (ids) => isLeafColumn(ids) ? CHAIN_WRAP_LEAF : CHAIN_WRAP;
			const rowHOfColumn = (ids) => isLeafColumn(ids) ? CHAIN_ROW_LEAF : CHAIN_ROW_H;
			const colBase = new Map();
			let totalCols = 0;
			for (let c = 0; c <= maxLayer; c++) {
				colBase.set(c, totalCols);
				totalCols += Math.max(1, Math.ceil(columns[c].length / wrapOfColumn(columns[c])));
			}
			const midline = ((Math.min(CHAIN_WRAP, Math.max(1, ...columns.map((c) => c.length))) - 1) * CHAIN_ROW_H) / 2;
			const pos = new Map();
			// [local patch 2026-10-21] 每列（子列）的纵向锚点 = 它自己那批父节点的 y 中心。
			//
			// 之前所有列共用同一个 midline 基准，于是「节点多的层」被均匀摊开到很长的 y 区间：
			// 实测 17 条事实跨 y=-33→1023（1056px），而 7 个意图只跨 165→825（660px）。
			// 两边 y 范围不一致，事实和它的意图就对不上，连线全部变成大斜线。
			//
			// 现在每折一列就算一次父节点平均 y，让这列围着它的来源排：
			// 前几个意图的产出聚在上半，后几个的聚在下半，边自然变短。
			const yOf = new Map();
			const parentYCenter = (chunk) => {
				let sum = 0;
				let n = 0;
				for (const id of chunk) {
					for (const e of valid) {
						if (e.targetId !== id) continue;
						const py = yOf.get(e.sourceId);
						if (py === void 0) continue;
						sum += py;
						n += 1;
					}
				}
				return n > 0 ? sum / n : midline;
			};
			columns.forEach((ids, c) => {
				const wrap = wrapOfColumn(ids);
				const rowH = rowHOfColumn(ids);
				const base = colBase.get(c) || 0;
				const subCount = Math.max(1, Math.ceil(ids.length / wrap));
				for (let sub = 0; sub < subCount; sub++) {
					const chunk = ids.slice(sub * wrap, (sub + 1) * wrap);
					const anchor = parentYCenter(chunk);
					const startY = anchor - ((chunk.length - 1) * rowH) / 2;
					chunk.forEach((id, i) => {
						const y = startY + i * rowH;
						pos.set(id, { x: (base + sub) * CHAIN_COL_W, y });
						yOf.set(id, y);
					});
				}
			});
			return pos;
		}
		/** 给节点补上 x/y（computeChainLayout 算出来的坐标）。 */
		function applyChainLayout(nodes, edges) {
			const pos = computeChainLayout(nodes, edges);
			return nodes.map((node) => {
				const p = pos.get(node.id);
				return p === void 0 ? { ...node, x: 0, y: 0 } : { ...node, x: p.x, y: p.y };
			});
		}

		function layoutChain(projection, opts) {
			const full = layoutExploration(projection);
			// [local patch 2026-10-25] 寻找真实的验证来源：projection 把没有来源的
			// auto verify intent 折叠成 goal，于是图上出现「目标 --证实--> 漏洞」。
			// 这里恢复一个虚拟 verify 意图，保持语义为 intent --证实--> finding。
			const virtualGoalId = projection.goal === null || projection.goal === void 0 ? "goal-1" : projection.goal.id;
			const virtualVerifyNodes = [];
			const rewrittenEdges = [];
			for (const edge of full.edges) {
				if (edge.kind !== "proves") {
					rewrittenEdges.push(edge);
					continue;
				}
				const sourceNode = full.nodes.find((node) => node.id === edge.sourceId);
				if (sourceNode !== void 0 && sourceNode.kind === "fact") {
					const yieldEdge = full.edges.find((candidate) => candidate.kind === "yields" && candidate.targetId === edge.sourceId);
					const sourceIntent = yieldEdge === void 0 ? void 0 : full.nodes.find((node) => node.id === yieldEdge.sourceId && node.kind === "intent");
					if (sourceIntent !== void 0) {
						rewrittenEdges.push({ ...edge, sourceId: sourceIntent.id });
						continue;
					}
				}
				if (edge.sourceId !== virtualGoalId) {
					rewrittenEdges.push(edge);
					continue;
				}
				const finding = full.nodes.find((node) => node.id === edge.targetId);
				if (finding === void 0 || finding.kind !== "finding") {
					rewrittenEdges.push(edge);
					continue;
				}
				const verifyId = "virtual-verify-" + finding.id;
				if (!virtualVerifyNodes.some((node) => node.id === verifyId)) {
					virtualVerifyNodes.push({
						id: verifyId,
						kind: "intent",
						intentKind: "verify",
						virtual: true,
						title: "验证：" + String(finding.title || ""),
						detail: "自动补齐的验证意图：原 auto verify 被折叠到目标，不能由目标直接证实漏洞。",
						x: 0,
						y: 0,
						createdAt: Number(finding.createdAt) || 0
					});
					rewrittenEdges.push({
						id: "virtual-verify-spawn-" + finding.id,
						kind: "derived_from",
						sourceId: virtualGoalId,
						targetId: verifyId,
						createdAt: Number(finding.createdAt) || 0
					});
				}
				rewrittenEdges.push({ ...edge, sourceId: verifyId });
			}
			full.nodes = full.nodes.concat(virtualVerifyNodes);
			full.edges = rewrittenEdges;
			// [local patch 2026-10-25] 压缩节点连接：投影里的 digest 只有成员事实 id，
			// 没有边；隐藏事实时就会变成孤立卡片。这里按「事实的来源 intent」补链，
			// 而且连接 intent→digest，因此隐藏事实视图也仍然可见。
			const digestNodeById = new Map(full.nodes.map((node) => [node.id, node]));
			const digestEdges = [];
			for (const digest of full.nodes) {
				if (digest.kind !== "digest") continue;
				const members = new Set(Array.isArray(digest.factIds) ? digest.factIds : (Array.isArray(digest.memberIds) ? digest.memberIds : []));
				const sources = new Set();
				for (const edge of full.edges) {
					if (edge.kind !== "yields" || !members.has(edge.targetId)) continue;
					const source = digestNodeById.get(edge.sourceId);
					if (source !== void 0 && source.kind === "intent") sources.add(edge.sourceId);
				}
				for (const sourceId of sources) {
					digestEdges.push({
						id: "digest-link-" + digest.id + "-" + sourceId,
						kind: "yields",
						sourceId,
						targetId: digest.id,
						createdAt: Number(digest.createdAt) || 0
					});
				}
			}
			full.edges = full.edges.concat(digestEdges);
			const hideFacts = opts !== void 0 && opts.hideFacts === true;
			const severities = opts === void 0 ? null : opts.severities;
			const kept = full.nodes.filter((node) => {
				if (hideFacts && node.kind === "fact") return false;
				if (node.kind === "finding" && severities !== null && !severities.includes(node.severity)) return false;
				return true;
			});
			const keptIds = new Set(kept.map((node) => node.id));
			const edges = full.edges.filter((edge) => keptIds.has(edge.sourceId) && keptIds.has(edge.targetId));
			if (!hideFacts) return { nodes: applyChainLayout(kept, edges), edges: edges };
			// [local patch 2026-10-19] 隐藏事实时重连意图链：
			//   intent A --yields--> fact F --derived_from--> intent B
			// 事实 F 被过滤后两条边都没了，意图 B 就成了孤点（图上看到「单独飘着的意图」）。
			// 这里跳过 F，把 A 和 B 直接连起来，关系类型沿用 derived_from（界面上叫「意图链」）。
			const yieldedBy = new Map();
			const derivesTo = new Map();
			for (const edge of full.edges) {
				if (edge.kind === "yields" && !keptIds.has(edge.targetId)) {
					if (!yieldedBy.has(edge.targetId)) yieldedBy.set(edge.targetId, []);
					yieldedBy.get(edge.targetId).push(edge.sourceId);
				}
				if (edge.kind === "derived_from" && !keptIds.has(edge.sourceId)) {
					if (!derivesTo.has(edge.sourceId)) derivesTo.set(edge.sourceId, []);
					derivesTo.get(edge.sourceId).push(edge.targetId);
				}
			}
			const linked = new Set();
			for (const edge of edges) {
				if (edge.kind === "derived_from" || edge.kind === "spawns") linked.add(edge.targetId);
			}
			const extra = [];
			for (const [factId, srcs] of yieldedBy) {
				const dsts = derivesTo.get(factId);
				if (dsts === void 0) continue;
				for (const src of srcs) {
					if (!keptIds.has(src)) continue;
					for (const dst of dsts) {
						if (!keptIds.has(dst) || dst === src || linked.has(dst)) continue;
						linked.add(dst);
						extra.push({ id: "relink-" + factId + "-" + dst, kind: "chain", sourceId: src, targetId: dst });
					}
				}
			}
			// 还没连上的意图（既无 spawns 也无 derived_from）兜底挂到目标上，别让它飘着
			const goalId = projection.goal === null || projection.goal === void 0 ? "" : projection.goal.id;
			if (goalId !== "" && keptIds.has(goalId)) {
				for (const node of kept) {
					if (node.kind !== "intent" || linked.has(node.id)) continue;
					linked.add(node.id);
					extra.push({ id: "relink-goal-" + node.id, kind: "spawns", sourceId: goalId, targetId: node.id });
				}
			}
			const all = edges.concat(extra);
			return { nodes: applyChainLayout(kept, all), edges: all };
		}

		/**
		 * [local patch 2026-10-19] 时间线：把探索链路的节点按**真实产生顺序**竖排列出来。
		 * 链路图擅长看结构，但节点一多就缩成一团、文字全看不清；时间线补这个缺口 ——
		 * 每一行就是一条时间线记录（类型 + 全局序号 + 标题 + 详情），可点开看全文。
		 * 序号用 pentest.js 里 withNode 写入的 seq（edge 全局递增号），跨类型可比先后。
		 */
		// [local patch 2026-10-19] 时间线：时间线 + 搜索 + 类型筛选。
		// 学 ARTEX 的时间线布局：左边一列时间轴（时刻 + 相对时间），中间竖线加类型色圆点，
		// 右边是内容（类型 + 全局序号 + 标题 + 详情）。点行头展开全文，点漏洞行跳详情。
		function pad2(n) {
			return (n < 10 ? "0" : "") + n;
		}
		function fmtClock(ts) {
			if (!ts) return "";
			const d = new Date(ts);
			return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
		}
		function fmtDay(ts) {
			if (!ts) return "";
			const d = new Date(ts);
			const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
			return (d.getMonth() + 1) + "月" + d.getDate() + "日" + wd;
		}
		function fmtAgo(ts) {
			if (!ts) return "";
			const m = Math.floor((Date.now() - ts) / 6e4);
			if (m < 1) return "刚刚";
			if (m < 60) return m + " 分钟前";
			const h = Math.floor(m / 60);
			if (h < 24) return h + " 小时前";
			return Math.floor(h / 24) + " 天前";
		}
		const STAGE_LABELS = { explore: "探索", probe: "探测", exploit: "利用", confirm: "确认", deliver: "交付" };
		const feedFilterKind = (it) => { const kind = feedKind(it); return kind === "candidate" || kind === "planner" ? "intent" : kind; };
		const feedKind = (it) => it.kind === "intent" && it.intentKind === "proposed" ? "candidate" : it.kind === "intent" && it.intentKind === "planner" ? "planner" : it.kind;
		const feedKindLabel = (it, t) => feedKind(it) === "candidate" ? "候选" : feedKind(it) === "planner" ? "planner" : t(KIND_LABELS[it.kind]);
		function FeedView({ pentest, t, onOpenFinding }) {
			const lineage = (0, react.useMemo)(() => normalizeLineageProjection(pentest), [pentest]);
			const [kinds, setKinds] = (0, react.useState)(null);
			const [q, setQ] = (0, react.useState)("");
			const [expanded, setExpanded] = (0, react.useState)({});
			// [local patch 2026-10-20] 时间线按需增量渲染。
			// 投影上限提高后（原来 200，现在 3000），大会话的节点数可以达到几千条；
			// 这里原本是 shown.map 全量渲染，DOM 数量直接等于节点数，会卡死。
			const FEED_PAGE = 15;
			const [feedPage, setFeedPage] = (0, react.useState)(0);
			const items = (0, react.useMemo)(() => {
				const all = [];
				if (pentest.goal !== null && pentest.goal !== void 0) {
					all.push({ id: pentest.goal.id, kind: "goal", seq: 0, at: 0, title: pentest.goal.target, detail: pentest.goal.objective });
				}
				for (const n of lineage.nodes) if (n.kind !== "asset" && !(n.kind === "intent" && n.intentKind === "planner")) all.push(n); // assets live in the 资产 tab; planner is scheduler telemetry, not a timeline event
				all.sort((a, b) => { const at = Number(a.at || a.createdAt || 0); const bt = Number(b.at || b.createdAt || 0); return bt - at || (Number(b.seq) || 0) - (Number(a.seq) || 0); });
				return all;
			}, [pentest, lineage]);
			const counts = (0, react.useMemo)(() => {
				const out = { goal: 0, intent: 0, candidate: 0, planner: 0, fact: 0, finding: 0 };
				for (const it of items) { const kind = feedKind(it); out[kind] = (out[kind] || 0) + 1; }
				return out;
			}, [items]);
			const shown = (0, react.useMemo)(() => {
				let list = kinds === null ? items : items.filter((it) => kinds.includes(feedFilterKind(it)));
				const kw = q.trim().toLowerCase();
				if (kw === "") return list;
				return list.filter((it) => {
					const hay = [it.id, "#" + String(it.seq || ""), it.title, it.detail, it.target, it.severity, t(KIND_LABELS[it.kind])].filter((x) => typeof x === "string").join(" ").toLowerCase();
					return hay.indexOf(kw) >= 0;
				});
			}, [items, kinds, q, t]);
			const pageCount = Math.max(1, Math.ceil(shown.length / FEED_PAGE));
			const visible = (0, react.useMemo)(() => shown.slice(feedPage * FEED_PAGE, (feedPage + 1) * FEED_PAGE), [shown, feedPage]);
			(0, react.useEffect)(() => { setFeedPage(0); }, [kinds, q]);
			const chip = (key, label, color) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-testid": "pentest-feed-filter-" + key,
				onClick: () => {
					setKinds((prev) => {
						const base = prev === null ? [] : prev.slice();
						const at = base.indexOf(key);
						if (at >= 0) base.splice(at, 1); else base.push(key);
						return base.length === 0 ? null : base;
					});
				},
				style: { cursor: "pointer", flex: "none", borderRadius: 999, padding: "0 10px", fontSize: 12, lineHeight: "22px",
					border: "1px solid " + (kinds !== null && kinds.includes(key) ? color : "var(--dsw-alias-border-l2)"),
					background: kinds !== null && kinds.includes(key) ? color : "var(--dsw-alias-bg-layer-2)",
					color: kinds !== null && kinds.includes(key) ? "#fff" : "var(--dsw-alias-label-secondary)" },
				children: label
			});
			let lastDay = "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ExploreView_module_css_default.feed,
				"data-testid": "pentest-feed",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ExploreView_module_css_default.feedBar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "search",
								value: q,
								onChange: (e) => setQ(e.target.value),
								placeholder: t("feed.search"),
								"data-testid": "pentest-feed-search",
								style: { flex: "0 1 260px", minWidth: 140, borderRadius: 6, padding: "0 10px", fontSize: 12, lineHeight: "26px",
									border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)", color: "var(--dsw-alias-label-primary)" }
							}),
							chip("goal", t("kind.goal") + " (" + counts.goal + ")", KIND_HEX.goal),
							chip("intent", t("kind.intent") + " (" + (counts.intent + counts.candidate + counts.planner) + ")", KIND_HEX.intent),
							chip("fact", t("kind.fact") + " (" + counts.fact + ")", KIND_HEX.fact),
							chip("finding", t("kind.finding") + " (" + counts.finding + ")", KIND_HEX.finding),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { marginLeft: "auto", fontSize: 12, color: "var(--dsw-alias-label-caption)" },
								children: shown.length + " / " + items.length
							})
						]
					}),
					shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ExploreView_module_css_default.empty,
						children: t("explore.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ExploreView_module_css_default.feedList,
						children: visible.map((it) => {
							const Icon = KIND_ICONS[it.kind] || KIND_ICONS.intent;
							const open = expanded[it.id] === true;
							const text = it.kind === "finding" ? splitFindingText(it.detail) : { desc: it.detail || "", impact: "" };
							const body = it.kind === "finding"
								? [text.desc, text.impact].filter((x) => x !== "").join("\n")
								: (String(text.desc || "").trim() === String(it.title || "").trim() ? "" : text.desc);
							const clickable = it.kind === "finding" && typeof onOpenFinding === "function";
							const clock = fmtClock(it.at || it.createdAt);
							const day = fmtDay(it.at || it.createdAt);
							const showDay = day !== "" && day !== lastDay;
							if (showDay) lastDay = day;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								showDay ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ExploreView_module_css_default.feedDay,
									children: day
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ExploreView_module_css_default.feedRow,
									"data-kind": feedKind(it),
									"data-testid": "pentest-feed-item-" + it.id,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ExploreView_module_css_default.feedTime,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: ExploreView_module_css_default.feedClock,
													children: clock === "" ? "" : clock
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: ExploreView_module_css_default.feedAgo,
													children: clock === "" ? "" : fmtAgo(it.at || it.createdAt)
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ExploreView_module_css_default.feedMain,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: ExploreView_module_css_default.feedHead,
													onClick: () => {
														if (clickable) { onOpenFinding(it.id); return; }
														setExpanded((prev) => ({ ...prev, [it.id]: prev[it.id] !== true }));
													},
													style: { cursor: "pointer", listStyle: "none" },
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: ExploreView_module_css_default.nodeIcon,
															"data-kind": it.kind,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {})
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: ExploreView_module_css_default.badge,
															style: { flex: "none", whiteSpace: "nowrap", alignSelf: "center" },
															children: feedKindLabel(it, t),
																title: feedKind(it) === "candidate" ? "worker 提出的待立项方向；接受后才会变成正式意图" : void 0
														}),
														
														it.origin !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: { color: "var(--dsw-alias-label-caption)", fontSize: "10px", flex: "none", whiteSpace: "nowrap", marginLeft: "auto", order: 9 },
															children: (it.origin === "planner" ? "planner" : it.origin === "worker" ? "worker" : it.origin === "lead" ? "lead" : String(it.origin)) + (Array.isArray(it.parents) && it.parents.length > 0 ? " ← " + it.parents.join(",") : "")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: ExploreView_module_css_default.feedSeq,
															children: "#" + String(it.seq === void 0 ? "" : it.seq)
														}),
														it.severity !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: ExploreView_module_css_default.severity,
															"data-severity": it.severity,
															children: t(SEVERITY_LABELS$1[it.severity])
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: ExploreView_module_css_default.feedTitle,
															style: { flex: "1", minWidth: 0, fontSize: "12.5px", lineHeight: "18px", fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", whiteSpace: "normal", overflow: "hidden" },
															children: it.title || (it.kind === "fact" ? String(it.target || "") : "")
														})
													]
												}),
												body === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: ExploreView_module_css_default.feedBody,
													"data-open": open ? "1" : "0",
													children: body
												})
											]
										})
									]
								})
							] }, it.id);
						})
					}),
					shown.length > FEED_PAGE ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-testid": "pentest-feed-pager",
						style: { alignSelf: "center", display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-testid": "pentest-feed-prev",
								disabled: feedPage === 0,
								onClick: () => setFeedPage((n) => Math.max(0, n - 1)),
								style: { cursor: feedPage === 0 ? "default" : "pointer", opacity: feedPage === 0 ? .4 : 1, borderRadius: 999, padding: "5px 16px", fontSize: 12,
									border: "1px solid var(--dsw-alias-border-l2)", background: "transparent", color: "var(--dsw-alias-label-secondary)" },
								children: "上一页"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: 12, color: "var(--dsw-alias-label-caption)" },
								children: (feedPage + 1) + " / " + pageCount + " · " + shown.length + " 条"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-testid": "pentest-feed-next",
								disabled: feedPage >= pageCount - 1,
								onClick: () => setFeedPage((n) => Math.min(pageCount - 1, n + 1)),
								style: { cursor: feedPage >= pageCount - 1 ? "default" : "pointer", opacity: feedPage >= pageCount - 1 ? .4 : 1, borderRadius: 999, padding: "5px 16px", fontSize: 12,
									border: "1px solid var(--dsw-alias-border-l2)", background: "transparent", color: "var(--dsw-alias-label-secondary)" },
								children: "下一页"
							})
						]
					}) : null
				]
			});
		}

		function ExploreView({ pentest, t, onOpenFinding }) {
			const { nodes, edges } = (0, react.useMemo)(() => layoutExploration(pentest), [pentest]);
			const [selectedNode, setSelectedNode] = (0, react.useState)(null);
			// HOTFIX(local): 默认隐藏事实（保留 目标→意图→漏洞 链路），漏洞可按等级筛选。
			const SEV_ORDER = ["critical", "high", "medium", "low", "info"];
			const SEV_COLORS = { critical: "#b91c1c", high: "#ef4444", medium: "#f59e0b", low: "#3b82f6", info: "#94a3b8" };
			const factCount = (0, react.useMemo)(() => pentest.nodes.filter((node) => node.kind === "fact").length, [pentest]);
			const hasChain = (0, react.useMemo)(() => pentest.nodes.some((node) => node.kind === "intent" || node.kind === "finding"), [pentest]);
			const sevCounts = (0, react.useMemo)(() => {
				const out = {};
				for (const node of pentest.nodes) if (node.kind === "finding") out[node.severity] = (out[node.severity] || 0) + 1;
				return out;
			}, [pentest]);
			const [hideFacts, setHideFacts] = (0, react.useState)(true);
			const [sevFilter, setSevFilter] = (0, react.useState)(null);
			// 只有存在非事实节点时才隐藏事实；只写事实的会话（子智能体）照旧显示自己的链路。
			const hideFactsEffective = hideFacts && hasChain;
			// 始终走 chain layout：事实可见时也要按 7 列折行，不能退回 layoutExploration
			// 的单列堆叠（否则 28 条事实会变成一列 28 张卡）。
			const shown = (0, react.useMemo)(() => layoutChain(pentest, { hideFacts: hideFactsEffective, severities: sevFilter }), [hideFactsEffective, sevFilter, pentest]);
			// [local patch 2026-10-19] 受控节点：ReactFlow 拥有节点的实时位置（拖动能生效），
			// 布局只在「节点集合变化」时给**新节点**算位置 —— 老节点保留当前坐标，
			// 所以既不会因为来一条新 fact 就整张图重排，也不会把用户拖动过的节点弹回去。
			const [rfNodes, setRfNodes] = (0, react.useState)([]);
			// 布局模式变化（显示事实 / 等级筛选）必须丢弃旧坐标：旧坐标来自另一套
			// 节点集合，会和新布局混在一起，导致某一列超过 7 张卡。
			const layoutMode = String(hideFactsEffective) + "|" + (sevFilter === null ? "all" : sevFilter.slice().sort().join(","));
			const layoutModeRef = (0, react.useRef)(layoutMode);
			// [照 ARTEX] 意图 → 执行它的子智能体名字。members 里已有 intentId → name，
			// 卡片底部显示 owner，一眼看出「这条是谁在跑」。
			const ownerOf = (0, react.useMemo)(() => {
				const map = new Map();
				for (const m of pentest.members || []) {
					if (m === null || m === void 0) continue;
					const iid = String(m.intentId || "");
					const nm = String(m.name || "");
					if (iid !== "" && nm !== "" && !map.has(iid)) map.set(iid, nm);
				}
				return map;
			}, [pentest.members]);
			(0, react.useEffect)(() => {
				const resetPositions = layoutModeRef.current !== layoutMode;
				layoutModeRef.current = layoutMode;
				setRfNodes((prev) => {
					const prevMap = resetPositions ? new Map() : new Map(prev.map((n) => [n.id, n]));
					return shown.nodes.map((node) => {
						const old = prevMap.get(node.id);
						return {
							id: node.id,
							type: "pentest",
							position: old === void 0 ? { x: node.x, y: node.y } : old.position,
							data: { node: node, owner: ownerOf.get(node.id) || "" },
							style: { width: 168 }
						};
					});
				});
			}, [shown.nodes, ownerOf, layoutMode]);
			const onNodesChange = (0, react.useCallback)((changes) => {
				setRfNodes((prev) => applyNodeChanges(changes, prev));
			}, []);
			// 边按关系类型着色（照 ARTEX relColor）：一眼看出哪条是「产出」哪条是「证明」。
			// 边保留关系标签（「产出 / 意图链 / 推导自 / 证实」）。
			// [local patch 2026-10-21] 曾试过删掉以减轻拥挤，但关系类型就只剩颜色可辨，
			// 看图时得反复对照左下角图例 —— 标签是有信息量的，删了反而难读。
			// 拥挤问题改由布局解决（见 computeChainLayout：derived_from 不参与分层、
			// 叶子层单独折列、每列锚定父节点 y）。标签保留，字号和描边压小。
			const flowEdges = (0, react.useMemo)(() => shown.edges.map((edge) => ({
				id: edge.id,
				type: "pentest",
				source: edge.sourceId,
				target: edge.targetId,
				// yields（意图→事实）是数量最多的一类边：每个 fact 一条，
				// 17-39 条「产出」胶囊糊在一起就是之前看到的「乱」。
				// 它的关系已经由橙色 + 图例说清，这里不画标签；
				// 其余三类（意图链 / 推导自 / 证实）数量少、信息关键，保留。
				label: edge.kind === "yields" ? void 0 : t(EDGE_LABELS[edge.kind]),
				data: { color: EDGE_COLORS[edge.kind] || "#94a3b8" },
				style: { stroke: EDGE_COLORS[edge.kind] || "#94a3b8", strokeWidth: 1.6, strokeOpacity: .7 }
			})), [shown.edges, t]);
			// [local patch 2026-10-19] 节点增减或筛选变化后重新 fitView。
			// fitView 属性只在挂载时生效，之后图变大也不会重算，导致节点被视口裁掉。
			const flowRef = (0, react.useRef)(null);
			const nodeCount = shown.nodes.length;
			(0, react.useEffect)(() => {
				const inst = flowRef.current;
				if (inst === null || inst === void 0 || typeof inst.fitView !== "function") return;
				const timer = setTimeout(() => {
					inst.fitView({ padding: .16, duration: 180 });
				}, 60);
				return () => clearTimeout(timer);
			}, [nodeCount]);
			const nodeTypes = (0, react.useMemo)(() => ({ pentest: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChainNode, {
				...props,
				t
			}) }), [t]);
			const chip = (label, active, color, onClick) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClick,
				style: { pointerEvents: "auto", cursor: "pointer", flex: "none", borderRadius: 999, padding: "0 10px", fontSize: 12, lineHeight: "22px",
					border: "1px solid " + (active && color !== void 0 ? color : "var(--dsw-alias-border-l2)"),
					background: active && color !== void 0 ? color : "var(--dsw-alias-bg-layer-2)",
					color: active && color !== void 0 ? "#fff" : "var(--dsw-alias-label-secondary)" },
				children: label
			});
			const toolbar = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { position: "absolute", zIndex: 5, left: 10, top: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
					maxWidth: "calc(100% - 20px)", pointerEvents: "none" },
				children: [
					chip(t("findings.filter.all"), sevFilter === null, void 0, () => setSevFilter(null)),
					SEV_ORDER.filter((sev) => sevCounts[sev]).map((sev) => chip(
						t(SEVERITY_LABELS$1[sev]) + " (" + sevCounts[sev] + ")",
						sevFilter !== null && sevFilter.includes(sev),
						SEV_COLORS[sev],
						() => setSevFilter((prev) => {
							const base = prev === null ? [] : prev.slice();
							const at = base.indexOf(sev);
							if (at >= 0) base.splice(at, 1); else base.push(sev);
							return base.length === 0 ? null : base;
						})
					))
				]
			});
			// 图例：类型色 + 关系色，放在左下角（右下角被 MiniMap 占了）。
			const legendItem = (color, label, dot) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: { display: "inline-flex", alignItems: "center", gap: 4 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: dot ? ExploreView_module_css_default.legendDot : ExploreView_module_css_default.legendLine,
						style: { background: color }
					}),
					label
				]
			});
			const legend = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ExploreView_module_css_default.legend,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ExploreView_module_css_default.legendRow,
						children: KIND_LEGEND.map((k) => legendItem(KIND_HEX[k], t(KIND_LABELS[k]), true))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ExploreView_module_css_default.legendRow,
						children: ["spawns", "derived_from", "yields", "proves"].map((k) => legendItem(EDGE_COLORS[k], t(EDGE_LABELS[k]), false))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ExploreView_module_css_default.legendRow,
						children: ["critical", "high", "medium", "low"].map((sv) => legendItem(SEV_HEX[sv], t(SEVERITY_LABELS$1[sv]), true))
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ExploreView_module_css_default.graph,
				"data-testid": "pentest-explore",
				children: [toolbar, shown.nodes.length === 0 ? null : legend, shown.nodes.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: ExploreView_module_css_default.empty,
					"data-testid": "pentest-explore-empty",
					children: t(sevFilter === null && hideFacts ? "explore.findings.empty" : "explore.empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(index, {
					nodes: rfNodes,
					edges: flowEdges,
					onNodesChange: onNodesChange,
					nodeTypes: nodeTypes,
					edgeTypes: { pentest: ChainEdge },
					fitView: true,
					fitViewOptions: { padding: .25 },
					proOptions: { hideAttribution: true },
					minZoom: .1,
					onNodeClick: (_, flowNode) => {
						const clicked = flowNode.data.node;
						if (clicked.kind === "finding" && typeof onOpenFinding === "function") {
							onOpenFinding(clicked.id);
							return;
						}
						setSelectedNode(clicked);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Background, {}),

					]
				}), selectedNode !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphDetailDrawer, {
					title: selectedNode.title,
					fields: [
						{ label: "类型", value: t(KIND_LABELS[selectedNode.kind]) },
						{ label: "说明", value: selectedNode.detail },
						...selectedNode.severity === void 0 ? [] : [{ label: "风险等级", value: t(SEVERITY_LABELS$1[selectedNode.severity]) }]
					],
					actions: memberActionsOf(selectedNode, pentest, t),
					onClose: () => {
						setSelectedNode(null);
					}
				})]
			});
		}

		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\FindingsView.module.css.mjs
		const css$2 = ".OTfrDG_list{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}.OTfrDG_finding{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;flex-direction:column;gap:8px;min-width:0;padding:12px 14px;display:flex}.OTfrDG_header{align-items:center;gap:10px;min-width:0;display:flex}.OTfrDG_severity{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:0 10px;font-size:12px;line-height:22px}.OTfrDG_severity[data-severity=critical]{color:#fff;background:#b91c1c;font-weight:700;box-shadow:inset 0 0 0 1px #7f1d1d}.OTfrDG_severity[data-severity=high]{color:#fff;background:#ef4444}.OTfrDG_severity[data-severity=medium]{color:#fff;background:#f59e0b}.OTfrDG_severity[data-severity=low]{color:#fff;background:#3b82f6}.OTfrDG_severity[data-severity=info]{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.OTfrDG_evidence{border:1px solid;border-radius:999px;flex:none;padding:0 8px;font-size:11px;line-height:20px}.OTfrDG_evidence[data-status=likely]{color:#fbbf24;border-color:#f59e0b66;background:#f59e0b1a}.OTfrDG_evidence[data-status=unverified]{color:#94a3b8;border-color:#64748b66;background:#64748b1a}.OTfrDG_title{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:auto;margin:0;font-size:14px;font-weight:600;line-height:22px}.OTfrDG_id{color:var(--dsw-alias-label-caption);flex:none;font-size:11px;line-height:20px}.OTfrDG_description{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px;white-space:pre-wrap}.OTfrDG_stepsBlock{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.OTfrDG_stepsLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;line-height:18px}.OTfrDG_steps{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-direction:column;gap:2px;margin:0;padding-left:20px;font-size:13px;line-height:20px;white-space:pre-wrap;display:flex}.OTfrDG_asset{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:20px;white-space:pre-wrap}.OTfrDG_empty{text-align:center;color:var(--dsw-alias-label-caption);margin:0;padding:24px 0;font-size:13px;line-height:20px}.OTfrDG_detailRoot{flex-direction:column;gap:10px;min-width:0;display:flex;flex:auto;min-height:0}.OTfrDG_detailBar{align-items:center;gap:8px;display:flex;flex-wrap:wrap;flex:none}.OTfrDG_detailBarBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:3px 10px;font-size:12px;line-height:20px}.OTfrDG_detailBarBtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}.OTfrDG_detailBarBtn:disabled{cursor:default;opacity:.45}.OTfrDG_detailPos{margin-left:auto;color:var(--dsw-alias-label-caption);font-size:12px;line-height:20px}.OTfrDG_detailBody{flex-direction:column;gap:10px;min-width:0;display:flex;overflow:auto;padding-bottom:8px;flex:auto}.OTfrDG_detailHead{flex-direction:column;gap:5px;display:flex;padding:2px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l2)}.OTfrDG_para{flex-direction:column;gap:2px;display:flex}.OTfrDG_paraLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;line-height:18px}.OTfrDG_paraText{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:21px;white-space:pre-wrap}.OTfrDG_kvList{border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;display:flex}.OTfrDG_kv{align-items:baseline;gap:10px;display:flex;padding:6px 0}.OTfrDG_kv+.OTfrDG_kv{border-top:1px solid var(--dsw-alias-border-l2)}.OTfrDG_kvLabel{color:var(--dsw-alias-label-tertiary);flex:none;min-width:58px;font-size:12px;line-height:20px}.OTfrDG_kvValue{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex:auto;min-width:0;font-size:13px;line-height:20px}.OTfrDG_detailTitle{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:15px;font-weight:600;line-height:24px}.OTfrDG_detailSub{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:20px}.OTfrDG_block{flex-direction:column;gap:8px;display:flex}.OTfrDG_blockLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;line-height:18px;padding-top:2px}.OTfrDG_blockValue{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px;white-space:pre-wrap}.OTfrDG_step{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}.OTfrDG_stepHead{align-items:center;gap:8px;display:flex;flex-wrap:wrap}.OTfrDG_stepNo{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:0 8px;font-size:11px;line-height:20px}.OTfrDG_stepNote{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:13px;font-weight:600;line-height:20px;white-space:pre-wrap}.OTfrDG_stepResult{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px;white-space:pre-wrap}.OTfrDG_code{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:6px;flex-direction:column;display:flex;overflow:hidden}.OTfrDG_codeHead{align-items:center;gap:8px;display:flex;border-bottom:1px solid var(--dsw-alias-border-l2);padding:4px 8px}.OTfrDG_codeLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;flex:auto}.OTfrDG_codePre{color:var(--dsw-alias-label-secondary);overflow-y:auto;overflow-x:hidden;margin:0;padding:8px 10px;font-size:12px;line-height:18px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;max-height:400px}.OTfrDG_copyBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:0 6px;font-size:11px;line-height:18px}.OTfrDG_copyBtn:hover{color:var(--dsw-alias-label-primary)}.OTfrDG_cardFoot{align-items:center;gap:8px;display:flex;flex-wrap:wrap}.OTfrDG_detailBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 10px;font-size:12px;line-height:20px;margin-left:auto}.OTfrDG_detailBtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}";
		const tagId$2 = "dsh-stcs/FindingsView.module.css";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var FindingsView_module_css_default = {
			"empty": "OTfrDG_empty",
			"severity": "OTfrDG_severity",
			"description": "OTfrDG_description",
			"stepsBlock": "OTfrDG_stepsBlock",
			"title": "OTfrDG_title",
			"asset": "OTfrDG_asset",
			"id": "OTfrDG_id",
			"steps": "OTfrDG_steps",
			"finding": "OTfrDG_finding",
			"stepsLabel": "OTfrDG_stepsLabel",
			"list": "OTfrDG_list",
			"header": "OTfrDG_header"
		};
		//#endregion
		//#region src/client/FindingsView.tsx
		/** Severity badge label keys. */
		const SEVERITY_LABELS = {
			critical: "severity.critical",
			high: "severity.high",
			medium: "severity.medium",
			low: "severity.low",
			info: "severity.info"
		};
		/** Narrow the projection nodes to findings. */
		function findingsOf(projection) {
			return projection.nodes.filter((node) => node.kind === "finding");
		}
		// Uniform vocabulary: only two states. 待审核 = 待验证 (needs full
		// verification by the auditor); 已审核 = 已确认漏洞 (independently
		// reproduced). No blocked / observation / negative split.
		const SECURITY_CATEGORY_ORDER = ["vulnerability", "candidate"];
		const SECURITY_CATEGORY_LABELS = {
			vulnerability: "findings.category.vulnerability",
			candidate: "findings.category.candidate"
		};
		const FILTER_CHIP_ACTIVE_COLOR = "#3b82f6";
		const FILTER_CHIP_ACTIVE_BG = "rgba(37, 99, 235, 0.45)";
		const DEFAULT_SECURITY_CATEGORY_FILTER = ["vulnerability", "candidate"];
		function findingBadgeLabel(finding, t) {
			if (finding.category === "candidate") return t(SECURITY_CATEGORY_LABELS.candidate) + " · " + t(SEVERITY_LABELS[finding.severity]);
			return finding.category === "vulnerability"
				? t(SEVERITY_LABELS[finding.severity])
				: t(SECURITY_CATEGORY_LABELS[finding.category] || "findings.category.observation");
		}
		// ONE authoritative classification is computed in the backend projection
		// (auditState / category). Do NOT re-derive from validation/status here:
		// local derivations in two tabs caused 待验证 vs 待审核 disagreements.
		function auditStateOf(finding) {
			return String(finding && finding.auditState || "") === "audited" ? "audited" : "pending";
		}
		function categoryOfAuditState(state) {
			return state === "audited" ? "vulnerability" : "candidate";
		}
		function findingCategory(finding) {
			const explicit = String(finding && finding.category || "");
			return explicit === "vulnerability" || explicit === "candidate" ? explicit : categoryOfAuditState(auditStateOf(finding));
		}
		function candidateSeverity(candidate) {
			const raw = String(candidate && (candidate.severity || candidate.riskIfConfirmed || candidate.risk) || "").trim().toLowerCase();
			const aliases = {
				critical: "critical", "严重": "critical",
				high: "high", "高危": "high", "高": "high",
				medium: "medium", "中危": "medium", "中": "medium",
				low: "low", "低危": "low", "低": "low",
				info: "info", "提示": "info", "信息": "info"
			};
			if (aliases[raw]) return aliases[raw];
			const source = [
				candidate && candidate.question,
				candidate && candidate.title,
				candidate && candidate.description,
				candidate && candidate.riskIfConfirmed,
				candidate && candidate.nextAction
			].filter(Boolean).join(" ");
			if (/(rce|远程代码执行|命令执行|代码执行|鉴权绕过|认证绕过|auth(?:entication)?\s*bypass|未授权.*(?:管理|admin|执行|写入|文件)|容器逃逸|host\s*escape|反序列化|deserial|任意文件(?:写|读)|重置.*管理员|管理员.*重置|sql\s*注入|sql\s*injection)/i.test(source)) return "critical";
			if (/(凭据|credential|secret|token|cookie|会话|未授权.*(?:读取|访问)|敏感|ssrf|越权|接管|upload|上传|写入|write|泄露|leak)/i.test(source)) return "high";
			if (/(信息泄露|配置|读取|路径|目录|枚举|版本|endpoint|接口|暴露|disclos)/i.test(source)) return "medium";
			return "low";
		}
		function factCategory(fact) {
			const explicit = String(fact && fact.category || "");
			if (SECURITY_CATEGORY_ORDER.includes(explicit)) return explicit;
			const text = String(fact && (fact.answer || fact.detail || fact.summary || fact.title) || "");
			if (/(未提交|未执行|未修改|未触发|红线|需授权|隔离实例|blocked)/i.test(text)) return "blocked";
			return "observation";
		}
		function securityItemsOf(projection) {
			if (!projection || typeof projection !== "object") return [];
			const items = [];
			for (const finding of findingsOf(projection)) {
				const category = findingCategory(finding);
				items.push({
					...finding,
					kind: "finding",
					category,
					severity: finding.severity || "info",
					status: finding.status || "unverified",
					steps: Array.isArray(finding.steps) ? finding.steps : [],
					stepNotes: Array.isArray(finding.stepNotes) ? finding.stepNotes : [],
					evidenceIds: Array.isArray(finding.evidenceIds) ? finding.evidenceIds : []
				});
			}
			for (const [index, coverage] of (Array.isArray(projection.coverage) ? projection.coverage : []).entries()) {
				if (!coverage || !["blocked", "not_tested"].includes(coverage.result)) continue;
				const axis = String(coverage.axis || coverage.id || "unknown");
				items.push({
					id: "coverage-" + axis + "-" + index,
					kind: "coverage",
					category: "blocked",
					title: "未覆盖：" + axis,
					claim: "未覆盖：" + axis,
					description: String(coverage.note || "该覆盖轴尚未完成测试。"),
					status: "blocked",
					severity: "info",
					blockedBy: [axis],
					nextAction: coverage.note || "",
					evidenceIds: Array.isArray(coverage.evidenceIds) ? coverage.evidenceIds : [],
					steps: [],
					stepNotes: [],
					createdAt: coverage.createdAt
				});
			}
			for (const fact of (Array.isArray(projection.facts) ? projection.facts : [])) {
				if (!fact || fact.deleted === true) continue;
				const text = String(fact.answer || fact.detail || fact.summary || fact.title || "");
				const category = factCategory(fact);
				items.push({
					...fact,
					id: fact.id,
					kind: "observation",
					category,
					title: shortFindingTitle({ title: fact.title || text }),
					claim: text,
					description: text,
					status: category === "blocked" ? "blocked" : "observed",
					severity: fact.severity || "info",
					blockedBy: category === "blocked" ? ["需授权/隔离环境"] : [],
					nextAction: category === "blocked" ? text : "",
					evidenceIds: Array.isArray(fact.evidenceIds) ? fact.evidenceIds : [],
					factIds: [fact.id],
					steps: [],
					stepNotes: []
				});
			}
			return items.sort((a, b) => {
				const category = SECURITY_CATEGORY_ORDER.indexOf(a.category) - SECURITY_CATEGORY_ORDER.indexOf(b.category);
				if (category !== 0) return category;
				return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
			});
		}
		function shortFindingTitle(finding) {
			const value = String(finding && (finding.title || finding.claim) || "").split(/[\n。！？!?]/)[0].replace(/\s+/g, " ").trim();
			return value.length > 88 ? value.slice(0, 87) + "…" : value;
		}

		function FindingsView({ pentest, t, focusId }) {
			// HOTFIX(local): severity filter chips for the 漏洞 tab. The stock view
			// listed every finding unfiltered; this adds a multi-select row of the
			// five severities (counts per level, click to toggle, "全部" resets).
			const SEV_FILTER_ORDER = ["critical", "high", "medium", "low", "info"];
			// [local patch 2026-10-19] critical 和 high 之前共用 state-error-primary，颜色分不出来；
			// 改成和链路图/时间线一致的 hex 五档。
			const FINDING_SEVERITY_CHIP_COLORS = {
				critical: "#b91c1c",
				high: "#ef4444",
				medium: "#f59e0b",
				low: "#3b82f6",
				info: "#94a3b8"
			};
			const allFindings = securityItemsOf(pentest);
			const confirmedFindings = allFindings.filter((node) => node.category === "vulnerability");
			const [categoryFilter, setCategoryFilter] = react.useState(DEFAULT_SECURITY_CATEGORY_FILTER);
			const [sevFilter, setSevFilter] = react.useState(null);
			// HOTFIX(local): 列表 ↔ 详情在同一个 tab 内切换（不弹遮罩、不用抽屉）。
			const [detailId, setDetailId] = react.useState(null);
			// HOTFIX(local): 从链路图跳过来 -> 清掉等级筛选并滚动/高亮到该条漏洞。
			(0, react.useEffect)(() => {
				if (focusId === null || focusId === void 0) return void 0;
				setSevFilter(null);
				setCategoryFilter(DEFAULT_SECURITY_CATEGORY_FILTER);
				const timer = setTimeout(() => {
					const el = document.querySelector('[data-finding-id="' + focusId + '"]');
					if (el !== null && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center", behavior: "smooth" });
				}, 80);
				return () => clearTimeout(timer);
			}, [focusId]);
			const countsBySeverity = {};
			// The tab badge and severity counters describe confirmed vulnerabilities only.
			// Pending candidates remain visible in the list but must not inflate the
			// confirmed-vulnerability counts.
			for (const node of confirmedFindings) countsBySeverity[node.severity] = (countsBySeverity[node.severity] || 0) + 1;
			const countsByCategory = {};
			for (const node of allFindings) countsByCategory[node.category] = (countsByCategory[node.category] || 0) + 1;
			const categoryItems = categoryFilter === null ? allFindings : allFindings.filter((node) => categoryFilter.includes(node.category));
			const findings = (sevFilter === null ? categoryItems : categoryItems.filter((node) => sevFilter.includes(node.severity))).slice().sort((a, b) => {
				// HOTFIX(local): most severe first; ties keep insertion order (stable sort).
				const ca = SECURITY_CATEGORY_ORDER.indexOf(a.category);
				const cb = SECURITY_CATEGORY_ORDER.indexOf(b.category);
				if (ca !== cb) return ca - cb;
				const ra = SEV_FILTER_ORDER.indexOf(a.severity); const rb = SEV_FILTER_ORDER.indexOf(b.severity)
				return (ra < 0 ? SEV_FILTER_ORDER.length : ra) - (rb < 0 ? SEV_FILTER_ORDER.length : rb)
			});
			const chipStyle = (active, color) => ({
				appearance: "none",
				cursor: "pointer",
				flex: "none",
				borderRadius: 999,
				padding: "0 10px",
				fontSize: 12,
				lineHeight: "22px",
				fontWeight: active ? 600 : 400,
				border: "1px solid " + (active ? (color !== void 0 ? color : FILTER_CHIP_ACTIVE_COLOR) : "var(--dsw-alias-border-l2)"),
				background: active ? (color !== void 0 ? color : FILTER_CHIP_ACTIVE_BG) : "var(--dsw-alias-bg-layer-2)",
				color: active ? "#fff" : "var(--dsw-alias-label-secondary)"
			});
			const categoryChipRow = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "pentest-security-filter",
				style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 2 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: chipStyle(categoryFilter === null),
						onClick: () => setCategoryFilter((prev) => prev === null ? [] : null),
						children: t("findings.category.all")
					}),
					...SECURITY_CATEGORY_ORDER.map((category) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-category": category,
						style: chipStyle(categoryFilter === null || categoryFilter.includes(category)),
						onClick: () => setCategoryFilter((prev) => {
							const base = prev === null ? [...SECURITY_CATEGORY_ORDER] : [...prev];
							const at = base.indexOf(category);
							if (at >= 0) base.splice(at, 1); else base.push(category);
							return base;
						}),
						children: t(SECURITY_CATEGORY_LABELS[category]) + (countsByCategory[category] ? ` (${countsByCategory[category]})` : "")
					}, category))
				]
			});
			const chipRow = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "pentest-findings-filter",
				style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: chipStyle(sevFilter === null),
						onClick: () => setSevFilter(null),
						children: t("findings.filter.all")
					}),
					SEV_FILTER_ORDER.map((sev) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-severity": sev,
						style: chipStyle(sevFilter !== null && sevFilter.includes(sev), FINDING_SEVERITY_CHIP_COLORS[sev]),
						onClick: () => setSevFilter((prev) => {
							const base = prev === null ? [] : [...prev];
							const at = base.indexOf(sev);
							if (at >= 0) base.splice(at, 1); else base.push(sev);
							return base.length === 0 ? null : base;
						}),
						children: t(SEVERITY_LABELS[sev]) + (countsBySeverity[sev] ? ` (${countsBySeverity[sev]})` : "")
					}, sev))
				]
			});
			// HOTFIX(local): 选中某条漏洞时，整个 tab 切成详情视图（顶部可返回列表、翻上一条/下一条）。
			// 找不到该 id（切会话/换筛选后）就回落到列表，避免空白页。
			if (detailId !== null) {
				const current = allFindings.find((node) => node.id === detailId);
				if (current !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FindingDetailView, {
					pentest: pentest,
					t: t,
					finding: current,
					findings: findings,
					onBack: () => setDetailId(null),
					onSelect: (id) => setDetailId(id)
				});
			}
			if (allFindings.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [categoryChipRow, chipRow, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: FindingsView_module_css_default.empty,
				"data-testid": "pentest-findings-empty",
				children: t("findings.empty")
			})] });
			if (findings.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [categoryChipRow, chipRow, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: FindingsView_module_css_default.empty,
				"data-testid": "pentest-findings-none-matching",
				children: t("findings.filter.empty")
			})] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [categoryChipRow, chipRow, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: FindingsView_module_css_default.list,
				"data-testid": "pentest-findings",
				children: findings.map((finding) => {
					const splitText = splitFindingText(finding.description || finding.summary || finding.claim || "");
					const descText = conciseSentences(splitText.desc, 2, 120);
					// Unified vocabulary: every card shows its vulnerability
					// description. 待审核 cards are simply awaiting full auditor
					// verification — no separate "受阻原因" wording anymore.
					const cardDescText = descText;
					const cardDescLabel = t("explore.desc");
					const linkedAssets = assetsForFinding(finding, pentest.assets);
					const asset = linkedAssets[0];
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: FindingsView_module_css_default.finding,
						"data-testid": "pentest-finding",
						"data-finding-id": finding.id,
						style: focusId === finding.id ? {
							outline: "2px solid " + (FINDING_SEVERITY_CHIP_COLORS[finding.severity] || "var(--dsw-alias-border-l2)"),
							outlineOffset: 2
						} : void 0,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: FindingsView_module_css_default.header,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: FindingsView_module_css_default.severity,
										"data-severity": finding.severity,
										"data-category": finding.category,
										children: findingBadgeLabel(finding, t)
									}),
									// [local patch 2026-10-19] 证据强度：只标「不是 confirmed」的。
									finding.evidenceStatus !== void 0 && finding.evidenceStatus !== "confirmed" && finding.evidenceStatus !== "已验证" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "OTfrDG_evidence",
										"data-status": finding.evidenceStatus,
										children: t(finding.evidenceStatus === "likely" ? "evidence.likely" : "evidence.unverified")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
										className: FindingsView_module_css_default.title,
										children: shortFindingTitle(finding)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: FindingsView_module_css_default.id,
										children: finding.id
									})
								]
							}),
							cardDescText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: FindingsView_module_css_default.description,
								"data-testid": "pentest-finding-description",
								children: cardDescLabel + "：" + cardDescText
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "OTfrDG_cardFoot",
								children: [
									(Array.isArray(finding.steps) ? finding.steps.length : 0) === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: FindingsView_module_css_default.asset,
										children: t("finding.steps.collapsed", { count: (Array.isArray(finding.steps) ? finding.steps.length : 0) })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "OTfrDG_detailBtn",
										"data-testid": "pentest-finding-open-detail",
										onClick: () => setDetailId(finding.id),
										children: t("finding.detail") + " →"
									})
								]
							}),
							asset !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: FindingsView_module_css_default.asset,
								children: [
									t("finding.affected"),
									": [",
									asset.type,
									"] ",
									asset.value
								]
							})
						]
					}, finding.id);
				})
			})] });
		}
		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\ReportView.module.css.mjs
		const css$1 = ".pbwMva_root{flex-direction:column;flex:auto;gap:10px;min-height:0;display:flex}.pbwMva_toolbar{justify-content:space-between;align-items:center;gap:12px;display:flex}.pbwMva_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.pbwMva_actions{flex:none;gap:8px;display:flex}.pbwMva_action{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;padding:5px 10px;font-size:13px;line-height:20px}.pbwMva_action:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}.pbwMva_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}.pbwMva_markdown{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-height:240px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;border-radius:6px;flex:auto;margin:0;padding:14px;font-size:13px;line-height:20px;overflow:auto}.pbwMva_markdown h1,.pbwMva_markdown h2,.pbwMva_markdown h3,.pbwMva_markdown p{margin:0}.pbwMva_markdown h1{border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);padding-bottom:10px;font-size:18px;line-height:26px}.pbwMva_markdown h2{color:var(--dsw-alias-label-primary);margin-top:16px;font-size:15px;line-height:24px}.pbwMva_markdown h3{color:var(--dsw-alias-label-primary);margin-top:12px;font-size:14px;line-height:22px}.pbwMva_markdown pre{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;border-radius:6px;margin:6px 0;padding:8px 10px;font-size:12px;line-height:18px;overflow-x:hidden;overflow-y:auto;max-height:360px}.pbwMva_markdown table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px;line-height:18px}.pbwMva_markdown th,.pbwMva_markdown td{border:1px solid var(--dsw-alias-border-l2);text-align:left;vertical-align:top;padding:4px 8px}.pbwMva_markdown th{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}.pbwMva_markdown strong{color:var(--dsw-alias-label-primary);font-weight:600}.pbwMva_markdown blockquote{border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);margin:6px 0;padding-left:10px}.pbwMva_bullet{padding-left:14px}.pbwMva_bullet:before{content:\"•\";color:var(--dsw-alias-label-tertiary);margin-left:-12px;margin-right:6px}.pbwMva_step{white-space:pre-wrap;padding-left:28px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}";
		const tagId$1 = "dsh-stcs/ReportView.module.css";
		if (typeof document !== "undefined" && true) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ReportView_module_css_default = {
			"error": "pbwMva_error",
			"bullet": "pbwMva_bullet",
			"hint": "pbwMva_hint",
			"action": "pbwMva_action",
			"step": "pbwMva_step",
			"root": "pbwMva_root",
			"toolbar": "pbwMva_toolbar",
			"markdown": "pbwMva_markdown",
			"actions": "pbwMva_actions"
		};
		//#endregion
		//#region src/client/ReportView.tsx
		/** Render, copy, and download the current pentest projection as Markdown. */
		/**
		 * HOTFIX(local): 生成整份渗透测试报告（绿盟 NSFOCUS 模板结构）。
		 * 一、摘要（风险等级统计 + 发现问题汇总表）
		 * 二、测试过程详述（每个漏洞一节，复用 findingSectionMarkdown）
		 * 三、资产清单
		 * 报告是中文交付物，正文直接写中文，不走 i18n（英文报告场景极少）。
		 */
		function reportOf(pentest, t) {
			if (pentest.goal === null) return "# 渗透测试报告\n\n（尚未初始化：请先调用 pentest_add_goal 记录目标与目的。）\n";
			const findings = pentest.nodes.filter((node) => node.kind === "finding");
			const CN = { critical: "严重", high: "高危", medium: "中危", low: "低危", info: "提示" };
			const ORDER = ["critical", "high", "medium", "low", "info"];
			const grouped = { critical: [], high: [], medium: [], low: [], info: [] };
			for (const f of findings) (grouped[f.severity] || grouped.info).push(f);
			const L = [];
			L.push("# 渗透测试报告");
			L.push("");
			L.push("- 测试目标：" + String(pentest.goal.target || ""));
			L.push("- 测试目的：" + String(pentest.goal.objective || ""));
			L.push("- 授权范围：" + (String(pentest.goal.authorization || "") === "" ? "（未声明）" : String(pentest.goal.authorization)));
			L.push("");
			L.push("## 一、摘要");
			L.push("");
			const cnt = ORDER.slice(0, 4).map((k) => CN[k] + " " + grouped[k].length + " 个").join("、");
			L.push("本次测试共发现 " + findings.length + " 个安全问题：" + cnt + "。");
			L.push("");
			if (findings.length > 0) {
				// 每个漏洞一行（绿盟模板：测试对象 | 问题等级 | 数量 | 安全问题名称 | 问题状态）
				const all = [];
				for (const k of ORDER) for (const f of grouped[k]) all.push({ key: k, finding: f });
				L.push("| 序号 | 问题等级 | 安全问题名称 |");
				L.push("| --- | --- | --- |");
				all.forEach((entry, index) => {
					L.push("| " + (index + 1) + " | " + CN[entry.key] + " | " + String(entry.finding.title || "").replace(/\|/g, "\\|") + " |");
				});
				L.push("");
			}
			L.push("## 二、测试过程详述");
			L.push("");
			if (findings.length === 0) {
				L.push("（本次测试未发现已确认的安全问题。）");
				L.push("");
			} else {
				const sorted = [];
				for (const k of ORDER) for (const f of grouped[k]) sorted.push(f);
				sorted.forEach((f, index) => {
					L.push(findingSectionMarkdown(f, pentest, t, { level: 3, seq: index }));
				});
			}
			L.push("## 三、资产清单");
			L.push("");
			if (!Array.isArray(pentest.assets) || pentest.assets.length === 0) {
				L.push("（未记录资产。）");
				L.push("");
			} else {
				L.push("| 类型 | 资产 | 说明 |");
				L.push("| --- | --- | --- |");
				for (const a of pentest.assets) {
					const meta = String(a.meta || "");
					L.push("| " + String(a.type || "") + " | " + String(a.value || "") + " | " + (meta === "" ? "-" : meta.replace(/\|/g, "\\|")) + " |");
				}
				L.push("");
			}
			return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
		}
		function filenameOf(target) {
			const name = target.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
			return `pentest-report-${name === "" ? "session" : name}.md`;
		}
		/** Render the report's small, fixed Markdown subset without interpreting HTML. */
		/**
		 * HOTFIX(local): 报告预览渲染。
		 * 原版只认 #/##/###/-/缩进数字，遇到代码围栏和管道表格会渲染成一堆裸符号。
		 * 现在支持：标题、无序列表、有序步骤、**代码块**、**表格**、> 引用、**粗体**。
		 */
		function MarkdownPreview({ markdown }) {
			const css = ReportView_module_css_default;
			const lines = String(markdown === void 0 ? "" : markdown).split("\n");
			const rows = [];
			let key = 0;
			const inline = (text) => {
				const value = String(text === void 0 ? "" : text);
				if (!value.includes("**")) return value;
				const parts = value.split("**");
				return parts.map((part, k) => (k % 2 === 1 ? (0, react_jsx_runtime.jsx)("strong", { children: part }, k) : part));
			};
			let i = 0;
			while (i < lines.length) {
				const line = lines[i];
				// 代码块
				if (line.startsWith("```")) {
					i += 1;
					const buf = [];
					while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i += 1; }
					i += 1;
					rows.push((0, react_jsx_runtime.jsx)("pre", { children: buf.join("\n") }, key++));
					continue;
				}
				// 表格
				if (line.startsWith("|")) {
					const buf = [];
					while (i < lines.length && lines[i].startsWith("|")) { buf.push(lines[i]); i += 1; }
					const cells = (row) => row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((x) => x.trim());
					const header = cells(buf[0]);
					const hasDivider = buf.length > 1 && /^[\s|:-]+$/.test(buf[1]);
					const bodyRows = buf.slice(hasDivider ? 2 : 1).map(cells);
					rows.push((0, react_jsx_runtime.jsxs)("table", {
						children: [
							(0, react_jsx_runtime.jsx)("thead", { children: (0, react_jsx_runtime.jsx)("tr", { children: header.map((h, k) => (0, react_jsx_runtime.jsx)("th", { children: inline(h) }, k)) }) }),
							(0, react_jsx_runtime.jsx)("tbody", { children: bodyRows.map((r, k) => (0, react_jsx_runtime.jsx)("tr", { children: r.map((c, k2) => (0, react_jsx_runtime.jsx)("td", { children: inline(c) }, k2)) }, k)) })
						]
					}, key++));
					continue;
				}
				if (line === "") { i += 1; continue; }
				if (line.startsWith("### ")) rows.push((0, react_jsx_runtime.jsx)("h3", { children: inline(line.slice(4)) }, key++));
				else if (line.startsWith("## ")) rows.push((0, react_jsx_runtime.jsx)("h2", { children: inline(line.slice(3)) }, key++));
				else if (line.startsWith("# ")) rows.push((0, react_jsx_runtime.jsx)("h1", { children: inline(line.slice(2)) }, key++));
				else if (line.startsWith("> ")) rows.push((0, react_jsx_runtime.jsx)("blockquote", { children: inline(line.slice(2)) }, key++));
				else if (line.startsWith("- ")) rows.push((0, react_jsx_runtime.jsx)("p", { className: css.bullet, children: inline(line.slice(2)) }, key++));
				else if (/^  \d+\. /.test(line)) rows.push((0, react_jsx_runtime.jsx)("p", { className: css.step, children: inline(line.trim()) }, key++));
				else rows.push((0, react_jsx_runtime.jsx)("p", { children: inline(line) }, key++));
				i += 1;
			}
			return (0, react_jsx_runtime.jsx)("article", {
				className: css.markdown,
				"data-testid": "pentest-report-markdown",
				children: rows
			});
		}
		function ReportView({ pentest, t }) {
			const markdown = reportOf(pentest, t);
			const [copyState, setCopyState] = (0, react.useState)("idle");
			const copy = async () => {
				try {
					await navigator.clipboard.writeText(markdown);
					setCopyState("done");
				} catch {
					setCopyState("failed");
				}
			};
			const download = () => {
				const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filenameOf(pentest.goal?.target ?? "");
				link.click();
				URL.revokeObjectURL(url);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: ReportView_module_css_default.root,
				"data-testid": "pentest-report",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: ReportView_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ReportView_module_css_default.hint,
							children: t("report.hint")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ReportView_module_css_default.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ReportView_module_css_default.action,
								onClick: () => {
									copy();
								},
								"data-testid": "pentest-report-copy",
								children: t(copyState === "done" ? "report.copied" : "report.copy")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ReportView_module_css_default.action,
								onClick: download,
								"data-testid": "pentest-report-download",
								children: t("report.download")
							})]
						})]
					}),
					copyState === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ReportView_module_css_default.error,
						role: "status",
						children: t("report.copyFailed")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownPreview, { markdown })
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\admin\Desktop\dsh\dsh-pentest\src\dsh-client-ui-pentest\src\client\PentestView.module.css.mjs
		const css = ".lPEbAa_root{box-sizing:border-box;flex-direction:column;gap:12px;height:100%;padding:16px 20px;display:flex;overflow-y:auto}.lPEbAa_card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;flex-direction:column;flex:none;gap:8px;min-width:0;padding:14px 16px;display:flex}.lPEbAa_cardTitle{align-items:baseline;flex-wrap:wrap;gap:4px 12px;min-width:0;display:flex}.lPEbAa_target{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:1 1 auto;min-width:0;margin:0;font-size:16px;font-weight:600;line-height:24px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.lPEbAa_objective{min-width:0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex:1 1 100%;font-size:13px;line-height:24px}.lPEbAa_counts{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.lPEbAa_authorization{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}.lPEbAa_tabs{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;gap:4px;display:flex}.lPEbAa_tab{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:8px 8px 0 0;padding:6px 12px;font-size:13px;line-height:20px}.lPEbAa_tab:hover{color:var(--dsw-alias-label-secondary)}.lPEbAa_tab[aria-pressed=true]{color:var(--dsw-alias-label-primary);box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary);font-weight:600}.lPEbAa_content{flex-direction:column;flex:auto;min-height:0;display:flex}.lPEbAa_empty{box-sizing:border-box;place-items:center;height:100%;padding:24px;display:grid}.lPEbAa_emptyText{text-align:center;max-width:480px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px}.lPEbAa_cardTitle{cursor:pointer;position:relative;padding-right:18px}.lPEbAa_cardTitle[data-open='0']{max-height:24px;overflow:hidden}.lPEbAa_cardTitle[data-open='0']::after{content:'\\25BE';position:absolute;right:0;top:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:24px}.lPEbAa_cardTitle[data-open='1']::after{content:'\\25B4';position:absolute;right:0;top:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:24px}.lPEbAa_cardTitle[data-open='1'] .lPEbAa_target{-webkit-line-clamp:unset;overflow:visible;display:block}";
		const tagId = "dsh-stcs/PentestView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-stcs";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PentestView_module_css_default = {
			"authorization": "lPEbAa_authorization",
			"tabs": "lPEbAa_tabs",
			"card": "lPEbAa_card",
			"emptyText": "lPEbAa_emptyText",
			"objective": "lPEbAa_objective",
			"root": "lPEbAa_root",
			"cardTitle": "lPEbAa_cardTitle",
			"counts": "lPEbAa_counts",
			"content": "lPEbAa_content",
			"empty": "lPEbAa_empty",
			"target": "lPEbAa_target",
			"tab": "lPEbAa_tab"
		};
		//#endregion
		//#region src/client/PentestView.tsx
		/**
		* PentestView: the 渗透 conversation-view tab. A pure projection-mode
		* surface — the standing `pentest` projection (engagement goal plus the
		* exploration graph) arrives through `useProjection('pentest')`, so the tab
		* owns no store and needs no host RPC. The view renders one engagement header
		* card (goal target, objective, authorization, node counts) over a sub-tab
		* bar: 探索链路 (the chain as an interactive graph), 漏洞 (findings with
		* reproducible steps), 资产 (list or graph), and 报告 (copyable Markdown).
		* Absent projection
		* (capability or session not composed) or null (no `pentest_add_goal` yet)
		* renders the guiding empty note.
		*/
		/** Sub-tab ids, in bar order. */
		const TABS = [
			"task",
			"explore",
			"feed",
			"findings",
			"assets",
			"report"
		];
		/** Sub-tab label keys. */
		const TAB_LABELS = {
			task: "view.tab.task",
			explore: "view.tab.explore",
			feed: "view.tab.feed",
			findings: "view.tab.findings",
			assets: "view.tab.assets",
			report: "view.tab.report"
		};

		/** 队列状态 -> 文案 key。 */
		const QUEUE_STATE_LABELS = {
			pending: "queue.state.pending",
			queued: "queue.state.pending",
			claimed: "queue.state.claimed",
			running: "queue.state.running",
			done: "queue.state.done",
			dead: "queue.state.dead",
			failed: "queue.state.dead",
			cancelled: "queue.state.cancelled",
			unknown: "queue.state.unknown"
		};
		/** 任务板分组（按此顺序渲染；未列出的状态归入「其他」）。 */
		const QUEUE_GROUPS = [
			{ key: "running", labelKey: "queue.group.running", states: ["running", "claimed"] },
			{ key: "pending", labelKey: "queue.group.pending", states: ["pending"] },
			{ key: "failed", labelKey: "queue.group.failed", states: ["dead"] },
			{ key: "cancelled", labelKey: "queue.group.cancelled", states: ["cancelled"] },
			{ key: "done", labelKey: "queue.group.done", states: ["done"] }
		];

		/** 时间戳 -> HH:MM:SS；缺失/非法值返回空串。 */
		function queueTimeLabel(ts) {
			const n = Number(ts);
			if (!Number.isFinite(n) || n <= 0) return "";
			try {
				return new Date(n).toLocaleTimeString([], { hour12: false });
			} catch (error) {
				return "";
			}
		}

		/** 任意值 -> 对象（字符串尝试 JSON 解析，失败得到空对象）。 */
		function queueObjectOf(value) {
			if (value !== null && typeof value === "object") return value;
			if (typeof value === "string" && value !== "") {
				try {
					const parsed = JSON.parse(value);
					return parsed !== null && typeof parsed === "object" ? parsed : {};
				} catch (error) {
					return {};
				}
			}
			return {};
		}

		/** 队列行 -> 展示快照；任何字段缺失都退回安全默认值。 */
		function queueTaskOf(raw) {
			const task = queueObjectOf(raw);
			const payload = queueObjectOf(task.payload);
			const budget = queueObjectOf(task.budget);
			const result = queueObjectOf(task.result);
			return {
				id: String(task.id || ""),
				intentId: String(task.intentId || ""),
				kind: String(task.kind || ""),
				title: String(task.title || ""),
				state: String(task.state || "unknown"),
				priority: Number(task.priority) || 0,
				attempts: Number(task.attempts) || 0,
				maxAttempts: Number(task.maxAttempts) || 0,
				worker: String(task.workerId || task.lastWorker || ""),
				calls: Number(budget.calls ?? task.calls) || 0,
				maxCalls: Number(budget.maxCalls) || 0,
				timeMs: Number(budget.timeMs) || 0,
				maxMs: Number(budget.maxMs) || 0,
				evidenceUsed: Number(budget.evidence) || 0,
				maxEvidence: Number(budget.maxEvidence) || 0,
				maxMinutes: Number(budget.maxMinutes) || 0,
				createdAt: Number(task.createdAt) || 0,
				updatedAt: Number(task.updatedAt) || 0,
				dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn.map((dep) => String(dep)).filter((dep) => dep !== "") : [],
				detail: String(payload.intentDetail || ""),
				doneWhen: String(payload.doneWhen || ""),
				lastError: String(payload.lastError || ""),
				lastSummary: String(payload.lastSummary || ""),
				summary: String(result.summary || ""),
				evidenceCount: Array.isArray(result.evidenceIds) ? result.evidenceIds.length : 0,
				findingCount: Array.isArray(result.findingIds) ? result.findingIds.length : 0
			};
		}

		/** 组内排序：待执行按优先级、执行中按创建时间、其余按最近更新。 */
		function queueSortOf(groupKey, a, b) {
			if (groupKey === "pending") return b.priority - a.priority || a.createdAt - b.createdAt;
			if (groupKey === "running") return a.createdAt - b.createdAt;
			return b.updatedAt - a.updatedAt;
		}

		/** 卡片里的一行「标签 值」；值为空时不渲染。 */
		function queueDetailRow(label, value) {
			if (value === null || value === void 0 || value === "") return null;
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", gap: "8px" },
				children: [
					(0, react_jsx_runtime.jsx)("span", { style: { flex: "0 0 64px", opacity: 0.6 }, children: label }),
					(0, react_jsx_runtime.jsx)("span", { style: { flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }, children: value })
				]
			});
		}

		/** 摘要行右侧的元信息：类型 / 意图 / 执行者 / 尝试次数 / 更新时间。 */
		function queueMetaOf(task, t) {
			const parts = [];
			if (task.kind !== "") parts.push(task.kind);
			if (task.intentId !== "") parts.push(t("queue.card.intent") + " " + task.intentId);
			if (task.worker !== "") parts.push(t("queue.card.worker") + " " + task.worker);
			if (task.maxAttempts > 0) parts.push(t("queue.card.attempts") + " " + task.attempts + "/" + task.maxAttempts);
			else if (task.attempts > 0) parts.push(t("queue.card.attempts") + " " + task.attempts);
			const updated = queueTimeLabel(task.updatedAt > 0 ? task.updatedAt : task.createdAt);
			if (updated !== "") parts.push(updated);
			return parts;
		}

		/** 单条队列任务：折叠时一行摘要，展开后是完整细节。 */
		function TaskCard({ task, t }) {
			const stateLabelKey = QUEUE_STATE_LABELS[task.state] !== void 0 ? QUEUE_STATE_LABELS[task.state] : "queue.state.unknown";
			const stateTone = task.state === "running" || task.state === "claimed" ? "#4f8cff"
				: task.state === "pending" || task.state === "queued" ? "#f0a020"
					: task.state === "dead" || task.state === "failed" || task.state === "unknown" ? "#e5484d"
						: task.state === "done" ? "#30a46c" : "var(--dsw-alias-label-tertiary)";
			const meta = [];
			const hasArtifacts = task.evidenceCount > 0 || task.findingCount > 0;
			const resultValue = task.summary !== ""
				? (hasArtifacts ? t("queue.card.resultWithCounts", { summary: task.summary, evidence: task.evidenceCount, findings: task.findingCount }) : task.summary)
				: (hasArtifacts ? t("queue.card.resultCounts", { evidence: task.evidenceCount, findings: task.findingCount }) : "");
			const budgetValue = task.maxCalls > 0 || task.maxMs > 0 || task.maxEvidence > 0
				? t("task.budgetHint", { calls: task.calls, maxCalls: task.maxCalls > 0 ? task.maxCalls : "-", evidence: task.evidenceUsed, maxEvidence: task.maxEvidence > 0 ? task.maxEvidence : "-", minutes: task.maxMinutes > 0 ? task.maxMinutes : "-" })
				: "";
			const titleValue = String(task.title || (task.id !== "" ? task.id : t("queue.card.none")));
			const title = titleValue.length > 120 ? titleValue.slice(0, 119) + "…" : titleValue;
			const pct = task.maxCalls > 0 ? Math.min(100, Math.round(task.calls / task.maxCalls * 100)) : 0;
			const updated = queueTimeLabel(task.updatedAt > 0 ? task.updatedAt : task.createdAt);
			return (0, react_jsx_runtime.jsxs)("details", {
				style: { border: "1px solid transparent", borderBottom: "1px solid var(--dsw-alias-border-l1)", borderRadius: 0, background: "transparent", padding: "6px 2px" },
				children: [
					(0, react_jsx_runtime.jsx)("summary", {
						style: { cursor: "pointer", listStyle: "none" },
						children: (0, react_jsx_runtime.jsxs)("div", {
							style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 10px" },
							children: [
								(0, react_jsx_runtime.jsx)("span", { style: { flex: "0 0 auto", fontSize: "11px", lineHeight: "18px", padding: "1px 8px", borderRadius: "999px", border: "1px solid " + stateTone + "55", background: stateTone + "18", color: stateTone }, children: t(stateLabelKey) }),
								(0, react_jsx_runtime.jsx)("span", { style: { flex: "1 1 260px", minWidth: 0, fontSize: "12.5px", lineHeight: "18px", fontWeight: 550, color: "var(--dsw-alias-label-primary)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }, children: title }),
								task.findingCount > 0 ? (0, react_jsx_runtime.jsx)("span", { style: { padding: "2px 7px", borderRadius: "6px", background: "var(--dsw-alias-bg-layer-2)", color: "#f76b15" }, children: t("task.findingsShort", { n: task.findingCount }) }) : null,
								(0, react_jsx_runtime.jsx)("span", { style: { flex: "0 0 auto", fontSize: "10px", color: "var(--dsw-alias-label-tertiary)", fontVariantNumeric: "tabular-nums" }, children: updated })
							]
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: { display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px", fontSize: "12px", lineHeight: "20px", color: "var(--dsw-alias-label-secondary)" },
						children: [
							pct > 0 ? (0, react_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "52px 1fr 86px", alignItems: "center", gap: "8px", margin: "2px 0 4px" }, children: [
								(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", color: "var(--dsw-alias-label-tertiary)" }, children: t("task.budgetCalls") }),
								(0, react_jsx_runtime.jsx)("span", { style: { height: "4px", borderRadius: "2px", background: "var(--dsw-alias-bg-layer-2)", overflow: "hidden" }, children: (0, react_jsx_runtime.jsx)("span", { style: { display: "block", width: pct + "%", height: "100%", borderRadius: "2px", background: pct >= 100 ? "#e5484d" : stateTone } }) }),
								(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", textAlign: "right", color: "var(--dsw-alias-label-tertiary)", fontVariantNumeric: "tabular-nums" }, children: task.calls + "/" + (task.maxCalls > 0 ? task.maxCalls : "?") })
							] }) : null,
							queueDetailRow(t("queue.card.detail"), task.detail),
							queueDetailRow(t("queue.card.doneWhen"), task.doneWhen),
							queueDetailRow(t("queue.card.dependsOn"), task.dependsOn.join(", ")),
							queueDetailRow(t("queue.card.budget"), budgetValue),
							queueDetailRow(t("queue.card.result"), resultValue),
							queueDetailRow(t("queue.card.lastError"), task.lastError),
							queueDetailRow(t("queue.card.lastSummary"), task.lastSummary)
						]
					})
				]
			});
		}

		const TASK_SEVERITIES = [
			{ key: "critical", label: "task.severity.critical", color: "#b91c1c" },
			{ key: "high", label: "task.severity.high", color: "#ef4444" },
			{ key: "medium", label: "task.severity.medium", color: "#f59e0b" },
			{ key: "low", label: "task.severity.low", color: "#3b82f6" },
			{ key: "info", label: "task.severity.info", color: "#94a3b8" }
		];

		function taskIsInternalEntry(task) {
			return /成员回报汇总|事实入口|不是探索方向/.test(task.title || "");
		}

		function TaskMetric({ label, value, suffix, tone }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", flexDirection: "column", gap: "3px", padding: "11px 12px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "10px", background: "var(--dsw-alias-bg-layer-1)" },
				children: [
					(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", color: "var(--dsw-alias-label-tertiary)" }, children: label }),
					(0, react_jsx_runtime.jsxs)("span", { style: { display: "flex", alignItems: "baseline", gap: "4px", color: tone || "var(--dsw-alias-label-primary)" }, children: [
						(0, react_jsx_runtime.jsx)("strong", { style: { fontSize: "22px", lineHeight: "26px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }, children: value }),
						suffix ? (0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", color: "var(--dsw-alias-label-tertiary)" }, children: suffix }) : null
					] })
				]
			});
		}

		function TaskSeverityBar({ counts, total, t }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", flexDirection: "column", gap: "8px" },
				children: [
					(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }, children: [
						(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "12px", fontWeight: 600, color: "var(--dsw-alias-label-secondary)" }, children: t("task.riskDistribution") }),
						(0, react_jsx_runtime.jsxs)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: [ t("task.totalFindings"), " ", (0, react_jsx_runtime.jsx)("strong", { style: { color: "var(--dsw-alias-label-primary)", fontSize: "14px" }, children: total }) ] })
					] }),
					total > 0 ? (0, react_jsx_runtime.jsx)("div", { style: { display: "flex", height: "7px", borderRadius: "999px", overflow: "hidden", background: "var(--dsw-alias-bg-layer-2)" }, children: TASK_SEVERITIES.filter((severity) => counts[severity.key] > 0).map((severity) => (0, react_jsx_runtime.jsx)("span", { style: { width: (counts[severity.key] / total * 100) + "%", background: severity.color }, title: t(severity.label) + " " + counts[severity.key] }, severity.key)) }) : (0, react_jsx_runtime.jsx)("div", { style: { height: "7px", borderRadius: "999px", background: "var(--dsw-alias-bg-layer-2)" } }),
					(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" }, children: TASK_SEVERITIES.map((severity) => (0, react_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 7px", borderRadius: "6px", background: "var(--dsw-alias-bg-layer-2)", fontSize: "11px", color: "var(--dsw-alias-label-secondary)" }, children: [
						(0, react_jsx_runtime.jsx)("span", { style: { width: "6px", height: "6px", borderRadius: "50%", background: severity.color } }),
						t(severity.label), (0, react_jsx_runtime.jsx)("strong", { style: { color: counts[severity.key] > 0 ? severity.color : "var(--dsw-alias-label-tertiary)" }, children: counts[severity.key] })
					] }, severity.key)) })
				]
			});
		}

		async function requestPentestControl(text) {
			const ctx = CLIENT_CTX;
			if (CURRENT_SESSION === void 0 || CURRENT_SESSION === "") throw new Error("no current session");
			const content = [{ type: "text", text }];
			let timeZone = "UTC";
			try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (error) { /* fallback */ }
			const requestId = () => {
				try { if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID(); } catch (error) { /* fallback */ }
				return "ui-" + Date.now() + "-" + Math.random().toString(36).slice(2);
			};
			const invoke = async (mode) => {
				const session = ctx && ctx.sessions && typeof ctx.sessions.get === "function" ? ctx.sessions.get(CURRENT_SESSION) : undefined;
				if (session && typeof session.prompt === "function") return await session.prompt(content, mode);
				const remote = ctx && ctx.remote;
				if (remote && remote.session && typeof remote.session.prompt === "function") return await remote.session.prompt({ requestId: requestId(), sessionId: CURRENT_SESSION, mode, content, clientTimeZone: timeZone });
				throw new Error("session prompt unavailable");
			};
			let result = await invoke("steer");
			if (!(result && result.ok)) result = await invoke("queue");
			if (!(result && result.ok)) throw new Error((result && result.error && result.error.message) || "prompt rejected");
			return result;
		}

		async function requestPentestPause(pause) {
			const ctx = CLIENT_CTX;
			const remote = ctx && ctx.remote;
			if (!CURRENT_SESSION || !remote || !remote.commands || typeof remote.commands.execute !== "function") {
				throw new Error("direct control API unavailable");
			}
			// Pass the exact session id as command input. The command bridge resolves
			// its `agent` argument from the active conversation, which can differ
			// from the session whose pentest tab is currently rendered.
			const line = (pause ? "/pentest-pause-all " : "/pentest-resume-all ") + CURRENT_SESSION;
			const result = await remote.commands.execute(CURRENT_SESSION, line, []);
			if (result === void 0 || result === null) throw new Error("command returned no result");
			// The bridge may wrap CommandExecution as {ok,value} or expose it
			// directly as {commandId,result}. Read the settled CommandResult
			// from either shape so an error can never look like success.
			const execution = result && typeof result === "object" && result.ok !== undefined
				? (result.ok ? result.value : null)
				: result;
			const settled = execution && typeof execution === "object" && execution.result
				? execution.result
				: execution;
			if (result.ok === false) throw new Error(String(result.error?.message || "command rejected"));
			if (!settled || typeof settled !== "object") throw new Error("command returned no settled result");
			if (settled.kind === "error") throw new Error(settled.text || "command rejected");
			return settled;
		}

		async function requestWorkerLimit(limit) {
			return requestPentestControl("并发 worker 上限设为 " + limit + "（UI 操作）");
		}

		/** Queue the auditor for every pending finding (no worker dispatch). */
		async function requestPentestAudit() {
			const ctx = CLIENT_CTX;
			const remote = ctx && ctx.remote;
			if (!CURRENT_SESSION || !remote || !remote.commands || typeof remote.commands.execute !== "function") {
				throw new Error("direct control API unavailable");
			}
			const line = "/pentest-audit-pending " + CURRENT_SESSION;
			const result = await remote.commands.execute(CURRENT_SESSION, line, []);
			if (result === void 0 || result === null) throw new Error("command returned no result");
			const execution = result && typeof result === "object" && result.ok !== undefined
				? (result.ok ? result.value : null)
				: result;
			const settled = execution && typeof execution === "object" && execution.result
				? execution.result
				: execution;
			if (result.ok === false) throw new Error(String(result.error?.message || "command rejected"));
			if (!settled || typeof settled !== "object") throw new Error("command returned no settled result");
			if (settled.kind === "error") throw new Error(settled.text || "command rejected");
			return settled;
		}

		async function requestGoalReopen() {
			return requestPentestControl("恢复目标（UI 操作）");
		}

		/** 「任务」tab：风险总览 + 任务控制台。 */
		function TaskTab({ pentest, t }) {
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => {
					try {
						const root = document.querySelector('[data-testid="pentest-view"]');
						let node = root;
						while (node) {
							if (node.scrollHeight > node.clientHeight + 2) node.scrollTop = 0;
							node = node.parentElement;
						}
						if (typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo(0, 0);
					} catch (error) { /* best effort */ }
				}, 0);
				return () => clearTimeout(timer);
			}, []);
			const allTasks = pentest !== null && typeof pentest === "object" && Array.isArray(pentest.queue) ? pentest.queue.map(queueTaskOf) : [];
			const findings = (pentest !== null && typeof pentest === "object" && Array.isArray(pentest.findings) ? pentest.findings : []).filter((finding) => !finding || finding.deleted !== true);
			const confirmedFindings = findings.filter((finding) => findingCategory(finding) === "vulnerability");
			const assets = pentest !== null && typeof pentest === "object" && Array.isArray(pentest.assets) ? pentest.assets : [];
			const coverage = pentest !== null && typeof pentest === "object" && Array.isArray(pentest.coverage) ? pentest.coverage : [];
			const tasks = allTasks.filter((task) => !taskIsInternalEntry(task));
			const taskDirectionSource = Array.isArray(pentest && pentest.directions) ? pentest.directions : (Array.isArray(pentest && pentest.intents) ? pentest.intents : []);
			const directionTitle = new Map(taskDirectionSource.map((direction) => [String(direction.id || ""), String(direction.question || direction.title || "")]));
			const taskWithTitle = (task) => { const mapped = directionTitle.get(String(task.intentId || "")); return { ...task, title: (task.title && task.title !== task.id ? task.title : mapped) || task.id }; };
			const hiddenTasks = allTasks.length - tasks.length;
			const counts = { running: 0, pending: 0, failed: 0, done: 0 };
			const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
			for (const finding of confirmedFindings) {
				const severity = String(finding && finding.severity || "info").toLowerCase();
				if (severity in severityCounts) severityCounts[severity] += 1;
				else severityCounts.info += 1;
			}
			const grouped = { running: [], pending: [], failed: [], cancelled: [], done: [] };
			const others = [];
			for (const task of tasks) {
				const state = String(task && task.state || "");
				// Accept both vocabularies: v3 used pending/claimed/dead, v4 uses
				// queued/running/failed. Without this every v4 queued or failed
				// task fell into "others" and the console showed 0 failures.
				if (state === "pending" || state === "queued") { counts.pending += 1; grouped.pending.push(task); }
				else if (state === "claimed" || state === "running") { counts.running += 1; grouped.running.push(task); }
				else if (state === "dead" || state === "failed" || state === "unknown") { counts.failed += 1; grouped.failed.push(task); }
				else if (state === "cancelled") { grouped.cancelled.push(task); }
				else if (state === "done") { counts.done += 1; grouped.done.push(task); }
				else others.push(task);
			}
			const paused = Boolean(pentest && pentest.goal && pentest.goal.paused === true);
			const goal = pentest && pentest.goal ? pentest.goal : {};
			const blocked = String(goal.phase || "") === "blocked";
			const [busy, setBusy] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)("");
			// ONE source of truth: auditStateOf() drives both the finding-tab
			// chips and this task-console summary, so 已审核/待审核 always equal
			// 已确认漏洞/待验证 and never disagree.
			const reportableFindings = findings.filter((finding) => String(finding && finding.severity || "") !== "info");
			const auditedCount = reportableFindings.filter((finding) => auditStateOf(finding) === "audited").length;
			const pendingAuditCount = reportableFindings.filter((finding) => auditStateOf(finding) === "pending").length;
			const auditDebt = pendingAuditCount;
			const runAudit = async () => {
				if (busy) return;
				setBusy(true);
				setNotice(t("task.auditRunning"));
				try {
					const result = await requestPentestAudit();
					// Host normalizes CommandResult down to {kind,text,...}, so
					// the queued count only survives inside text.
					const text = String(result && result.text || "");
					const match = text.match(/Queued\s+(\d+)\s+finding/i);
					const queued = Number(result && result.queued || (match ? match[1] : 0));
					setNotice(t("task.auditQueued", { n: queued }));
				} catch (error) {
					setNotice(t("task.auditFailed", { reason: String(error && error.message ? error.message : error) }));
				} finally {
					setBusy(false);
				}
			};
			const workerLimit = Math.min(Math.max(Number(pentest && pentest.settings && pentest.settings.workerLimit || 3), 1), 6);
			const activeWorkers = Number(pentest && pentest.concurrency && pentest.concurrency.active || counts.running || 0);
			const changeWorkerLimit = async (next) => {
				if (busy) return;
				const value = Math.min(Math.max(Number(next) || 3, 1), 6);
				if (value === workerLimit) return;
				setBusy(true);
				setNotice(t("task.workerLimitPending"));
				try { await requestWorkerLimit(value); setNotice(t("task.workerLimitRequested", { n: value })); }
				catch (error) { setNotice(t("task.workerLimitFailed", { reason: String(error && error.message ? error.message : error) })); }
				finally { setBusy(false); }
			};
			const togglePause = async () => {
				if (busy) return;
				setBusy(true);
				setNotice(blocked ? t("task.reopenPending") : (paused ? t("task.resumePending") : t("task.pausePending")));
				try {
					if (blocked) {
						await requestGoalReopen();
						setNotice(t("task.pauseRequested"));
					} else {
						const result = await requestPentestPause(!paused);
						const settled = result && typeof result === "object" && result.result ? result.result : result;
						const text = settled && typeof settled === "object" ? String(settled.text || settled.sessionId || "") : "";
						setNotice(text ? t("task.pauseRequested") + " " + text : t("task.pauseRequested"));
					}
				} catch (error) {
					setNotice(t("task.pauseFailed", { reason: String(error && error.message ? error.message : error) }));
				} finally {
					setBusy(false);
				}
			};
			const sections = [];
			for (const group of QUEUE_GROUPS) {
				const rows = grouped[group.key].slice().sort((a, b) => queueSortOf(group.key, a, b));
				if (rows.length === 0) continue;
				sections.push((0, react_jsx_runtime.jsxs)("section", {
					style: { display: "flex", flexDirection: "column", gap: "6px" },
					children: [
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
							(0, react_jsx_runtime.jsx)("h3", { style: { margin: 0, fontSize: "12px", fontWeight: 650, color: "var(--dsw-alias-label-secondary)" }, children: t(group.labelKey) }),
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: rows.length })
						] }),
						...rows.map((task, index) => (0, react_jsx_runtime.jsx)(TaskCard, { task: taskWithTitle(task), t }, (task.id || "task") + "-" + index))
					]
				}, group.key));
			}
			if (others.length > 0) {
				others.sort((a, b) => b.updatedAt - a.updatedAt);
				sections.push((0, react_jsx_runtime.jsxs)("section", {
					style: { display: "flex", flexDirection: "column", gap: "6px" },
					children: [
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
							(0, react_jsx_runtime.jsx)("h3", { style: { margin: 0, fontSize: "12px", fontWeight: 650, color: "var(--dsw-alias-label-secondary)" }, children: t("queue.group.other") }),
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: others.length })
						] }),
						...others.map((task, index) => (0, react_jsx_runtime.jsx)(TaskCard, { task: taskWithTitle(task), t }, (task.id || "other") + "-" + index))
					]
				}, "other"));
			}
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", flexDirection: "column", gap: "14px", padding: "16px", minHeight: 0, overflowY: "auto" },
				children: [
					(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }, children: [
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }, children: [
							(0, react_jsx_runtime.jsx)("div", { style: { fontSize: "16px", fontWeight: 700, color: "var(--dsw-alias-label-primary)" }, children: t("task.title") }),
							(0, react_jsx_runtime.jsxs)("div", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)", overflowWrap: "anywhere" }, children: [ t("task.goalLine", { target: goal.target || t("task.noTarget") }), paused ? " · " + t("task.paused") : "", blocked ? " · " + t("task.blocked") : "" ] })
						] }),
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }, children: [
							(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "5px", padding: "3px 6px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "8px", background: "var(--dsw-alias-bg-layer-1)" }, children: [
								(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: t("task.workerLimit") }),
								(0, react_jsx_runtime.jsx)("button", { type: "button", disabled: busy || workerLimit <= 1, onClick: () => changeWorkerLimit(workerLimit - 1), style: { width: "22px", height: "22px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "6px", background: "transparent", color: "var(--dsw-alias-label-secondary)", cursor: busy || workerLimit <= 1 ? "not-allowed" : "pointer", opacity: busy || workerLimit <= 1 ? 0.4 : 1 }, children: "-" }),
								(0, react_jsx_runtime.jsx)("span", { style: { minWidth: "12px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "var(--dsw-alias-label-primary)", fontVariantNumeric: "tabular-nums" }, children: workerLimit }),
								(0, react_jsx_runtime.jsx)("button", { type: "button", disabled: busy || workerLimit >= 6, onClick: () => changeWorkerLimit(workerLimit + 1), style: { width: "22px", height: "22px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "6px", background: "transparent", color: "var(--dsw-alias-label-secondary)", cursor: busy || workerLimit >= 6 ? "not-allowed" : "pointer", opacity: busy || workerLimit >= 6 ? 0.4 : 1 }, children: "+" }),
								(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", color: "var(--dsw-alias-label-tertiary)" }, children: activeWorkers + "/" + workerLimit })
							] }),
							paused ? (0, react_jsx_runtime.jsx)("span", { style: { padding: "4px 8px", borderRadius: "999px", fontSize: "11px", color: "#f0a020", border: "1px solid #f0a02066", background: "#f0a02018" }, children: t("task.paused") }) : null,
							blocked ? (0, react_jsx_runtime.jsx)("span", { style: { padding: "4px 8px", borderRadius: "999px", fontSize: "11px", color: "#e5484d", border: "1px solid #e5484d66", background: "#e5484d18" }, children: t("task.blocked") }) : null
						] })
					] }),
					(0, react_jsx_runtime.jsxs)("section", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "16px 18px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "14px", background: "linear-gradient(135deg, var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-layer-2))" }, children: [
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }, children: [
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "12px", fontWeight: 650, color: "var(--dsw-alias-label-secondary)" }, children: "漏洞总览" }),
							(0, react_jsx_runtime.jsxs)("span", { style: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" }, children: ["共 ", (0, react_jsx_runtime.jsx)("strong", { style: { fontSize: "24px", color: "var(--dsw-alias-label-primary)", fontVariantNumeric: "tabular-nums" }, children: confirmedFindings.length }), " 条"] })
						] }),
						(0, react_jsx_runtime.jsxs)("div", { "data-testid": "pentest-audit-summary", style: { display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", color: "var(--dsw-alias-label-tertiary)", flexWrap: "wrap" }, children: [
							(0, react_jsx_runtime.jsxs)("span", { title: "已审核：审核员已独立完整验证并确认成立；与漏洞 tab 的「已审核」是同一批。", style: { display: "inline-flex", alignItems: "center", gap: "5px" }, children: [
								(0, react_jsx_runtime.jsx)("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: "#2f9e44" } }),
								"已审核 ",
								(0, react_jsx_runtime.jsx)("strong", { style: { color: "var(--dsw-alias-label-primary)", fontVariantNumeric: "tabular-nums" }, children: auditedCount })
							] }),
							(0, react_jsx_runtime.jsxs)("span", { title: "待审核：审核员还没完整验证；与漏洞 tab 的「待审核」是同一批，会自动排队验证。", style: { display: "inline-flex", alignItems: "center", gap: "5px" }, children: [
								(0, react_jsx_runtime.jsx)("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: "#f0a020" } }),
								"待审核 ",
								(0, react_jsx_runtime.jsx)("strong", { style: { color: "var(--dsw-alias-label-primary)", fontVariantNumeric: "tabular-nums" }, children: pendingAuditCount })
							] }),
							(0, react_jsx_runtime.jsxs)("span", { title: "审核覆盖 = 已审核 / 全部可报漏洞。", children: ["审核覆盖 ", Math.round(reportableFindings.length > 0 ? auditedCount / reportableFindings.length * 100 : 0), "%"] }),
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "10px", opacity: 0.75 }, children: "待审核即待验证，由审核员完整验证后转为已审核" })
						] }),
						(0, react_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }, children: TASK_SEVERITIES.filter((severity) => severity.key !== "info").map((severity) => (0, react_jsx_runtime.jsxs)("div", { style: { padding: "12px 14px", border: "1px solid var(--dsw-alias-border-l1)", borderTop: "3px solid " + severity.color, borderRadius: "10px", background: "var(--dsw-alias-bg-layer-1)", display: "flex", flexDirection: "column", gap: "4px" }, children: [
							(0, react_jsx_runtime.jsxs)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)", display: "flex", alignItems: "center", gap: "6px" }, children: [
								(0, react_jsx_runtime.jsx)("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: severity.color } }),
								t(severity.label)
							] }),
							(0, react_jsx_runtime.jsx)("strong", { style: { fontSize: "32px", lineHeight: "34px", fontWeight: 750, color: severityCounts[severity.key] > 0 ? severity.color : "var(--dsw-alias-label-tertiary)", fontVariantNumeric: "tabular-nums" }, children: severityCounts[severity.key] || 0 })
						] }, severity.key)) })
					] }),
					(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }, children: [
						(0, react_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 }, children: [
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "12px", fontWeight: 650, color: "var(--dsw-alias-label-secondary)" }, children: t("task.execution") }),
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: t("queue.summary", { total: tasks.length, running: counts.running, pending: counts.pending, failed: counts.failed, done: counts.done }) })
						] }),
					auditDebt > 0 ? (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: runAudit,
						style: { cursor: busy ? "wait" : "pointer", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "8px", padding: "5px 11px", fontSize: "12px", fontWeight: 650, color: "var(--dsw-alias-label-primary)", background: "transparent", opacity: busy ? 0.7 : 1 },
						children: t("task.auditPending", { n: auditDebt })
					}) : null,
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: togglePause,
							style: { cursor: busy ? "wait" : "pointer", border: "1px solid transparent", borderRadius: "8px", padding: "5px 11px", fontSize: "12px", fontWeight: 650, color: "#fff", background: blocked ? "#c2413d" : (paused ? "#2f9e63" : "#c2413d"), opacity: busy ? 0.7 : 1 },
							children: busy ? (blocked ? t("task.reopenPending") : (paused ? t("task.resumePending") : t("task.pausePending"))) : (blocked ? t("task.reopenGoal") : (paused ? t("task.resumeAllShort") : t("task.pauseAllShort")))
						})
					] }),
					hiddenTasks > 0 ? (0, react_jsx_runtime.jsx)("div", { style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }, children: t("task.hiddenInternal", { n: hiddenTasks }) }) : null,
					notice !== "" ? (0, react_jsx_runtime.jsx)("div", { style: { padding: "7px 9px", borderRadius: "7px", fontSize: "11px", color: "var(--dsw-alias-label-secondary)", background: "var(--dsw-alias-bg-layer-1)", border: "1px solid var(--dsw-alias-border-l1)" }, children: notice }) : null,
					...(tasks.length === 0 ? [(0, react_jsx_runtime.jsx)("div", { style: { padding: "20px 16px", borderRadius: "10px", border: "1px dashed var(--dsw-alias-border-l1)", color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", lineHeight: "20px" }, children: t("queue.empty") }, "empty")] : sections)
				]
			});
		}

		function PentestView({ useProjection, t }) {
			const pentest = useProjection("pentest");
			const [tab, setTab] = (0, react.useState)("task");
			// HOTFIX(local): 链路图点「漏洞」节点 -> 切到「漏洞」tab 并定位到该条。
			const [focusFindingId, setFocusFindingId] = (0, react.useState)(null);
			// HOTFIX(local): 目标/目的默认收起，点标题行展开。
			const [goalOpen, setGoalOpen] = (0, react.useState)(false);
			const openFinding = (findingId) => {
				setFocusFindingId(findingId);
				setTab("findings");
			};
			if (pentest === void 0 || pentest === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PentestView_module_css_default.empty,
				"data-testid": "pentest-view",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PentestView_module_css_default.emptyText,
					children: t("view.empty")
				})
			});
			if (pentest.goal === void 0 || pentest.goal === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PentestView_module_css_default.empty,
				"data-testid": "pentest-view",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PentestView_module_css_default.emptyText,
						children: t("view.emptyNoGoal")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PentestView_module_css_default.emptyText,
						style: { marginTop: "8px" },
						children: t("view.emptyNoGoalHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PentestView_module_css_default.emptyText,
						style: { marginTop: "8px", opacity: 0.72 },
						children: t("view.emptyNoGoalOptOut")
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: PentestView_module_css_default.root,
				"data-testid": "pentest-view",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: PentestView_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PentestView_module_css_default.cardTitle,
								"data-open": goalOpen ? "1" : "0",
								onClick: () => {
									setGoalOpen(!goalOpen);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: PentestView_module_css_default.target,
									title: pentest.goal === null ? "" : pentest.goal.target,
									children: pentest.goal === null ? "" : pentest.goal.target
								}), pentest.goal !== null && pentest.goal.objective !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: PentestView_module_css_default.objective,
									children: ["目的：", pentest.goal.objective]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PentestView_module_css_default.counts,
								children: t("counts", {
									intents: normalizeLineageProjection(pentest).intents.length,
									facts: normalizeLineageProjection(pentest).facts.length,
									findings: normalizeLineageProjection(pentest).findings.length,
									assets: pentest.counts.assets
								})
							}),
							pentest.goal !== null && pentest.goal.authorization !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: PentestView_module_css_default.authorization,
								children: ["授权：", pentest.goal.authorization]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
						className: PentestView_module_css_default.tabs,
						"data-testid": "pentest-tabs",
						children: TABS.map((tabKey) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: PentestView_module_css_default.tab,
							"aria-pressed": tab === tabKey,
							"data-testid": `pentest-tab-${tabKey}`,
							onClick: () => {
								setTab(tabKey);
								setTimeout(() => {
									try {
										const root = document.querySelector('[data-testid="pentest-view"]');
										let node = root;
										while (node) { if (node.scrollHeight > node.clientHeight + 2) node.scrollTop = 0; node = node.parentElement; }
										if (typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo(0, 0);
									} catch (error) {}
								}, 0);
							},
							children: [
								t(TAB_LABELS[tabKey]),
								tabKey === "findings" ? ` (${securityItemsOf(pentest).filter((item) => item.category === "vulnerability").length})` : "",
								tabKey === "assets" ? ` (${pentest.counts.assets})` : ""
							]
						}, tabKey))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PentestView_module_css_default.content,
						children: [
							tab === "task" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskTab, {
								pentest,
								t
							}),
							tab === "explore" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExploreView, {
								pentest,
								t,
								onOpenFinding: openFinding
							}),
							tab === "feed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeedView, {
								pentest,
								t,
								onOpenFinding: openFinding
							}),
							tab === "findings" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FindingsView, {
								pentest,
								t,
								focusId: focusFindingId
							}),
							tab === "assets" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetsView, {
								pentest,
								t
							}),
							tab === "report" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReportView, {
								pentest,
								t
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** `pentest` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "pentest";
		// HOTFIX(local): 打开子智能体会话需要 client ctx（apply 里抓住）与当前会话 id（sync 里记下）。
		let CLIENT_CTX = null;
		let CURRENT_SESSION = void 0;
		/** HOTFIX(local): intent -> 子智能体会话 的跳转（用 client ctx 的 uiWorkspace.openSession）。 */
		function openMemberSession(childSessionId) {
			const ui = CLIENT_CTX === null || CLIENT_CTX === void 0 ? void 0 : CLIENT_CTX.uiWorkspace;
			if (ui !== void 0 && typeof ui.openSession === "function") {
				try {
					ui.openSession({ parentSessionId: CURRENT_SESSION, childSessionId: childSessionId, mode: "continuable" });
					return true;
				} catch (reason) {
					try { ui.openSession(CURRENT_SESSION); } catch (other) { /* fallthrough */ }
				}
			}
			try {
				navigator.clipboard.writeText(childSessionId);
			} catch (reason) { /* clipboard is best effort */ }
			return false;
		}
		/** 该节点若对应某个子智能体会话，给出「打开」按钮。 */
		function memberActionsOf(node, projection, t) {
			if (node.kind !== "intent") return void 0;
			const members = projection.members === void 0 ? [] : projection.members;
			const hit = members.filter((member) => member.intentId === node.id && member.sessionId !== "");
			if (hit.length === 0) return void 0;
			return hit.map((member) => ({
				label: t("explore.openMember") + (member.name === "" ? "" : "：" + member.name),
				onClick: () => openMemberSession(member.sessionId)
			}));
		}


		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"counts": "意图 {intents} · 事实 {facts} · 漏洞 {findings} · 资产 {assets}",
			"view.tab.task": "任务",
			"view.tab.explore": "探索链路",
			"view.tab.feed": "时间线",
			"feed.search": "搜索内容 / 标题 / 节点 id",
			"explore.hideFacts": "隐藏事实",
			"explore.showFacts": "显示事实",
			"explore.desc": "漏洞描述",
			"explore.digestMembers": "含 {n} 条事实",
			"evidence.likely": "强证据待复现",
			"evidence.unverified": "待验证",
			"explore.impact": "风险分析/影响",
			"explore.openMember": "打开子智能体对话",
			"explore.mode.findings": "只看漏洞",
			"explore.mode.all": "全部链路",
			"explore.findings.empty": "暂无漏洞记录。「全部链路」可以看到意图与事实。",
			"explore.hint.jump": "点击漏洞可跳到「漏洞」tab",
			"findings.category.all": "全部",
			"findings.category.vulnerability": "已审核",
			"findings.category.candidate": "待审核",
			"findings.category.blocked": "受阻",
			"findings.category.observation": "观察项",
			"findings.category.negative": "已排除",
			"view.tab.findings": "漏洞",
			"view.tab.assets": "资产",
			"view.tab.report": "报告",
			"queue.summary": "共 {total} 个任务 · 执行中 {running} · 待执行 {pending} · 失败 {failed} · 完成 {done}",
			"queue.empty": "当前会话还没有排队任务。推进 goal 后，待验证的 intent 会自动入队，由成员领取执行。",
			"queue.group.running": "执行中",
			"queue.group.pending": "待执行",
			"queue.group.failed": "失败",
			"queue.group.cancelled": "已取消",
			"queue.group.done": "完成",
			"queue.group.other": "其他",
			"queue.state.pending": "待执行",
			"queue.state.claimed": "已派发",
			"queue.state.running": "执行中",
			"queue.state.done": "完成",
			"queue.state.dead": "失败",
			"queue.state.cancelled": "已取消",
			"queue.state.unknown": "未知",
			"queue.card.intent": "意图",
			"queue.card.worker": "执行者",
			"queue.card.attempts": "尝试",
			"queue.card.detail": "方向细节",
			"queue.card.doneWhen": "完成判据",
			"queue.card.dependsOn": "依赖",
			"queue.card.budget": "预算",
			"queue.card.budgetValue": "调用 {calls}/{maxCalls} · 上限 {minutes} 分钟",
			"queue.card.result": "结果",
			"queue.card.resultCounts": "证据 {evidence} · 漏洞 {findings}",
			"queue.card.resultWithCounts": "{summary}（证据 {evidence} · 漏洞 {findings}）",
			"queue.card.lastError": "上次失败",
			"queue.card.lastSummary": "上次进度",
			"queue.card.none": "（无）",
			"task.title": "任务控制台",
			"task.workerLimit": "并发 worker",
			"task.workerLimitPending": "正在设置并发上限…",
			"task.workerLimitRequested": "并发上限已设为 {n}",
			"task.workerLimitFailed": "设置失败：{reason}",
			"task.pauseAll": "暂停全员任务",
			"task.pauseAllShort": "全部暂停",
			"task.resumeAll": "恢复全员任务",
			"task.resumeAllShort": "恢复全部",
			"task.execution": "任务执行",
			"task.paused": "已暂停调度",
			"task.pausedHint": "调度与派发已暂停；恢复后 sidecar 会继续领取 pending 任务。",
			"task.pausePending": "正在暂停…",
			"task.resumePending": "正在恢复…",
			"task.pauseRequested": "暂停/恢复已执行，状态会随投影刷新。",
			"task.auditPending": "审计待验证 ({n})",
			"task.auditRunning": "正在排队审计…",
			"task.auditQueued": "已排队 {n} 条审计，审计员稍后写回结果。",
			"task.auditFailed": "审计请求失败：{reason}",
			"task.pauseFailed": "操作失败：{reason}",
			"task.blocked": "目标已受阻（旧状态）",
			"task.reopenGoal": "恢复目标并继续",
			"task.reopenPending": "正在恢复目标…",
			"task.stat.findings": "漏洞",
			"task.stat.critical": "严重/高危",
			"task.stat.assets": "资产",
			"task.stat.coverage": "覆盖",
			"task.stat.queue": "任务",
			"task.findingsShort": "漏洞 {n}",
			"task.goalLine": "目标：{target}",
			"task.noTarget": "未设置目标",
			"task.findings": "漏洞",
			"task.findingRecords": "条记录",
			"task.riskDistribution": "风险等级分布",
			"task.totalFindings": "总计",
			"task.severity.critical": "严重",
			"task.severity.high": "高危",
			"task.severity.medium": "中危",
			"task.severity.low": "低危",
			"task.severity.info": "信息",
			"task.stat.active": "执行中",
			"task.stat.visibleFiles": "条对外任务",
			"task.budgetCalls": "调用",
			"task.hiddenInternal": "已隐藏 {n} 个内部汇总入口（不是真实探索任务）",
			"task.evidenceShort": "证据 {n}",
			"task.budgetHint": "调用 {calls}/{maxCalls} · 证据 {evidence}/{maxEvidence} · 时间上限 {minutes} 分钟",
			"view.pentest": "渗透",
			"view.empty": "当前会话还没有渗透测试记录。在「渗透模式」预设下发送目标与目的后，这里会显示探索链路。",
			"view.emptyNoGoal": "这个会话还没有记录目标（goal），所以渗透视图是空的。",
			"view.emptyNoGoalHint": "让 Agent 先调用 pentest_add_goal 记录目标与目的；也可以直接发送「记录目标：https://…，目的：…」。",
			"view.emptyNoGoalOptOut": "本次不需要记录目标？直接对 Agent 说「不要设置目标」，它就不会再要求记录。",
			"explore.empty": "探索链路为空。先调用 pentest_add_goal 记录目标与目的。",
			"findings.empty": "暂无漏洞记录",
			"findings.filter.all": "全部",
			"findings.filter.empty": "所选筛选下暂无漏洞，点击「全部」恢复。",
			"assets.empty": "暂无资产记录",
			"assets.search": "搜索地址 / 说明 / 方法",
			"assets.detail.type": "类型",
			"assets.detail.meta": "说明",
			"assets.detail.parent": "上级资产",
			"assets.detail.state": "测试状态",
			"assets.relatedFacts": "关联事实",
			"assets.relatedFindings": "关联漏洞",
			"assets.noRefs": "这个资产还没有被任何事实或漏洞引用",
			"assets.col.method": "方法",
			"assets.col.url": "完整地址",
			"assets.col.params": "参数",
			"assets.col.state": "状态",
			"assets.col.vuln": "漏洞",
			"assets.prev": "上一页",
			"assets.scopeTotal": "范围内",
			"assets.scopeTested": "已测",
			"assets.state.tested": "已测",
			"assets.state.untested": "未测",
			"assets.state.outOfScope": "范围外",
			"assets.foldMore": "还有 {n} 个",
			"assets.foldExpand": "Show {n} more",
			"assets.foldExpand": "展示更多（+{n}）",
			"assets.cover.hint": "力导向布局，可拖拽节点、滚轮缩放；虚线圆是折叠节点。",
			"assets.next": "下一页",
			"assets.mode.list": "列表",
			"assets.mode.graph": "图",
			"report.title": "渗透测试报告",
			"report.hint": "报告基于当前会话记录实时生成",
			"report.copy": "复制",
			"report.copied": "已复制",
			"report.copyFailed": "复制失败，请手动选择报告内容复制",
			"report.download": "保存 .md",
			"report.target": "目标",
			"report.objective": "目的",
			"report.authorization": "授权",
			"report.chain": "探索链路",
			"report.findings": "漏洞发现",
			"report.assets": "资产",
			"report.description": "描述",
			"report.none": "（无）",
			"report.unlinked": "（未关联）",
			"report.undeclared": "（未声明）",
			"report.chainEmpty": "（仅目标，尚未展开）",
			"report.uninitialized": "（未初始化：尚未调用 pentest_add_goal。）",
			"finding.affected": "影响资产",
			"finding.steps": "可复现步骤",
			"kind.goal": "目标",
			"kind.intent": "意图",
			"kind.fact": "事实",
			"kind.finding": "漏洞",
			"kind.digest": "压缩",
			"edge.spawns": "意图链",
			"edge.yields": "产出",
			"edge.derived_from": "推导自",
			"edge.chain": "引出",
			"edge.proves": "证实",
			"edge.parent": "隶属",
			"severity.critical": "严重",
			"severity.high": "高危",
			"severity.medium": "中危",
			"severity.low": "低危",
			"severity.info": "提示",
			"state.open": "待领",
			"state.running": "执行中",
			"state.done": "已确认",
			"state.exhausted": "已耗尽",
			"state.blocked": "受阻",
			"state.stopped": "已停止",
			"asset.type.root-domain": "根域名",
			"asset.type.subdomain": "子域名",
			"asset.type.ip": "IP",
			"asset.type.service": "服务",
			"asset.type.app": "App",
			"asset.type.endpoint": "端点",
			"finding.detail": "查看详情",
			"finding.detail.back": "返回列表",
			"finding.detail.prev": "上一条",
			"finding.detail.next": "下一条",
			"finding.detail.meta": "基本信息",
			"finding.detail.func": "功能点",
			"finding.detail.link": "漏洞链接",
			"finding.detail.process": "完整测试过程",
			"finding.detail.request": "请求包",
			"finding.detail.response": "响应包",
			"finding.detail.copy": "复制",
			"finding.detail.copied": "已复制",
			"finding.detail.step": "步骤",
			"finding.detail.expect": "预期",
			"finding.detail.noasset": "（未关联资产）",
			"finding.detail.nointent": "（未关联意图）",
			"finding.detail.noSteps": "（无可复现步骤）",
			"finding.steps.collapsed": "{count} 步 · 点击查看详情",
			"finding.detail.copyMd": "复制 Markdown",
			"finding.detail.copyMdDone": "已复制 Markdown",
			"finding.detail.position": "{index} / {total}"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"counts": "Intents {intents} · Facts {facts} · Findings {findings} · Assets {assets}",
			"view.tab.task": "Task",
			"view.tab.explore": "Exploration",
			"view.tab.feed": "Timeline",
			"feed.search": "Search content / title / node id",
			"explore.hideFacts": "Hide facts",
			"explore.showFacts": "Show facts",
			"explore.desc": "Vulnerability",
			"explore.digestMembers": "Folds {n} facts",
			"evidence.likely": "Strong evidence",
			"evidence.unverified": "Unverified",
			"explore.impact": "Risk / impact",
			"explore.openMember": "Open teammate",
			"explore.mode.findings": "Findings only",
			"explore.mode.all": "Full chain",
			"explore.findings.empty": "No findings yet. Switch to \"Full chain\" to see intents and facts.",
			"explore.hint.jump": "Click a finding to jump to the Findings tab",
			"findings.category.all": "All",
			"findings.category.vulnerability": "Reviewed",
			"findings.category.candidate": "Pending review",
			"findings.category.blocked": "Blocked",
			"findings.category.observation": "Observations",
			"findings.category.negative": "Excluded",
			"view.tab.findings": "Vulnerabilities",
			"view.tab.assets": "Assets",
			"view.tab.report": "Report",
			"queue.summary": "{total} tasks · running {running} · pending {pending} · failed {failed} · done {done}",
			"queue.empty": "No queued tasks in this session yet. As the goal advances, pending intents are enqueued and claimed by workers.",
			"queue.group.running": "Running",
			"queue.group.pending": "Pending",
			"queue.group.failed": "Failed",
			"queue.group.cancelled": "Cancelled",
			"queue.group.done": "Done",
			"queue.group.other": "Other",
			"queue.state.pending": "Pending",
			"queue.state.claimed": "Claimed",
			"queue.state.running": "Running",
			"queue.state.done": "Done",
			"queue.state.dead": "Failed",
			"queue.state.cancelled": "Cancelled",
			"queue.state.unknown": "Unknown",
			"queue.card.intent": "intent",
			"queue.card.worker": "worker",
			"queue.card.attempts": "attempts",
			"queue.card.detail": "Intent detail",
			"queue.card.doneWhen": "Done when",
			"queue.card.dependsOn": "Depends on",
			"queue.card.budget": "Budget",
			"queue.card.budgetValue": "{calls}/{maxCalls} calls · cap {minutes} min",
			"queue.card.result": "Result",
			"queue.card.resultCounts": "evidence {evidence} · findings {findings}",
			"queue.card.resultWithCounts": "{summary} (evidence {evidence} · findings {findings})",
			"queue.card.lastError": "Last error",
			"queue.card.lastSummary": "Last progress",
			"queue.card.none": "(none)",
			"task.title": "Task console",
			"task.workerLimit": "Workers",
			"task.workerLimitPending": "Updating worker limit…",
			"task.workerLimitRequested": "Worker limit set to {n}",
			"task.workerLimitFailed": "Update failed: {reason}",
			"task.pauseAll": "Pause all tasks",
			"task.pauseAllShort": "Pause all",
			"task.resumeAll": "Resume all tasks",
			"task.resumeAllShort": "Resume all",
			"task.execution": "Task execution",
			"task.paused": "Paused",
			"task.pausedHint": "Scheduling and dispatch are paused; resuming lets the sidecar claim pending tasks again.",
			"task.pausePending": "Pausing…",
			"task.resumePending": "Resuming…",
			"task.pauseRequested": "Pause/resume applied; the projection will refresh.",
			"task.auditPending": "Audit pending ({n})",
			"task.auditRunning": "Queueing audit…",
			"task.auditQueued": "Queued {n} finding(s) for audit.",
			"task.auditFailed": "Audit request failed: {reason}",
			"task.pauseFailed": "Request failed: {reason}",
			"task.blocked": "Goal blocked (legacy)",
			"task.reopenGoal": "Reopen goal",
			"task.reopenPending": "Reopening goal…",
			"task.stat.findings": "Findings",
			"task.stat.critical": "Critical/High",
			"task.stat.assets": "Assets",
			"task.stat.coverage": "Coverage",
			"task.stat.queue": "Tasks",
			"task.findingsShort": "{n} findings",
			"task.goalLine": "Target: {target}",
			"task.noTarget": "no target",
			"task.findings": "Findings",
			"task.findingRecords": "records",
			"task.riskDistribution": "Severity distribution",
			"task.totalFindings": "Total",
			"task.severity.critical": "Critical",
			"task.severity.high": "High",
			"task.severity.medium": "Medium",
			"task.severity.low": "Low",
			"task.severity.info": "Info",
			"task.stat.active": "Running",
			"task.stat.visibleFiles": "visible tasks",
			"task.budgetCalls": "calls",
			"task.hiddenInternal": "{n} internal report entries hidden (not exploration tasks)",
			"task.evidenceShort": "{n} evidence",
			"task.budgetHint": "{calls}/{maxCalls} calls · {evidence}/{maxEvidence} evidence · cap {minutes} min",
			"view.pentest": "Pentest",
			"view.empty": "No penetration-testing records in this session yet. Start an engagement on the 渗透模式 preset and the exploration chain will appear here.",
			"view.emptyNoGoal": "This session has not recorded a goal yet, so the penetration view is empty.",
			"view.emptyNoGoalHint": "Ask the agent to call pentest_add_goal with the target and objective first; or send \"记录目标：https://…，目的：…\" directly.",
			"view.emptyNoGoalOptOut": "Do not need a goal for this session? Tell the agent \"不要设置目标\" and it will stop asking.",
			"explore.empty": "The exploration chain is empty. Start by recording a goal with pentest_add_goal.",
			"findings.empty": "No vulnerabilities recorded yet",
			"findings.filter.all": "All",
			"findings.filter.empty": "No vulnerabilities match the selected filters. Click \"All\" to reset.",
			"assets.empty": "No assets recorded yet",
			"assets.search": "Search URL / note / method",
			"assets.detail.type": "Type",
			"assets.detail.meta": "Note",
			"assets.detail.parent": "Parent",
			"assets.detail.state": "Test state",
			"assets.relatedFacts": "Related facts",
			"assets.relatedFindings": "Related findings",
			"assets.noRefs": "No fact or finding references this asset yet",
			"assets.col.method": "Method",
			"assets.col.url": "Full URL",
			"assets.col.params": "Parameters",
			"assets.col.state": "State",
			"assets.col.vuln": "Vulns",
			"assets.prev": "Prev",
			"assets.scopeTotal": "In scope",
			"assets.scopeTested": "tested",
			"assets.state.tested": "Tested",
			"assets.state.untested": "Untested",
			"assets.state.outOfScope": "Out of scope",
			"assets.foldMore": "+{n} more",
			"assets.cover.hint": "Force layout — drag nodes, scroll to zoom. Dashed circles are folded groups.",
			"assets.next": "Next",
			"assets.mode.list": "List",
			"assets.mode.graph": "Graph",
			"report.title": "Penetration Test Report",
			"report.hint": "Generated from the current session record",
			"report.copy": "Copy",
			"report.copied": "Copied",
			"report.copyFailed": "Copy failed. Select the report content and copy it manually.",
			"report.download": "Save .md",
			"report.target": "Target",
			"report.objective": "Objective",
			"report.authorization": "Authorization",
			"report.chain": "Exploration chain",
			"report.findings": "Findings",
			"report.assets": "Assets",
			"report.description": "Description",
			"report.none": "(none)",
			"report.unlinked": "(unlinked)",
			"report.undeclared": "(undeclared)",
			"report.chainEmpty": "(goal only; not expanded)",
			"report.uninitialized": "(not initialized: pentest_add_goal has not been called.)",
			"finding.affected": "Affected asset",
			"finding.steps": "Reproducible steps",
			"kind.goal": "Goal",
			"kind.intent": "Intent",
			"kind.fact": "Fact",
			"kind.finding": "Finding",
			"kind.digest": "Digest",
			"edge.spawns": "spawns",
			"edge.yields": "yields",
			"edge.derived_from": "derived from",
			"edge.chain": "leads to",
			"edge.proves": "proves",
			"edge.parent": "belongs to",
			"severity.critical": "Critical",
			"severity.high": "High",
			"severity.medium": "Medium",
			"severity.low": "Low",
			"severity.info": "Info",
			"state.open": "Open",
			"state.running": "Running",
			"state.done": "Done",
			"state.exhausted": "Exhausted",
			"state.blocked": "Blocked",
			"state.stopped": "Stopped",
			"asset.type.root-domain": "Root domain",
			"asset.type.subdomain": "Subdomain",
			"asset.type.ip": "IP",
			"asset.type.service": "Service",
			"asset.type.app": "App",
			"asset.type.endpoint": "Endpoint",
			"finding.detail": "Open detail",
			"finding.detail.back": "Back to list",
			"finding.detail.prev": "Previous",
			"finding.detail.next": "Next",
			"finding.detail.meta": "Summary",
			"finding.detail.func": "Feature",
			"finding.detail.link": "Vulnerable endpoint",
			"finding.detail.process": "Full test process",
			"finding.detail.request": "Request",
			"finding.detail.response": "Response",
			"finding.detail.copy": "Copy",
			"finding.detail.copied": "Copied",
			"finding.detail.step": "Step",
			"finding.detail.expect": "Expected",
			"finding.detail.noasset": "(no linked asset)",
			"finding.detail.nointent": "(no linked intent)",
			"finding.detail.noSteps": "(no reproduction steps)",
			"finding.steps.collapsed": "{count} steps · open detail",
			"finding.detail.copyMd": "Copy Markdown",
			"finding.detail.copyMdDone": "Copied Markdown",
			"finding.detail.position": "{index} / {total}"
		};
		//#endregion
		//#region src/client/index.ts
		/**
		 * Penetration-testing surface plugin, browser half: the 渗透 conversation-view
		 * tab. Projection-mode surface — the live pentest state arrives through
		 * `useProjection('pentest')` (seeded by the history tail page, updated by
		 * session/projection frames), so this plugin owns no store, no refresh chain,
		 * and no event listener.
		 *
		 * The tab is a per-session surface: the view entry registers only while the
		 * CURRENT session (or a listed ancestor) carries the pentest capability. Two
		 * signals are accepted, because presets are neither composable nor
		 * introspectable from a browser:
		 *
		 * - the sessions list's `agentPreset` fact, whichever wire carries it — the
		 *   shipped `pentest` preset and its copies named `pentest-*` register before
		 *   the session has run a single turn;
		 * - the `pentestMounted` projection value, folded host-side from that
		 *   session's own log (a `pentest_*` tool in the assembled request header, a
		 *   logged call, or a delegated submission) — any preset name, at the price
		 *   of waiting for the session's first request.
		 *
		 * The projection KEY is deliberately unused: the session-projection registry
		 * is host-wide, so once any pentest preset is mounted the `pentest` and
		 * `pentestMounted` keys exist in EVERY session's baseline (as `null` /
		 * `false`). Only the per-session value distinguishes sessions. Sessions drive
		 * the entry — switching the current session (or switching the session's
		 * preset in place) toggles the registration, and the view ring re-reads its
		 * entries on every slots version bump.
		 */

		// Type-only: pulls the ui-conversation SlotMap merge (the conversation.view
		// entry).

		// Type-only: pulls the locale plugin's Context merge (ctx.locale).

		/** The main-view session id, absent while no session is selected. */

		/** The agent-preset id whose sessions carry the pentest capability. */
		const PENTEST_PRESET = 'pentest'
		/** A copy of the shipped preset keeps this id prefix (the documented convention). */
		const PENTEST_PRESET_PREFIX = `${PENTEST_PRESET}-`
		/** Client-visible marker: this session's own log proved the row is mounted. */
		const PENTEST_MOUNTED_KEY = 'pentestMounted'

		/**
		 * One sessions-list row as the gate reads it, across both wires: 0.1.1 and
		 * earlier carried the preset id straight on the row, while 0.1.2+ dropped
		 * that field and publishes the preset as the client-visible `agentPreset`
		 * session projection, retained per row in `projectionValues` (`null` when the
		 * deployment composes no presets). `projectionValues` likewise carries the
		 * host-folded `pentestMounted` marker, absent on hosts without the projection
		 * seam.
		 */

		/** Only the list fields consumed by the gate, across old and new hosts. */

		/** Read the legacy selection or the session retained by the main view. */
		function currentSessionOf(snapshot                     )                   {
		  return snapshot.current ?? Object.entries(snapshot.byId)
		    .find(([, row]) => (row?.retainedBy?.mainView ?? 0) > 0)?.[0]
		}

		/** The agent-preset id one row carries, off whichever wire supplies it. */
		function presetOf(row                        )                     {
		  const projected = row?.projectionValues?.agentPreset
		  if (typeof projected === 'string') return projected
		  return row?.agentPreset
		}

		/** Whether one preset id names the pentest composition or a copy of it. */
		function isPentestPresetId(id                    )          {
		  return id === PENTEST_PRESET || (id !== undefined && id.startsWith(PENTEST_PRESET_PREFIX))
		}

		/**
		 * Whether one row's session holds the mount marker: its own log proved the
		 * pentest row is mounted, so the tab follows copied/renamed presets too. Read
		 * strictly (`=== true`) — an absent key on 0.1.1-and-earlier hosts, a `false`
		 * baseline for foreign sessions, and a malformed wire all mean "no evidence".
		 */
		function mountedOf(row                        )          {
		  const marker = row?.projectionValues?.[PENTEST_MOUNTED_KEY]
		  return typeof marker === 'boolean' && marker
		}

		/**
		 * Whether a session carries the pentest capability — the session itself or any
		 * listed ancestor (subagents of a pentest session inherit its preset; their
		 * own rows may or may not carry the preset on the wire, and they prove their
		 * own mount as soon as they call the delegated submission tool).
		 */
		function isPentestSession(snapshot                     , id        )          {
		  let cursor                     = id
		  const seen = new Set        ()
		  const byId = snapshot.byId
		  while (cursor !== undefined && !seen.has(cursor)) {
		    seen.add(cursor)
		    const row                         = byId[cursor]
		    if (isPentestPresetId(presetOf(row)) || mountedOf(row)) return true
		    cursor = row?.parentId
		  }
		  return false
		}

		/** Required services for the view registration and its copy. */
		const inject = ['slots', 'locale', 'sessions', 'uiWorkspace', 'remote', 'remote.session', 'remote.commands']

		/**
		 * Client plugin body: the 渗透 view tab over the pentest projection, mounted
		 * per-session (registered while the current session — or a listed ancestor —
		 * carries the `pentest` preset or proves the mount in its own log, disposed as
		 * soon as it does neither).
		 * @param ctx - client root context.
		 */
		function apply(ctx               )       {
			CLIENT_CTX = ctx;
		  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-pentest: dictionaries')
		  // Registration-time text (the view tab label) reads through the bound
		  // translate as a thunk, so it follows the active locale without
		  // re-registration.
		  const t = ctx.locale.bind(NS)
		  const sessions = ctx.sessions

		  ctx.slots.inject('conversation.view', () => {
		    let disposeEntry
		    let sessionId
		    let sessionPentest

		    const sync = ()       => {
		      const snapshot = sessions.list.getSnapshot()
		      const current = currentSessionOf(snapshot)
		      CURRENT_SESSION = current;
		      const pentest = current === undefined ? undefined : isPentestSession(snapshot, current)
		      if (current === sessionId && pentest === sessionPentest) return
		      disposeEntry?.()
		      disposeEntry = undefined
		      sessionId = current
		      sessionPentest = pentest
		      if (current === undefined || pentest !== true) return
		      disposeEntry = ctx.slots.register({
		        name: 'conversation.view',
		        id: 'pentest',
		        order: 20,
		        locale: NS,
		        label: () => t('view.pentest'),
		      }, PentestView)
		    }

		    sync()
		    const offList = sessions.list.subscribe(sync)
		    return () => {
		      offList()
		      disposeEntry?.()
		    }
		  })
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map