(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process,global){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `value instanceof AwaitArgument` to determine if the yielded value is
  // meant to be awaited. Some may consider the name of this method too
  // cutesy, but they are curmudgeons.
  runtime.awrap = function(arg) {
    return new AwaitArgument(arg);
  };

  function AwaitArgument(arg) {
    this.arg = arg;
  }

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value instanceof AwaitArgument) {
          return Promise.resolve(value.arg).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if (typeof process === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" ||
              (method === "throw" && delegate.iterator[method] === undefined)) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(
            delegate.iterator[method],
            delegate.iterator,
            arg
          );

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          if (state === GenStateSuspendedYield) {
            context.sent = arg;
          } else {
            context.sent = undefined;
          }

        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp[toStringTagSymbol] = "Generator";

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
"use strict";function frame(){var t=Ti.Platform.displayCaps.platformWidth,e=Ti.Platform.displayCaps.platformHeight;return{width:t>e?e:t,height:t>e?t:e,isNG:e>=568||t>=568}}function touchOnOff(t,e,a){t.addEventListener("touchstart",e),t.addEventListener("touchend",a)}function cbfactory(t,e){var a=null,i=null,r=null,s=null;return a=Ti.UI.createView({height:30,width:30}),t||(i=Ti.UI.createImageView({image:"checkbox.png",bottom:0,right:0,height:30,width:30})),r=Ti.UI.createImageView({image:"checksign.png",bottom:2,right:2,height:25,width:25}),a.add(i),a.add(r),e&&(s=Ti.UI.createView({backgroundColor:baseDark,height:30,width:30,right:0}),a.add(s)),{item:a,box:i,sign:r,overlay:s,kickoff:function(){this.overlay.animate({width:0,duration:750})},cleanup:function(){try{this.item.hide&&this.item.hide(),this.item=null,this.box=null,this.sign=null,this.overlay=null}catch(t){}}}}Object.defineProperty(exports,"__esModule",{value:!0}),exports.frame=frame,exports.touchOnOff=touchOnOff,exports.cbfactory=cbfactory;var baseLight=exports.baseLight="#A9914A",alphaBaseLight=exports.alphaBaseLight="#70"+baseLight.substr(1),baseDark=exports.baseDark="#1D1D1B",alphaBaseDark=exports.alphaBaseDark="#50"+baseDark.substr(1),baseFontSemibold=exports.baseFontSemibold="SanFranciscoDisplay-Semibold",baseFontMedium=exports.baseFontMedium="SanFranciscoDisplay-Medium";

},{}],4:[function(require,module,exports){
(function (process,global){
"use strict";function _typeof(t){return t&&"undefined"!=typeof Symbol&&t.constructor===Symbol?"symbol":typeof t}!function(t){if("object"==("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;"undefined"!=typeof window?e=window:"undefined"!=typeof global?e=global:"undefined"!=typeof self&&(e=self),e.Promise=t()}}(function(){return function t(e,n,r){function i(s,a){if(!n[s]){if(!e[s]){var c="function"==typeof _dereq_&&_dereq_;if(!a&&c)return c(s,!0);if(o)return o(s,!0);var l=new Error("Cannot find module '"+s+"'");throw l.code="MODULE_NOT_FOUND",l}var u=n[s]={exports:{}};e[s][0].call(u.exports,function(t){var n=e[s][1][t];return i(n?n:t)},u,u.exports,t,e,n,r)}return n[s].exports}for(var o="function"==typeof _dereq_&&_dereq_,s=0;s<r.length;s++)i(r[s]);return i}({1:[function(t,e){e.exports=function(t){function e(t){var e=new n(t),r=e.promise();return e.setHowMany(1),e.setUnwrap(),e.init(),r}var n=t._SomePromiseArray;t.any=function(t){return e(t)},t.prototype.any=function(){return e(this)}}},{}],2:[function(t,e){function n(){this._isTickUsed=!1,this._lateQueue=new l(16),this._normalQueue=new l(16),this._haveDrainedQueues=!1,this._trampolineEnabled=!0;var t=this;this.drainQueues=function(){t._drainQueues()},this._schedule=c.isStatic?c(this.drainQueues):c}function r(t,e,n){this._lateQueue.push(t,e,n),this._queueTick()}function i(t,e,n){this._normalQueue.push(t,e,n),this._queueTick()}function o(t){this._normalQueue._pushOne(t),this._queueTick()}var s;try{throw new Error}catch(a){s=a}var c=t("./schedule"),l=t("./queue"),u=t("./util");n.prototype.disableTrampolineIfNecessary=function(){u.hasDevTools&&(this._trampolineEnabled=!1)},n.prototype.haveItemsQueued=function(){return this._isTickUsed||this._haveDrainedQueues},n.prototype.fatalError=function(t,e){e?(process.stderr.write("Fatal "+(t instanceof Error?t.stack:t)),process.exit(2)):this.throwLater(t)},n.prototype.throwLater=function(t,e){if(1===arguments.length&&(e=t,t=function(){throw e}),"undefined"!=typeof setTimeout)setTimeout(function(){t(e)},0);else try{this._schedule(function(){t(e)})}catch(n){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")}},u.hasDevTools?(c.isStatic&&(c=function(t){setTimeout(t,0)}),n.prototype.invokeLater=function(t,e,n){this._trampolineEnabled?r.call(this,t,e,n):this._schedule(function(){setTimeout(function(){t.call(e,n)},100)})},n.prototype.invoke=function(t,e,n){this._trampolineEnabled?i.call(this,t,e,n):this._schedule(function(){t.call(e,n)})},n.prototype.settlePromises=function(t){this._trampolineEnabled?o.call(this,t):this._schedule(function(){t._settlePromises()})}):(n.prototype.invokeLater=r,n.prototype.invoke=i,n.prototype.settlePromises=o),n.prototype.invokeFirst=function(t,e,n){this._normalQueue.unshift(t,e,n),this._queueTick()},n.prototype._drainQueue=function(t){for(;t.length()>0;){var e=t.shift();if("function"==typeof e){var n=t.shift(),r=t.shift();e.call(n,r)}else e._settlePromises()}},n.prototype._drainQueues=function(){this._drainQueue(this._normalQueue),this._reset(),this._haveDrainedQueues=!0,this._drainQueue(this._lateQueue)},n.prototype._queueTick=function(){this._isTickUsed||(this._isTickUsed=!0,this._schedule(this.drainQueues))},n.prototype._reset=function(){this._isTickUsed=!1},e.exports=n,e.exports.firstLineError=s},{"./queue":26,"./schedule":29,"./util":36}],3:[function(t,e){e.exports=function(t,e,n,r){var i=!1,o=function(t,e){this._reject(e)},s=function(t,e){e.promiseRejectionQueued=!0,e.bindingPromise._then(o,o,null,this,t)},a=function(t,e){0===(50397184&this._bitField)&&this._resolveCallback(e.target)},c=function(t,e){e.promiseRejectionQueued||this._reject(t)};t.prototype.bind=function(o){i||(i=!0,t.prototype._propagateFrom=r.propagateFromFunction(),t.prototype._boundValue=r.boundValueFunction());var l=n(o),u=new t(e);u._propagateFrom(this,1);var p=this._target();if(u._setBoundTo(l),l instanceof t){var h={promiseRejectionQueued:!1,promise:u,target:p,bindingPromise:l};p._then(e,s,void 0,u,h),l._then(a,c,void 0,u,h),u._setOnCancel(l)}else u._resolveCallback(p);return u},t.prototype._setBoundTo=function(t){void 0!==t?(this._bitField=2097152|this._bitField,this._boundTo=t):this._bitField=-2097153&this._bitField},t.prototype._isBound=function(){return 2097152===(2097152&this._bitField)},t.bind=function(e,n){return t.resolve(n).bind(e)}}},{}],4:[function(t,e){function n(){try{Promise===i&&(Promise=r)}catch(t){}return i}var r;"undefined"!=typeof Promise&&(r=Promise);var i=t("./promise")();i.noConflict=n,e.exports=i},{"./promise":22}],5:[function(t,e){var n=Object.create;if(n){var r=n(null),i=n(null);r[" size"]=i[" size"]=0}e.exports=function(e){function n(t,n){var r;if(null!=t&&(r=t[n]),"function"!=typeof r){var i="Object "+a.classString(t)+" has no method '"+a.toString(n)+"'";throw new e.TypeError(i)}return r}function r(t){var e=this.pop(),r=n(t,e);return r.apply(t,this)}function i(t){return t[this]}function o(t){var e=+this;return 0>e&&(e=Math.max(0,e+t.length)),t[e]}var s,a=t("./util"),c=a.canEvaluate;a.isIdentifier,e.prototype.call=function(t){var e=[].slice.call(arguments,1);return e.push(t),this._then(r,void 0,void 0,e,void 0)},e.prototype.get=function(t){var e,n="number"==typeof t;if(n)e=o;else if(c){var r=s(t);e=null!==r?r:i}else e=i;return this._then(e,void 0,void 0,t,void 0)}}},{"./util":36}],6:[function(t,e){e.exports=function(e,n,r,i){var o=t("./util"),s=o.tryCatch,a=o.errorObj,c=e._async;e.prototype["break"]=e.prototype.cancel=function(){if(!i.cancellation())return this._warn("cancellation is disabled");for(var t=this,e=t;t.isCancellable();){if(!t._cancelBy(e)){e._isFollowing()?e._followee().cancel():e._cancelBranched();break}var n=t._cancellationParent;if(null==n||!n.isCancellable()){t._isFollowing()?t._followee().cancel():t._cancelBranched();break}t._isFollowing()&&t._followee().cancel(),e=t,t=n}},e.prototype._branchHasCancelled=function(){this._branchesRemainingToCancel--},e.prototype._enoughBranchesHaveCancelled=function(){return void 0===this._branchesRemainingToCancel||this._branchesRemainingToCancel<=0},e.prototype._cancelBy=function(t){return t===this?(this._branchesRemainingToCancel=0,this._invokeOnCancel(),!0):(this._branchHasCancelled(),this._enoughBranchesHaveCancelled()?(this._invokeOnCancel(),!0):!1)},e.prototype._cancelBranched=function(){this._enoughBranchesHaveCancelled()&&this._cancel()},e.prototype._cancel=function(){this.isCancellable()&&(this._setCancelled(),c.invoke(this._cancelPromises,this,void 0))},e.prototype._cancelPromises=function(){this._length()>0&&this._settlePromises()},e.prototype._unsetOnCancel=function(){this._onCancelField=void 0},e.prototype.isCancellable=function(){return this.isPending()&&!this.isCancelled()},e.prototype._doInvokeOnCancel=function(t,e){if(o.isArray(t))for(var n=0;n<t.length;++n)this._doInvokeOnCancel(t[n],e);else if(void 0!==t)if("function"==typeof t){if(!e){var r=s(t).call(this._boundValue());r===a&&(this._attachExtraTrace(r.e),c.throwLater(r.e))}}else t._resultCancelled(this)},e.prototype._invokeOnCancel=function(){var t=this._onCancel();this._unsetOnCancel(),c.invoke(this._doInvokeOnCancel,this,t)},e.prototype._invokeInternalOnCancel=function(){this.isCancellable()&&(this._doInvokeOnCancel(this._onCancel(),!0),this._unsetOnCancel())},e.prototype._resultCancelled=function(){this.cancel()}}},{"./util":36}],7:[function(t,e){e.exports=function(e){function n(t,n,a){return function(c){var l=a._boundValue();t:for(var u=0;u<t.length;++u){var p=t[u];if(p===Error||null!=p&&p.prototype instanceof Error){if(c instanceof p)return o(n).call(l,c)}else if("function"==typeof p){var h=o(p).call(l,c);if(h===s)return h;if(h)return o(n).call(l,c)}else if(r.isObject(c)){for(var f=i(p),_=0;_<f.length;++_){var d=f[_];if(p[d]!=c[d])continue t}return o(n).call(l,c)}}return e}}var r=t("./util"),i=t("./es5").keys,o=r.tryCatch,s=r.errorObj;return n}},{"./es5":13,"./util":36}],8:[function(t,e){e.exports=function(t){function e(){this._trace=new e.CapturedTrace(r())}function n(){return i?new e:void 0}function r(){var t=o.length-1;return t>=0?o[t]:void 0}var i=!1,o=[];return t.prototype._promiseCreated=function(){},t.prototype._pushContext=function(){},t.prototype._popContext=function(){return null},t._peekContext=t.prototype._peekContext=function(){},e.prototype._pushContext=function(){void 0!==this._trace&&(this._trace._promiseCreated=null,o.push(this._trace))},e.prototype._popContext=function(){if(void 0!==this._trace){var t=o.pop(),e=t._promiseCreated;return t._promiseCreated=null,e}return null},e.CapturedTrace=null,e.create=n,e.activateLongStackTraces=function(){i=!0,t.prototype._pushContext=e.prototype._pushContext,t.prototype._popContext=e.prototype._popContext,t._peekContext=t.prototype._peekContext=r,t.prototype._promiseCreated=function(){var t=this._peekContext();t&&null==t._promiseCreated&&(t._promiseCreated=this)}},e}},{}],9:[function(t,e){e.exports=function(e,n){function r(t,e,n){var r=this;try{t(e,n,function(t){if("function"!=typeof t)throw new TypeError("onCancel must be a function, got: "+H.toString(t));r._attachCancellationCallback(t)})}catch(i){return i}}function i(t){if(!this.isCancellable())return this;var e=this._onCancel();void 0!==e?H.isArray(e)?e.push(t):this._setOnCancel([e,t]):this._setOnCancel(t)}function o(){return this._onCancelField}function s(t){this._onCancelField=t}function a(){this._cancellationParent=void 0,this._onCancelField=void 0}function c(t,e){if(0!==(1&e)){this._cancellationParent=t;var n=t._branchesRemainingToCancel;void 0===n&&(n=0),t._branchesRemainingToCancel=n+1}0!==(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)}function l(t,e){0!==(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)}function u(){var t=this._boundTo;return void 0!==t&&t instanceof e?t.isFulfilled()?t.value():void 0:t}function p(){this._trace=new P(this._peekContext())}function h(t,e){if(I(t)){var n=this._trace;if(void 0!==n&&e&&(n=n._parent),void 0!==n)n.attachExtraTrace(t);else if(!t.__stackCleaned__){var r=w(t);H.notEnumerableProp(t,"stack",r.message+"\n"+r.stack.join("\n")),H.notEnumerableProp(t,"__stackCleaned__",!0)}}}function f(t,e,n,r){if(void 0===t&&null!==e&&J.longStackTraces&&J.warnings){var i="a promise was created in a "+n+" handler but was not returned from it";r._warn(i,!0,e)}}function _(t,e){var n=t+" is deprecated and will be removed in a future version.";return e&&(n+=" Use "+e+" instead."),d(n)}function d(t,n,r){if(J.warnings){var i,o=new V(t);if(n)r._attachExtraTrace(o);else if(J.longStackTraces&&(i=e._peekContext()))i.attachExtraTrace(o);else{var s=w(o);o.stack=s.message+"\n"+s.stack.join("\n")}C(o,"",!0)}}function v(t,e){for(var n=0;n<e.length-1;++n)e[n].push("From previous event:"),e[n]=e[n].join("\n");return n<e.length&&(e[n]=e[n].join("\n")),t+"\n"+e.join("\n")}function y(t){for(var e=0;e<t.length;++e)(0===t[e].length||e+1<t.length&&t[e][0]===t[e+1][0])&&(t.splice(e,1),e--)}function g(t){for(var e=t[0],n=1;n<t.length;++n){for(var r=t[n],i=e.length-1,o=e[i],s=-1,a=r.length-1;a>=0;--a)if(r[a]===o){s=a;break}for(var a=s;a>=0;--a){var c=r[a];if(e[i]!==c)break;e.pop(),i--}e=r}}function m(t){for(var e=[],n=0;n<t.length;++n){var r=t[n],i="    (No stack trace)"===r||N.test(r),o=i&&z(r);i&&!o&&(M&&" "!==r.charAt(0)&&(r="    "+r),e.push(r))}return e}function b(t){for(var e=t.stack.replace(/\s+$/g,"").split("\n"),n=0;n<e.length;++n){var r=e[n];if("    (No stack trace)"===r||N.test(r))break}return n>0&&(e=e.slice(n)),e}function w(t){var e=t.stack,n=t.toString();return e="string"==typeof e&&e.length>0?b(t):["    (No stack trace)"],{message:n,stack:m(e)}}function C(t,e,n){if("undefined"!=typeof console){var r;if(H.isObject(t)){var i=t.stack;r=e+U(i,t)}else r=e+String(t);"function"==typeof S?S(r,n):("function"==typeof console.log||"object"==_typeof(console.log))&&console.log(r)}}function j(t,e,n,r){var i=!1;try{"function"==typeof e&&(i=!0,"rejectionHandled"===t?e(r):e(n,r))}catch(o){D.throwLater(o)}var s=!1;try{s=K(t,n,r)}catch(o){s=!0,D.throwLater(o)}var a=!1;if(G)try{a=G(t.toLowerCase(),{reason:n,promise:r})}catch(o){a=!0,D.throwLater(o)}s||i||a||"unhandledRejection"!==t||C(n,"Unhandled rejection ")}function k(t){var e;if("function"==typeof t)e="[function "+(t.name||"anonymous")+"]";else{e=t&&"function"==typeof t.toString?t.toString():H.toString(t);var n=/\[object [a-zA-Z0-9$_]+\]/;if(n.test(e))try{var r=JSON.stringify(t);e=r}catch(i){}0===e.length&&(e="(empty array)")}return"(<"+F(e)+">, no stack trace)"}function F(t){var e=41;return t.length<e?t:t.substr(0,e-3)+"..."}function E(){return"function"==typeof W}function x(t){var e=t.match(X);return e?{fileName:e[1],line:parseInt(e[2],10)}:void 0}function T(t,e){if(E()){for(var n,r,i=t.stack.split("\n"),o=e.stack.split("\n"),s=-1,a=-1,c=0;c<i.length;++c){var l=x(i[c]);if(l){n=l.fileName,s=l.line;break}}for(var c=0;c<o.length;++c){var l=x(o[c]);if(l){r=l.fileName,a=l.line;break}}0>s||0>a||!n||!r||n!==r||s>=a||(z=function(t){if(L.test(t))return!0;var e=x(t);return e&&e.fileName===n&&s<=e.line&&e.line<=a?!0:!1})}}function P(t){this._parent=t,this._promisesCreated=0;var e=this._length=1+(void 0===t?0:t._length);W(this,P),e>32&&this.uncycle()}var R,O,S,A=e._getDomain,D=e._async,V=t("./errors").Warning,H=t("./util"),I=H.canAttachTrace,L=/[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/,N=null,U=null,M=!1,B=!(0==H.env("BLUEBIRD_DEBUG")||!H.env("BLUEBIRD_DEBUG")&&"development"!==H.env("NODE_ENV")),q=!(0==H.env("BLUEBIRD_WARNINGS")||!B&&!H.env("BLUEBIRD_WARNINGS")),Q=!(0==H.env("BLUEBIRD_LONG_STACK_TRACES")||!B&&!H.env("BLUEBIRD_LONG_STACK_TRACES"));e.prototype.suppressUnhandledRejections=function(){var t=this._target();t._bitField=-1048577&t._bitField|2097152},e.prototype._ensurePossibleRejectionHandled=function(){0===(2097152&this._bitField)&&(this._setRejectionIsUnhandled(),D.invokeLater(this._notifyUnhandledRejection,this,void 0))},e.prototype._notifyUnhandledRejectionIsHandled=function(){j("rejectionHandled",R,void 0,this)},e.prototype._notifyUnhandledRejection=function(){if(this._isRejectionUnhandled()){var t=this._settledValue();this._setUnhandledRejectionIsNotified(),j("unhandledRejection",O,t,this)}},e.prototype._setUnhandledRejectionIsNotified=function(){this._bitField=262144|this._bitField},e.prototype._unsetUnhandledRejectionIsNotified=function(){this._bitField=-262145&this._bitField},e.prototype._isUnhandledRejectionNotified=function(){return(262144&this._bitField)>0},e.prototype._setRejectionIsUnhandled=function(){this._bitField=1048576|this._bitField},e.prototype._unsetRejectionIsUnhandled=function(){this._bitField=-1048577&this._bitField,this._isUnhandledRejectionNotified()&&(this._unsetUnhandledRejectionIsNotified(),this._notifyUnhandledRejectionIsHandled())},e.prototype._isRejectionUnhandled=function(){return(1048576&this._bitField)>0},e.prototype._warn=function(t,e,n){return d(t,e,n||this)},e.onPossiblyUnhandledRejection=function(t){var e=A();O="function"==typeof t?null===e?t:e.bind(t):void 0},e.onUnhandledRejectionHandled=function(t){var e=A();R="function"==typeof t?null===e?t:e.bind(t):void 0},e.longStackTraces=function(){if(D.haveItemsQueued()&&!J.longStackTraces)throw new Error("cannot enable long stack traces after promises have been created\n\n    See http://goo.gl/MqrFmX\n");!J.longStackTraces&&E()&&(J.longStackTraces=!0,e.prototype._captureStackTrace=p,e.prototype._attachExtraTrace=h,n.activateLongStackTraces(),D.disableTrampolineIfNecessary())},e.hasLongStackTraces=function(){return J.longStackTraces&&E()},e.config=function(t){if(t=Object(t),"longStackTraces"in t&&t.longStackTraces&&e.longStackTraces(),"warnings"in t&&(J.warnings=!!t.warnings),"cancellation"in t&&t.cancellation&&!J.cancellation){if(D.haveItemsQueued())throw new Error("cannot enable cancellation after promises are in use");e.prototype._clearCancellationData=a,e.prototype._propagateFrom=c,e.prototype._onCancel=o,e.prototype._setOnCancel=s,e.prototype._attachCancellationCallback=i,e.prototype._execute=r,$=c,J.cancellation=!0}},e.prototype._execute=function(t,e,n){try{t(e,n)}catch(r){return r}},e.prototype._onCancel=function(){},e.prototype._setOnCancel=function(){},e.prototype._attachCancellationCallback=function(){},e.prototype._captureStackTrace=function(){},e.prototype._attachExtraTrace=function(){},e.prototype._clearCancellationData=function(){},e.prototype._propagateFrom=function(){};var $=l,z=function(){return!1},X=/[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;H.inherits(P,Error),n.CapturedTrace=P,P.prototype.uncycle=function(){var t=this._length;if(!(2>t)){for(var e=[],n={},r=0,i=this;void 0!==i;++r)e.push(i),i=i._parent;t=this._length=r;for(var r=t-1;r>=0;--r){var o=e[r].stack;void 0===n[o]&&(n[o]=r)}for(var r=0;t>r;++r){var s=e[r].stack,a=n[s];if(void 0!==a&&a!==r){a>0&&(e[a-1]._parent=void 0,e[a-1]._length=1),e[r]._parent=void 0,e[r]._length=1;var c=r>0?e[r-1]:this;t-1>a?(c._parent=e[a+1],c._parent.uncycle(),c._length=c._parent._length+1):(c._parent=void 0,c._length=1);for(var l=c._length+1,u=r-2;u>=0;--u)e[u]._length=l,l++;return}}}},P.prototype.attachExtraTrace=function(t){if(!t.__stackCleaned__){this.uncycle();for(var e=w(t),n=e.message,r=[e.stack],i=this;void 0!==i;)r.push(m(i.stack.split("\n"))),i=i._parent;g(r),y(r),H.notEnumerableProp(t,"stack",v(n,r)),H.notEnumerableProp(t,"__stackCleaned__",!0)}};var G,W=function(){var t=/^\s*at\s*/,e=function(t,e){return"string"==typeof t?t:void 0!==e.name&&void 0!==e.message?e.toString():k(e)};if("number"==typeof Error.stackTraceLimit&&"function"==typeof Error.captureStackTrace){Error.stackTraceLimit+=6,N=t,U=e;var n=Error.captureStackTrace;return z=function(t){return L.test(t)},function(t,e){Error.stackTraceLimit+=6,n(t,e),Error.stackTraceLimit-=6}}var r=new Error;if("string"==typeof r.stack&&r.stack.split("\n")[0].indexOf("stackDetection@")>=0)return N=/@/,U=e,M=!0,function(t){t.stack=(new Error).stack};var i;try{throw new Error}catch(o){i="stack"in o}return"stack"in r||!i||"number"!=typeof Error.stackTraceLimit?(U=function(t,e){return"string"==typeof t?t:"object"!=("undefined"==typeof e?"undefined":_typeof(e))&&"function"!=typeof e||void 0===e.name||void 0===e.message?k(e):e.toString()},null):(N=t,U=e,function(t){Error.stackTraceLimit+=6;try{throw new Error}catch(e){t.stack=e.stack}Error.stackTraceLimit-=6})}([]),K=function(){if(H.isNode)return function(t,e,n){return"rejectionHandled"===t?process.emit(t,n):process.emit(t,e,n)};var t=!1,e=!0;try{var n=new global.CustomEvent("test");t=n instanceof CustomEvent}catch(r){}if(!t)try{var i=document.createEvent("CustomEvent");i.initCustomEvent("testingtheevent",!1,!0,{}),global.dispatchEvent(i)}catch(r){e=!1}e&&(G=function(e,n){var r;return t?r=new global.CustomEvent(e,{detail:n,bubbles:!1,cancelable:!0}):global.dispatchEvent&&(r=document.createEvent("CustomEvent"),r.initCustomEvent(e,!1,!0,n)),r?!global.dispatchEvent(r):!1});var o={};return o.unhandledRejection="onunhandledRejection".toLowerCase(),o.rejectionHandled="onrejectionHandled".toLowerCase(),function(t,e,n){var r=o[t],i=global[r];return i?("rejectionHandled"===t?i.call(global,n):i.call(global,e,n),!0):!1}}();"undefined"!=typeof console&&"undefined"!=typeof console.warn&&(S=function(t){console.warn(t)},H.isNode&&process.stderr.isTTY?S=function(t,e){var n=e?"[33m":"[31m";console.warn(n+t+"[0m\n")}:H.isNode||"string"!=typeof(new Error).stack||(S=function(t,e){console.warn("%c"+t,e?"color: darkorange":"color: red")}));var J={warnings:q,longStackTraces:!1,cancellation:!1};return Q&&e.longStackTraces(),{longStackTraces:function(){return J.longStackTraces},warnings:function(){return J.warnings},cancellation:function(){return J.cancellation},propagateFromFunction:function(){return $},boundValueFunction:function(){return u},checkForgottenReturns:f,setBounds:T,warn:d,deprecated:_,CapturedTrace:P}}},{"./errors":12,"./util":36}],10:[function(t,e){e.exports=function(t){function e(){return this.value}function n(){throw this.reason}t.prototype["return"]=t.prototype.thenReturn=function(n){return n instanceof t&&n.suppressUnhandledRejections(),this._then(e,void 0,void 0,{value:n},void 0)},t.prototype["throw"]=t.prototype.thenThrow=function(t){return this._then(n,void 0,void 0,{reason:t},void 0)},t.prototype.catchThrow=function(t){if(arguments.length<=1)return this._then(void 0,n,void 0,{reason:t},void 0);var e=arguments[1],r=function(){throw e};return this.caught(t,r)},t.prototype.catchReturn=function(n){if(arguments.length<=1)return n instanceof t&&n.suppressUnhandledRejections(),this._then(void 0,e,void 0,{value:n},void 0);var r=arguments[1];r instanceof t&&r.suppressUnhandledRejections();var i=function(){return r};return this.caught(n,i)}}},{}],11:[function(t,e){e.exports=function(t,e){function n(){return o(this)}function r(t,n){return i(t,n,e,e)}var i=t.reduce,o=t.all;t.prototype.each=function(t){return this.mapSeries(t)._then(n,void 0,void 0,this,void 0)},t.prototype.mapSeries=function(t){return i(this,t,e,e)},t.each=function(t,e){return r(t,e)._then(n,void 0,void 0,t,void 0)},t.mapSeries=r}},{}],12:[function(t,e){function n(t,e){function n(r){return this instanceof n?(u(this,"message","string"==typeof r?r:e),u(this,"name",t),void(Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):Error.call(this))):new n(r)}return l(n,Error),n}function r(t){return this instanceof r?(u(this,"name","OperationalError"),u(this,"message",t),this.cause=t,this.isOperational=!0,void(t instanceof Error?(u(this,"message",t.message),u(this,"stack",t.stack)):Error.captureStackTrace&&Error.captureStackTrace(this,this.constructor))):new r(t)}var i,o,s=t("./es5"),a=s.freeze,c=t("./util"),l=c.inherits,u=c.notEnumerableProp,p=n("Warning","warning"),h=n("CancellationError","cancellation error"),f=n("TimeoutError","timeout error"),_=n("AggregateError","aggregate error");try{i=TypeError,o=RangeError}catch(d){i=n("TypeError","type error"),o=n("RangeError","range error")}for(var v="join pop push shift unshift slice filter forEach some every map indexOf lastIndexOf reduce reduceRight sort reverse".split(" "),y=0;y<v.length;++y)"function"==typeof Array.prototype[v[y]]&&(_.prototype[v[y]]=Array.prototype[v[y]]);s.defineProperty(_.prototype,"length",{value:0,configurable:!1,writable:!0,enumerable:!0}),_.prototype.isOperational=!0;var g=0;_.prototype.toString=function(){var t=Array(4*g+1).join(" "),e="\n"+t+"AggregateError of:\n";g++,t=Array(4*g+1).join(" ");for(var n=0;n<this.length;++n){for(var r=this[n]===this?"[Circular AggregateError]":this[n]+"",i=r.split("\n"),o=0;o<i.length;++o)i[o]=t+i[o];r=i.join("\n"),e+=r+"\n"}return g--,e},l(r,Error);var m=Error.__BluebirdErrorTypes__;m||(m=a({CancellationError:h,TimeoutError:f,OperationalError:r,RejectionError:r,AggregateError:_}),u(Error,"__BluebirdErrorTypes__",m)),e.exports={Error:Error,TypeError:i,RangeError:o,CancellationError:m.CancellationError,OperationalError:m.OperationalError,TimeoutError:m.TimeoutError,AggregateError:m.AggregateError,Warning:p}},{"./es5":13,"./util":36}],13:[function(t,e){var n=function(){return void 0===this}();if(n)e.exports={freeze:Object.freeze,defineProperty:Object.defineProperty,getDescriptor:Object.getOwnPropertyDescriptor,keys:Object.keys,names:Object.getOwnPropertyNames,getPrototypeOf:Object.getPrototypeOf,isArray:Array.isArray,isES5:n,propertyIsWritable:function(t,e){var n=Object.getOwnPropertyDescriptor(t,e);return!(n&&!n.writable&&!n.set)}};else{var r={}.hasOwnProperty,i={}.toString,o={}.constructor.prototype,s=function(t){var e=[];for(var n in t)r.call(t,n)&&e.push(n);return e},a=function(t,e){return{value:t[e]}},c=function(t,e,n){return t[e]=n.value,t},l=function(t){return t},u=function(t){try{return Object(t).constructor.prototype}catch(e){return o}},p=function(t){try{return"[object Array]"===i.call(t)}catch(e){return!1}};e.exports={isArray:p,keys:s,names:s,defineProperty:c,getDescriptor:a,freeze:l,getPrototypeOf:u,isES5:n,propertyIsWritable:function(){return!0}}}},{}],14:[function(t,e){e.exports=function(t,e){var n=t.map;t.prototype.filter=function(t,r){return n(this,t,r,e)},t.filter=function(t,r,i){return n(t,r,i,e)}}},{}],15:[function(t,e){e.exports=function(e,n){function r(t){this.finallyHandler=t}function i(t,e){return null!=t.cancelPromise?(arguments.length>1?t.cancelPromise._reject(e):t.cancelPromise._cancel(),t.cancelPromise=null,!0):!1}function o(){return a.call(this,this.promise._target()._settledValue())}function s(t){return i(this,t)?void 0:(u.e=t,u)}function a(t){var a=this.promise,c=this.handler;if(!this.called){this.called=!0;var p=0===this.type?c.call(a._boundValue()):c.call(a._boundValue(),t);if(void 0!==p){var h=n(p,a);if(h instanceof e){if(null!=this.cancelPromise){if(h.isCancelled()){var f=new l("late cancellation observer");return a._attachExtraTrace(f),u.e=f,u}h.isPending()&&h._attachCancellationCallback(new r(this))}return h._then(o,s,void 0,this,void 0)}}}return a.isRejected()?(i(this),u.e=t,u):(i(this),t)}var c=t("./util"),l=e.CancellationError,u=c.errorObj;return r.prototype._resultCancelled=function(){i(this.finallyHandler)},e.prototype._passThrough=function(t,e,n,r){return"function"!=typeof t?this.then():this._then(n,r,void 0,{promise:this,handler:t,called:!1,cancelPromise:null,type:e},void 0)},e.prototype.lastly=e.prototype["finally"]=function(t){return this._passThrough(t,0,a,a)},e.prototype.tap=function(t){return this._passThrough(t,1,a)},a}},{"./util":36}],16:[function(t,e){e.exports=function(e,n,r,i,o,s){function a(t,n,r){for(var o=0;o<n.length;++o){r._pushContext();var s=f(n[o])(t);if(r._popContext(),s===h){r._pushContext();var a=e.reject(h.e);return r._popContext(),a}var c=i(s,r);if(c instanceof e)return c}return null}function c(t,n,i,o){var s=this._promise=new e(r);s._captureStackTrace(),s._setOnCancel(this),this._stack=o,this._generatorFunction=t,this._receiver=n,this._generator=void 0,this._yieldHandlers="function"==typeof i?[i].concat(_):_,this._yieldedPromise=null}var l=t("./errors"),u=l.TypeError,p=t("./util"),h=p.errorObj,f=p.tryCatch,_=[];p.inherits(c,o),c.prototype._isResolved=function(){return null===this.promise},c.prototype._cleanup=function(){this._promise=this._generator=null},c.prototype._promiseCancelled=function(){if(!this._isResolved()){var t,n="undefined"!=typeof this._generator["return"];if(n)this._promise._pushContext(),t=f(this._generator["return"]).call(this._generator,void 0),this._promise._popContext();else{var r=new e.CancellationError("generator .return() sentinel");e.coroutine.returnSentinel=r,this._promise._attachExtraTrace(r),this._promise._pushContext(),t=f(this._generator["throw"]).call(this._generator,r),this._promise._popContext(),t===h&&t.e===r&&(t=null)}var i=this._promise;this._cleanup(),t===h?i._rejectCallback(t.e,!1):i.cancel()}},c.prototype._promiseFulfilled=function(t){this._yieldedPromise=null,this._promise._pushContext();var e=f(this._generator.next).call(this._generator,t);this._promise._popContext(),this._continue(e)},c.prototype._promiseRejected=function(t){this._yieldedPromise=null,this._promise._attachExtraTrace(t),this._promise._pushContext();var e=f(this._generator["throw"]).call(this._generator,t);this._promise._popContext(),this._continue(e)},c.prototype._resultCancelled=function(){if(this._yieldedPromise instanceof e){var t=this._yieldedPromise;this._yieldedPromise=null,t.cancel()}},c.prototype.promise=function(){return this._promise},c.prototype._run=function(){this._generator=this._generatorFunction.call(this._receiver),this._receiver=this._generatorFunction=void 0,this._promiseFulfilled(void 0)},c.prototype._continue=function(t){var n=this._promise;if(t===h)return this._cleanup(),n._rejectCallback(t.e,!1);var r=t.value;if(t.done===!0)return this._cleanup(),n._resolveCallback(r);var o=i(r,this._promise);if(!(o instanceof e)&&(o=a(o,this._yieldHandlers,this._promise),null===o))return void this._promiseRejected(new u("A value %s was yielded that could not be treated as a promise\n\n    See http://goo.gl/MqrFmX\n\n".replace("%s",r)+"From coroutine:\n"+this._stack.split("\n").slice(1,-7).join("\n")));o=o._target();var s=o._bitField;0===(50397184&s)?(this._yieldedPromise=o,o._proxy(this,null)):0!==(33554432&s)?this._promiseFulfilled(o._value()):0!==(16777216&s)?this._promiseRejected(o._reason()):this._promiseCancelled()},e.coroutine=function(t,e){if("function"!=typeof t)throw new u("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var n=Object(e).yieldHandler,r=c,i=(new Error).stack;return function(){var e=t.apply(this,arguments),o=new r(void 0,void 0,n,i),s=o.promise();return o._generator=e,o._promiseFulfilled(void 0),s}},e.coroutine.addYieldHandler=function(t){if("function"!=typeof t)throw new u("expecting a function but got "+p.classString(t));_.push(t)},e.spawn=function(t){if(s.deprecated("Promise.spawn()","Promise.coroutine()"),"function"!=typeof t)return n("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var r=new c(t,this),i=r.promise();return r._run(e.spawn),i}}},{"./errors":12,"./util":36}],17:[function(t,e){e.exports=function(e,n,r,i){var o=t("./util");o.canEvaluate,o.tryCatch,o.errorObj,e.join=function(){var t,e=arguments.length-1;if(e>0&&"function"==typeof arguments[e]){t=arguments[e];var r}var i=[].slice.call(arguments);t&&i.pop();var r=new n(i).promise();return void 0!==t?r.spread(t):r}}},{"./util":36}],18:[function(t,e){e.exports=function(e,n,r,i,o,s){function a(t,e,n,r){this.constructor$(t),this._promise._captureStackTrace();var i=l();this._callback=null===i?e:i.bind(e),this._preservedValues=r===o?new Array(this.length()):null,this._limit=n,this._inFlight=0,this._queue=n>=1?[]:f,this._init$(void 0,-2)}function c(t,e,n,i){if("function"!=typeof e)return r("expecting a function but got "+u.classString(e));var o="object"==("undefined"==typeof n?"undefined":_typeof(n))&&null!==n?n.concurrency:0;return o="number"==typeof o&&isFinite(o)&&o>=1?o:0,new a(t,e,o,i).promise()}var l=e._getDomain,u=t("./util"),p=u.tryCatch,h=u.errorObj,f=[];u.inherits(a,n),a.prototype._init=function(){},a.prototype._promiseFulfilled=function(t,n){var r=this._values,o=this.length(),a=this._preservedValues,c=this._limit;if(0>n){if(n=-1*n-1,r[n]=t,c>=1&&(this._inFlight--,this._drainQueue(),this._isResolved()))return!0}else{if(c>=1&&this._inFlight>=c)return r[n]=t,this._queue.push(n),!1;null!==a&&(a[n]=t);var l=this._promise,u=this._callback,f=l._boundValue();l._pushContext();var _=p(u).call(f,t,n,o),d=l._popContext();if(s.checkForgottenReturns(_,d,null!==a?"Promise.filter":"Promise.map",l),_===h)return this._reject(_.e),!0;var v=i(_,this._promise);if(v instanceof e){v=v._target();var y=v._bitField;if(0===(50397184&y))return c>=1&&this._inFlight++,r[n]=v,v._proxy(this,-1*(n+1)),!1;if(0===(33554432&y))return 0!==(16777216&y)?(this._reject(v._reason()),!0):(this._cancel(),!0);_=v._value()}r[n]=_}var g=++this._totalResolved;return g>=o?(null!==a?this._filter(r,a):this._resolve(r),!0):!1},a.prototype._drainQueue=function(){for(var t=this._queue,e=this._limit,n=this._values;t.length>0&&this._inFlight<e;){if(this._isResolved())return;var r=t.pop();this._promiseFulfilled(n[r],r)}},a.prototype._filter=function(t,e){for(var n=e.length,r=new Array(n),i=0,o=0;n>o;++o)t[o]&&(r[i++]=e[o]);r.length=i,this._resolve(r)},a.prototype.preservedValues=function(){return this._preservedValues},e.prototype.map=function(t,e){return c(this,t,e,null)},e.map=function(t,e,n,r){return c(t,e,n,r)}}},{"./util":36}],19:[function(t,e){e.exports=function(e,n,r,i,o){var s=t("./util"),a=s.tryCatch;e.method=function(t){if("function"!=typeof t)throw new e.TypeError("expecting a function but got "+s.classString(t));return function(){var r=new e(n);r._captureStackTrace(),r._pushContext();var i=a(t).apply(this,arguments),s=r._popContext();return o.checkForgottenReturns(i,s,"Promise.method",r),r._resolveFromSyncValue(i),r}},e.attempt=e["try"]=function(t){if("function"!=typeof t)return i("expecting a function but got "+s.classString(t));var r=new e(n);r._captureStackTrace(),
r._pushContext();var c;if(arguments.length>1){o.deprecated("calling Promise.try with more than 1 argument");var l=arguments[1],u=arguments[2];c=s.isArray(l)?a(t).apply(u,l):a(t).call(u,l)}else c=a(t)();var p=r._popContext();return o.checkForgottenReturns(c,p,"Promise.try",r),r._resolveFromSyncValue(c),r},e.prototype._resolveFromSyncValue=function(t){t===s.errorObj?this._rejectCallback(t.e,!1):this._resolveCallback(t,!0)}}},{"./util":36}],20:[function(t,e){function n(t){return t instanceof Error&&l.getPrototypeOf(t)===Error.prototype}function r(t){var e;if(n(t)){e=new c(t),e.name=t.name,e.message=t.message,e.stack=t.stack;for(var r=l.keys(t),i=0;i<r.length;++i){var s=r[i];u.test(s)||(e[s]=t[s])}return e}return o.markAsOriginatingFromRejection(t),t}function i(t,e){return function(n,i){if(null!==t){if(n){var o=r(s(n));t._attachExtraTrace(o),t._reject(o)}else if(e){var a=[].slice.call(arguments,1);t._fulfill(a)}else t._fulfill(i);t=null}}}var o=t("./util"),s=o.maybeWrapAsError,a=t("./errors"),c=a.OperationalError,l=t("./es5"),u=/^(?:name|message|stack|cause)$/;e.exports=i},{"./errors":12,"./es5":13,"./util":36}],21:[function(t,e){e.exports=function(e){function n(t,e){var n=this;if(!o.isArray(t))return r.call(n,t,e);var i=a(e).apply(n._boundValue(),[null].concat(t));i===c&&s.throwLater(i.e)}function r(t,e){var n=this,r=n._boundValue(),i=void 0===t?a(e).call(r,null):a(e).call(r,null,t);i===c&&s.throwLater(i.e)}function i(t,e){var n=this;if(!t){var r=new Error(t+"");r.cause=t,t=r}var i=a(e).call(n._boundValue(),t);i===c&&s.throwLater(i.e)}var o=t("./util"),s=e._async,a=o.tryCatch,c=o.errorObj;e.prototype.asCallback=e.prototype.nodeify=function(t,e){if("function"==typeof t){var o=r;void 0!==e&&Object(e).spread&&(o=n),this._then(o,i,void 0,this,t)}return this}}},{"./util":36}],22:[function(t,e){e.exports=function(){function e(){}function n(t,e){if("function"!=typeof e)throw new y("expecting a function but got "+h.classString(e));if(t.constructor!==r)throw new y("the promise constructor cannot be invoked directly\n\n    See http://goo.gl/MqrFmX\n")}function r(t){this._bitField=0,this._fulfillmentHandler0=void 0,this._rejectionHandler0=void 0,this._promise0=void 0,this._receiver0=void 0,t!==m&&(n(this,t),this._resolveFromExecutor(t)),this._promiseCreated()}function i(t){this.promise._resolveCallback(t)}function o(t){this.promise._rejectCallback(t,!1)}function s(t){var e=new r(m);e._fulfillmentHandler0=t,e._rejectionHandler0=t,e._promise0=t,e._receiver0=t}var a,c=function(){return new y("circular promise resolution chain\n\n    See http://goo.gl/MqrFmX\n")},l=function(){return new r.PromiseInspection(this._target())},u=function(t){return r.reject(new y(t))},p={},h=t("./util");a=h.isNode?function(){var t=process.domain;return void 0===t&&(t=null),t}:function(){return null},h.notEnumerableProp(r,"_getDomain",a);var f=t("./es5"),_=t("./async"),d=new _;f.defineProperty(r,"_async",{value:d});var v=t("./errors"),y=r.TypeError=v.TypeError;r.RangeError=v.RangeError;var g=r.CancellationError=v.CancellationError;r.TimeoutError=v.TimeoutError,r.OperationalError=v.OperationalError,r.RejectionError=v.OperationalError,r.AggregateError=v.AggregateError;var m=function(){},b={},w={},C=t("./thenables")(r,m),j=t("./promise_array")(r,m,C,u,e),k=t("./context")(r),F=k.create,E=t("./debuggability")(r,k),x=(E.CapturedTrace,t("./finally")(r,C)),T=t("./catch_filter")(w),P=t("./nodeback"),R=h.errorObj,O=h.tryCatch;return r.prototype.toString=function(){return"[object Promise]"},r.prototype.caught=r.prototype["catch"]=function(t){var e=arguments.length;if(e>1){var n,r=new Array(e-1),i=0;for(n=0;e-1>n;++n){var o=arguments[n];if(!h.isObject(o))return u("expecting an object but got "+h.classString(o));r[i++]=o}return r.length=i,t=arguments[n],this.then(void 0,T(r,t,this))}return this.then(void 0,t)},r.prototype.reflect=function(){return this._then(l,l,void 0,this,void 0)},r.prototype.then=function(t,e){if(E.warnings()&&arguments.length>0&&"function"!=typeof t&&"function"!=typeof e){var n=".then() only accepts functions but was passed: "+h.classString(t);arguments.length>1&&(n+=", "+h.classString(e)),this._warn(n)}return this._then(t,e,void 0,void 0,void 0)},r.prototype.done=function(t,e){var n=this._then(t,e,void 0,void 0,void 0);n._setIsFinal()},r.prototype.spread=function(t){return"function"!=typeof t?u("expecting a function but got "+h.classString(t)):this.all()._then(t,void 0,void 0,b,void 0)},r.prototype.toJSON=function(){var t={isFulfilled:!1,isRejected:!1,fulfillmentValue:void 0,rejectionReason:void 0};return this.isFulfilled()?(t.fulfillmentValue=this.value(),t.isFulfilled=!0):this.isRejected()&&(t.rejectionReason=this.reason(),t.isRejected=!0),t},r.prototype.all=function(){return arguments.length>0&&this._warn(".all() was passed arguments but it does not take any"),new j(this).promise()},r.prototype.error=function(t){return this.caught(h.originatesFromRejection,t)},r.is=function(t){return t instanceof r},r.fromNode=r.fromCallback=function(t){var e=new r(m),n=arguments.length>1?!!Object(arguments[1]).multiArgs:!1,i=O(t)(P(e,n));return i===R&&e._rejectCallback(i.e,!0),e._isFateSealed()||e._setAsyncGuaranteed(),e},r.all=function(t){return new j(t).promise()},r.cast=function(t){var e=C(t);return e instanceof r||(e=new r(m),e._setFulfilled(),e._rejectionHandler0=t),e},r.resolve=r.fulfilled=r.cast,r.reject=r.rejected=function(t){var e=new r(m);return e._captureStackTrace(),e._rejectCallback(t,!0),e},r.setScheduler=function(t){if("function"!=typeof t)throw new y("expecting a function but got "+h.classString(t));var e=d._schedule;return d._schedule=t,e},r.prototype._then=function(t,e,n,i,o){var s=void 0!==o,c=s?o:new r(m),l=this._target(),u=l._bitField;s||(c._propagateFrom(this,3),c._captureStackTrace(),void 0===i&&0!==(2097152&this._bitField)&&(i=0!==(50397184&u)?this._boundValue():l===this?void 0:this._boundTo));var p=a();if(0!==(50397184&u)){var h,f,_=l._settlePromiseCtx;0!==(33554432&u)?(f=l._rejectionHandler0,h=t):0!==(16777216&u)?(f=l._fulfillmentHandler0,h=e,l._unsetRejectionIsUnhandled()):(_=l._settlePromiseLateCancellationObserver,f=new g("late cancellation observer"),l._attachExtraTrace(f),h=e),d.invoke(_,l,{handler:null===p?h:"function"==typeof h&&p.bind(h),promise:c,receiver:i,value:f})}else l._addCallbacks(t,e,c,i,p);return c},r.prototype._length=function(){return 65535&this._bitField},r.prototype._isFateSealed=function(){return 0!==(117506048&this._bitField)},r.prototype._isFollowing=function(){return 67108864===(67108864&this._bitField)},r.prototype._setLength=function(t){this._bitField=-65536&this._bitField|65535&t},r.prototype._setFulfilled=function(){this._bitField=33554432|this._bitField},r.prototype._setRejected=function(){this._bitField=16777216|this._bitField},r.prototype._setFollowing=function(){this._bitField=67108864|this._bitField},r.prototype._setIsFinal=function(){this._bitField=4194304|this._bitField},r.prototype._isFinal=function(){return(4194304&this._bitField)>0},r.prototype._unsetCancelled=function(){this._bitField=-65537&this._bitField},r.prototype._setCancelled=function(){this._bitField=65536|this._bitField},r.prototype._setAsyncGuaranteed=function(){this._bitField=134217728|this._bitField},r.prototype._receiverAt=function(t){var e=0===t?this._receiver0:this[4*t-4+3];return e===p?void 0:void 0===e&&this._isBound()?this._boundValue():e},r.prototype._promiseAt=function(t){return this[4*t-4+2]},r.prototype._fulfillmentHandlerAt=function(t){return this[4*t-4+0]},r.prototype._rejectionHandlerAt=function(t){return this[4*t-4+1]},r.prototype._boundValue=function(){},r.prototype._migrateCallback0=function(t){var e=(t._bitField,t._fulfillmentHandler0),n=t._rejectionHandler0,r=t._promise0,i=t._receiverAt(0);void 0===i&&(i=p),this._addCallbacks(e,n,r,i,null)},r.prototype._migrateCallbackAt=function(t,e){var n=t._fulfillmentHandlerAt(e),r=t._rejectionHandlerAt(e),i=t._promiseAt(e),o=t._receiverAt(e);void 0===o&&(o=p),this._addCallbacks(n,r,i,o,null)},r.prototype._addCallbacks=function(t,e,n,r,i){var o=this._length();if(o>=65531&&(o=0,this._setLength(0)),0===o)this._promise0=n,this._receiver0=r,"function"==typeof t&&(this._fulfillmentHandler0=null===i?t:i.bind(t)),"function"==typeof e&&(this._rejectionHandler0=null===i?e:i.bind(e));else{var s=4*o-4;this[s+2]=n,this[s+3]=r,"function"==typeof t&&(this[s+0]=null===i?t:i.bind(t)),"function"==typeof e&&(this[s+1]=null===i?e:i.bind(e))}return this._setLength(o+1),o},r.prototype._proxy=function(t,e){this._addCallbacks(void 0,void 0,e,t,null)},r.prototype._resolveCallback=function(t,e){if(0===(117506048&this._bitField)){if(t===this)return this._rejectCallback(c(),!1);var n=C(t,this);if(!(n instanceof r))return this._fulfill(t);e&&this._propagateFrom(n,2);var i=n._target(),o=i._bitField;if(0===(50397184&o)){var s=this._length();s>0&&i._migrateCallback0(this);for(var a=1;s>a;++a)i._migrateCallbackAt(this,a);this._setFollowing(),this._setLength(0),this._setFollowee(i)}else if(0!==(33554432&o))this._fulfill(i._value());else if(0!==(16777216&o))this._reject(i._reason());else{var l=new g("late cancellation observer");i._attachExtraTrace(l),this._reject(l)}}},r.prototype._rejectCallback=function(t,e,n){var r=h.ensureErrorObject(t),i=r===t;if(!i&&!n&&E.warnings()){var o="a promise was rejected with a non-error: "+h.classString(t);this._warn(o,!0)}this._attachExtraTrace(r,e?i:!1),this._reject(t)},r.prototype._resolveFromExecutor=function(t){var e=this;this._captureStackTrace(),this._pushContext();var n=!0,r=this._execute(t,function(t){e._resolveCallback(t)},function(t){e._rejectCallback(t,n)});n=!1,this._popContext(),void 0!==r&&e._rejectCallback(r,!0)},r.prototype._settlePromiseFromHandler=function(t,e,n,r){var i=r._bitField;if(0===(65536&i)){r._pushContext();var o;e===b?n&&"number"==typeof n.length?o=O(t).apply(this._boundValue(),n):(o=R,o.e=new y("cannot .spread() a non-array: "+h.classString(n))):o=O(t).call(e,n);var s=r._popContext();if(i=r._bitField,0===(65536&i))if(o===w)r._reject(n);else if(o===R||o===r){var a=o===r?c():o.e;r._rejectCallback(a,!1)}else E.checkForgottenReturns(o,s,"",r),r._resolveCallback(o)}},r.prototype._target=function(){for(var t=this;t._isFollowing();)t=t._followee();return t},r.prototype._followee=function(){return this._rejectionHandler0},r.prototype._setFollowee=function(t){this._rejectionHandler0=t},r.prototype._settlePromise=function(t,n,i,o){var s=t instanceof r,a=this._bitField,c=0!==(134217728&a);0!==(65536&a)?(s&&t._invokeInternalOnCancel(),n===x?(i.cancelPromise=t,O(n).call(i,o)===R&&t._reject(R.e)):n===l?t._fulfill(l.call(i)):i instanceof e?i._promiseCancelled(t):s||t instanceof j?t._cancel():i.cancel()):"function"==typeof n?s?(c&&t._setAsyncGuaranteed(),this._settlePromiseFromHandler(n,i,o,t)):n.call(i,o,t):i instanceof e?i._isResolved()||(0!==(33554432&a)?i._promiseFulfilled(o,t):i._promiseRejected(o,t)):s&&(c&&t._setAsyncGuaranteed(),0!==(33554432&a)?t._fulfill(o):t._reject(o))},r.prototype._settlePromiseLateCancellationObserver=function(t){var e=t.handler,n=t.promise,i=t.receiver,o=t.value;"function"==typeof e?n instanceof r?this._settlePromiseFromHandler(e,i,o,n):e.call(i,o,n):n instanceof r&&n._reject(o)},r.prototype._settlePromiseCtx=function(t){this._settlePromise(t.promise,t.handler,t.receiver,t.value)},r.prototype._settlePromise0=function(t,e){var n=this._promise0,r=this._receiverAt(0);this._promise0=void 0,this._receiver0=void 0,this._settlePromise(n,t,r,e)},r.prototype._clearCallbackDataAtIndex=function(t){var e=4*t-4;this[e+2]=this[e+3]=this[e+0]=this[e+1]=void 0},r.prototype._fulfill=function(t){var e=this._bitField;if(!((117506048&e)>>>16)){if(t===this){var n=c();return this._attachExtraTrace(n),this._reject(n)}this._setFulfilled(),this._rejectionHandler0=t,(65535&e)>0&&(0!==(134217728&e)?this._settlePromises():d.settlePromises(this))}},r.prototype._reject=function(t){var e=this._bitField;return(117506048&e)>>>16?void 0:(this._setRejected(),this._fulfillmentHandler0=t,this._isFinal()?d.fatalError(t,h.isNode):void((65535&e)>0?0!==(134217728&e)?this._settlePromises():d.settlePromises(this):this._ensurePossibleRejectionHandled()))},r.prototype._fulfillPromises=function(t,e){for(var n=1;t>n;n++){var r=this._fulfillmentHandlerAt(n),i=this._promiseAt(n),o=this._receiverAt(n);this._clearCallbackDataAtIndex(n),this._settlePromise(i,r,o,e)}},r.prototype._rejectPromises=function(t,e){for(var n=1;t>n;n++){var r=this._rejectionHandlerAt(n),i=this._promiseAt(n),o=this._receiverAt(n);this._clearCallbackDataAtIndex(n),this._settlePromise(i,r,o,e)}},r.prototype._settlePromises=function(){var t=this._bitField,e=65535&t;if(e>0){if(0!==(16842752&t)){var n=this._fulfillmentHandler0;this._settlePromise0(this._rejectionHandler0,n,t),this._rejectPromises(e,n)}else{var r=this._rejectionHandler0;this._settlePromise0(this._fulfillmentHandler0,r,t),this._fulfillPromises(e,r)}this._setLength(0)}this._clearCancellationData()},r.prototype._settledValue=function(){var t=this._bitField;return 0!==(33554432&t)?this._rejectionHandler0:0!==(16777216&t)?this._fulfillmentHandler0:void 0},r.defer=r.pending=function(){E.deprecated("Promise.defer","new Promise");var t=new r(m);return{promise:t,resolve:i,reject:o}},h.notEnumerableProp(r,"_makeSelfResolutionError",c),t("./method")(r,m,C,u,E),t("./bind")(r,m,C,E),t("./cancel")(r,j,u,E),t("./direct_resolve")(r),t("./synchronous_inspection")(r),t("./join")(r,j,C,m,E),r.Promise=r,t("./map.js")(r,j,u,C,m,E),t("./using.js")(r,u,C,F,m,E),t("./timers.js")(r,m),t("./generators.js")(r,u,m,C,e,E),t("./nodeify.js")(r),t("./call_get.js")(r),t("./props.js")(r,j,C,u),t("./race.js")(r,m,C,u),t("./reduce.js")(r,j,u,C,m,E),t("./settle.js")(r,j,E),t("./some.js")(r,j,u),t("./promisify.js")(r,m),t("./any.js")(r),t("./each.js")(r,m),t("./filter.js")(r,m),h.toFastProperties(r),h.toFastProperties(r.prototype),s({a:1}),s({b:2}),s({c:3}),s(1),s(function(){}),s(void 0),s(!1),s(new r(m)),E.setBounds(_.firstLineError,h.lastLineError),r}},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(t,e){e.exports=function(e,n,r,i,o){function s(t){switch(t){case-2:return[];case-3:return{}}}function a(t){var r=this._promise=new e(n);t instanceof e&&r._propagateFrom(t,3),r._setOnCancel(this),this._values=t,this._length=0,this._totalResolved=0,this._init(void 0,-2)}var c=t("./util");return c.isArray,c.inherits(a,o),a.prototype.length=function(){return this._length},a.prototype.promise=function(){return this._promise},a.prototype._init=function l(t,n){var o=r(this._values,this._promise);if(o instanceof e){o=o._target();var a=o._bitField;if(this._values=o,0===(50397184&a))return this._promise._setAsyncGuaranteed(),o._then(l,this._reject,void 0,this,n);if(0===(33554432&a))return 0!==(16777216&a)?this._reject(o._reason()):this._cancel();o=o._value()}if(o=c.asArray(o),null===o){var u=i("expecting an array or an iterable object but got "+c.classString(o)).reason();return void this._promise._rejectCallback(u,!1)}return 0===o.length?void(-5===n?this._resolveEmptyArray():this._resolve(s(n))):void this._iterate(o)},a.prototype._iterate=function(t){var n=this.getActualLength(t.length);this._length=n,this._values=this.shouldCopyValues()?new Array(n):this._values;for(var i=this._promise,o=!1,s=null,a=0;n>a;++a){var c=r(t[a],i);c instanceof e?(c=c._target(),s=c._bitField):s=null,o?null!==s&&c.suppressUnhandledRejections():null!==s?0===(50397184&s)?(c._proxy(this,a),this._values[a]=c):o=0!==(33554432&s)?this._promiseFulfilled(c._value(),a):0!==(16777216&s)?this._promiseRejected(c._reason(),a):this._promiseCancelled(a):o=this._promiseFulfilled(c,a)}o||i._setAsyncGuaranteed()},a.prototype._isResolved=function(){return null===this._values},a.prototype._resolve=function(t){this._values=null,this._promise._fulfill(t)},a.prototype._cancel=function(){!this._isResolved()&&this._promise.isCancellable()&&(this._values=null,this._promise._cancel())},a.prototype._reject=function(t){this._values=null,this._promise._rejectCallback(t,!1)},a.prototype._promiseFulfilled=function(t,e){this._values[e]=t;var n=++this._totalResolved;return n>=this._length?(this._resolve(this._values),!0):!1},a.prototype._promiseCancelled=function(){return this._cancel(),!0},a.prototype._promiseRejected=function(t){return this._totalResolved++,this._reject(t),!0},a.prototype._resultCancelled=function(){if(!this._isResolved()){var t=this._values;if(this._cancel(),t instanceof e)t.cancel();else for(var n=0;n<t.length;++n)t[n]instanceof e&&t[n].cancel()}},a.prototype.shouldCopyValues=function(){return!0},a.prototype.getActualLength=function(t){return t},a}},{"./util":36}],24:[function(t,e){e.exports=function(e,n){function r(t){return!C.test(t)}function i(t){try{return t.__isPromisified__===!0}catch(e){return!1}}function o(t,e,n){var r=f.getDataPropertyOrDefault(t,e+n,b);return r?i(r):!1}function s(t,e,n){for(var r=0;r<t.length;r+=2){var i=t[r];if(n.test(i))for(var o=i.replace(n,""),s=0;s<t.length;s+=2)if(t[s]===o)throw new g("Cannot promisify an API that has normal methods with '%s'-suffix\n\n    See http://goo.gl/MqrFmX\n".replace("%s",e))}}function a(t,e,n,r){for(var a=f.inheritedDataKeys(t),c=[],l=0;l<a.length;++l){var u=a[l],p=t[u],h=r===j?!0:j(u,p,t);"function"!=typeof p||i(p)||o(t,u,e)||!r(u,p,t,h)||c.push(u,p)}return s(c,e,n),c}function c(t,r,i,o,s,a){function c(){var i=r;r===h&&(i=this);var o=new e(n);o._captureStackTrace();var s="string"==typeof u&&this!==l?this[u]:t,c=_(o,a);try{s.apply(i,d(arguments,c))}catch(p){o._rejectCallback(v(p),!0,!0)}return o._isFateSealed()||o._setAsyncGuaranteed(),o}var l=function(){return this}(),u=t;return"string"==typeof u&&(t=o),f.notEnumerableProp(c,"__isPromisified__",!0),c}function l(t,e,n,r,i){for(var o=new RegExp(k(e)+"$"),s=a(t,e,o,n),c=0,l=s.length;l>c;c+=2){var u=s[c],p=s[c+1],_=u+e;if(r===F)t[_]=F(u,h,u,p,e,i);else{var d=r(p,function(){return F(u,h,u,p,e,i)});f.notEnumerableProp(d,"__isPromisified__",!0),t[_]=d}}return f.toFastProperties(t),t}function u(t,e,n){return F(t,e,void 0,t,null,n)}var p,h={},f=t("./util"),_=t("./nodeback"),d=f.withAppended,v=f.maybeWrapAsError,y=f.canEvaluate,g=t("./errors").TypeError,m="Async",b={__isPromisified__:!0},w=["arity","length","name","arguments","caller","callee","prototype","__isPromisified__"],C=new RegExp("^(?:"+w.join("|")+")$"),j=function(t){return f.isIdentifier(t)&&"_"!==t.charAt(0)&&"constructor"!==t},k=function(t){return t.replace(/([$])/,"\\$")},F=y?p:c;e.promisify=function(t,e){if("function"!=typeof t)throw new g("expecting a function but got "+f.classString(t));if(i(t))return t;e=Object(e);var n=void 0===e.context?h:e.context,o=!!e.multiArgs,s=u(t,n,o);return f.copyDescriptors(t,s,r),s},e.promisifyAll=function(t,e){if("function"!=typeof t&&"object"!=("undefined"==typeof t?"undefined":_typeof(t)))throw new g("the target of promisifyAll must be an object or a function\n\n    See http://goo.gl/MqrFmX\n");e=Object(e);var n=!!e.multiArgs,r=e.suffix;"string"!=typeof r&&(r=m);var i=e.filter;"function"!=typeof i&&(i=j);var o=e.promisifier;if("function"!=typeof o&&(o=F),!f.isIdentifier(r))throw new RangeError("suffix must be a valid identifier\n\n    See http://goo.gl/MqrFmX\n");for(var s=f.inheritedDataKeys(t),a=0;a<s.length;++a){var c=t[s[a]];"constructor"!==s[a]&&f.isClass(c)&&(l(c.prototype,r,i,o,n),l(c,r,i,o,n))}return l(t,r,i,o,n)}}},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(t,e){e.exports=function(e,n,r,i){function o(t){var e,n=!1;if(void 0!==a&&t instanceof a)e=p(t),n=!0;else{var r=u.keys(t),i=r.length;e=new Array(2*i);for(var o=0;i>o;++o){var s=r[o];e[o]=t[s],e[o+i]=s}}this.constructor$(e),this._isMap=n,this._init$(void 0,-3)}function s(t){var n,s=r(t);return l(s)?(n=s instanceof e?s._then(e.props,void 0,void 0,void 0,void 0):new o(s).promise(),s instanceof e&&n._propagateFrom(s,2),n):i("cannot await properties of a non-object\n\n    See http://goo.gl/MqrFmX\n")}var a,c=t("./util"),l=c.isObject,u=t("./es5");"function"==typeof Map&&(a=Map);var p=function(){function t(t,r){this[e]=t,this[e+n]=r,e++}var e=0,n=0;return function(r){n=r.size,e=0;var i=new Array(2*r.size);return r.forEach(t,i),i}}(),h=function(t){for(var e=new a,n=t.length/2|0,r=0;n>r;++r){var i=t[n+r],o=t[r];e.set(i,o)}return e};c.inherits(o,n),o.prototype._init=function(){},o.prototype._promiseFulfilled=function(t,e){this._values[e]=t;var n=++this._totalResolved;if(n>=this._length){var r;if(this._isMap)r=h(this._values);else{r={};for(var i=this.length(),o=0,s=this.length();s>o;++o)r[this._values[o+i]]=this._values[o]}return this._resolve(r),!0}return!1},o.prototype.shouldCopyValues=function(){return!1},o.prototype.getActualLength=function(t){return t>>1},e.prototype.props=function(){return s(this)},e.props=function(t){return s(t)}}},{"./es5":13,"./util":36}],26:[function(t,e){function n(t,e,n,r,i){for(var o=0;i>o;++o)n[o+r]=t[o+e],t[o+e]=void 0}function r(t){this._capacity=t,this._length=0,this._front=0}r.prototype._willBeOverCapacity=function(t){return this._capacity<t},r.prototype._pushOne=function(t){var e=this.length();this._checkCapacity(e+1);var n=this._front+e&this._capacity-1;this[n]=t,this._length=e+1},r.prototype._unshiftOne=function(t){var e=this._capacity;this._checkCapacity(this.length()+1);var n=this._front,r=(n-1&e-1^e)-e;this[r]=t,this._front=r,this._length=this.length()+1},r.prototype.unshift=function(t,e,n){this._unshiftOne(n),this._unshiftOne(e),this._unshiftOne(t)},r.prototype.push=function(t,e,n){var r=this.length()+3;if(this._willBeOverCapacity(r))return this._pushOne(t),this._pushOne(e),void this._pushOne(n);var i=this._front+r-3;this._checkCapacity(r);var o=this._capacity-1;this[i+0&o]=t,this[i+1&o]=e,this[i+2&o]=n,this._length=r},r.prototype.shift=function(){var t=this._front,e=this[t];return this[t]=void 0,this._front=t+1&this._capacity-1,this._length--,e},r.prototype.length=function(){return this._length},r.prototype._checkCapacity=function(t){this._capacity<t&&this._resizeTo(this._capacity<<1)},r.prototype._resizeTo=function(t){var e=this._capacity;this._capacity=t;var r=this._front,i=this._length,o=r+i&e-1;n(this,0,this,e,o)},e.exports=r},{}],27:[function(t,e){e.exports=function(e,n,r,i){function o(t,o){var c=r(t);if(c instanceof e)return a(c);if(t=s.asArray(t),null===t)return i("expecting an array or an iterable object but got "+s.classString(t));var l=new e(n);void 0!==o&&l._propagateFrom(o,3);for(var u=l._fulfill,p=l._reject,h=0,f=t.length;f>h;++h){var _=t[h];(void 0!==_||h in t)&&e.cast(_)._then(u,p,void 0,l,null)}return l}var s=t("./util"),a=function(t){return t.then(function(e){return o(e,t)})};e.race=function(t){return o(t,void 0)},e.prototype.race=function(){return o(this,void 0)}}},{"./util":36}],28:[function(t,e){e.exports=function(e,n,r,i,o,s){function a(t,n,r,i){this.constructor$(t);var s=h();this._fn=null===s?n:s.bind(n),void 0!==r&&(r=e.resolve(r),r._attachCancellationCallback(this)),this._initialValue=r,this._currentCancellable=null,this._eachValues=i===o?[]:void 0,this._promise._captureStackTrace(),this._init$(void 0,-5)}function c(t,e){this.isFulfilled()?e._resolve(t):e._reject(t)}function l(t,e,n,i){if("function"!=typeof e)return r("expecting a function but got "+f.classString(e));var o=new a(t,e,n,i);return o.promise()}function u(t){this.accum=t,this.array._gotAccum(t);var n=i(this.value,this.array._promise);return n instanceof e?(this.array._currentCancellable=n,n._then(p,void 0,void 0,this,void 0)):p.call(this,n)}function p(t){var n=this.array,r=n._promise,i=_(n._fn);r._pushContext();var o;o=void 0!==n._eachValues?i.call(r._boundValue(),t,this.index,this.length):i.call(r._boundValue(),this.accum,t,this.index,this.length),o instanceof e&&(n._currentCancellable=o);var a=r._popContext();return s.checkForgottenReturns(o,a,void 0!==n._eachValues?"Promise.each":"Promise.reduce",r),o}var h=e._getDomain,f=t("./util"),_=f.tryCatch;f.inherits(a,n),a.prototype._gotAccum=function(t){void 0!==this._eachValues&&t!==o&&this._eachValues.push(t)},a.prototype._eachComplete=function(t){return this._eachValues.push(t),this._eachValues},a.prototype._init=function(){},a.prototype._resolveEmptyArray=function(){this._resolve(void 0!==this._eachValues?this._eachValues:this._initialValue)},a.prototype.shouldCopyValues=function(){return!1},a.prototype._resolve=function(t){this._promise._resolveCallback(t),this._values=null},a.prototype._resultCancelled=function(t){return t===this._initialValue?this._cancel():void(this._isResolved()||(this._resultCancelled$(),this._currentCancellable instanceof e&&this._currentCancellable.cancel(),this._initialValue instanceof e&&this._initialValue.cancel()))},a.prototype._iterate=function(t){this._values=t;var n,r,i=t.length;if(void 0!==this._initialValue?(n=this._initialValue,r=0):(n=e.resolve(t[0]),r=1),this._currentCancellable=n,!n.isRejected())for(;i>r;++r){var o={accum:null,value:t[r],index:r,length:i,array:this};n=n._then(u,void 0,void 0,o,void 0)}void 0!==this._eachValues&&(n=n._then(this._eachComplete,void 0,void 0,this,void 0)),n._then(c,c,void 0,n,this)},e.prototype.reduce=function(t,e){return l(this,t,e,null)},e.reduce=function(t,e,n,r){return l(t,e,n,r)}}},{"./util":36}],29:[function(t,e){var n,r=t("./util"),i=function(){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")};if(r.isNode&&"undefined"==typeof MutationObserver){var o=global.setImmediate,s=process.nextTick;n=r.isRecentNode?function(t){o.call(global,t)}:function(t){s.call(process,t)}}else"undefined"==typeof MutationObserver||"undefined"!=typeof window&&window.navigator&&window.navigator.standalone?n="undefined"!=typeof setImmediate?function(t){setImmediate(t)}:"undefined"!=typeof setTimeout?function(t){setTimeout(t,0)}:i:(n=function(t){var e=document.createElement("div"),n=new MutationObserver(t);return n.observe(e,{attributes:!0}),function(){e.classList.toggle("foo")}},n.isStatic=!0);e.exports=n},{"./util":36}],30:[function(t,e){e.exports=function(e,n,r){function i(t){this.constructor$(t)}var o=e.PromiseInspection,s=t("./util");s.inherits(i,n),i.prototype._promiseResolved=function(t,e){this._values[t]=e;var n=++this._totalResolved;return n>=this._length?(this._resolve(this._values),!0):!1},i.prototype._promiseFulfilled=function(t,e){var n=new o;return n._bitField=33554432,n._settledValueField=t,this._promiseResolved(e,n)},i.prototype._promiseRejected=function(t,e){var n=new o;return n._bitField=16777216,n._settledValueField=t,this._promiseResolved(e,n)},e.settle=function(t){return r.deprecated(".settle()",".reflect()"),new i(t).promise()},e.prototype.settle=function(){return e.settle(this)}}},{"./util":36}],31:[function(t,e){e.exports=function(e,n,r){function i(t){this.constructor$(t),this._howMany=0,this._unwrap=!1,this._initialized=!1}function o(t,e){if((0|e)!==e||0>e)return r("expecting a positive integer\n\n    See http://goo.gl/MqrFmX\n");var n=new i(t),o=n.promise();return n.setHowMany(e),n.init(),o}var s=t("./util"),a=t("./errors").RangeError,c=t("./errors").AggregateError,l=s.isArray,u={};s.inherits(i,n),i.prototype._init=function(){if(this._initialized){if(0===this._howMany)return void this._resolve([]);this._init$(void 0,-5);var t=l(this._values);!this._isResolved()&&t&&this._howMany>this._canPossiblyFulfill()&&this._reject(this._getRangeError(this.length()))}},i.prototype.init=function(){this._initialized=!0,this._init()},i.prototype.setUnwrap=function(){this._unwrap=!0},i.prototype.howMany=function(){return this._howMany},i.prototype.setHowMany=function(t){this._howMany=t},i.prototype._promiseFulfilled=function(t){return this._addFulfilled(t),this._fulfilled()===this.howMany()?(this._values.length=this.howMany(),this._resolve(1===this.howMany()&&this._unwrap?this._values[0]:this._values),!0):!1},i.prototype._promiseRejected=function(t){return this._addRejected(t),this._checkOutcome()},i.prototype._promiseCancelled=function(){return this._values instanceof e||null==this._values?this._cancel():(this._addRejected(u),this._checkOutcome())},i.prototype._checkOutcome=function(){if(this.howMany()>this._canPossiblyFulfill()){for(var t=new c,e=this.length();e<this._values.length;++e)this._values[e]!==u&&t.push(this._values[e]);return t.length>0?this._reject(t):this._cancel(),!0}return!1},i.prototype._fulfilled=function(){return this._totalResolved},i.prototype._rejected=function(){return this._values.length-this.length()},i.prototype._addRejected=function(t){this._values.push(t)},i.prototype._addFulfilled=function(t){this._values[this._totalResolved++]=t},i.prototype._canPossiblyFulfill=function(){return this.length()-this._rejected()},i.prototype._getRangeError=function(t){var e="Input array must contain at least "+this._howMany+" items but contains only "+t+" items";return new a(e)},i.prototype._resolveEmptyArray=function(){this._reject(this._getRangeError(0))},e.some=function(t,e){return o(t,e)},e.prototype.some=function(t){return o(this,t)},e._SomePromiseArray=i}},{"./errors":12,"./util":36}],32:[function(t,e){e.exports=function(t){function e(t){void 0!==t?(t=t._target(),this._bitField=t._bitField,this._settledValueField=t._isFateSealed()?t._settledValue():void 0):(this._bitField=0,this._settledValueField=void 0)}e.prototype._settledValue=function(){return this._settledValueField};var n=e.prototype.value=function(){if(!this.isFulfilled())throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},r=e.prototype.error=e.prototype.reason=function(){if(!this.isRejected())throw new TypeError("cannot get rejection reason of a non-rejected promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},i=e.prototype.isFulfilled=function(){return 0!==(33554432&this._bitField)},o=e.prototype.isRejected=function(){return 0!==(16777216&this._bitField)},s=e.prototype.isPending=function(){return 0===(50397184&this._bitField)},a=e.prototype.isResolved=function(){return 0!==(50331648&this._bitField)};e.prototype.isCancelled=t.prototype._isCancelled=function(){return 65536===(65536&this._bitField)},t.prototype.isCancelled=function(){return this._target()._isCancelled()},t.prototype.isPending=function(){return s.call(this._target())},t.prototype.isRejected=function(){return o.call(this._target())},t.prototype.isFulfilled=function(){return i.call(this._target())},t.prototype.isResolved=function(){return a.call(this._target())},t.prototype.value=function(){return n.call(this._target())},t.prototype.reason=function(){var t=this._target();return t._unsetRejectionIsUnhandled(),r.call(t)},t.prototype._value=function(){return this._settledValue()},t.prototype._reason=function(){return this._unsetRejectionIsUnhandled(),this._settledValue()},t.PromiseInspection=e}},{}],33:[function(t,e){e.exports=function(e,n){function r(t,r){if(u(t)){if(t instanceof e)return t;var i=o(t);if(i===l){r&&r._pushContext();var c=e.reject(i.e);return r&&r._popContext(),c}if("function"==typeof i){if(s(t)){var c=new e(n);return t._then(c._fulfill,c._reject,void 0,c,null),c}return a(t,i,r)}}return t}function i(t){return t.then}function o(t){try{return i(t)}catch(e){return l.e=e,l}}function s(t){return p.call(t,"_promise0")}function a(t,r,i){function o(t){a&&(a._resolveCallback(t),a=null)}function s(t){a&&(a._rejectCallback(t,p,!0),a=null)}var a=new e(n),u=a;i&&i._pushContext(),a._captureStackTrace(),i&&i._popContext();var p=!0,h=c.tryCatch(r).call(t,o,s);return p=!1,a&&h===l&&(a._rejectCallback(h.e,!0,!0),a=null),u}var c=t("./util"),l=c.errorObj,u=c.isObject,p={}.hasOwnProperty;return r}},{"./util":36}],34:[function(t,e){e.exports=function(e,n){
function r(t){var e=this;return e instanceof Number&&(e=+e),clearTimeout(e),t}function i(t){var e=this;throw e instanceof Number&&(e=+e),clearTimeout(e),t}var o=t("./util"),s=e.TimeoutError,a=function(t,e){if(t.isPending()){var n;n="string"!=typeof e?e instanceof Error?e:new s("operation timed out"):new s(e),o.markAsOriginatingFromRejection(n),t._attachExtraTrace(n),t._reject(n)}},c=function(t){return l(+this).thenReturn(t)},l=e.delay=function(t,r){var i;return void 0!==r?i=e.resolve(r)._then(c,null,null,t,void 0):(i=new e(n),setTimeout(function(){i._fulfill()},+t)),i._setAsyncGuaranteed(),i};e.prototype.delay=function(t){return l(t,this)},e.prototype.timeout=function(t,e){t=+t;var n=this.then(),o=setTimeout(function(){a(n,e)},t);return n._then(r,i,void 0,o,void 0)}}},{"./util":36}],35:[function(t,e){e.exports=function(e,n,r,i,o,s){function a(t){setTimeout(function(){throw t},0)}function c(t){var e=r(t);return e!==t&&"function"==typeof t._isDisposable&&"function"==typeof t._getDisposer&&t._isDisposable()&&e._setDisposable(t._getDisposer()),e}function l(t,n){function i(){if(s>=l)return u._fulfill();var o=c(t[s++]);if(o instanceof e&&o._isDisposable()){try{o=r(o._getDisposer().tryDispose(n),t.promise)}catch(p){return a(p)}if(o instanceof e)return o._then(i,a,null,null,null)}i()}var s=0,l=t.length,u=new e(o);return i(),u}function u(t,e,n){this._data=t,this._promise=e,this._context=n}function p(t,e,n){this.constructor$(t,e,n)}function h(t){return u.isDisposer(t)?(this.resources[this.index]._setDisposable(t),t.promise()):t}function f(t){this.length=t,this.promise=null,this[t-1]=null}var _=t("./util"),d=t("./errors").TypeError,v=t("./util").inherits,y=_.errorObj,g=_.tryCatch;u.prototype.data=function(){return this._data},u.prototype.promise=function(){return this._promise},u.prototype.resource=function(){return this.promise().isFulfilled()?this.promise().value():null},u.prototype.tryDispose=function(t){var e=this.resource(),n=this._context;void 0!==n&&n._pushContext();var r=null!==e?this.doDispose(e,t):null;return void 0!==n&&n._popContext(),this._promise._unsetDisposable(),this._data=null,r},u.isDisposer=function(t){return null!=t&&"function"==typeof t.resource&&"function"==typeof t.tryDispose},v(p,u),p.prototype.doDispose=function(t,e){var n=this.data();return n.call(t,t,e)},f.prototype._resultCancelled=function(){for(var t=this.length,n=0;t>n;++n){var r=this[n];r instanceof e&&r.cancel()}},e.using=function(){var t=arguments.length;if(2>t)return n("you must pass at least 2 arguments to Promise.using");var i=arguments[t-1];if("function"!=typeof i)return n("expecting a function but got "+_.classString(i));var o,a=!0;2===t&&Array.isArray(arguments[0])?(o=arguments[0],t=o.length,a=!1):(o=arguments,t--);for(var c=new f(t),p=0;t>p;++p){var d=o[p];if(u.isDisposer(d)){var v=d;d=d.promise(),d._setDisposable(v)}else{var m=r(d);m instanceof e&&(d=m._then(h,null,null,{resources:c,index:p},void 0))}c[p]=d}for(var b=new Array(c.length),p=0;p<b.length;++p)b[p]=e.resolve(c[p]).reflect();var w=e.all(b).then(function(t){for(var e=0;e<t.length;++e){var n=t[e];if(n.isRejected())return y.e=n.error(),y;if(!n.isFulfilled())return void w.cancel();t[e]=n.value()}C._pushContext(),i=g(i);var r=a?i.apply(void 0,t):i(t),o=C._popContext();return s.checkForgottenReturns(r,o,"Promise.using",C),r}),C=w.lastly(function(){var t=new e.PromiseInspection(w);return l(c,t)});return c.promise=C,C._setOnCancel(c),C},e.prototype._setDisposable=function(t){this._bitField=131072|this._bitField,this._disposer=t},e.prototype._isDisposable=function(){return(131072&this._bitField)>0},e.prototype._getDisposer=function(){return this._disposer},e.prototype._unsetDisposable=function(){this._bitField=-131073&this._bitField,this._disposer=void 0},e.prototype.disposer=function(t){if("function"==typeof t)return new p(t,this,i());throw new d}}},{"./errors":12,"./util":36}],36:[function(t,e,n){function r(){try{var t=j;return j=null,t.apply(this,arguments)}catch(e){return E.e=e,E}}function i(t){return j=t,r}function o(t){return null==t||t===!0||t===!1||"string"==typeof t||"number"==typeof t}function s(t){return"function"==typeof t||"object"==("undefined"==typeof t?"undefined":_typeof(t))&&null!==t}function a(t){return o(t)?new Error(v(t)):t}function c(t,e){var n,r=t.length,i=new Array(r+1);for(n=0;r>n;++n)i[n]=t[n];return i[n]=e,i}function l(t,e,n){if(!k.isES5)return{}.hasOwnProperty.call(t,e)?t[e]:void 0;var r=Object.getOwnPropertyDescriptor(t,e);return null!=r?null==r.get&&null==r.set?r.value:n:void 0}function u(t,e,n){if(o(t))return t;var r={value:n,configurable:!0,enumerable:!1,writable:!0};return k.defineProperty(t,e,r),t}function p(t){throw t}function h(t){try{if("function"==typeof t){var e=k.names(t.prototype),n=k.isES5&&e.length>1,r=e.length>0&&!(1===e.length&&"constructor"===e[0]),i=P.test(t+"")&&k.names(t).length>0;if(n||r||i)return!0}return!1}catch(o){return!1}}function f(t){function e(){}e.prototype=t;for(var n=8;n--;)new e;return t}function _(t){return R.test(t)}function d(t,e,n){for(var r=new Array(t),i=0;t>i;++i)r[i]=e+i+n;return r}function v(t){try{return t+""}catch(e){return"[no string representation]"}}function y(t){try{u(t,"isOperational",!0)}catch(e){}}function g(t){return null==t?!1:t instanceof Error.__BluebirdErrorTypes__.OperationalError||t.isOperational===!0}function m(t){return t instanceof Error&&k.propertyIsWritable(t,"stack")}function b(t){return{}.toString.call(t)}function w(t,e,n){for(var r=k.names(t),i=0;i<r.length;++i){var o=r[i];if(n(o))try{k.defineProperty(e,o,k.getDescriptor(t,o))}catch(s){}}}function C(t,e){return D?process.env[t]:e}var j,k=t("./es5"),F="undefined"==typeof navigator,E={e:{}},x=function(t,e){function n(){this.constructor=t,this.constructor$=e;for(var n in e.prototype)r.call(e.prototype,n)&&"$"!==n.charAt(n.length-1)&&(this[n+"$"]=e.prototype[n])}var r={}.hasOwnProperty;return n.prototype=e.prototype,t.prototype=new n,t.prototype},T=function(){var t=[Array.prototype,Object.prototype,Function.prototype],e=function(e){for(var n=0;n<t.length;++n)if(t[n]===e)return!0;return!1};if(k.isES5){var n=Object.getOwnPropertyNames;return function(t){for(var r=[],i=Object.create(null);null!=t&&!e(t);){var o;try{o=n(t)}catch(s){return r}for(var a=0;a<o.length;++a){var c=o[a];if(!i[c]){i[c]=!0;var l=Object.getOwnPropertyDescriptor(t,c);null!=l&&null==l.get&&null==l.set&&r.push(c)}}t=k.getPrototypeOf(t)}return r}}var r={}.hasOwnProperty;return function(n){if(e(n))return[];var i=[];t:for(var o in n)if(r.call(n,o))i.push(o);else{for(var s=0;s<t.length;++s)if(r.call(t[s],o))continue t;i.push(o)}return i}}(),P=/this\s*\.\s*\S+\s*=/,R=/^[a-z$_][a-z$_0-9]*$/i,O=function(){return"stack"in new Error?function(t){return m(t)?t:new Error(v(t))}:function(t){if(m(t))return t;try{throw new Error(v(t))}catch(e){return e}}}(),S=function(t){return k.isArray(t)?t:null};if("undefined"!=typeof Symbol&&Symbol.iterator){var A="function"==typeof Array.from?function(t){return Array.from(t)}:function(t){for(var e,n=[],r=t[Symbol.iterator]();!(e=r.next()).done;)n.push(e.value);return n};S=function(t){return k.isArray(t)?t:null!=t&&"function"==typeof t[Symbol.iterator]?A(t):null}}var D="undefined"!=typeof process&&"[object process]"===b(process).toLowerCase(),V={isClass:h,isIdentifier:_,inheritedDataKeys:T,getDataPropertyOrDefault:l,thrower:p,isArray:k.isArray,asArray:S,notEnumerableProp:u,isPrimitive:o,isObject:s,canEvaluate:F,errorObj:E,tryCatch:i,inherits:x,withAppended:c,maybeWrapAsError:a,toFastProperties:f,filledRange:d,toString:v,canAttachTrace:m,ensureErrorObject:O,originatesFromRejection:g,markAsOriginatingFromRejection:y,classString:b,copyDescriptors:w,hasDevTools:"undefined"!=typeof chrome&&chrome&&"function"==typeof chrome.loadTimes,isNode:D,env:C};V.isRecentNode=V.isNode&&function(){var t=process.versions.node.split(".").map(Number);return 0===t[0]&&t[1]>10||t[0]>0}(),V.isNode&&V.toFastProperties(process);try{throw new Error}catch(H){V.lastLineError=H}e.exports=V},{"./es5":13}]},{},[4])(4)}),"undefined"!=typeof window&&null!==window?window.P=window.Promise:"undefined"!=typeof self&&null!==self&&(global.P=global.Promise);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],5:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var i18n=L,baseCDN=exports.baseCDN="http://d286f74vnssc9p.cloudfront.net",baseReleasePath=exports.baseReleasePath="/ota",yorckCDN=exports.yorckCDN="http://d1h9fxczewi7b8.cloudfront.net",yorckBasePath=exports.yorckBasePath="/static/assets/films/",yorckBaseURI=exports.yorckBaseURI=yorckCDN+yorckBasePath,defaultPaths=exports.defaultPaths={meta:{title:i18n("meta")+"..",path:"/meta"},cinemas:{title:i18n("cinemas")+"..",path:"/cinemas"},payload:{title:i18n("movies")+"..",path:""}};

},{}],6:[function(require,module,exports){
(function (global){
"use strict";function boot(e){return new bluebird(function(e){alert("test!")})}Object.defineProperty(exports,"__esModule",{value:!0}),exports.release=exports.regeneratorRuntime=void 0,exports.boot=boot;var _bindings=require("./bindings"),_config=require("./config"),_utils=require("./utils"),regeneratorRuntime=exports.regeneratorRuntime=require("regenerator/runtime"),bluebird=require("./bluebird"),async=bluebird.coroutine,release=exports.release="1.0.1";global.ota=exports;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./bindings":3,"./bluebird":4,"./config":5,"./utils":7,"regenerator/runtime":2}],7:[function(require,module,exports){
"use strict";function showNotification(t){var e=arguments.length<=1||void 0===arguments[1]?2e3:arguments[1],n=Ti.UI.createWindow({height:40,bottom:-40}),i=Ti.UI.createView({backgroundColor:_bindings.baseLight,width:(0,_bindings.frame)().width,height:40}),o=Ti.UI.createLabel({color:_bindings.baseDark,font:{fontFamily:"SanFranciscoDisplay-Medium",fontSize:15}});o.text=i18n(t[0]);var r=function(){setTimeout(function(){n.animate(Ti.UI.createAnimation({duration:500,bottom:-40})),setTimeout(function(){n.remove(i),n.close(),n=null,i=null,o=null},550)},e)};t instanceof Array&&e&&t.length>1?!function(){var n=1,i=setInterval(function(){o.text=i18n(t[n++]),n>=t.length&&(clearInterval(i),r())},e)}():r(),i.add(o),n.add(i),n.open(),n.animate(Ti.UI.createAnimation({duration:500,bottom:0}))}function getURL(t){return new bluebird(function(e,n){var i=Ti.Network.createHTTPClient({onload:function(){e(this)},onerror:function(t){n(t)},timeout:5e3});i.open("GET",t),i.send()})}Object.defineProperty(exports,"__esModule",{value:!0}),exports.showNotification=showNotification,exports.getURL=getURL;var _bindings=require("./bindings"),bluebird=require("./bluebird"),i18n=L;

},{"./bindings":3,"./bluebird":4}]},{},[6]);
