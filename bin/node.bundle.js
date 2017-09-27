module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/Confidential/code/chatbot/botpress-api.ai";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';
	
	var _botpressVersionManager = __webpack_require__(2);
	
	var _botpressVersionManager2 = _interopRequireDefault(_botpressVersionManager);
	
	var _path = __webpack_require__(3);
	
	var _path2 = _interopRequireDefault(_path);
	
	var _fs = __webpack_require__(4);
	
	var _fs2 = _interopRequireDefault(_fs);
	
	var _lodash = __webpack_require__(5);
	
	var _lodash2 = _interopRequireDefault(_lodash);
	
	var _crypto = __webpack_require__(6);
	
	var _crypto2 = _interopRequireDefault(_crypto);
	
	var _axios = __webpack_require__(7);
	
	var _axios2 = _interopRequireDefault(_axios);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }
	
	var config = null;
	var service = null;
	
	var getClient = function getClient() {
	  return _axios2.default.create({
	    baseURL: 'https://api.api.ai/v1',
	    timeout: process.env.BOTPRESS_HTTP_TIMEOUT || 5000,
	    headers: { 'Authorization': 'Bearer ' + config.accessToken }
	  });
	};
	
	var setService = function setService() {
	  service = function service(userId, text) {
	    return getClient().post('/query?v=20170101', {
	      query: text,
	      lang: config.lang,
	      sessionId: userId
	    });
	  };
	};
	
	var errorHandler = function errorHandler(bp) {
	  return function (error) {
	    var err = _lodash2.default.get(error, 'response.data.status') || _lodash2.default.get(error, 'message') || error || 'Unknown error';
	
	    if (err && err.code) {
	      err = '[' + err.code + '] Type:' + err.errorType + ':', err.errorDetails;
	    }
	
	    console.log(error.stack);
	
	    bp.logger.warn('botpress-api.ai', 'API Error. Could not trigger event: ' + err);
	  };
	};
	
	var sendOutgoing = function sendOutgoing(event) {
	  return function (_ref) {
	    var data = _ref.data;
	    var result = data.result;
	
	    if (result.fulfillment && result.fulfillment.speech && result.fulfillment.speech.length > 0) {
	      event.bp.middlewares.sendOutgoing({
	        type: 'text',
	        platform: event.platform,
	        text: result.fulfillment.speech,
	        raw: {
	          to: event.user.id,
	          message: result.fulfillment.speech
	        }
	      });
	    }
	  };
	};
	
	var contextAdd = function contextAdd(userId) {
	  return function (name) {
	    var lifespan = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
	
	    return getClient().post('/contexts?v=20170101', [{ name: name, lifespan: lifespan }], { params: { sessionId: userId } });
	  };
	};
	
	var contextRemove = function contextRemove(userId) {
	  return function (name) {
	    return getClient().delete('/contexts/' + name, { params: { sessionId: userId } });
	  };
	};
	
	var triggerEvent = function triggerEvent(userId, originalEvent) {
	  return function (name) {
	    var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	
	    return getClient().post('/query?v=20170101', {
	      event: {
	        name: name,
	        data: data
	      },
	      lang: config.lang,
	      sessionId: userId
	    }).then(sendOutgoing(originalEvent)).catch(errorHandler(originalEvent.bp));
	  };
	};
	
	var incomingMiddleware = function incomingMiddleware(event, next) {
	  if (event.type === 'message') {
	
	    var _shortUserId = event.user.id;
	    if (_shortUserId.length > 36) {
	      _shortUserId = _crypto2.default.createHash('md5').update(_shortUserId).digest("hex");
	    }
	
	    service(_shortUserId, event.text).then(function (response) {
	      if (config.mode === 'fulfillment') {
	        sendOutgoing(event)(response);
	        return null; // swallow the event, don't call next()
	      } else {
	        var result = response.data.result;
	
	        event.nlp = Object.assign(result, {
	          context: {
	            add: contextAdd(_shortUserId),
	            remove: contextRemove(_shortUserId)
	          },
	          triggerEvent: triggerEvent(_shortUserId, event)
	        });
	        next();
	      }
	    }).catch(errorHandler(event.bp));
	  } else {
	    event.nlp = {
	      context: {
	        add: contextAdd(shortUserId),
	        remove: contextRemove(shortUserId)
	      },
	      triggerEvent: triggerEvent(shortUserId, event)
	    };
	
	    next();
	  }
	};
	
	module.exports = {
	
	  config: {
	    accessToken: { type: 'string', env: 'APIAI_TOKEN' },
	    lang: { type: 'string', default: 'en' },
	    mode: { type: 'choice', validation: ['fulfillment', 'default'], default: 'default' }
	  },
	
	  init: function () {
	    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(bp, configurator) {
	      return regeneratorRuntime.wrap(function _callee$(_context) {
	        while (1) {
	          switch (_context.prev = _context.next) {
	            case 0:
	              (0, _botpressVersionManager2.default)(bp, __dirname);
	
	              bp.middlewares.register({
	                name: 'apiai.incoming',
	                module: 'botpress-api.ai',
	                type: 'incoming',
	                handler: incomingMiddleware,
	                order: 10,
	                description: 'Process natural language in the form of text. Structured data with an action and parameters for that action is injected in the incoming message event.'
	              });
	
	              _context.next = 4;
	              return configurator.loadAll();
	
	            case 4:
	              config = _context.sent;
	
	              setService();
	
	            case 6:
	            case 'end':
	              return _context.stop();
	          }
	        }
	      }, _callee, this);
	    }));
	
	    function init(_x3, _x4) {
	      return _ref2.apply(this, arguments);
	    }
	
	    return init;
	  }(),
	
	  ready: function () {
	    var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(bp, configurator) {
	      var _this = this;
	
	      var router;
	      return regeneratorRuntime.wrap(function _callee4$(_context4) {
	        while (1) {
	          switch (_context4.prev = _context4.next) {
	            case 0:
	              router = bp.getRouter('botpress-apiai');
	
	
	              router.get('/config', function () {
	                var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
	                  return regeneratorRuntime.wrap(function _callee2$(_context2) {
	                    while (1) {
	                      switch (_context2.prev = _context2.next) {
	                        case 0:
	                          _context2.t0 = res;
	                          _context2.next = 3;
	                          return configurator.loadAll();
	
	                        case 3:
	                          _context2.t1 = _context2.sent;
	
	                          _context2.t0.send.call(_context2.t0, _context2.t1);
	
	                        case 5:
	                        case 'end':
	                          return _context2.stop();
	                      }
	                    }
	                  }, _callee2, _this);
	                }));
	
	                return function (_x7, _x8) {
	                  return _ref4.apply(this, arguments);
	                };
	              }());
	
	              router.post('/config', function () {
	                var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res) {
	                  var _req$body, accessToken, lang, mode;
	
	                  return regeneratorRuntime.wrap(function _callee3$(_context3) {
	                    while (1) {
	                      switch (_context3.prev = _context3.next) {
	                        case 0:
	                          _req$body = req.body, accessToken = _req$body.accessToken, lang = _req$body.lang, mode = _req$body.mode;
	                          _context3.next = 3;
	                          return configurator.saveAll({ accessToken: accessToken, lang: lang, mode: mode });
	
	                        case 3:
	                          _context3.next = 5;
	                          return configurator.loadAll();
	
	                        case 5:
	                          config = _context3.sent;
	
	                          setService();
	                          res.sendStatus(200);
	
	                        case 8:
	                        case 'end':
	                          return _context3.stop();
	                      }
	                    }
	                  }, _callee3, _this);
	                }));
	
	                return function (_x9, _x10) {
	                  return _ref5.apply(this, arguments);
	                };
	              }());
	
	            case 3:
	            case 'end':
	              return _context4.stop();
	          }
	        }
	      }, _callee4, this);
	    }));
	
	    function ready(_x5, _x6) {
	      return _ref3.apply(this, arguments);
	    }
	
	    return ready;
	  }()
	};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	module.exports = require("botpress-version-manager");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = require("path");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

	module.exports = require("fs");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

	module.exports = require("lodash");

/***/ }),
/* 6 */
/***/ (function(module, exports) {

	module.exports = require("crypto");

/***/ }),
/* 7 */
/***/ (function(module, exports) {

	module.exports = require("axios");

/***/ })
/******/ ]);
//# sourceMappingURL=node.bundle.js.map