/*eslint-disable*/

var Module = (() => {
  var _scriptDir =
    typeof document !== "undefined" && document.currentScript
      ? document.currentScript.src
      : undefined
  if (typeof __filename !== "undefined") _scriptDir = _scriptDir || __filename
  return function (Module) {
    Module = Module || {}

    // The Module object: Our interface to the outside world. We import
    // and export values on it. There are various ways Module can be used:
    // 1. Not defined. We create it here
    // 2. A function parameter, function(Module) { ..generated code.. }
    // 3. pre-run appended it, var Module = {}; ..generated code..
    // 4. External script tag defines var Module.
    // We need to check if Module already exists (e.g. case 3 above).
    // Substitution will be replaced with actual code on later stage of the build,
    // this way Closure Compiler will not mangle it (e.g. case 4. above).
    // Note that if you want to run closure, and also to use Module
    // after the generated code, you will need to define   var Module = {};
    // before the code. Then that object will be used in the code, and you
    // can continue to use Module afterwards as well.
    var Module = typeof Module != "undefined" ? Module : {}

    // See https://caniuse.com/mdn-javascript_builtins_object_assign

    // Set up the promise that indicates the Module is initialized
    var readyPromiseResolve, readyPromiseReject
    Module["ready"] = new Promise(function (resolve, reject) {
      readyPromiseResolve = resolve
      readyPromiseReject = reject
    })

    // --pre-jses are emitted after the Module integration code, so that they can
    // refer to Module (if they choose; they can also define Module)
    // {{PRE_JSES}}

    // Sometimes an existing Module object exists with properties
    // meant to overwrite the default module functionality. Here
    // we collect those properties and reapply _after_ we configure
    // the current environment's defaults to avoid having to be so
    // defensive during initialization.
    var moduleOverrides = Object.assign({}, Module)

    var arguments_ = []
    var thisProgram = "./this.program"
    var quit_ = (status, toThrow) => {
      throw toThrow
    }

    // Determine the runtime environment we are in. You can customize this by
    // setting the ENVIRONMENT setting at compile time (see settings.js).

    // Attempt to auto-detect the environment
    var ENVIRONMENT_IS_WEB = typeof window == "object"
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function"
    // N.b. Electron.js environment is simultaneously a NODE-environment, but
    // also a web environment.
    var ENVIRONMENT_IS_NODE =
      typeof process == "object" &&
      typeof process.versions == "object" &&
      typeof process.versions.node == "string"
    var ENVIRONMENT_IS_SHELL =
      !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER

    // `/` should be present at the end if `scriptDirectory` is not empty
    var scriptDirectory = ""
    function locateFile(path) {
      if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
      }
      return scriptDirectory + path
    }

    // Hooks that are implemented differently in different runtime environments.
    var read_, readAsync, readBinary, setWindowTitle

    // Normally we don't log exceptions but instead let them bubble out the top
    // level where the embedding environment (e.g. the browser) can handle
    // them.
    // However under v8 and node we sometimes exit the process direcly in which case
    // its up to use us to log the exception before exiting.
    // If we fix https://github.com/emscripten-core/emscripten/issues/15080
    // this may no longer be needed under node.
    function logExceptionOnExit(e) {
      if (e instanceof ExitStatus) return
      let toLog = e
      err("exiting due to exception: " + toLog)
    }

    var fs
    var nodePath
    var requireNodeFS

    if (ENVIRONMENT_IS_NODE) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/"
      } else {
        scriptDirectory = __dirname + "/"
      }

      // include: node_shell_read.js

      requireNodeFS = () => {
        // Use nodePath as the indicator for these not being initialized,
        // since in some environments a global fs may have already been
        // created.
        if (!nodePath) {
          fs = require("fs")
          nodePath = require("path")
        }
      }

      read_ = function shell_read(filename, binary) {
        requireNodeFS()
        filename = nodePath["normalize"](filename)
        return fs.readFileSync(filename, binary ? undefined : "utf8")
      }

      readBinary = (filename) => {
        var ret = read_(filename, true)
        if (!ret.buffer) {
          ret = new Uint8Array(ret)
        }
        return ret
      }

      readAsync = (filename, onload, onerror) => {
        requireNodeFS()
        filename = nodePath["normalize"](filename)
        fs.readFile(filename, function (err, data) {
          if (err) onerror(err)
          else onload(data.buffer)
        })
      }

      // end include: node_shell_read.js
      if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/")
      }

      arguments_ = process["argv"].slice(2)

      // MODULARIZE will export the module in the proper place outside, we don't need to export here

      process["on"]("uncaughtException", function (ex) {
        // suppress ExitStatus exceptions from showing an error
        if (!(ex instanceof ExitStatus)) {
          throw ex
        }
      })

      // Without this older versions of node (< v15) will log unhandled rejections
      // but return 0, which is not normally the desired behaviour.  This is
      // not be needed with node v15 and about because it is now the default
      // behaviour:
      // See https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode
      process["on"]("unhandledRejection", function (reason) {
        throw reason
      })

      quit_ = (status, toThrow) => {
        if (keepRuntimeAlive()) {
          process["exitCode"] = status
          throw toThrow
        }
        logExceptionOnExit(toThrow)
        process["exit"](status)
      }

      Module["inspect"] = function () {
        return "[Emscripten Module object]"
      }
    }

    // Note that this includes Node.js workers when relevant (pthreads is enabled).
    // Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
    // ENVIRONMENT_IS_NODE.
    else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        // Check worker, not web, since window could be polyfilled
        scriptDirectory = self.location.href
      } else if (typeof document != "undefined" && document.currentScript) {
        // web
        scriptDirectory = document.currentScript.src
      }
      // When MODULARIZE, this JS may be executed later, after document.currentScript
      // is gone, so we saved it, and we use it here instead of any other info.
      if (_scriptDir) {
        scriptDirectory = _scriptDir
      }
      // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
      // otherwise, slice off the final part of the url to find the script directory.
      // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
      // and scriptDirectory will correctly be replaced with an empty string.
      // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
      // they are removed because they could contain a slash.
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(
          0,
          scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1
        )
      } else {
        scriptDirectory = ""
      }

      // Differentiate the Web Worker from the Node Worker case, as reading must
      // be done differently.
      {
        // include: web_or_worker_shell_read.js

        read_ = (url) => {
          var xhr = new XMLHttpRequest()
          xhr.open("GET", url, false)
          xhr.send(null)
          return xhr.responseText
        }

        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest()
            xhr.open("GET", url, false)
            xhr.responseType = "arraybuffer"
            xhr.send(null)
            return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response))
          }
        }

        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest()
          xhr.open("GET", url, true)
          xhr.responseType = "arraybuffer"
          xhr.onload = () => {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
              // file URLs can return 0
              onload(xhr.response)
              return
            }
            onerror()
          }
          xhr.onerror = onerror
          xhr.send(null)
        }

        // end include: web_or_worker_shell_read.js
      }

      setWindowTitle = (title) => (document.title = title)
    } else {
    }

    var out = Module["print"] || console.log.bind(console)
    var err = Module["printErr"] || console.warn.bind(console)

    // Merge back in the overrides
    Object.assign(Module, moduleOverrides)
    // Free the object hierarchy contained in the overrides, this lets the GC
    // reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
    moduleOverrides = null

    // Emit code to handle expected values on the Module object. This applies Module.x
    // to the proper local x. This has two benefits: first, we only emit it if it is
    // expected to arrive, and second, by using a local everywhere else that can be
    // minified.

    if (Module["arguments"]) arguments_ = Module["arguments"]

    if (Module["thisProgram"]) thisProgram = Module["thisProgram"]

    if (Module["quit"]) quit_ = Module["quit"]

    // perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message

    var STACK_ALIGN = 16
    var POINTER_SIZE = 4

    function getNativeTypeSize(type) {
      switch (type) {
        case "i1":
        case "i8":
          return 1
        case "i16":
          return 2
        case "i32":
          return 4
        case "i64":
          return 8
        case "float":
          return 4
        case "double":
          return 8
        default: {
          if (type[type.length - 1] === "*") {
            return POINTER_SIZE
          } else if (type[0] === "i") {
            const bits = Number(type.substr(1))
            assert(
              bits % 8 === 0,
              "getNativeTypeSize invalid bits " + bits + ", type " + type
            )
            return bits / 8
          } else {
            return 0
          }
        }
      }
    }

    function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {}
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1
        err(text)
      }
    }

    // include: runtime_functions.js

    // Wraps a JS function as a wasm function with a given signature.
    function convertJsFunctionToWasm(func, sig) {
      // If the type reflection proposal is available, use the new
      // "WebAssembly.Function" constructor.
      // Otherwise, construct a minimal wasm module importing the JS function and
      // re-exporting it.
      if (typeof WebAssembly.Function == "function") {
        var typeNames = {
          i: "i32",
          j: "i64",
          f: "f32",
          d: "f64",
        }
        var type = {
          parameters: [],
          results: sig[0] == "v" ? [] : [typeNames[sig[0]]],
        }
        for (var i = 1; i < sig.length; ++i) {
          type.parameters.push(typeNames[sig[i]])
        }
        return new WebAssembly.Function(type, func)
      }

      // The module is static, with the exception of the type section, which is
      // generated based on the signature passed in.
      var typeSection = [
        0x01, // id: section,
        0x00, // length: 0 (placeholder)
        0x01, // count: 1
        0x60, // form: func
      ]
      var sigRet = sig.slice(0, 1)
      var sigParam = sig.slice(1)
      var typeCodes = {
        i: 0x7f, // i32
        j: 0x7e, // i64
        f: 0x7d, // f32
        d: 0x7c, // f64
      }

      // Parameters, length + signatures
      typeSection.push(sigParam.length)
      for (var i = 0; i < sigParam.length; ++i) {
        typeSection.push(typeCodes[sigParam[i]])
      }

      // Return values, length + signatures
      // With no multi-return in MVP, either 0 (void) or 1 (anything else)
      if (sigRet == "v") {
        typeSection.push(0x00)
      } else {
        typeSection = typeSection.concat([0x01, typeCodes[sigRet]])
      }

      // Write the overall length of the type section back into the section header
      // (excepting the 2 bytes for the section id and length)
      typeSection[1] = typeSection.length - 2

      // Rest of the module is static
      var bytes = new Uint8Array(
        [
          0x00,
          0x61,
          0x73,
          0x6d, // magic ("\0asm")
          0x01,
          0x00,
          0x00,
          0x00, // version: 1
        ].concat(typeSection, [
          0x02,
          0x07, // import section
          // (import "e" "f" (func 0 (type 0)))
          0x01,
          0x01,
          0x65,
          0x01,
          0x66,
          0x00,
          0x00,
          0x07,
          0x05, // export section
          // (export "f" (func 0 (type 0)))
          0x01,
          0x01,
          0x66,
          0x00,
          0x00,
        ])
      )

      // We can compile this wasm module synchronously because it is very small.
      // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
      var module = new WebAssembly.Module(bytes)
      var instance = new WebAssembly.Instance(module, {
        e: {
          f: func,
        },
      })
      var wrappedFunc = instance.exports["f"]
      return wrappedFunc
    }

    var freeTableIndexes = []

    // Weak map of functions in the table to their indexes, created on first use.
    var functionsInTableMap

    function getEmptyTableSlot() {
      // Reuse a free index if there is one, otherwise grow.
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop()
      }
      // Grow the table
      try {
        wasmTable.grow(1)
      } catch (err) {
        if (!(err instanceof RangeError)) {
          throw err
        }
        throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH."
      }
      return wasmTable.length - 1
    }

    function updateTableMap(offset, count) {
      for (var i = offset; i < offset + count; i++) {
        var item = getWasmTableEntry(i)
        // Ignore null values.
        if (item) {
          functionsInTableMap.set(item, i)
        }
      }
    }

    /**
     * Add a function to the table.
     * 'sig' parameter is required if the function being added is a JS function.
     * @param {string=} sig
     */
    function addFunction(func, sig) {
      // Check if the function is already in the table, to ensure each function
      // gets a unique index. First, create the map if this is the first use.
      if (!functionsInTableMap) {
        functionsInTableMap = new WeakMap()
        updateTableMap(0, wasmTable.length)
      }
      if (functionsInTableMap.has(func)) {
        return functionsInTableMap.get(func)
      }

      // It's not in the table, add it now.

      var ret = getEmptyTableSlot()

      // Set the new value.
      try {
        // Attempting to call this with JS function will cause of table.set() to fail
        setWasmTableEntry(ret, func)
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err
        }
        var wrapped = convertJsFunctionToWasm(func, sig)
        setWasmTableEntry(ret, wrapped)
      }

      functionsInTableMap.set(func, ret)

      return ret
    }

    function removeFunction(index) {
      functionsInTableMap.delete(getWasmTableEntry(index))
      freeTableIndexes.push(index)
    }

    // end include: runtime_functions.js
    // include: runtime_debug.js

    // end include: runtime_debug.js
    var tempRet0 = 0
    var setTempRet0 = (value) => {
      tempRet0 = value
    }
    var getTempRet0 = () => tempRet0

    // === Preamble library stuff ===

    // Documentation for the public APIs defined in this file must be updated in:
    //    site/source/docs/api_reference/preamble.js.rst
    // A prebuilt local version of the documentation is available at:
    //    site/build/text/docs/api_reference/preamble.js.txt
    // You can also build docs locally as HTML or other formats in site/
    // An online HTML version (which may be of a different version of Emscripten)
    //    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

    var wasmBinary
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"]
    var noExitRuntime = Module["noExitRuntime"] || true

    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected")
    }

    // include: runtime_safe_heap.js

    // In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
    // In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

    /** @param {number} ptr
    @param {number} value
    @param {string} type
    @param {number|boolean=} noSafe */
    function setValue(ptr, value, type = "i8", noSafe) {
      if (type.charAt(type.length - 1) === "*") type = "i32"
      switch (type) {
        case "i1":
          HEAP8[ptr >> 0] = value
          break
        case "i8":
          HEAP8[ptr >> 0] = value
          break
        case "i16":
          HEAP16[ptr >> 1] = value
          break
        case "i32":
          HEAP32[ptr >> 2] = value
          break
        case "i64":
          ;(tempI64 = [
            value >>> 0,
            ((tempDouble = value),
            +Math.abs(tempDouble) >= 1.0
              ? tempDouble > 0.0
                ? (Math.min(
                    +Math.floor(tempDouble / 4294967296.0),
                    4294967295.0
                  ) |
                    0) >>>
                  0
                : ~~+Math.ceil(
                    (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                  ) >>> 0
              : 0),
          ]),
            (HEAP32[ptr >> 2] = tempI64[0]),
            (HEAP32[(ptr + 4) >> 2] = tempI64[1])
          break
        case "float":
          HEAPF32[ptr >> 2] = value
          break
        case "double":
          HEAPF64[ptr >> 3] = value
          break
        default:
          abort("invalid type for setValue: " + type)
      }
    }

    /** @param {number} ptr
    @param {string} type
    @param {number|boolean=} noSafe */
    function getValue(ptr, type = "i8", noSafe) {
      if (type.charAt(type.length - 1) === "*") type = "i32"
      switch (type) {
        case "i1":
          return HEAP8[ptr >> 0]
        case "i8":
          return HEAP8[ptr >> 0]
        case "i16":
          return HEAP16[ptr >> 1]
        case "i32":
          return HEAP32[ptr >> 2]
        case "i64":
          return HEAP32[ptr >> 2]
        case "float":
          return HEAPF32[ptr >> 2]
        case "double":
          return Number(HEAPF64[ptr >> 3])
        default:
          abort("invalid type for getValue: " + type)
      }
      return null
    }

    // end include: runtime_safe_heap.js
    // Wasm globals

    var wasmMemory

    //========================================
    // Runtime essentials
    //========================================

    // whether we are quitting the application. no code should run after this.
    // set in exit() and abort()
    var ABORT = false

    // set by exit() and abort().  Passed to 'onExit' handler.
    // NOTE: This is also used as the process return code code in shell environments
    // but only when noExitRuntime is false.
    var EXITSTATUS

    /** @type {function(*, string=)} */
    function assert(condition, text) {
      if (!condition) {
        // This build was created without ASSERTIONS defined.  `assert()` should not
        // ever be called in this configuration but in case there are callers in
        // the wild leave this simple abort() implemenation here for now.
        abort(text)
      }
    }

    // Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
    function getCFunc(ident) {
      var func = Module["_" + ident] // closure exported function
      return func
    }

    // C calling interface.
    /** @param {string|null=} returnType
    @param {Array=} argTypes
    @param {Arguments|Array=} args
    @param {Object=} opts */
    function ccall(ident, returnType, argTypes, args, opts) {
      // For fast lookup of conversion functions
      var toC = {
        string: function (str) {
          var ret = 0
          if (str !== null && str !== undefined && str !== 0) {
            // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            var len = (str.length << 2) + 1
            ret = stackAlloc(len)
            stringToUTF8(str, ret, len)
          }
          return ret
        },
        array: function (arr) {
          var ret = stackAlloc(arr.length)
          writeArrayToMemory(arr, ret)
          return ret
        },
      }

      function convertReturnValue(ret) {
        if (returnType === "string") return UTF8ToString(ret)
        if (returnType === "boolean") return Boolean(ret)
        return ret
      }

      var func = getCFunc(ident)
      var cArgs = []
      var stack = 0
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]]
          if (converter) {
            if (stack === 0) stack = stackSave()
            cArgs[i] = converter(args[i])
          } else {
            cArgs[i] = args[i]
          }
        }
      }
      var ret = func.apply(null, cArgs)
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack)
        return convertReturnValue(ret)
      }

      ret = onDone(ret)
      return ret
    }

    /** @param {string=} returnType
    @param {Array=} argTypes
    @param {Object=} opts */
    function cwrap(ident, returnType, argTypes, opts) {
      argTypes = argTypes || []
      // When the function takes numbers and returns a number, we can just return
      // the original function
      var numericArgs = argTypes.every(function (type) {
        return type === "number"
      })
      var numericRet = returnType !== "string"
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident)
      }
      return function () {
        return ccall(ident, returnType, argTypes, arguments, opts)
      }
    }

    // include: runtime_legacy.js

    var ALLOC_NORMAL = 0 // Tries to use _malloc()
    var ALLOC_STACK = 1 // Lives for the duration of the current function call

    /**
     * allocate(): This function is no longer used by emscripten but is kept around to avoid
     *             breaking external users.
     *             You should normally not use allocate(), and instead allocate
     *             memory using _malloc()/stackAlloc(), initialize it with
     *             setValue(), and so forth.
     * @param {(Uint8Array|Array<number>)} slab: An array of data.
     * @param {number=} allocator : How to allocate memory, see ALLOC_*
     */
    function allocate(slab, allocator) {
      var ret

      if (allocator == ALLOC_STACK) {
        ret = stackAlloc(slab.length)
      } else {
        ret = _malloc(slab.length)
      }

      if (!slab.subarray && !slab.slice) {
        slab = new Uint8Array(slab)
      }
      HEAPU8.set(slab, ret)
      return ret
    }

    // end include: runtime_legacy.js
    // include: runtime_strings.js

    // runtime_strings.js: Strings related runtime functions that are part of both MINIMAL_RUNTIME and regular runtime.

    // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
    // a copy of that string as a Javascript String object.

    var UTF8Decoder =
      typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined

    /**
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
    function UTF8ArrayToString(heap, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead
      var endPtr = idx
      // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
      // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
      while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr

      if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr))
      } else {
        var str = ""
        // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
        while (idx < endPtr) {
          // For UTF8 byte structure, see:
          // http://en.wikipedia.org/wiki/UTF-8#Description
          // https://www.ietf.org/rfc/rfc2279.txt
          // https://tools.ietf.org/html/rfc3629
          var u0 = heap[idx++]
          if (!(u0 & 0x80)) {
            str += String.fromCharCode(u0)
            continue
          }
          var u1 = heap[idx++] & 63
          if ((u0 & 0xe0) == 0xc0) {
            str += String.fromCharCode(((u0 & 31) << 6) | u1)
            continue
          }
          var u2 = heap[idx++] & 63
          if ((u0 & 0xf0) == 0xe0) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2
          } else {
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63)
          }

          if (u0 < 0x10000) {
            str += String.fromCharCode(u0)
          } else {
            var ch = u0 - 0x10000
            str += String.fromCharCode(
              0xd800 | (ch >> 10),
              0xdc00 | (ch & 0x3ff)
            )
          }
        }
      }
      return str
    }

    // Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
    // copy of that string as a Javascript String object.
    // maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
    //                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
    //                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
    //                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
    //                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
    //                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
    //                 throw JS JIT optimizations off, so it is worth to consider consistently using one
    //                 style or the other.
    /**
     * @param {number} ptr
     * @param {number=} maxBytesToRead
     * @return {string}
     */
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
    }

    // Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
    // encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
    // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Parameters:
    //   str: the Javascript string to copy.
    //   heap: the array to copy to. Each index in this array is assumed to be one 8-byte element.
    //   outIdx: The starting offset in the array to begin the copying.
    //   maxBytesToWrite: The maximum number of bytes this function can write to the array.
    //                    This count should include the null terminator,
    //                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
    //                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0))
        // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
        return 0

      var startIdx = outIdx
      var endIdx = outIdx + maxBytesToWrite - 1 // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i) // possibly a lead surrogate
        if (u >= 0xd800 && u <= 0xdfff) {
          var u1 = str.charCodeAt(++i)
          u = (0x10000 + ((u & 0x3ff) << 10)) | (u1 & 0x3ff)
        }
        if (u <= 0x7f) {
          if (outIdx >= endIdx) break
          heap[outIdx++] = u
        } else if (u <= 0x7ff) {
          if (outIdx + 1 >= endIdx) break
          heap[outIdx++] = 0xc0 | (u >> 6)
          heap[outIdx++] = 0x80 | (u & 63)
        } else if (u <= 0xffff) {
          if (outIdx + 2 >= endIdx) break
          heap[outIdx++] = 0xe0 | (u >> 12)
          heap[outIdx++] = 0x80 | ((u >> 6) & 63)
          heap[outIdx++] = 0x80 | (u & 63)
        } else {
          if (outIdx + 3 >= endIdx) break
          heap[outIdx++] = 0xf0 | (u >> 18)
          heap[outIdx++] = 0x80 | ((u >> 12) & 63)
          heap[outIdx++] = 0x80 | ((u >> 6) & 63)
          heap[outIdx++] = 0x80 | (u & 63)
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0
      return outIdx - startIdx
    }

    // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
    // null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
    // Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
    }

    // Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
    function lengthBytesUTF8(str) {
      var len = 0
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var u = str.charCodeAt(i) // possibly a lead surrogate
        if (u >= 0xd800 && u <= 0xdfff)
          u = (0x10000 + ((u & 0x3ff) << 10)) | (str.charCodeAt(++i) & 0x3ff)
        if (u <= 0x7f) ++len
        else if (u <= 0x7ff) len += 2
        else if (u <= 0xffff) len += 3
        else len += 4
      }
      return len
    }

    // end include: runtime_strings.js
    // include: runtime_strings_extra.js

    // runtime_strings_extra.js: Strings related runtime functions that are available only in regular runtime.

    // Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
    // a copy of that string as a Javascript String object.

    function AsciiToString(ptr) {
      var str = ""
      while (1) {
        var ch = HEAPU8[ptr++ >> 0]
        if (!ch) return str
        str += String.fromCharCode(ch)
      }
    }

    // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
    // null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

    function stringToAscii(str, outPtr) {
      return writeAsciiToMemory(str, outPtr, false)
    }

    // Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
    // a copy of that string as a Javascript String object.

    var UTF16Decoder =
      typeof TextDecoder != "undefined"
        ? new TextDecoder("utf-16le")
        : undefined

    function UTF16ToString(ptr, maxBytesToRead) {
      var endPtr = ptr
      // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
      // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
      var idx = endPtr >> 1
      var maxIdx = idx + maxBytesToRead / 2
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx
      endPtr = idx << 1

      if (endPtr - ptr > 32 && UTF16Decoder) {
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr))
      } else {
        var str = ""

        // If maxBytesToRead is not passed explicitly, it will be undefined, and the for-loop's condition
        // will always evaluate to true. The loop is then terminated on the first null char.
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
          var codeUnit = HEAP16[(ptr + i * 2) >> 1]
          if (codeUnit == 0) break
          // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
          str += String.fromCharCode(codeUnit)
        }

        return str
      }
    }

    // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
    // null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
    // Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Parameters:
    //   str: the Javascript string to copy.
    //   outPtr: Byte address in Emscripten HEAP where to write the string to.
    //   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
    //                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
    //                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7fffffff
      }
      if (maxBytesToWrite < 2) return 0
      maxBytesToWrite -= 2 // Null terminator.
      var startPtr = outPtr
      var numCharsToWrite =
        maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length
      for (var i = 0; i < numCharsToWrite; ++i) {
        // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
        var codeUnit = str.charCodeAt(i) // possibly a lead surrogate
        HEAP16[outPtr >> 1] = codeUnit
        outPtr += 2
      }
      // Null-terminate the pointer to the HEAP.
      HEAP16[outPtr >> 1] = 0
      return outPtr - startPtr
    }

    // Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

    function lengthBytesUTF16(str) {
      return str.length * 2
    }

    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0

      var str = ""
      // If maxBytesToRead is not passed explicitly, it will be undefined, and this
      // will always evaluate to true. This saves on code size.
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[(ptr + i * 4) >> 2]
        if (utf32 == 0) break
        ++i
        // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        if (utf32 >= 0x10000) {
          var ch = utf32 - 0x10000
          str += String.fromCharCode(0xd800 | (ch >> 10), 0xdc00 | (ch & 0x3ff))
        } else {
          str += String.fromCharCode(utf32)
        }
      }
      return str
    }

    // Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
    // null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
    // Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
    // Parameters:
    //   str: the Javascript string to copy.
    //   outPtr: Byte address in Emscripten HEAP where to write the string to.
    //   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
    //                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
    //                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
    // Returns the number of bytes written, EXCLUDING the null terminator.

    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 0x7fffffff
      }
      if (maxBytesToWrite < 4) return 0
      var startPtr = outPtr
      var endPtr = startPtr + maxBytesToWrite - 4
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i) // possibly a lead surrogate
        if (codeUnit >= 0xd800 && codeUnit <= 0xdfff) {
          var trailSurrogate = str.charCodeAt(++i)
          codeUnit =
            (0x10000 + ((codeUnit & 0x3ff) << 10)) | (trailSurrogate & 0x3ff)
        }
        HEAP32[outPtr >> 2] = codeUnit
        outPtr += 4
        if (outPtr + 4 > endPtr) break
      }
      // Null-terminate the pointer to the HEAP.
      HEAP32[outPtr >> 2] = 0
      return outPtr - startPtr
    }

    // Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

    function lengthBytesUTF32(str) {
      var len = 0
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var codeUnit = str.charCodeAt(i)
        if (codeUnit >= 0xd800 && codeUnit <= 0xdfff) ++i // possibly a lead surrogate, so skip over the tail surrogate.
        len += 4
      }

      return len
    }

    // Allocate heap space for a JS string, and write it there.
    // It is the responsibility of the caller to free() that memory.
    function allocateUTF8(str) {
      var size = lengthBytesUTF8(str) + 1
      var ret = _malloc(size)
      if (ret) stringToUTF8Array(str, HEAP8, ret, size)
      return ret
    }

    // Allocate stack space for a JS string, and write it there.
    function allocateUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1
      var ret = stackAlloc(size)
      stringToUTF8Array(str, HEAP8, ret, size)
      return ret
    }

    // Deprecated: This function should not be called because it is unsafe and does not provide
    // a maximum length limit of how many bytes it is allowed to write. Prefer calling the
    // function stringToUTF8Array() instead, which takes in a maximum length that can be used
    // to be secure from out of bounds writes.
    /** @deprecated
    @param {boolean=} dontAddNull */
    function writeStringToMemory(string, buffer, dontAddNull) {
      warnOnce(
        "writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!"
      )

      var /** @type {number} */ lastChar, /** @type {number} */ end
      if (dontAddNull) {
        // stringToUTF8Array always appends null. If we don't want to do that, remember the
        // character that existed at the location where the null will be placed, and restore
        // that after the write (below).
        end = buffer + lengthBytesUTF8(string)
        lastChar = HEAP8[end]
      }
      stringToUTF8(string, buffer, Infinity)
      if (dontAddNull) HEAP8[end] = lastChar // Restore the value under the null character.
    }

    function writeArrayToMemory(array, buffer) {
      HEAP8.set(array, buffer)
    }

    /** @param {boolean=} dontAddNull */
    function writeAsciiToMemory(str, buffer, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
      }
      // Null-terminate the pointer to the HEAP.
      if (!dontAddNull) HEAP8[buffer >> 0] = 0
    }

    // end include: runtime_strings_extra.js
    // Memory management

    function alignUp(x, multiple) {
      if (x % multiple > 0) {
        x += multiple - (x % multiple)
      }
      return x
    }

    var HEAP,
      /** @type {ArrayBuffer} */
      buffer,
      /** @type {Int8Array} */
      HEAP8,
      /** @type {Uint8Array} */
      HEAPU8,
      /** @type {Int16Array} */
      HEAP16,
      /** @type {Uint16Array} */
      HEAPU16,
      /** @type {Int32Array} */
      HEAP32,
      /** @type {Uint32Array} */
      HEAPU32,
      /** @type {Float32Array} */
      HEAPF32,
      /** @type {Float64Array} */
      HEAPF64

    function updateGlobalBufferAndViews(buf) {
      buffer = buf
      Module["HEAP8"] = HEAP8 = new Int8Array(buf)
      Module["HEAP16"] = HEAP16 = new Int16Array(buf)
      Module["HEAP32"] = HEAP32 = new Int32Array(buf)
      Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf)
      Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf)
      Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf)
      Module["HEAPF32"] = HEAPF32 = new Float32Array(buf)
      Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
    }

    var TOTAL_STACK = 536870912

    var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 1073741824

    // include: runtime_init_table.js
    // In regular non-RELOCATABLE mode the table is exported
    // from the wasm module and this will be assigned once
    // the exports are available.
    var wasmTable

    // end include: runtime_init_table.js
    // include: runtime_stack_check.js

    // end include: runtime_stack_check.js
    // include: runtime_assertions.js

    // end include: runtime_assertions.js
    var __ATPRERUN__ = [] // functions called before the runtime is initialized
    var __ATINIT__ = [] // functions called during startup
    var __ATMAIN__ = [] // functions called when main() is to be run
    var __ATEXIT__ = [] // functions called during shutdown
    var __ATPOSTRUN__ = [] // functions called after the main() is called

    var runtimeInitialized = false
    var runtimeExited = false
    var runtimeKeepaliveCounter = 0

    function keepRuntimeAlive() {
      return noExitRuntime || runtimeKeepaliveCounter > 0
    }

    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function")
          Module["preRun"] = [Module["preRun"]]
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift())
        }
      }

      callRuntimeCallbacks(__ATPRERUN__)
    }

    function initRuntime() {
      runtimeInitialized = true

      SOCKFS.root = FS.mount(SOCKFS, {}, null)

      if (!Module["noFSInit"] && !FS.init.initialized) FS.init()
      FS.ignorePermissions = false

      TTY.init()
      callRuntimeCallbacks(__ATINIT__)
    }

    function preMain() {
      callRuntimeCallbacks(__ATMAIN__)
    }

    function exitRuntime() {
      runtimeExited = true
    }

    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function")
          Module["postRun"] = [Module["postRun"]]
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift())
        }
      }

      callRuntimeCallbacks(__ATPOSTRUN__)
    }

    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb)
    }

    function addOnInit(cb) {
      __ATINIT__.unshift(cb)
    }

    function addOnPreMain(cb) {
      __ATMAIN__.unshift(cb)
    }

    function addOnExit(cb) {}

    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb)
    }

    // include: runtime_math.js

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

    // end include: runtime_math.js
    // A counter of dependencies for calling run(). If we need to
    // do asynchronous work before running, increment this and
    // decrement it. Incrementing must happen in a place like
    // Module.preRun (used by emcc to add file preloading).
    // Note that you can add dependencies in preRun, even though
    // it happens right before run - run will be postponed until
    // the dependencies are met.
    var runDependencies = 0
    var runDependencyWatcher = null
    var dependenciesFulfilled = null // overridden to take different actions when all run dependencies are fulfilled

    function getUniqueRunDependency(id) {
      return id
    }

    function addRunDependency(id) {
      runDependencies++

      if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
      }
    }

    function removeRunDependency(id) {
      runDependencies--

      if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
      }

      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher)
          runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled
          dependenciesFulfilled = null
          callback() // can add another dependenciesFulfilled
        }
      }
    }

    Module["preloadedImages"] = {} // maps url to image data
    Module["preloadedAudios"] = {} // maps url to audio data

    /** @param {string|number=} what */
    function abort(what) {
      {
        if (Module["onAbort"]) {
          Module["onAbort"](what)
        }
      }

      what = "Aborted(" + what + ")"
      // TODO(sbc): Should we remove printing and leave it up to whoever
      // catches the exception?
      err(what)

      ABORT = true
      EXITSTATUS = 1

      what += ". Build with -s ASSERTIONS=1 for more info."

      // Use a wasm runtime error, because a JS error might be seen as a foreign
      // exception, which means we'd run destructors on it. We need the error to
      // simply make the program stop.

      // Suppress closure compiler warning here. Closure compiler's builtin extern
      // defintion for WebAssembly.RuntimeError claims it takes no arguments even
      // though it can.
      // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.

      /** @suppress {checkTypes} */
      var e = new WebAssembly.RuntimeError(what)

      readyPromiseReject(e)
      // Throw the error whether or not MODULARIZE is set because abort is used
      // in code paths apart from instantiation where an exception is expected
      // to be thrown when abort is called.
      throw e
    }

    // {{MEM_INITIALIZER}}

    // include: memoryprofiler.js

    // end include: memoryprofiler.js
    // include: URIUtils.js

    // Prefix of data URIs emitted by SINGLE_FILE and related options.
    var dataURIPrefix = "data:application/octet-stream;base64,"

    // Indicates whether filename is a base64 data URI.
    function isDataURI(filename) {
      // Prefix of data URIs emitted by SINGLE_FILE and related options.
      return filename.startsWith(dataURIPrefix)
    }

    // Indicates whether filename is delivered via file protocol (as opposed to http/https)
    function isFileURI(filename) {
      return filename.startsWith("file://")
    }

    // end include: URIUtils.js
    var wasmBinaryFile
    wasmBinaryFile = "falco.wasm"
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile)
    }

    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary)
        }
        if (readBinary) {
          return readBinary(file)
        } else {
          throw "both async and sync fetching of the wasm failed"
        }
      } catch (err) {
        abort(err)
      }
    }

    function getBinaryPromise() {
      // If we don't have the binary yet, try to to load it asynchronously.
      // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
      // See https://github.com/github/fetch/pull/92#issuecomment-140665932
      // Cordova or Electron apps are typically loaded from a file:// url.
      // So use fetch if it is available and the url is not a file, otherwise fall back to XHR.
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function" && !isFileURI(wasmBinaryFile)) {
          return fetch(wasmBinaryFile, { credentials: "same-origin" })
            .then(function (response) {
              if (!response["ok"]) {
                throw (
                  "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                )
              }
              return response["arrayBuffer"]()
            })
            .catch(function () {
              return getBinary(wasmBinaryFile)
            })
        } else {
          if (readAsync) {
            // fetch is not available or url is file => try XHR (readAsync uses XHR internally)
            return new Promise(function (resolve, reject) {
              readAsync(
                wasmBinaryFile,
                function (response) {
                  resolve(new Uint8Array(/** @type{!ArrayBuffer} */ (response)))
                },
                reject
              )
            })
          }
        }
      }

      // Otherwise, getBinary should be able to get it synchronously
      return Promise.resolve().then(function () {
        return getBinary(wasmBinaryFile)
      })
    }

    // Create the wasm instance.
    // Receives the wasm imports, returns the exports.
    function createWasm() {
      // prepare imports
      var info = {
        env: asmLibraryArg,
        wasi_snapshot_preview1: asmLibraryArg,
      }
      // Load the wasm module and create an instance of using native support in the JS engine.
      // handle a generated wasm instance, receiving its exports and
      // performing other necessary setup
      /** @param {WebAssembly.Module=} module*/
      function receiveInstance(instance, module) {
        var exports = instance.exports

        Module["asm"] = exports

        wasmMemory = Module["asm"]["memory"]
        updateGlobalBufferAndViews(wasmMemory.buffer)

        wasmTable = Module["asm"]["__indirect_function_table"]

        addOnInit(Module["asm"]["__wasm_call_ctors"])

        removeRunDependency("wasm-instantiate")
      }
      // we can't run yet (except in a pthread, where we have a custom sync instantiator)
      addRunDependency("wasm-instantiate")

      // Prefer streaming instantiation if available.
      function receiveInstantiationResult(result) {
        // 'result' is a ResultObject object which has both the module and instance.
        // receiveInstance() will swap in the exports (to Module.asm) so they can be called
        // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
        // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
        receiveInstance(result["instance"])
      }

      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise()
          .then(function (binary) {
            return WebAssembly.instantiate(binary, info)
          })
          .then(function (instance) {
            return instance
          })
          .then(receiver, function (reason) {
            err("failed to asynchronously prepare wasm: " + reason)

            abort(reason)
          })
      }

      function instantiateAsync() {
        if (
          !wasmBinary &&
          typeof WebAssembly.instantiateStreaming == "function" &&
          !isDataURI(wasmBinaryFile) &&
          // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
          !isFileURI(wasmBinaryFile) &&
          typeof fetch == "function"
        ) {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
            function (response) {
              // Suppress closure warning here since the upstream definition for
              // instantiateStreaming only allows Promise<Repsponse> rather than
              // an actual Response.
              // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
              /** @suppress {checkTypes} */
              var result = WebAssembly.instantiateStreaming(response, info)

              return result.then(receiveInstantiationResult, function (reason) {
                // We expect the most common failure cause to be a bad MIME type for the binary,
                // in which case falling back to ArrayBuffer instantiation should work.
                err("wasm streaming compile failed: " + reason)
                err("falling back to ArrayBuffer instantiation")
                return instantiateArrayBuffer(receiveInstantiationResult)
              })
            }
          )
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult)
        }
      }

      // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
      // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
      // to any other async startup actions they are performing.
      if (Module["instantiateWasm"]) {
        try {
          var exports = Module["instantiateWasm"](info, receiveInstance)
          return exports
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e)
          return false
        }
      }

      // If instantiation fails, reject the module ready promise.
      instantiateAsync().catch(readyPromiseReject)
      return {} // no exports yet; we'll fill them in later
    }

    // Globals used by JS i64 conversions (see makeSetValue)
    var tempDouble
    var tempI64

    // === Body ===

    var ASM_CONSTS = {}

    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        var callback = callbacks.shift()
        if (typeof callback == "function") {
          callback(Module) // Pass the module as the first argument.
          continue
        }
        var func = callback.func
        if (typeof func == "number") {
          if (callback.arg === undefined) {
            getWasmTableEntry(func)()
          } else {
            getWasmTableEntry(func)(callback.arg)
          }
        } else {
          func(callback.arg === undefined ? null : callback.arg)
        }
      }
    }

    function withStackSave(f) {
      var stack = stackSave()
      var ret = f()
      stackRestore(stack)
      return ret
    }
    function demangle(func) {
      return func
    }

    function demangleAll(text) {
      var regex = /\b_Z[\w\d_]+/g
      return text.replace(regex, function (x) {
        var y = demangle(x)
        return x === y ? x : y + " [" + x + "]"
      })
    }

    var wasmTableMirror = []
    function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr]
      if (!func) {
        if (funcPtr >= wasmTableMirror.length)
          wasmTableMirror.length = funcPtr + 1
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr)
      }
      return func
    }

    function handleException(e) {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS
      }
      quit_(1, e)
    }

    function jsStackTrace() {
      var error = new Error()
      if (!error.stack) {
        // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
        // so try that as a special-case.
        try {
          throw new Error()
        } catch (e) {
          error = e
        }
        if (!error.stack) {
          return "(no stack trace available)"
        }
      }
      return error.stack.toString()
    }

    function setWasmTableEntry(idx, func) {
      wasmTable.set(idx, func)
      wasmTableMirror[idx] = func
    }

    function stackTrace() {
      var js = jsStackTrace()
      if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]()
      return demangleAll(js)
    }

    function ___assert_fail(condition, filename, line, func) {
      abort(
        "Assertion failed: " +
          UTF8ToString(condition) +
          ", at: " +
          [
            filename ? UTF8ToString(filename) : "unknown filename",
            line,
            func ? UTF8ToString(func) : "unknown function",
          ]
      )
    }

    function ___cxa_allocate_exception(size) {
      // Thrown object is prepended by exception metadata block
      return _malloc(size + 16) + 16
    }

    /** @constructor */
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr
      this.ptr = excPtr - 16

      this.set_type = function (type) {
        HEAP32[(this.ptr + 4) >> 2] = type
      }

      this.get_type = function () {
        return HEAP32[(this.ptr + 4) >> 2]
      }

      this.set_destructor = function (destructor) {
        HEAP32[(this.ptr + 8) >> 2] = destructor
      }

      this.get_destructor = function () {
        return HEAP32[(this.ptr + 8) >> 2]
      }

      this.set_refcount = function (refcount) {
        HEAP32[this.ptr >> 2] = refcount
      }

      this.set_caught = function (caught) {
        caught = caught ? 1 : 0
        HEAP8[(this.ptr + 12) >> 0] = caught
      }

      this.get_caught = function () {
        return HEAP8[(this.ptr + 12) >> 0] != 0
      }

      this.set_rethrown = function (rethrown) {
        rethrown = rethrown ? 1 : 0
        HEAP8[(this.ptr + 13) >> 0] = rethrown
      }

      this.get_rethrown = function () {
        return HEAP8[(this.ptr + 13) >> 0] != 0
      }

      // Initialize native structure fields. Should be called once after allocated.
      this.init = function (type, destructor) {
        this.set_type(type)
        this.set_destructor(destructor)
        this.set_refcount(0)
        this.set_caught(false)
        this.set_rethrown(false)
      }

      this.add_ref = function () {
        var value = HEAP32[this.ptr >> 2]
        HEAP32[this.ptr >> 2] = value + 1
      }

      // Returns true if last reference released.
      this.release_ref = function () {
        var prev = HEAP32[this.ptr >> 2]
        HEAP32[this.ptr >> 2] = prev - 1
        return prev === 1
      }
    }

    /**
     * @constructor
     * @param {number=} ptr
     */
    function CatchInfo(ptr) {
      this.free = function () {
        _free(this.ptr)
        this.ptr = 0
      }

      this.set_base_ptr = function (basePtr) {
        HEAP32[this.ptr >> 2] = basePtr
      }

      this.get_base_ptr = function () {
        return HEAP32[this.ptr >> 2]
      }

      this.set_adjusted_ptr = function (adjustedPtr) {
        HEAP32[(this.ptr + 4) >> 2] = adjustedPtr
      }

      this.get_adjusted_ptr_addr = function () {
        return this.ptr + 4
      }

      this.get_adjusted_ptr = function () {
        return HEAP32[(this.ptr + 4) >> 2]
      }

      // Get pointer which is expected to be received by catch clause in C++ code. It may be adjusted
      // when the pointer is casted to some of the exception object base classes (e.g. when virtual
      // inheritance is used). When a pointer is thrown this method should return the thrown pointer
      // itself.
      this.get_exception_ptr = function () {
        // Work around a fastcomp bug, this code is still included for some reason in a build without
        // exceptions support.
        var isPointer = ___cxa_is_pointer_type(
          this.get_exception_info().get_type()
        )
        if (isPointer) {
          return HEAP32[this.get_base_ptr() >> 2]
        }
        var adjusted = this.get_adjusted_ptr()
        if (adjusted !== 0) return adjusted
        return this.get_base_ptr()
      }

      this.get_exception_info = function () {
        return new ExceptionInfo(this.get_base_ptr())
      }

      if (ptr === undefined) {
        this.ptr = _malloc(8)
        this.set_adjusted_ptr(0)
      } else {
        this.ptr = ptr
      }
    }

    var exceptionCaught = []

    function exception_addRef(info) {
      info.add_ref()
    }

    var uncaughtExceptionCount = 0
    function ___cxa_begin_catch(ptr) {
      var catchInfo = new CatchInfo(ptr)
      var info = catchInfo.get_exception_info()
      if (!info.get_caught()) {
        info.set_caught(true)
        uncaughtExceptionCount--
      }
      info.set_rethrown(false)
      exceptionCaught.push(catchInfo)
      exception_addRef(info)
      return catchInfo.get_exception_ptr()
    }

    function ___cxa_current_primary_exception() {
      if (!exceptionCaught.length) {
        return 0
      }
      var catchInfo = exceptionCaught[exceptionCaught.length - 1]
      exception_addRef(catchInfo.get_exception_info())
      return catchInfo.get_base_ptr()
    }

    function ___cxa_free_exception(ptr) {
      try {
        return _free(new ExceptionInfo(ptr).ptr)
      } catch (e) {}
    }
    function exception_decRef(info) {
      // A rethrown exception can reach refcount 0; it must not be discarded
      // Its next handler will clear the rethrown flag and addRef it, prior to
      // final decRef and destruction here
      if (info.release_ref() && !info.get_rethrown()) {
        var destructor = info.get_destructor()
        if (destructor) {
          // In Wasm, destructors return 'this' as in ARM
          getWasmTableEntry(destructor)(info.excPtr)
        }
        ___cxa_free_exception(info.excPtr)
      }
    }
    function ___cxa_decrement_exception_refcount(ptr) {
      if (!ptr) return
      exception_decRef(new ExceptionInfo(ptr))
    }

    var exceptionLast = 0
    function ___cxa_end_catch() {
      // Clear state flag.
      _setThrew(0)
      // Call destructor if one is registered then clear it.
      var catchInfo = exceptionCaught.pop()

      exception_decRef(catchInfo.get_exception_info())
      catchInfo.free()
      exceptionLast = 0 // XXX in decRef?
    }

    function ___resumeException(catchInfoPtr) {
      var catchInfo = new CatchInfo(catchInfoPtr)
      var ptr = catchInfo.get_base_ptr()
      if (!exceptionLast) {
        exceptionLast = ptr
      }
      catchInfo.free()
      throw ptr
    }
    function ___cxa_find_matching_catch_2() {
      var thrown = exceptionLast
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0)
        return 0 | 0
      }
      var info = new ExceptionInfo(thrown)
      var thrownType = info.get_type()
      var catchInfo = new CatchInfo()
      catchInfo.set_base_ptr(thrown)
      catchInfo.set_adjusted_ptr(thrown)
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0)
        return catchInfo.ptr | 0
      }
      var typeArray = Array.prototype.slice.call(arguments)

      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        var caughtType = typeArray[i]
        if (caughtType === 0 || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break
        }
        if (
          ___cxa_can_catch(
            caughtType,
            thrownType,
            catchInfo.get_adjusted_ptr_addr()
          )
        ) {
          setTempRet0(caughtType)
          return catchInfo.ptr | 0
        }
      }
      setTempRet0(thrownType)
      return catchInfo.ptr | 0
    }

    function ___cxa_find_matching_catch_3() {
      var thrown = exceptionLast
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0)
        return 0 | 0
      }
      var info = new ExceptionInfo(thrown)
      var thrownType = info.get_type()
      var catchInfo = new CatchInfo()
      catchInfo.set_base_ptr(thrown)
      catchInfo.set_adjusted_ptr(thrown)
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0)
        return catchInfo.ptr | 0
      }
      var typeArray = Array.prototype.slice.call(arguments)

      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        var caughtType = typeArray[i]
        if (caughtType === 0 || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break
        }
        if (
          ___cxa_can_catch(
            caughtType,
            thrownType,
            catchInfo.get_adjusted_ptr_addr()
          )
        ) {
          setTempRet0(caughtType)
          return catchInfo.ptr | 0
        }
      }
      setTempRet0(thrownType)
      return catchInfo.ptr | 0
    }

    function ___cxa_find_matching_catch_4() {
      var thrown = exceptionLast
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0)
        return 0 | 0
      }
      var info = new ExceptionInfo(thrown)
      var thrownType = info.get_type()
      var catchInfo = new CatchInfo()
      catchInfo.set_base_ptr(thrown)
      catchInfo.set_adjusted_ptr(thrown)
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0)
        return catchInfo.ptr | 0
      }
      var typeArray = Array.prototype.slice.call(arguments)

      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        var caughtType = typeArray[i]
        if (caughtType === 0 || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break
        }
        if (
          ___cxa_can_catch(
            caughtType,
            thrownType,
            catchInfo.get_adjusted_ptr_addr()
          )
        ) {
          setTempRet0(caughtType)
          return catchInfo.ptr | 0
        }
      }
      setTempRet0(thrownType)
      return catchInfo.ptr | 0
    }

    function ___cxa_find_matching_catch_5() {
      var thrown = exceptionLast
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0)
        return 0 | 0
      }
      var info = new ExceptionInfo(thrown)
      var thrownType = info.get_type()
      var catchInfo = new CatchInfo()
      catchInfo.set_base_ptr(thrown)
      catchInfo.set_adjusted_ptr(thrown)
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0)
        return catchInfo.ptr | 0
      }
      var typeArray = Array.prototype.slice.call(arguments)

      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        var caughtType = typeArray[i]
        if (caughtType === 0 || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break
        }
        if (
          ___cxa_can_catch(
            caughtType,
            thrownType,
            catchInfo.get_adjusted_ptr_addr()
          )
        ) {
          setTempRet0(caughtType)
          return catchInfo.ptr | 0
        }
      }
      setTempRet0(thrownType)
      return catchInfo.ptr | 0
    }

    function ___cxa_find_matching_catch_6() {
      var thrown = exceptionLast
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0)
        return 0 | 0
      }
      var info = new ExceptionInfo(thrown)
      var thrownType = info.get_type()
      var catchInfo = new CatchInfo()
      catchInfo.set_base_ptr(thrown)
      catchInfo.set_adjusted_ptr(thrown)
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0)
        return catchInfo.ptr | 0
      }
      var typeArray = Array.prototype.slice.call(arguments)

      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        var caughtType = typeArray[i]
        if (caughtType === 0 || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break
        }
        if (
          ___cxa_can_catch(
            caughtType,
            thrownType,
            catchInfo.get_adjusted_ptr_addr()
          )
        ) {
          setTempRet0(caughtType)
          return catchInfo.ptr | 0
        }
      }
      setTempRet0(thrownType)
      return catchInfo.ptr | 0
    }

    function ___cxa_increment_exception_refcount(ptr) {
      if (!ptr) return
      exception_addRef(new ExceptionInfo(ptr))
    }

    function ___cxa_rethrow() {
      var catchInfo = exceptionCaught.pop()
      if (!catchInfo) {
        abort("no exception to throw")
      }
      var info = catchInfo.get_exception_info()
      var ptr = catchInfo.get_base_ptr()
      if (!info.get_rethrown()) {
        // Only pop if the corresponding push was through rethrow_primary_exception
        exceptionCaught.push(catchInfo)
        info.set_rethrown(true)
        info.set_caught(false)
        uncaughtExceptionCount++
      } else {
        catchInfo.free()
      }
      exceptionLast = ptr
      throw ptr
    }

    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr)
      // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
      info.init(type, destructor)
      exceptionLast = ptr
      uncaughtExceptionCount++
      throw ptr
    }

    function ___cxa_uncaught_exceptions() {
      return uncaughtExceptionCount
    }

    function getRandomDevice() {
      if (
        typeof crypto == "object" &&
        typeof crypto["getRandomValues"] == "function"
      ) {
        // for modern web browsers
        var randomBuffer = new Uint8Array(1)
        return function () {
          crypto.getRandomValues(randomBuffer)
          return randomBuffer[0]
        }
      } else if (ENVIRONMENT_IS_NODE) {
        // for nodejs with or without crypto support included
        try {
          var crypto_module = require("crypto")
          // nodejs has crypto support
          return function () {
            return crypto_module["randomBytes"](1)[0]
          }
        } catch (e) {
          // nodejs doesn't have crypto support
        }
      }
      // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
      return function () {
        abort("randomDevice")
      }
    }

    var PATH = {
      splitPath: function (filename) {
        var splitPathRe =
          /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/
        return splitPathRe.exec(filename).slice(1)
      },
      normalizeArray: function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i]
          if (last === ".") {
            parts.splice(i, 1)
          } else if (last === "..") {
            parts.splice(i, 1)
            up++
          } else if (up) {
            parts.splice(i, 1)
            up--
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift("..")
          }
        }
        return parts
      },
      normalize: function (path) {
        var isAbsolute = path.charAt(0) === "/",
          trailingSlash = path.substr(-1) === "/"
        // Normalize the path
        path = PATH.normalizeArray(
          path.split("/").filter(function (p) {
            return !!p
          }),
          !isAbsolute
        ).join("/")
        if (!path && !isAbsolute) {
          path = "."
        }
        if (path && trailingSlash) {
          path += "/"
        }
        return (isAbsolute ? "/" : "") + path
      },
      dirname: function (path) {
        var result = PATH.splitPath(path),
          root = result[0],
          dir = result[1]
        if (!root && !dir) {
          // No dirname whatsoever
          return "."
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
      },
      basename: function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === "/") return "/"
        path = PATH.normalize(path)
        path = path.replace(/\/$/, "")
        var lastSlash = path.lastIndexOf("/")
        if (lastSlash === -1) return path
        return path.substr(lastSlash + 1)
      },
      extname: function (path) {
        return PATH.splitPath(path)[3]
      },
      join: function () {
        var paths = Array.prototype.slice.call(arguments, 0)
        return PATH.normalize(paths.join("/"))
      },
      join2: function (l, r) {
        return PATH.normalize(l + "/" + r)
      },
    }

    var PATH_FS = {
      resolve: function () {
        var resolvedPath = "",
          resolvedAbsolute = false
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = i >= 0 ? arguments[i] : FS.cwd()
          // Skip empty and invalid entries
          if (typeof path != "string") {
            throw new TypeError("Arguments to path.resolve must be strings")
          } else if (!path) {
            return "" // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + "/" + resolvedPath
          resolvedAbsolute = path.charAt(0) === "/"
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(
          resolvedPath.split("/").filter(function (p) {
            return !!p
          }),
          !resolvedAbsolute
        ).join("/")
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
      },
      relative: function (from, to) {
        from = PATH_FS.resolve(from).substr(1)
        to = PATH_FS.resolve(to).substr(1)
        function trim(arr) {
          var start = 0
          for (; start < arr.length; start++) {
            if (arr[start] !== "") break
          }
          var end = arr.length - 1
          for (; end >= 0; end--) {
            if (arr[end] !== "") break
          }
          if (start > end) return []
          return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"))
        var toParts = trim(to.split("/"))
        var length = Math.min(fromParts.length, toParts.length)
        var samePartsLength = length
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i
            break
          }
        }
        var outputParts = []
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength))
        return outputParts.join("/")
      },
    }

    var TTY = {
      ttys: [],
      init: function () {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },
      shutdown: function () {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },
      register: function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops }
        FS.registerDevice(dev, TTY.stream_ops)
      },
      stream_ops: {
        open: function (stream) {
          var tty = TTY.ttys[stream.node.rdev]
          if (!tty) {
            throw new FS.ErrnoError(43)
          }
          stream.tty = tty
          stream.seekable = false
        },
        close: function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty)
        },
        flush: function (stream) {
          stream.tty.ops.flush(stream.tty)
        },
        read: function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60)
          }
          var bytesRead = 0
          for (var i = 0; i < length; i++) {
            var result
            try {
              result = stream.tty.ops.get_char(stream.tty)
            } catch (e) {
              throw new FS.ErrnoError(29)
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6)
            }
            if (result === null || result === undefined) break
            bytesRead++
            buffer[offset + i] = result
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now()
          }
          return bytesRead
        },
        write: function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60)
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset + i])
            }
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
          if (length) {
            stream.node.timestamp = Date.now()
          }
          return i
        },
      },
      default_tty_ops: {
        get_char: function (tty) {
          if (!tty.input.length) {
            var result = null
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256
              var buf = Buffer.alloc(BUFSIZE)
              var bytesRead = 0

              try {
                bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE, -1)
              } catch (e) {
                // Cross-platform differences: on Windows, reading EOF throws an exception, but on other OSes,
                // reading EOF returns 0. Uniformize behavior by treating the EOF exception to return 0.
                if (e.toString().includes("EOF")) bytesRead = 0
                else throw e
              }

              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString("utf-8")
              } else {
                result = null
              }
            } else if (
              typeof window != "undefined" &&
              typeof window.prompt == "function"
            ) {
              // Browser.
              result = window.prompt("Input: ") // returns null on cancel
              if (result !== null) {
                result += "\n"
              }
            } else if (typeof readline == "function") {
              // Command line.
              result = readline()
              if (result !== null) {
                result += "\n"
              }
            }
            if (!result) {
              return null
            }
            tty.input = intArrayFromString(result, true)
          }
          return tty.input.shift()
        },
        put_char: function (tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0))
            tty.output = []
          } else {
            if (val != 0) tty.output.push(val) // val == 0 would cut text output off in the middle.
          }
        },
        flush: function (tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0))
            tty.output = []
          }
        },
      },
      default_tty1_ops: {
        put_char: function (tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0))
            tty.output = []
          } else {
            if (val != 0) tty.output.push(val)
          }
        },
        flush: function (tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0))
            tty.output = []
          }
        },
      },
    }

    function zeroMemory(address, size) {
      HEAPU8.fill(0, address, address + size)
    }

    function alignMemory(size, alignment) {
      return Math.ceil(size / alignment) * alignment
    }
    function mmapAlloc(size) {
      abort()
    }
    var MEMFS = {
      ops_table: null,
      mount: function (mount) {
        return MEMFS.createNode(null, "/", 16384 | 511 /* 0777 */, 0)
      },
      createNode: function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63)
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink,
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
              },
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync,
              },
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink,
              },
              stream: {},
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
              },
              stream: FS.chrdev_stream_ops,
            },
          }
        }
        var node = FS.createNode(parent, name, mode, dev)
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node
          node.stream_ops = MEMFS.ops_table.dir.stream
          node.contents = {}
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node
          node.stream_ops = MEMFS.ops_table.file.stream
          node.usedBytes = 0 // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node
          node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node
          node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now()
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node
          parent.timestamp = node.timestamp
        }
        return node
      },
      getFileDataAsTypedArray: function (node) {
        if (!node.contents) return new Uint8Array(0)
        if (node.contents.subarray)
          return node.contents.subarray(0, node.usedBytes) // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents)
      },
      expandFileStorage: function (node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0
        if (prevCapacity >= newCapacity) return // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024
        newCapacity = Math.max(
          newCapacity,
          (prevCapacity *
            (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>>
            0
        )
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256) // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents
        node.contents = new Uint8Array(newCapacity) // Allocate new storage.
        if (node.usedBytes > 0)
          node.contents.set(oldContents.subarray(0, node.usedBytes), 0) // Copy old data over to the new storage.
      },
      resizeFileStorage: function (node, newSize) {
        if (node.usedBytes == newSize) return
        if (newSize == 0) {
          node.contents = null // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0
        } else {
          var oldContents = node.contents
          node.contents = new Uint8Array(newSize) // Allocate new storage.
          if (oldContents) {
            node.contents.set(
              oldContents.subarray(0, Math.min(newSize, node.usedBytes))
            ) // Copy old data over to the new storage.
          }
          node.usedBytes = newSize
        }
      },
      node_ops: {
        getattr: function (node) {
          var attr = {}
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1
          attr.ino = node.id
          attr.mode = node.mode
          attr.nlink = 1
          attr.uid = 0
          attr.gid = 0
          attr.rdev = node.rdev
          if (FS.isDir(node.mode)) {
            attr.size = 4096
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length
          } else {
            attr.size = 0
          }
          attr.atime = new Date(node.timestamp)
          attr.mtime = new Date(node.timestamp)
          attr.ctime = new Date(node.timestamp)
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096
          attr.blocks = Math.ceil(attr.size / attr.blksize)
          return attr
        },
        setattr: function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size)
          }
        },
        lookup: function (parent, name) {
          throw FS.genericErrors[44]
        },
        mknod: function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev)
        },
        rename: function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node
            try {
              new_node = FS.lookupNode(new_dir, new_name)
            } catch (e) {}
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55)
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name]
          old_node.parent.timestamp = Date.now()
          old_node.name = new_name
          new_dir.contents[new_name] = old_node
          new_dir.timestamp = old_node.parent.timestamp
          old_node.parent = new_dir
        },
        unlink: function (parent, name) {
          delete parent.contents[name]
          parent.timestamp = Date.now()
        },
        rmdir: function (parent, name) {
          var node = FS.lookupNode(parent, name)
          for (var i in node.contents) {
            throw new FS.ErrnoError(55)
          }
          delete parent.contents[name]
          parent.timestamp = Date.now()
        },
        readdir: function (node) {
          var entries = [".", ".."]
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue
            }
            entries.push(key)
          }
          return entries
        },
        symlink: function (parent, newname, oldpath) {
          var node = MEMFS.createNode(
            parent,
            newname,
            511 /* 0777 */ | 40960,
            0
          )
          node.link = oldpath
          return node
        },
        readlink: function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28)
          }
          return node.link
        },
      },
      stream_ops: {
        read: function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents
          if (position >= stream.node.usedBytes) return 0
          var size = Math.min(stream.node.usedBytes - position, length)
          if (size > 8 && contents.subarray) {
            // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset)
          } else {
            for (var i = 0; i < size; i++)
              buffer[offset + i] = contents[position + i]
          }
          return size
        },
        write: function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0
          var node = stream.node
          node.timestamp = Date.now()

          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
            // This write is from a typed array to a typed array?
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length)
              node.usedBytes = length
              return length
            } else if (node.usedBytes === 0 && position === 0) {
              // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length)
              node.usedBytes = length
              return length
            } else if (position + length <= node.usedBytes) {
              // Writing to an already allocated and used subrange of the file?
              node.contents.set(
                buffer.subarray(offset, offset + length),
                position
              )
              return length
            }
          }

          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position + length)
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(
              buffer.subarray(offset, offset + length),
              position
            )
          } else {
            for (var i = 0; i < length; i++) {
              node.contents[position + i] = buffer[offset + i] // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length)
          return length
        },
        llseek: function (stream, offset, whence) {
          var position = offset
          if (whence === 1) {
            position += stream.position
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28)
          }
          return position
        },
        allocate: function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length)
          stream.node.usedBytes = Math.max(
            stream.node.usedBytes,
            offset + length
          )
        },
        mmap: function (stream, address, length, position, prot, flags) {
          if (address !== 0) {
            // We don't currently support location hints for the address of the mapping
            throw new FS.ErrnoError(28)
          }
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43)
          }
          var ptr
          var allocated
          var contents = stream.node.contents
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false
            ptr = contents.byteOffset
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length)
              } else {
                contents = Array.prototype.slice.call(
                  contents,
                  position,
                  position + length
                )
              }
            }
            allocated = true
            ptr = mmapAlloc(length)
            if (!ptr) {
              throw new FS.ErrnoError(48)
            }
            HEAP8.set(contents, ptr)
          }
          return { ptr: ptr, allocated: allocated }
        },
        msync: function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43)
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0
          }

          var bytesWritten = MEMFS.stream_ops.write(
            stream,
            buffer,
            0,
            length,
            offset,
            false
          )
          // should we check if bytesWritten and length are the same?
          return 0
        },
      },
    }

    /** @param {boolean=} noRunDep */
    function asyncLoad(url, onload, onerror, noRunDep) {
      var dep = !noRunDep ? getUniqueRunDependency("al " + url) : ""
      readAsync(
        url,
        function (arrayBuffer) {
          assert(
            arrayBuffer,
            'Loading data file "' + url + '" failed (no arrayBuffer).'
          )
          onload(new Uint8Array(arrayBuffer))
          if (dep) removeRunDependency(dep)
        },
        function (event) {
          if (onerror) {
            onerror()
          } else {
            throw 'Loading data file "' + url + '" failed.'
          }
        }
      )
      if (dep) addRunDependency(dep)
    }
    var FS = {
      root: null,
      mounts: [],
      devices: {},
      streams: [],
      nextInode: 1,
      nameTable: null,
      currentPath: "/",
      initialized: false,
      ignorePermissions: true,
      ErrnoError: null,
      genericErrors: {},
      filesystems: null,
      syncFSRequests: 0,
      lookupPath: (path, opts = {}) => {
        path = PATH_FS.resolve(FS.cwd(), path)

        if (!path) return { path: "", node: null }

        var defaults = {
          follow_mount: true,
          recurse_count: 0,
        }
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key]
          }
        }

        if (opts.recurse_count > 8) {
          // max recursive lookup of 8
          throw new FS.ErrnoError(32)
        }

        // split the path
        var parts = PATH.normalizeArray(
          path.split("/").filter((p) => !!p),
          false
        )

        // start at the root
        var current = FS.root
        var current_path = "/"

        for (var i = 0; i < parts.length; i++) {
          var islast = i === parts.length - 1
          if (islast && opts.parent) {
            // stop resolving
            break
          }

          current = FS.lookupNode(current, parts[i])
          current_path = PATH.join2(current_path, parts[i])

          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root
            }
          }

          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path)
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link)

              var lookup = FS.lookupPath(current_path, {
                recurse_count: opts.recurse_count,
              })
              current = lookup.node

              if (count++ > 40) {
                // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32)
              }
            }
          }
        }

        return { path: current_path, node: current }
      },
      getPath: (node) => {
        var path
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint
            if (!path) return mount
            return mount[mount.length - 1] !== "/"
              ? mount + "/" + path
              : mount + path
          }
          path = path ? node.name + "/" + path : node.name
          node = node.parent
        }
      },
      hashName: (parentid, name) => {
        var hash = 0

        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length
      },
      hashAddNode: (node) => {
        var hash = FS.hashName(node.parent.id, node.name)
        node.name_next = FS.nameTable[hash]
        FS.nameTable[hash] = node
      },
      hashRemoveNode: (node) => {
        var hash = FS.hashName(node.parent.id, node.name)
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next
        } else {
          var current = FS.nameTable[hash]
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next
              break
            }
            current = current.name_next
          }
        }
      },
      lookupNode: (parent, name) => {
        var errCode = FS.mayLookup(parent)
        if (errCode) {
          throw new FS.ErrnoError(errCode, parent)
        }
        var hash = FS.hashName(parent.id, name)
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name
          if (node.parent.id === parent.id && nodeName === name) {
            return node
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name)
      },
      createNode: (parent, name, mode, rdev) => {
        var node = new FS.FSNode(parent, name, mode, rdev)

        FS.hashAddNode(node)

        return node
      },
      destroyNode: (node) => {
        FS.hashRemoveNode(node)
      },
      isRoot: (node) => {
        return node === node.parent
      },
      isMountpoint: (node) => {
        return !!node.mounted
      },
      isFile: (mode) => {
        return (mode & 61440) === 32768
      },
      isDir: (mode) => {
        return (mode & 61440) === 16384
      },
      isLink: (mode) => {
        return (mode & 61440) === 40960
      },
      isChrdev: (mode) => {
        return (mode & 61440) === 8192
      },
      isBlkdev: (mode) => {
        return (mode & 61440) === 24576
      },
      isFIFO: (mode) => {
        return (mode & 61440) === 4096
      },
      isSocket: (mode) => {
        return (mode & 49152) === 49152
      },
      flagModes: { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 },
      modeStringToFlags: (str) => {
        var flags = FS.flagModes[str]
        if (typeof flags == "undefined") {
          throw new Error("Unknown file open mode: " + str)
        }
        return flags
      },
      flagsToPermissionString: (flag) => {
        var perms = ["r", "w", "rw"][flag & 3]
        if (flag & 512) {
          perms += "w"
        }
        return perms
      },
      nodePermissions: (node, perms) => {
        if (FS.ignorePermissions) {
          return 0
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes("r") && !(node.mode & 292)) {
          return 2
        } else if (perms.includes("w") && !(node.mode & 146)) {
          return 2
        } else if (perms.includes("x") && !(node.mode & 73)) {
          return 2
        }
        return 0
      },
      mayLookup: (dir) => {
        var errCode = FS.nodePermissions(dir, "x")
        if (errCode) return errCode
        if (!dir.node_ops.lookup) return 2
        return 0
      },
      mayCreate: (dir, name) => {
        try {
          var node = FS.lookupNode(dir, name)
          return 20
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
      },
      mayDelete: (dir, name, isdir) => {
        var node
        try {
          node = FS.lookupNode(dir, name)
        } catch (e) {
          return e.errno
        }
        var errCode = FS.nodePermissions(dir, "wx")
        if (errCode) {
          return errCode
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31
          }
        }
        return 0
      },
      mayOpen: (node, flags) => {
        if (!node) {
          return 44
        }
        if (FS.isLink(node.mode)) {
          return 32
        } else if (FS.isDir(node.mode)) {
          if (
            FS.flagsToPermissionString(flags) !== "r" || // opening for write
            flags & 512
          ) {
            // TODO: check for O_SEARCH? (== search for dir only)
            return 31
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
      },
      MAX_OPEN_FDS: 4096,
      nextfd: (fd_start = 0, fd_end = FS.MAX_OPEN_FDS) => {
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd
          }
        }
        throw new FS.ErrnoError(33)
      },
      getStream: (fd) => FS.streams[fd],
      createStream: (stream, fd_start, fd_end) => {
        if (!FS.FSStream) {
          FS.FSStream = /** @constructor */ function () {}
          FS.FSStream.prototype = {
            object: {
              get: function () {
                return this.node
              },
              set: function (val) {
                this.node = val
              },
            },
            isRead: {
              get: function () {
                return (this.flags & 2097155) !== 1
              },
            },
            isWrite: {
              get: function () {
                return (this.flags & 2097155) !== 0
              },
            },
            isAppend: {
              get: function () {
                return this.flags & 1024
              },
            },
          }
        }
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream)
        var fd = FS.nextfd(fd_start, fd_end)
        stream.fd = fd
        FS.streams[fd] = stream
        return stream
      },
      closeStream: (fd) => {
        FS.streams[fd] = null
      },
      chrdev_stream_ops: {
        open: (stream) => {
          var device = FS.getDevice(stream.node.rdev)
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
          }
        },
        llseek: () => {
          throw new FS.ErrnoError(70)
        },
      },
      major: (dev) => dev >> 8,
      minor: (dev) => dev & 0xff,
      makedev: (ma, mi) => (ma << 8) | mi,
      registerDevice: (dev, ops) => {
        FS.devices[dev] = { stream_ops: ops }
      },
      getDevice: (dev) => FS.devices[dev],
      getMounts: (mount) => {
        var mounts = []
        var check = [mount]

        while (check.length) {
          var m = check.pop()

          mounts.push(m)

          check.push.apply(check, m.mounts)
        }

        return mounts
      },
      syncfs: (populate, callback) => {
        if (typeof populate == "function") {
          callback = populate
          populate = false
        }

        FS.syncFSRequests++

        if (FS.syncFSRequests > 1) {
          err(
            "warning: " +
              FS.syncFSRequests +
              " FS.syncfs operations in flight at once, probably just doing extra work"
          )
        }

        var mounts = FS.getMounts(FS.root.mount)
        var completed = 0

        function doCallback(errCode) {
          FS.syncFSRequests--
          return callback(errCode)
        }

        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true
              return doCallback(errCode)
            }
            return
          }
          if (++completed >= mounts.length) {
            doCallback(null)
          }
        }

        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null)
          }
          mount.type.syncfs(mount, populate, done)
        })
      },
      mount: (type, opts, mountpoint) => {
        var root = mountpoint === "/"
        var pseudo = !mountpoint
        var node

        if (root && FS.root) {
          throw new FS.ErrnoError(10)
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false })

          mountpoint = lookup.path // use the absolute path
          node = lookup.node

          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
          }

          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54)
          }
        }

        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: [],
        }

        // create a root node for the fs
        var mountRoot = type.mount(mount)
        mountRoot.mount = mount
        mount.root = mountRoot

        if (root) {
          FS.root = mountRoot
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount

          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount)
          }
        }

        return mountRoot
      },
      unmount: (mountpoint) => {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false })

        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28)
        }

        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node
        var mount = node.mounted
        var mounts = FS.getMounts(mount)

        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash]

          while (current) {
            var next = current.name_next

            if (mounts.includes(current.mount)) {
              FS.destroyNode(current)
            }

            current = next
          }
        })

        // no longer a mountpoint
        node.mounted = null

        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount)
        node.mount.mounts.splice(idx, 1)
      },
      lookup: (parent, name) => {
        return parent.node_ops.lookup(parent, name)
      },
      mknod: (path, mode, dev) => {
        var lookup = FS.lookupPath(path, { parent: true })
        var parent = lookup.node
        var name = PATH.basename(path)
        if (!name || name === "." || name === "..") {
          throw new FS.ErrnoError(28)
        }
        var errCode = FS.mayCreate(parent, name)
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
      },
      create: (path, mode) => {
        mode = mode !== undefined ? mode : 438 /* 0666 */
        mode &= 4095
        mode |= 32768
        return FS.mknod(path, mode, 0)
      },
      mkdir: (path, mode) => {
        mode = mode !== undefined ? mode : 511 /* 0777 */
        mode &= 511 | 512
        mode |= 16384
        return FS.mknod(path, mode, 0)
      },
      mkdirTree: (path, mode) => {
        var dirs = path.split("/")
        var d = ""
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue
          d += "/" + dirs[i]
          try {
            FS.mkdir(d, mode)
          } catch (e) {
            if (e.errno != 20) throw e
          }
        }
      },
      mkdev: (path, mode, dev) => {
        if (typeof dev == "undefined") {
          dev = mode
          mode = 438 /* 0666 */
        }
        mode |= 8192
        return FS.mknod(path, mode, dev)
      },
      symlink: (oldpath, newpath) => {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44)
        }
        var lookup = FS.lookupPath(newpath, { parent: true })
        var parent = lookup.node
        if (!parent) {
          throw new FS.ErrnoError(44)
        }
        var newname = PATH.basename(newpath)
        var errCode = FS.mayCreate(parent, newname)
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
      },
      rename: (old_path, new_path) => {
        var old_dirname = PATH.dirname(old_path)
        var new_dirname = PATH.dirname(new_path)
        var old_name = PATH.basename(old_path)
        var new_name = PATH.basename(new_path)
        // parents must exist
        var lookup, old_dir, new_dir

        // let the errors from non existant directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true })
        old_dir = lookup.node
        lookup = FS.lookupPath(new_path, { parent: true })
        new_dir = lookup.node

        if (!old_dir || !new_dir) throw new FS.ErrnoError(44)
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75)
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name)
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname)
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(28)
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname)
        if (relative.charAt(0) !== ".") {
          throw new FS.ErrnoError(55)
        }
        // see if the new path already exists
        var new_node
        try {
          new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode)
        var errCode = FS.mayDelete(old_dir, old_name, isdir)
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node
          ? FS.mayDelete(new_dir, new_name, isdir)
          : FS.mayCreate(new_dir, new_name)
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63)
        }
        if (
          FS.isMountpoint(old_node) ||
          (new_node && FS.isMountpoint(new_node))
        ) {
          throw new FS.ErrnoError(10)
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, "w")
          if (errCode) {
            throw new FS.ErrnoError(errCode)
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node)
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
          throw e
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node)
        }
      },
      rmdir: (path) => {
        var lookup = FS.lookupPath(path, { parent: true })
        var parent = lookup.node
        var name = PATH.basename(path)
        var node = FS.lookupNode(parent, name)
        var errCode = FS.mayDelete(parent, name, true)
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10)
        }
        parent.node_ops.rmdir(parent, name)
        FS.destroyNode(node)
      },
      readdir: (path) => {
        var lookup = FS.lookupPath(path, { follow: true })
        var node = lookup.node
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54)
        }
        return node.node_ops.readdir(node)
      },
      unlink: (path) => {
        var lookup = FS.lookupPath(path, { parent: true })
        var parent = lookup.node
        if (!parent) {
          throw new FS.ErrnoError(44)
        }
        var name = PATH.basename(path)
        var node = FS.lookupNode(parent, name)
        var errCode = FS.mayDelete(parent, name, false)
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10)
        }
        parent.node_ops.unlink(parent, name)
        FS.destroyNode(node)
      },
      readlink: (path) => {
        var lookup = FS.lookupPath(path)
        var link = lookup.node
        if (!link) {
          throw new FS.ErrnoError(44)
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28)
        }
        return PATH_FS.resolve(
          FS.getPath(link.parent),
          link.node_ops.readlink(link)
        )
      },
      stat: (path, dontFollow) => {
        var lookup = FS.lookupPath(path, { follow: !dontFollow })
        var node = lookup.node
        if (!node) {
          throw new FS.ErrnoError(44)
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63)
        }
        return node.node_ops.getattr(node)
      },
      lstat: (path) => {
        return FS.stat(path, true)
      },
      chmod: (path, mode, dontFollow) => {
        var node
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow })
          node = lookup.node
        } else {
          node = path
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now(),
        })
      },
      lchmod: (path, mode) => {
        FS.chmod(path, mode, true)
      },
      fchmod: (fd, mode) => {
        var stream = FS.getStream(fd)
        if (!stream) {
          throw new FS.ErrnoError(8)
        }
        FS.chmod(stream.node, mode)
      },
      chown: (path, uid, gid, dontFollow) => {
        var node
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: !dontFollow })
          node = lookup.node
        } else {
          node = path
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now(),
          // we ignore the uid / gid for now
        })
      },
      lchown: (path, uid, gid) => {
        FS.chown(path, uid, gid, true)
      },
      fchown: (fd, uid, gid) => {
        var stream = FS.getStream(fd)
        if (!stream) {
          throw new FS.ErrnoError(8)
        }
        FS.chown(stream.node, uid, gid)
      },
      truncate: (path, len) => {
        if (len < 0) {
          throw new FS.ErrnoError(28)
        }
        var node
        if (typeof path == "string") {
          var lookup = FS.lookupPath(path, { follow: true })
          node = lookup.node
        } else {
          node = path
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63)
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31)
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28)
        }
        var errCode = FS.nodePermissions(node, "w")
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now(),
        })
      },
      ftruncate: (fd, len) => {
        var stream = FS.getStream(fd)
        if (!stream) {
          throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28)
        }
        FS.truncate(stream.node, len)
      },
      utime: (path, atime, mtime) => {
        var lookup = FS.lookupPath(path, { follow: true })
        var node = lookup.node
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime),
        })
      },
      open: (path, flags, mode, fd_start, fd_end) => {
        if (path === "") {
          throw new FS.ErrnoError(44)
        }
        flags = typeof flags == "string" ? FS.modeStringToFlags(flags) : flags
        mode = typeof mode == "undefined" ? 438 /* 0666 */ : mode
        if (flags & 64) {
          mode = (mode & 4095) | 32768
        } else {
          mode = 0
        }
        var node
        if (typeof path == "object") {
          node = path
        } else {
          path = PATH.normalize(path)
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072),
            })
            node = lookup.node
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false
        if (flags & 64) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if (flags & 128) {
              throw new FS.ErrnoError(20)
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0)
            created = true
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44)
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512
        }
        // if asked only for a directory, then this must be one
        if (flags & 65536 && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54)
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags)
          if (errCode) {
            throw new FS.ErrnoError(errCode)
          }
        }
        // do truncation if necessary
        if (flags & 512) {
          FS.truncate(node, 0)
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072)

        // register the stream with the filesystem
        var stream = FS.createStream(
          {
            node: node,
            path: FS.getPath(node), // we want the absolute path to the node
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            // used by the file family libc calls (fopen, fwrite, ferror, etc.)
            ungotten: [],
            error: false,
          },
          fd_start,
          fd_end
        )
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {}
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1
          }
        }
        return stream
      },
      close: (stream) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8)
        }
        if (stream.getdents) stream.getdents = null // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream)
          }
        } catch (e) {
          throw e
        } finally {
          FS.closeStream(stream.fd)
        }
        stream.fd = null
      },
      isClosed: (stream) => {
        return stream.fd === null
      },
      llseek: (stream, offset, whence) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8)
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70)
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence)
        stream.ungotten = []
        return stream.position
      },
      read: (stream, buffer, offset, length, position) => {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28)
        }
        var seeking = typeof position != "undefined"
        if (!seeking) {
          position = stream.position
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70)
        }
        var bytesRead = stream.stream_ops.read(
          stream,
          buffer,
          offset,
          length,
          position
        )
        if (!seeking) stream.position += bytesRead
        return bytesRead
      },
      write: (stream, buffer, offset, length, position, canOwn) => {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28)
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2)
        }
        var seeking = typeof position != "undefined"
        if (!seeking) {
          position = stream.position
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70)
        }
        var bytesWritten = stream.stream_ops.write(
          stream,
          buffer,
          offset,
          length,
          position,
          canOwn
        )
        if (!seeking) stream.position += bytesWritten
        return bytesWritten
      },
      allocate: (stream, offset, length) => {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8)
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28)
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43)
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138)
        }
        stream.stream_ops.allocate(stream, offset, length)
      },
      mmap: (stream, address, length, position, prot, flags) => {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if (
          (prot & 2) !== 0 &&
          (flags & 2) === 0 &&
          (stream.flags & 2097155) !== 2
        ) {
          throw new FS.ErrnoError(2)
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2)
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43)
        }
        return stream.stream_ops.mmap(
          stream,
          address,
          length,
          position,
          prot,
          flags
        )
      },
      msync: (stream, buffer, offset, length, mmapFlags) => {
        if (!stream || !stream.stream_ops.msync) {
          return 0
        }
        return stream.stream_ops.msync(
          stream,
          buffer,
          offset,
          length,
          mmapFlags
        )
      },
      munmap: (stream) => 0,
      ioctl: (stream, cmd, arg) => {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
      },
      readFile: (path, opts = {}) => {
        opts.flags = opts.flags || 0
        opts.encoding = opts.encoding || "binary"
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
          throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret
        var stream = FS.open(path, opts.flags)
        var stat = FS.stat(path)
        var length = stat.size
        var buf = new Uint8Array(length)
        FS.read(stream, buf, 0, length, 0)
        if (opts.encoding === "utf8") {
          ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
          ret = buf
        }
        FS.close(stream)
        return ret
      },
      writeFile: (path, data, opts = {}) => {
        opts.flags = opts.flags || 577
        var stream = FS.open(path, opts.flags, opts.mode)
        if (typeof data == "string") {
          var buf = new Uint8Array(lengthBytesUTF8(data) + 1)
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length)
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
        } else {
          throw new Error("Unsupported data type")
        }
        FS.close(stream)
      },
      cwd: () => FS.currentPath,
      chdir: (path) => {
        var lookup = FS.lookupPath(path, { follow: true })
        if (lookup.node === null) {
          throw new FS.ErrnoError(44)
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54)
        }
        var errCode = FS.nodePermissions(lookup.node, "x")
        if (errCode) {
          throw new FS.ErrnoError(errCode)
        }
        FS.currentPath = lookup.path
      },
      createDefaultDirectories: () => {
        FS.mkdir("/tmp")
        FS.mkdir("/home")
        FS.mkdir("/home/web_user")
      },
      createDefaultDevices: () => {
        // create /dev
        FS.mkdir("/dev")
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
        })
        FS.mkdev("/dev/null", FS.makedev(1, 3))
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops)
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops)
        FS.mkdev("/dev/tty", FS.makedev(5, 0))
        FS.mkdev("/dev/tty1", FS.makedev(6, 0))
        // setup /dev/[u]random
        var random_device = getRandomDevice()
        FS.createDevice("/dev", "random", random_device)
        FS.createDevice("/dev", "urandom", random_device)
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir("/dev/shm")
        FS.mkdir("/dev/shm/tmp")
      },
      createSpecialDirectories: () => {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir("/proc")
        var proc_self = FS.mkdir("/proc/self")
        FS.mkdir("/proc/self/fd")
        FS.mount(
          {
            mount: () => {
              var node = FS.createNode(
                proc_self,
                "fd",
                16384 | 511 /* 0777 */,
                73
              )
              node.node_ops = {
                lookup: (parent, name) => {
                  var fd = +name
                  var stream = FS.getStream(fd)
                  if (!stream) throw new FS.ErrnoError(8)
                  var ret = {
                    parent: null,
                    mount: { mountpoint: "fake" },
                    node_ops: { readlink: () => stream.path },
                  }
                  ret.parent = ret // make it look like a simple root node
                  return ret
                },
              }
              return node
            },
          },
          {},
          "/proc/self/fd"
        )
      },
      createStandardStreams: () => {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops

        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module["stdin"]) {
          FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
          FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
          FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
          FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
          FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
          FS.symlink("/dev/tty1", "/dev/stderr")
        }

        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open("/dev/stdin", 0)
        var stdout = FS.open("/dev/stdout", 1)
        var stderr = FS.open("/dev/stderr", 1)
      },
      ensureErrnoError: () => {
        if (FS.ErrnoError) return
        FS.ErrnoError = /** @this{Object} */ function ErrnoError(errno, node) {
          this.node = node
          this.setErrno = /** @this{Object} */ function (errno) {
            this.errno = errno
          }
          this.setErrno(errno)
          this.message = "FS error"
        }
        FS.ErrnoError.prototype = new Error()
        FS.ErrnoError.prototype.constructor = FS.ErrnoError
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        ;[44].forEach((code) => {
          FS.genericErrors[code] = new FS.ErrnoError(code)
          FS.genericErrors[code].stack = "<generic error, no stack>"
        })
      },
      staticInit: () => {
        FS.ensureErrnoError()

        FS.nameTable = new Array(4096)

        FS.mount(MEMFS, {}, "/")

        FS.createDefaultDirectories()
        FS.createDefaultDevices()
        FS.createSpecialDirectories()

        FS.filesystems = {
          MEMFS: MEMFS,
        }
      },
      init: (input, output, error) => {
        FS.init.initialized = true

        FS.ensureErrnoError()

        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module["stdin"] = input || Module["stdin"]
        Module["stdout"] = output || Module["stdout"]
        Module["stderr"] = error || Module["stderr"]

        FS.createStandardStreams()
      },
      quit: () => {
        FS.init.initialized = false
        // Call musl-internal function to close all stdio streams, so nothing is
        // left in internal buffers.
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i]
          if (!stream) {
            continue
          }
          FS.close(stream)
        }
      },
      getMode: (canRead, canWrite) => {
        var mode = 0
        if (canRead) mode |= 292 | 73
        if (canWrite) mode |= 146
        return mode
      },
      findObject: (path, dontResolveLastLink) => {
        var ret = FS.analyzePath(path, dontResolveLastLink)
        if (ret.exists) {
          return ret.object
        } else {
          return null
        }
      },
      analyzePath: (path, dontResolveLastLink) => {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink })
          path = lookup.path
        } catch (e) {}
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null,
        }
        try {
          var lookup = FS.lookupPath(path, { parent: true })
          ret.parentExists = true
          ret.parentPath = lookup.path
          ret.parentObject = lookup.node
          ret.name = PATH.basename(path)
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink })
          ret.exists = true
          ret.path = lookup.path
          ret.object = lookup.node
          ret.name = lookup.node.name
          ret.isRoot = lookup.path === "/"
        } catch (e) {
          ret.error = e.errno
        }
        return ret
      },
      createPath: (parent, path, canRead, canWrite) => {
        parent = typeof parent == "string" ? parent : FS.getPath(parent)
        var parts = path.split("/").reverse()
        while (parts.length) {
          var part = parts.pop()
          if (!part) continue
          var current = PATH.join2(parent, part)
          try {
            FS.mkdir(current)
          } catch (e) {
            // ignore EEXIST
          }
          parent = current
        }
        return current
      },
      createFile: (parent, name, properties, canRead, canWrite) => {
        var path = PATH.join2(
          typeof parent == "string" ? parent : FS.getPath(parent),
          name
        )
        var mode = FS.getMode(canRead, canWrite)
        return FS.create(path, mode)
      },
      createDataFile: (parent, name, data, canRead, canWrite, canOwn) => {
        var path = name
        if (parent) {
          parent = typeof parent == "string" ? parent : FS.getPath(parent)
          path = name ? PATH.join2(parent, name) : parent
        }
        var mode = FS.getMode(canRead, canWrite)
        var node = FS.create(path, mode)
        if (data) {
          if (typeof data == "string") {
            var arr = new Array(data.length)
            for (var i = 0, len = data.length; i < len; ++i)
              arr[i] = data.charCodeAt(i)
            data = arr
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146)
          var stream = FS.open(node, 577)
          FS.write(stream, data, 0, data.length, 0, canOwn)
          FS.close(stream)
          FS.chmod(node, mode)
        }
        return node
      },
      createDevice: (parent, name, input, output) => {
        var path = PATH.join2(
          typeof parent == "string" ? parent : FS.getPath(parent),
          name
        )
        var mode = FS.getMode(!!input, !!output)
        if (!FS.createDevice.major) FS.createDevice.major = 64
        var dev = FS.makedev(FS.createDevice.major++, 0)
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: (stream) => {
            stream.seekable = false
          },
          close: (stream) => {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10)
            }
          },
          read: (stream, buffer, offset, length, pos /* ignored */) => {
            var bytesRead = 0
            for (var i = 0; i < length; i++) {
              var result
              try {
                result = input()
              } catch (e) {
                throw new FS.ErrnoError(29)
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6)
              }
              if (result === null || result === undefined) break
              bytesRead++
              buffer[offset + i] = result
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now()
            }
            return bytesRead
          },
          write: (stream, buffer, offset, length, pos) => {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset + i])
              } catch (e) {
                throw new FS.ErrnoError(29)
              }
            }
            if (length) {
              stream.node.timestamp = Date.now()
            }
            return i
          },
        })
        return FS.mkdev(path, mode, dev)
      },
      forceLoadFile: (obj) => {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
          return true
        if (typeof XMLHttpRequest != "undefined") {
          throw new Error(
            "Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread."
          )
        } else if (read_) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(read_(obj.url), true)
            obj.usedBytes = obj.contents.length
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
        } else {
          throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
      },
      createLazyFile: (parent, name, url, canRead, canWrite) => {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        /** @constructor */
        function LazyUint8Array() {
          this.lengthKnown = false
          this.chunks = [] // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get =
          /** @this{Object} */ function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
              return undefined
            }
            var chunkOffset = idx % this.chunkSize
            var chunkNum = (idx / this.chunkSize) | 0
            return this.getter(chunkNum)[chunkOffset]
          }
        LazyUint8Array.prototype.setDataGetter =
          function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
          }
        LazyUint8Array.prototype.cacheLength =
          function LazyUint8Array_cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest()
            xhr.open("HEAD", url, false)
            xhr.send(null)
            if (
              !((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304)
            )
              throw new Error(
                "Couldn't load " + url + ". Status: " + xhr.status
              )
            var datalength = Number(xhr.getResponseHeader("Content-length"))
            var header
            var hasByteServing =
              (header = xhr.getResponseHeader("Accept-Ranges")) &&
              header === "bytes"
            var usesGzip =
              (header = xhr.getResponseHeader("Content-Encoding")) &&
              header === "gzip"

            var chunkSize = 1024 * 1024 // Chunk size in bytes

            if (!hasByteServing) chunkSize = datalength

            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to)
                throw new Error(
                  "invalid range (" +
                    from +
                    ", " +
                    to +
                    ") or no bytes requested!"
                )
              if (to > datalength - 1)
                throw new Error(
                  "only " + datalength + " bytes available! programmer error!"
                )

              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest()
              xhr.open("GET", url, false)
              if (datalength !== chunkSize)
                xhr.setRequestHeader("Range", "bytes=" + from + "-" + to)

              // Some hints to the browser that we want binary data.
              xhr.responseType = "arraybuffer"
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/plain; charset=x-user-defined")
              }

              xhr.send(null)
              if (
                !((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304)
              )
                throw new Error(
                  "Couldn't load " + url + ". Status: " + xhr.status
                )
              if (xhr.response !== undefined) {
                return new Uint8Array(
                  /** @type{Array<number>} */ (xhr.response || [])
                )
              } else {
                return intArrayFromString(xhr.responseText || "", true)
              }
            }
            var lazyArray = this
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize
              var end = (chunkNum + 1) * chunkSize - 1 // including this byte
              end = Math.min(end, datalength - 1) // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == "undefined") {
                lazyArray.chunks[chunkNum] = doXHR(start, end)
              }
              if (typeof lazyArray.chunks[chunkNum] == "undefined")
                throw new Error("doXHR failed!")
              return lazyArray.chunks[chunkNum]
            })

            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1 // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length
              chunkSize = datalength
              out(
                "LazyFiles on gzip forces download of the whole file when length is accessed"
              )
            }

            this._length = datalength
            this._chunkSize = chunkSize
            this.lengthKnown = true
          }
        if (typeof XMLHttpRequest != "undefined") {
          if (!ENVIRONMENT_IS_WORKER)
            throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc"
          var lazyArray = new LazyUint8Array()
          Object.defineProperties(lazyArray, {
            length: {
              get: /** @this{Object} */ function () {
                if (!this.lengthKnown) {
                  this.cacheLength()
                }
                return this._length
              },
            },
            chunkSize: {
              get: /** @this{Object} */ function () {
                if (!this.lengthKnown) {
                  this.cacheLength()
                }
                return this._chunkSize
              },
            },
          })

          var properties = { isDevice: false, contents: lazyArray }
        } else {
          var properties = { isDevice: false, url: url }
        }

        var node = FS.createFile(parent, name, properties, canRead, canWrite)
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents
        } else if (properties.url) {
          node.contents = null
          node.url = properties.url
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: /** @this {FSNode} */ function () {
              return this.contents.length
            },
          },
        })
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {}
        var keys = Object.keys(node.stream_ops)
        keys.forEach((key) => {
          var fn = node.stream_ops[key]
          stream_ops[key] = function forceLoadLazyFile() {
            FS.forceLoadFile(node)
            return fn.apply(null, arguments)
          }
        })
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node)
          var contents = stream.node.contents
          if (position >= contents.length) return 0
          var size = Math.min(contents.length - position, length)
          if (contents.slice) {
            // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i]
            }
          } else {
            for (var i = 0; i < size; i++) {
              // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i)
            }
          }
          return size
        }
        node.stream_ops = stream_ops
        return node
      },
      createPreloadedFile: (
        parent,
        name,
        url,
        canRead,
        canWrite,
        onload,
        onerror,
        dontCreateFile,
        canOwn,
        preFinish
      ) => {
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent
        var dep = getUniqueRunDependency("cp " + fullname) // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish()
            if (!dontCreateFile) {
              FS.createDataFile(
                parent,
                name,
                byteArray,
                canRead,
                canWrite,
                canOwn
              )
            }
            if (onload) onload()
            removeRunDependency(dep)
          }
          if (
            Browser.handledByPreloadPlugin(byteArray, fullname, finish, () => {
              if (onerror) onerror()
              removeRunDependency(dep)
            })
          ) {
            return
          }
          finish(byteArray)
        }
        addRunDependency(dep)
        if (typeof url == "string") {
          asyncLoad(url, (byteArray) => processData(byteArray), onerror)
        } else {
          processData(url)
        }
      },
      indexedDB: () => {
        return (
          window.indexedDB ||
          window.mozIndexedDB ||
          window.webkitIndexedDB ||
          window.msIndexedDB
        )
      },
      DB_NAME: () => {
        return "EM_FS_" + window.location.pathname
      },
      DB_VERSION: 20,
      DB_STORE_NAME: "FILE_DATA",
      saveFilesToDB: (paths, onload, onerror) => {
        onload = onload || (() => {})
        onerror = onerror || (() => {})
        var indexedDB = FS.indexedDB()
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
          return onerror(e)
        }
        openRequest.onupgradeneeded = () => {
          out("creating db")
          var db = openRequest.result
          db.createObjectStore(FS.DB_STORE_NAME)
        }
        openRequest.onsuccess = () => {
          var db = openRequest.result
          var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite")
          var files = transaction.objectStore(FS.DB_STORE_NAME)
          var ok = 0,
            fail = 0,
            total = paths.length
          function finish() {
            if (fail == 0) onload()
            else onerror()
          }
          paths.forEach((path) => {
            var putRequest = files.put(
              FS.analyzePath(path).object.contents,
              path
            )
            putRequest.onsuccess = () => {
              ok++
              if (ok + fail == total) finish()
            }
            putRequest.onerror = () => {
              fail++
              if (ok + fail == total) finish()
            }
          })
          transaction.onerror = onerror
        }
        openRequest.onerror = onerror
      },
      loadFilesFromDB: (paths, onload, onerror) => {
        onload = onload || (() => {})
        onerror = onerror || (() => {})
        var indexedDB = FS.indexedDB()
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
          return onerror(e)
        }
        openRequest.onupgradeneeded = onerror // no database to load from
        openRequest.onsuccess = () => {
          var db = openRequest.result
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
          } catch (e) {
            onerror(e)
            return
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME)
          var ok = 0,
            fail = 0,
            total = paths.length
          function finish() {
            if (fail == 0) onload()
            else onerror()
          }
          paths.forEach((path) => {
            var getRequest = files.get(path)
            getRequest.onsuccess = () => {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path)
              }
              FS.createDataFile(
                PATH.dirname(path),
                PATH.basename(path),
                getRequest.result,
                true,
                true,
                true
              )
              ok++
              if (ok + fail == total) finish()
            }
            getRequest.onerror = () => {
              fail++
              if (ok + fail == total) finish()
            }
          })
          transaction.onerror = onerror
        }
        openRequest.onerror = onerror
      },
    }
    var SOCKFS = {
      mount: function (mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module["websocket"] =
          Module["websocket"] && "object" === typeof Module["websocket"]
            ? Module["websocket"]
            : {}

        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module["websocket"]._callbacks = {}
        Module["websocket"]["on"] = /** @this{Object} */ function (
          event,
          callback
        ) {
          if ("function" === typeof callback) {
            this._callbacks[event] = callback
          }
          return this
        }

        Module["websocket"].emit = /** @this{Object} */ function (
          event,
          param
        ) {
          if ("function" === typeof this._callbacks[event]) {
            this._callbacks[event].call(this, param)
          }
        }

        // If debug is enabled register simple default logging callbacks for each Event.

        return FS.createNode(null, "/", 16384 | 511 /* 0777 */, 0)
      },
      createSocket: function (family, type, protocol) {
        type &= ~526336 // Some applications may pass it; it makes no sense for a single process.
        var streaming = type == 1
        if (protocol) {
          assert(streaming == (protocol == 6)) // if SOCK_STREAM, must be tcp
        }

        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops,
        }

        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname()
        var node = FS.createNode(SOCKFS.root, name, 49152, 0)
        node.sock = sock

        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: 2,
          seekable: false,
          stream_ops: SOCKFS.stream_ops,
        })

        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream

        return sock
      },
      getSocket: function (fd) {
        var stream = FS.getStream(fd)
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null
        }
        return stream.node.sock
      },
      stream_ops: {
        poll: function (stream) {
          var sock = stream.node.sock
          return sock.sock_ops.poll(sock)
        },
        ioctl: function (stream, request, varargs) {
          var sock = stream.node.sock
          return sock.sock_ops.ioctl(sock, request, varargs)
        },
        read: function (
          stream,
          buffer,
          offset,
          length,
          position /* ignored */
        ) {
          var sock = stream.node.sock
          var msg = sock.sock_ops.recvmsg(sock, length)
          if (!msg) {
            // socket is closed
            return 0
          }
          buffer.set(msg.buffer, offset)
          return msg.buffer.length
        },
        write: function (
          stream,
          buffer,
          offset,
          length,
          position /* ignored */
        ) {
          var sock = stream.node.sock
          return sock.sock_ops.sendmsg(sock, buffer, offset, length)
        },
        close: function (stream) {
          var sock = stream.node.sock
          sock.sock_ops.close(sock)
        },
      },
      nextname: function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0
        }
        return "socket[" + SOCKFS.nextname.current++ + "]"
      },
      websocket_sock_ops: {
        createPeer: function (sock, addr, port) {
          var ws

          if (typeof addr == "object") {
            ws = addr
            addr = null
            port = null
          }

          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress
              port = ws._socket.remotePort
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url)
              if (!result) {
                throw new Error(
                  "WebSocket URL must be in the format ws(s)://address:port"
                )
              }
              addr = result[1]
              port = parseInt(result[2], 10)
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig =
                Module["websocket"] && "object" === typeof Module["websocket"]

              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = "ws:#".replace("#", "//")

              if (runtimeConfig) {
                if ("string" === typeof Module["websocket"]["url"]) {
                  url = Module["websocket"]["url"] // Fetch runtime WebSocket URL config.
                }
              }

              if (url === "ws://" || url === "wss://") {
                // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split("/")
                url =
                  url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
              }

              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = "binary" // The default value is 'binary'

              if (runtimeConfig) {
                if ("string" === typeof Module["websocket"]["subprotocol"]) {
                  subProtocols = Module["websocket"]["subprotocol"] // Fetch runtime WebSocket subprotocol config.
                }
              }

              // The default WebSocket options
              var opts = undefined

              if (subProtocols !== "null") {
                // The regex trims the string (removes spaces at the beginning and end, then splits the string by
                // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
                subProtocols = subProtocols
                  .replace(/^ +| +$/g, "")
                  .split(/ *, */)

                // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
                opts = ENVIRONMENT_IS_NODE
                  ? { protocol: subProtocols.toString() }
                  : subProtocols
              }

              // some webservers (azure) does not support subprotocol header
              if (
                runtimeConfig &&
                null === Module["websocket"]["subprotocol"]
              ) {
                subProtocols = "null"
                opts = undefined
              }

              // If node we use the ws library.
              var WebSocketConstructor
              if (ENVIRONMENT_IS_NODE) {
                WebSocketConstructor = /** @type{(typeof WebSocket)} */ (
                  require("ws")
                )
              } else {
                WebSocketConstructor = WebSocket
              }
              ws = new WebSocketConstructor(url, opts)
              ws.binaryType = "arraybuffer"
            } catch (e) {
              throw new FS.ErrnoError(23)
            }
          }

          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: [],
          }

          SOCKFS.websocket_sock_ops.addPeer(sock, peer)
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer)

          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport != "undefined") {
            peer.dgram_send_queue.push(
              new Uint8Array([
                255,
                255,
                255,
                255,
                "p".charCodeAt(0),
                "o".charCodeAt(0),
                "r".charCodeAt(0),
                "t".charCodeAt(0),
                (sock.sport & 0xff00) >> 8,
                sock.sport & 0xff,
              ])
            )
          }

          return peer
        },
        getPeer: function (sock, addr, port) {
          return sock.peers[addr + ":" + port]
        },
        addPeer: function (sock, peer) {
          sock.peers[peer.addr + ":" + peer.port] = peer
        },
        removePeer: function (sock, peer) {
          delete sock.peers[peer.addr + ":" + peer.port]
        },
        handlePeerEvents: function (sock, peer) {
          var first = true

          var handleOpen = function () {
            Module["websocket"].emit("open", sock.stream.fd)

            try {
              var queued = peer.dgram_send_queue.shift()
              while (queued) {
                peer.socket.send(queued)
                queued = peer.dgram_send_queue.shift()
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close()
            }
          }

          function handleMessage(data) {
            if (typeof data == "string") {
              var encoder = new TextEncoder() // should be utf-8
              data = encoder.encode(data) // make a typed array from the string
            } else {
              assert(data.byteLength !== undefined) // must receive an ArrayBuffer
              if (data.byteLength == 0) {
                // An empty ArrayBuffer will emit a pseudo disconnect event
                // as recv/recvmsg will return zero which indicates that a socket
                // has performed a shutdown although the connection has not been disconnected yet.
                return
              } else {
                data = new Uint8Array(data) // make a typed array view on the array buffer
              }
            }

            // if this is the port message, override the peer's port with it
            var wasfirst = first
            first = false
            if (
              wasfirst &&
              data.length === 10 &&
              data[0] === 255 &&
              data[1] === 255 &&
              data[2] === 255 &&
              data[3] === 255 &&
              data[4] === "p".charCodeAt(0) &&
              data[5] === "o".charCodeAt(0) &&
              data[6] === "r".charCodeAt(0) &&
              data[7] === "t".charCodeAt(0)
            ) {
              // update the peer's port and it's key in the peer map
              var newport = (data[8] << 8) | data[9]
              SOCKFS.websocket_sock_ops.removePeer(sock, peer)
              peer.port = newport
              SOCKFS.websocket_sock_ops.addPeer(sock, peer)
              return
            }

            sock.recv_queue.push({
              addr: peer.addr,
              port: peer.port,
              data: data,
            })
            Module["websocket"].emit("message", sock.stream.fd)
          }

          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on("open", handleOpen)
            peer.socket.on("message", function (data, flags) {
              if (!flags.binary) {
                return
              }
              handleMessage(new Uint8Array(data).buffer) // copy from node Buffer -> ArrayBuffer
            })
            peer.socket.on("close", function () {
              Module["websocket"].emit("close", sock.stream.fd)
            })
            peer.socket.on("error", function (error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g.
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = 14 // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module["websocket"].emit("error", [
                sock.stream.fd,
                sock.error,
                "ECONNREFUSED: Connection refused",
              ])
              // don't throw
            })
          } else {
            peer.socket.onopen = handleOpen
            peer.socket.onclose = function () {
              Module["websocket"].emit("close", sock.stream.fd)
            }
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data)
            }
            peer.socket.onerror = function (error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = 14 // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module["websocket"].emit("error", [
                sock.stream.fd,
                sock.error,
                "ECONNREFUSED: Connection refused",
              ])
            }
          }
        },
        poll: function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? 64 | 1 : 0
          }

          var mask = 0
          var dest =
            sock.type === 1 // we only care about the socket state for connection-based sockets
              ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport)
              : null

          if (
            sock.recv_queue.length ||
            !dest || // connection-less sockets are always ready to read
            (dest && dest.socket.readyState === dest.socket.CLOSING) ||
            (dest && dest.socket.readyState === dest.socket.CLOSED)
          ) {
            // let recv return 0 once closed
            mask |= 64 | 1
          }

          if (
            !dest || // connection-less sockets are always ready to write
            (dest && dest.socket.readyState === dest.socket.OPEN)
          ) {
            mask |= 4
          }

          if (
            (dest && dest.socket.readyState === dest.socket.CLOSING) ||
            (dest && dest.socket.readyState === dest.socket.CLOSED)
          ) {
            mask |= 16
          }

          return mask
        },
        ioctl: function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length
              }
              HEAP32[arg >> 2] = bytes
              return 0
            default:
              return 28
          }
        },
        close: function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close()
            } catch (e) {}
            sock.server = null
          }
          // close any peer connections
          var peers = Object.keys(sock.peers)
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]]
            try {
              peer.socket.close()
            } catch (e) {}
            SOCKFS.websocket_sock_ops.removePeer(sock, peer)
          }
          return 0
        },
        bind: function (sock, addr, port) {
          if (
            typeof sock.saddr != "undefined" ||
            typeof sock.sport != "undefined"
          ) {
            throw new FS.ErrnoError(28) // already bound
          }
          sock.saddr = addr
          sock.sport = port
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close()
              sock.server = null
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0)
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e
              if (e.errno !== 138) throw e
            }
          }
        },
        connect: function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(138)
          }

          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }

          // early out if we're already connected / in the middle of connecting
          if (
            typeof sock.daddr != "undefined" &&
            typeof sock.dport != "undefined"
          ) {
            var dest = SOCKFS.websocket_sock_ops.getPeer(
              sock,
              sock.daddr,
              sock.dport
            )
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(7)
              } else {
                throw new FS.ErrnoError(30)
              }
            }
          }

          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
          sock.daddr = peer.addr
          sock.dport = peer.port

          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(26)
        },
        listen: function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(138)
          }
          if (sock.server) {
            throw new FS.ErrnoError(28) // already listening
          }
          var WebSocketServer = require("ws").Server
          var host = sock.saddr
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport,
            // TODO support backlog
          })
          Module["websocket"].emit("listen", sock.stream.fd) // Send Event with listen fd.

          sock.server.on("connection", function (ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(
                sock.family,
                sock.type,
                sock.protocol
              )

              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws)
              newsock.daddr = peer.addr
              newsock.dport = peer.port

              // push to queue for accept to pick up
              sock.pending.push(newsock)
              Module["websocket"].emit("connection", newsock.stream.fd)
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws)
              Module["websocket"].emit("connection", sock.stream.fd)
            }
          })
          sock.server.on("closed", function () {
            Module["websocket"].emit("close", sock.stream.fd)
            sock.server = null
          })
          sock.server.on("error", function (error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g.
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = 23 // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module["websocket"].emit("error", [
              sock.stream.fd,
              sock.error,
              "EHOSTUNREACH: Host is unreachable",
            ])
            // don't throw
          })
        },
        accept: function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(28)
          }
          var newsock = listensock.pending.shift()
          newsock.stream.flags = listensock.stream.flags
          return newsock
        },
        getname: function (sock, peer) {
          var addr, port
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(53)
            }
            addr = sock.daddr
            port = sock.dport
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0
            port = sock.sport || 0
          }
          return { addr: addr, port: port }
        },
        sendmsg: function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr
              port = sock.dport
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(17)
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr
            port = sock.dport
          }

          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port)

          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (
              !dest ||
              dest.socket.readyState === dest.socket.CLOSING ||
              dest.socket.readyState === dest.socket.CLOSED
            ) {
              throw new FS.ErrnoError(53)
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(6)
            }
          }

          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          if (ArrayBuffer.isView(buffer)) {
            offset += buffer.byteOffset
            buffer = buffer.buffer
          }

          var data
          data = buffer.slice(offset, offset + length)

          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (
                !dest ||
                dest.socket.readyState === dest.socket.CLOSING ||
                dest.socket.readyState === dest.socket.CLOSED
              ) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
              }
              dest.dgram_send_queue.push(data)
              return length
            }
          }

          try {
            // send the actual data
            dest.socket.send(data)
            return length
          } catch (e) {
            throw new FS.ErrnoError(28)
          }
        },
        recvmsg: function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(53)
          }

          var queued = sock.recv_queue.shift()
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(
                sock,
                sock.daddr,
                sock.dport
              )

              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(53)
              } else if (
                dest.socket.readyState === dest.socket.CLOSING ||
                dest.socket.readyState === dest.socket.CLOSED
              ) {
                // return null if the socket has closed
                return null
              } else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(6)
              }
            } else {
              throw new FS.ErrnoError(6)
            }
          }

          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length
          var queuedOffset = queued.data.byteOffset || 0
          var queuedBuffer = queued.data.buffer || queued.data
          var bytesRead = Math.min(length, queuedLength)
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port,
          }

          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead
            queued.data = new Uint8Array(
              queuedBuffer,
              queuedOffset + bytesRead,
              bytesRemaining
            )
            sock.recv_queue.unshift(queued)
          }

          return res
        },
      },
    }
    function getSocketFromFD(fd) {
      var socket = SOCKFS.getSocket(fd)
      if (!socket) throw new FS.ErrnoError(8)
      return socket
    }

    function setErrNo(value) {
      HEAP32[___errno_location() >> 2] = value
      return value
    }
    var Sockets = {
      BUFFER_SIZE: 10240,
      MAX_BUFFER_SIZE: 10485760,
      nextFd: 1,
      fds: {},
      nextport: 1,
      maxport: 65535,
      peer: null,
      connections: {},
      portmap: {},
      localAddr: 4261412874,
      addrPool: [
        33554442, 50331658, 67108874, 83886090, 100663306, 117440522, 134217738,
        150994954, 167772170, 184549386, 201326602, 218103818, 234881034,
      ],
    }

    function inetNtop4(addr) {
      return (
        (addr & 0xff) +
        "." +
        ((addr >> 8) & 0xff) +
        "." +
        ((addr >> 16) & 0xff) +
        "." +
        ((addr >> 24) & 0xff)
      )
    }

    function inetNtop6(ints) {
      //  ref:  http://www.ietf.org/rfc/rfc2373.txt - section 2.5.4
      //  Format for IPv4 compatible and mapped  128-bit IPv6 Addresses
      //  128-bits are split into eight 16-bit words
      //  stored in network byte order (big-endian)
      //  |                80 bits               | 16 |      32 bits        |
      //  +-----------------------------------------------------------------+
      //  |               10 bytes               |  2 |      4 bytes        |
      //  +--------------------------------------+--------------------------+
      //  +               5 words                |  1 |      2 words        |
      //  +--------------------------------------+--------------------------+
      //  |0000..............................0000|0000|    IPv4 ADDRESS     | (compatible)
      //  +--------------------------------------+----+---------------------+
      //  |0000..............................0000|FFFF|    IPv4 ADDRESS     | (mapped)
      //  +--------------------------------------+----+---------------------+
      var str = ""
      var word = 0
      var longest = 0
      var lastzero = 0
      var zstart = 0
      var len = 0
      var i = 0
      var parts = [
        ints[0] & 0xffff,
        ints[0] >> 16,
        ints[1] & 0xffff,
        ints[1] >> 16,
        ints[2] & 0xffff,
        ints[2] >> 16,
        ints[3] & 0xffff,
        ints[3] >> 16,
      ]

      // Handle IPv4-compatible, IPv4-mapped, loopback and any/unspecified addresses

      var hasipv4 = true
      var v4part = ""
      // check if the 10 high-order bytes are all zeros (first 5 words)
      for (i = 0; i < 5; i++) {
        if (parts[i] !== 0) {
          hasipv4 = false
          break
        }
      }

      if (hasipv4) {
        // low-order 32-bits store an IPv4 address (bytes 13 to 16) (last 2 words)
        v4part = inetNtop4(parts[6] | (parts[7] << 16))
        // IPv4-mapped IPv6 address if 16-bit value (bytes 11 and 12) == 0xFFFF (6th word)
        if (parts[5] === -1) {
          str = "::ffff:"
          str += v4part
          return str
        }
        // IPv4-compatible IPv6 address if 16-bit value (bytes 11 and 12) == 0x0000 (6th word)
        if (parts[5] === 0) {
          str = "::"
          //special case IPv6 addresses
          if (v4part === "0.0.0.0") v4part = "" // any/unspecified address
          if (v4part === "0.0.0.1") v4part = "1" // loopback address
          str += v4part
          return str
        }
      }

      // Handle all other IPv6 addresses

      // first run to find the longest contiguous zero words
      for (word = 0; word < 8; word++) {
        if (parts[word] === 0) {
          if (word - lastzero > 1) {
            len = 0
          }
          lastzero = word
          len++
        }
        if (len > longest) {
          longest = len
          zstart = word - longest + 1
        }
      }

      for (word = 0; word < 8; word++) {
        if (longest > 1) {
          // compress contiguous zeros - to produce "::"
          if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
            if (word === zstart) {
              str += ":"
              if (zstart === 0) str += ":" //leading zeros case
            }
            continue
          }
        }
        // converts 16-bit words from big-endian to little-endian before converting to hex string
        str += Number(_ntohs(parts[word] & 0xffff)).toString(16)
        str += word < 7 ? ":" : ""
      }
      return str
    }
    function readSockaddr(sa, salen) {
      // family / port offsets are common to both sockaddr_in and sockaddr_in6
      var family = HEAP16[sa >> 1]
      var port = _ntohs(HEAPU16[(sa + 2) >> 1])
      var addr

      switch (family) {
        case 2:
          if (salen !== 16) {
            return { errno: 28 }
          }
          addr = HEAP32[(sa + 4) >> 2]
          addr = inetNtop4(addr)
          break
        case 10:
          if (salen !== 28) {
            return { errno: 28 }
          }
          addr = [
            HEAP32[(sa + 8) >> 2],
            HEAP32[(sa + 12) >> 2],
            HEAP32[(sa + 16) >> 2],
            HEAP32[(sa + 20) >> 2],
          ]
          addr = inetNtop6(addr)
          break
        default:
          return { errno: 5 }
      }

      return { family: family, addr: addr, port: port }
    }

    function inetPton4(str) {
      var b = str.split(".")
      for (var i = 0; i < 4; i++) {
        var tmp = Number(b[i])
        if (isNaN(tmp)) return null
        b[i] = tmp
      }
      return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0
    }

    /** @suppress {checkTypes} */
    function jstoi_q(str) {
      return parseInt(str)
    }
    function inetPton6(str) {
      var words
      var w, offset, z, i
      /* http://home.deds.nl/~aeron/regex/ */
      var valid6regx =
        /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i
      var parts = []
      if (!valid6regx.test(str)) {
        return null
      }
      if (str === "::") {
        return [0, 0, 0, 0, 0, 0, 0, 0]
      }
      // Z placeholder to keep track of zeros when splitting the string on ":"
      if (str.startsWith("::")) {
        str = str.replace("::", "Z:") // leading zeros case
      } else {
        str = str.replace("::", ":Z:")
      }

      if (str.indexOf(".") > 0) {
        // parse IPv4 embedded stress
        str = str.replace(new RegExp("[.]", "g"), ":")
        words = str.split(":")
        words[words.length - 4] =
          jstoi_q(words[words.length - 4]) +
          jstoi_q(words[words.length - 3]) * 256
        words[words.length - 3] =
          jstoi_q(words[words.length - 2]) +
          jstoi_q(words[words.length - 1]) * 256
        words = words.slice(0, words.length - 2)
      } else {
        words = str.split(":")
      }

      offset = 0
      z = 0
      for (w = 0; w < words.length; w++) {
        if (typeof words[w] == "string") {
          if (words[w] === "Z") {
            // compressed zeros - write appropriate number of zero words
            for (z = 0; z < 8 - words.length + 1; z++) {
              parts[w + z] = 0
            }
            offset = z - 1
          } else {
            // parse hex to field to 16-bit value and write it in network byte-order
            parts[w + offset] = _htons(parseInt(words[w], 16))
          }
        } else {
          // parsed IPv4 words
          parts[w + offset] = words[w]
        }
      }
      return [
        (parts[1] << 16) | parts[0],
        (parts[3] << 16) | parts[2],
        (parts[5] << 16) | parts[4],
        (parts[7] << 16) | parts[6],
      ]
    }
    var DNS = {
      address_map: { id: 1, addrs: {}, names: {} },
      lookup_name: function (name) {
        // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
        var res = inetPton4(name)
        if (res !== null) {
          return name
        }
        res = inetPton6(name)
        if (res !== null) {
          return name
        }

        // See if this name is already mapped.
        var addr

        if (DNS.address_map.addrs[name]) {
          addr = DNS.address_map.addrs[name]
        } else {
          var id = DNS.address_map.id++
          assert(id < 65535, "exceeded max address mappings of 65535")

          addr = "172.29." + (id & 0xff) + "." + (id & 0xff00)

          DNS.address_map.names[addr] = name
          DNS.address_map.addrs[name] = addr
        }

        return addr
      },
      lookup_addr: function (addr) {
        if (DNS.address_map.names[addr]) {
          return DNS.address_map.names[addr]
        }

        return null
      },
    }
    /** @param {boolean=} allowNull */
    function getSocketAddress(addrp, addrlen, allowNull) {
      if (allowNull && addrp === 0) return null
      var info = readSockaddr(addrp, addrlen)
      if (info.errno) throw new FS.ErrnoError(info.errno)
      info.addr = DNS.lookup_addr(info.addr) || info.addr
      return info
    }

    var SYSCALLS = {
      DEFAULT_POLLMASK: 5,
      calculateAt: function (dirfd, path, allowEmpty) {
        if (path[0] === "/") {
          return path
        }
        // relative path
        var dir
        if (dirfd === -100) {
          dir = FS.cwd()
        } else {
          var dirstream = FS.getStream(dirfd)
          if (!dirstream) throw new FS.ErrnoError(8)
          dir = dirstream.path
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44)
          }
          return dir
        }
        return PATH.join2(dir, path)
      },
      doStat: function (func, path, buf) {
        try {
          var stat = func(path)
        } catch (e) {
          if (
            e &&
            e.node &&
            PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))
          ) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -54
          }
          throw e
        }
        HEAP32[buf >> 2] = stat.dev
        HEAP32[(buf + 4) >> 2] = 0
        HEAP32[(buf + 8) >> 2] = stat.ino
        HEAP32[(buf + 12) >> 2] = stat.mode
        HEAP32[(buf + 16) >> 2] = stat.nlink
        HEAP32[(buf + 20) >> 2] = stat.uid
        HEAP32[(buf + 24) >> 2] = stat.gid
        HEAP32[(buf + 28) >> 2] = stat.rdev
        HEAP32[(buf + 32) >> 2] = 0
        ;(tempI64 = [
          stat.size >>> 0,
          ((tempDouble = stat.size),
          +Math.abs(tempDouble) >= 1.0
            ? tempDouble > 0.0
              ? (Math.min(
                  +Math.floor(tempDouble / 4294967296.0),
                  4294967295.0
                ) |
                  0) >>>
                0
              : ~~+Math.ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                ) >>> 0
            : 0),
        ]),
          (HEAP32[(buf + 40) >> 2] = tempI64[0]),
          (HEAP32[(buf + 44) >> 2] = tempI64[1])
        HEAP32[(buf + 48) >> 2] = 4096
        HEAP32[(buf + 52) >> 2] = stat.blocks
        HEAP32[(buf + 56) >> 2] = (stat.atime.getTime() / 1000) | 0
        HEAP32[(buf + 60) >> 2] = 0
        HEAP32[(buf + 64) >> 2] = (stat.mtime.getTime() / 1000) | 0
        HEAP32[(buf + 68) >> 2] = 0
        HEAP32[(buf + 72) >> 2] = (stat.ctime.getTime() / 1000) | 0
        HEAP32[(buf + 76) >> 2] = 0
        ;(tempI64 = [
          stat.ino >>> 0,
          ((tempDouble = stat.ino),
          +Math.abs(tempDouble) >= 1.0
            ? tempDouble > 0.0
              ? (Math.min(
                  +Math.floor(tempDouble / 4294967296.0),
                  4294967295.0
                ) |
                  0) >>>
                0
              : ~~+Math.ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                ) >>> 0
            : 0),
        ]),
          (HEAP32[(buf + 80) >> 2] = tempI64[0]),
          (HEAP32[(buf + 84) >> 2] = tempI64[1])
        return 0
      },
      doMsync: function (addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len)
        FS.msync(stream, buffer, offset, len, flags)
      },
      doMkdir: function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path)
        if (path[path.length - 1] === "/")
          path = path.substr(0, path.length - 1)
        FS.mkdir(path, mode, 0)
        return 0
      },
      doMknod: function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break
          default:
            return -28
        }
        FS.mknod(path, mode, dev)
        return 0
      },
      doReadlink: function (path, buf, bufsize) {
        if (bufsize <= 0) return -28
        var ret = FS.readlink(path)

        var len = Math.min(bufsize, lengthBytesUTF8(ret))
        var endChar = HEAP8[buf + len]
        stringToUTF8(ret, buf, bufsize + 1)
        // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
        // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
        HEAP8[buf + len] = endChar

        return len
      },
      doAccess: function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -28
        }
        var lookup = FS.lookupPath(path, { follow: true })
        var node = lookup.node
        if (!node) {
          return -44
        }
        var perms = ""
        if (amode & 4) perms += "r"
        if (amode & 2) perms += "w"
        if (amode & 1) perms += "x"
        if (
          perms /* otherwise, they've just passed F_OK */ &&
          FS.nodePermissions(node, perms)
        ) {
          return -2
        }
        return 0
      },
      doDup: function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD)
        if (suggest) FS.close(suggest)
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
      },
      doReadv: function (stream, iov, iovcnt, offset) {
        var ret = 0
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(iov + i * 8) >> 2]
          var len = HEAP32[(iov + (i * 8 + 4)) >> 2]
          var curr = FS.read(stream, HEAP8, ptr, len, offset)
          if (curr < 0) return -1
          ret += curr
          if (curr < len) break // nothing more to read
        }
        return ret
      },
      doWritev: function (stream, iov, iovcnt, offset) {
        var ret = 0
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(iov + i * 8) >> 2]
          var len = HEAP32[(iov + (i * 8 + 4)) >> 2]
          var curr = FS.write(stream, HEAP8, ptr, len, offset)
          if (curr < 0) return -1
          ret += curr
        }
        return ret
      },
      varargs: undefined,
      get: function () {
        SYSCALLS.varargs += 4
        var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2]
        return ret
      },
      getStr: function (ptr) {
        var ret = UTF8ToString(ptr)
        return ret
      },
      getStreamFromFD: function (fd) {
        var stream = FS.getStream(fd)
        if (!stream) throw new FS.ErrnoError(8)
        return stream
      },
      get64: function (low, high) {
        return low
      },
    }
    function ___syscall_connect(fd, addr, addrlen) {
      try {
        var sock = getSocketFromFD(fd)
        var info = getSocketAddress(addr, addrlen)
        sock.sock_ops.connect(sock, info.addr, info.port)
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_dup(fd) {
      try {
        var old = SYSCALLS.getStreamFromFD(fd)
        return FS.open(old.path, old.flags, 0).fd
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        switch (cmd) {
          case 0: {
            var arg = SYSCALLS.get()
            if (arg < 0) {
              return -28
            }
            var newStream
            newStream = FS.open(stream.path, stream.flags, 0, arg)
            return newStream.fd
          }
          case 1:
          case 2:
            return 0 // FD_CLOEXEC makes no sense for a single process.
          case 3:
            return stream.flags
          case 4: {
            var arg = SYSCALLS.get()
            stream.flags |= arg
            return 0
          }
          case 5: /* case 5: Currently in musl F_GETLK64 has same value as F_GETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */ {
            var arg = SYSCALLS.get()
            var offset = 0
            // We're always unlocked.
            HEAP16[(arg + offset) >> 1] = 2
            return 0
          }
          case 6:
          case 7:
            /* case 6: Currently in musl F_SETLK64 has same value as F_SETLK, so omitted to avoid duplicate case blocks. If that changes, uncomment this */
            /* case 7: Currently in musl F_SETLKW64 has same value as F_SETLKW, so omitted to avoid duplicate case blocks. If that changes, uncomment this */

            return 0 // Pretend that the locking is successful.
          case 16:
          case 8:
            return -28 // These are for sockets. We don't have them fully implemented yet.
          case 9:
            // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fnctl() returns that, and we set errno ourselves.
            setErrNo(28)
            return -1
          default: {
            return -28
          }
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_fstat64(fd, buf) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        return SYSCALLS.doStat(FS.stat, stream.path, buf)
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_fstatat64(dirfd, path, buf, flags) {
      try {
        path = SYSCALLS.getStr(path)
        var nofollow = flags & 256
        var allowEmpty = flags & 4096
        flags = flags & ~4352
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty)
        return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf)
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_getcwd(buf, size) {
      try {
        if (size === 0) return -28
        var cwd = FS.cwd()
        var cwdLengthInBytes = lengthBytesUTF8(cwd)
        if (size < cwdLengthInBytes + 1) return -68
        stringToUTF8(cwd, buf, size)
        return buf
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_getdents64(fd, dirp, count) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        if (!stream.getdents) {
          stream.getdents = FS.readdir(stream.path)
        }

        var struct_size = 280
        var pos = 0
        var off = FS.llseek(stream, 0, 1)

        var idx = Math.floor(off / struct_size)

        while (idx < stream.getdents.length && pos + struct_size <= count) {
          var id
          var type
          var name = stream.getdents[idx]
          if (name === ".") {
            id = stream.node.id
            type = 4 // DT_DIR
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true })
            id = lookup.node.id
            type = 4 // DT_DIR
          } else {
            var child = FS.lookupNode(stream.node, name)
            id = child.id
            type = FS.isChrdev(child.mode)
              ? 2 // DT_CHR, character device.
              : FS.isDir(child.mode)
              ? 4 // DT_DIR, directory.
              : FS.isLink(child.mode)
              ? 10 // DT_LNK, symbolic link.
              : 8 // DT_REG, regular file.
          }
          ;(tempI64 = [
            id >>> 0,
            ((tempDouble = id),
            +Math.abs(tempDouble) >= 1.0
              ? tempDouble > 0.0
                ? (Math.min(
                    +Math.floor(tempDouble / 4294967296.0),
                    4294967295.0
                  ) |
                    0) >>>
                  0
                : ~~+Math.ceil(
                    (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                  ) >>> 0
              : 0),
          ]),
            (HEAP32[(dirp + pos) >> 2] = tempI64[0]),
            (HEAP32[(dirp + pos + 4) >> 2] = tempI64[1])
          ;(tempI64 = [
            ((idx + 1) * struct_size) >>> 0,
            ((tempDouble = (idx + 1) * struct_size),
            +Math.abs(tempDouble) >= 1.0
              ? tempDouble > 0.0
                ? (Math.min(
                    +Math.floor(tempDouble / 4294967296.0),
                    4294967295.0
                  ) |
                    0) >>>
                  0
                : ~~+Math.ceil(
                    (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                  ) >>> 0
              : 0),
          ]),
            (HEAP32[(dirp + pos + 8) >> 2] = tempI64[0]),
            (HEAP32[(dirp + pos + 12) >> 2] = tempI64[1])
          HEAP16[(dirp + pos + 16) >> 1] = 280
          HEAP8[(dirp + pos + 18) >> 0] = type
          stringToUTF8(name, dirp + pos + 19, 256)
          pos += struct_size
          idx += 1
        }
        FS.llseek(stream, idx * struct_size, 0)
        return pos
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        switch (op) {
          case 21509:
          case 21505: {
            if (!stream.tty) return -59
            return 0
          }
          case 21510:
          case 21511:
          case 21512:
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59
            return 0 // no-op, not actually adjusting terminal settings
          }
          case 21519: {
            if (!stream.tty) return -59
            var argp = SYSCALLS.get()
            HEAP32[argp >> 2] = 0
            return 0
          }
          case 21520: {
            if (!stream.tty) return -59
            return -28 // not supported
          }
          case 21531: {
            var argp = SYSCALLS.get()
            return FS.ioctl(stream, op, argp)
          }
          case 21523: {
            // TODO: in theory we should write to the winsize struct that gets
            // passed in, but for now musl doesn't read anything on it
            if (!stream.tty) return -59
            return 0
          }
          case 21524: {
            // TODO: technically, this ioctl call should change the window size.
            // but, since emscripten doesn't have any concept of a terminal window
            // yet, we'll just silently throw it away as we do TIOCGWINSZ
            if (!stream.tty) return -59
            return 0
          }
          default:
            abort("bad ioctl syscall " + op)
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_lstat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path)
        return SYSCALLS.doStat(FS.lstat, path, buf)
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_mkdir(path, mode) {
      try {
        path = SYSCALLS.getStr(path)
        return SYSCALLS.doMkdir(path, mode)
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_open(path, flags, varargs) {
      SYSCALLS.varargs = varargs
      try {
        var pathname = SYSCALLS.getStr(path)
        var mode = varargs ? SYSCALLS.get() : 0
        var stream = FS.open(pathname, flags, mode)
        return stream.fd
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path)
        FS.rmdir(path)
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
      try {
        var sock = getSocketFromFD(fd)
        var dest = getSocketAddress(addr, addr_len, true)
        if (!dest) {
          // send, no address provided
          return FS.write(sock.stream, HEAP8, message, length)
        } else {
          // sendto an address
          return sock.sock_ops.sendmsg(
            sock,
            HEAP8,
            message,
            length,
            dest.addr,
            dest.port
          )
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_socket(domain, type, protocol) {
      try {
        var sock = SOCKFS.createSocket(domain, type, protocol)
        return sock.stream.fd
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path)
        return SYSCALLS.doStat(FS.stat, path, buf)
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function ___syscall_unlink(path) {
      try {
        path = SYSCALLS.getStr(path)
        FS.unlink(path)
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return -e.errno
      }
    }

    function __dlopen_js(filename, flag) {
      abort(
        "To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking"
      )
    }

    function __dlsym_js(handle, symbol) {
      abort(
        "To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking"
      )
    }

    function __gmtime_js(time, tmPtr) {
      var date = new Date(HEAP32[time >> 2] * 1000)
      HEAP32[tmPtr >> 2] = date.getUTCSeconds()
      HEAP32[(tmPtr + 4) >> 2] = date.getUTCMinutes()
      HEAP32[(tmPtr + 8) >> 2] = date.getUTCHours()
      HEAP32[(tmPtr + 12) >> 2] = date.getUTCDate()
      HEAP32[(tmPtr + 16) >> 2] = date.getUTCMonth()
      HEAP32[(tmPtr + 20) >> 2] = date.getUTCFullYear() - 1900
      HEAP32[(tmPtr + 24) >> 2] = date.getUTCDay()
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0)
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24)) | 0
      HEAP32[(tmPtr + 28) >> 2] = yday
    }

    function __localtime_js(time, tmPtr) {
      var date = new Date(HEAP32[time >> 2] * 1000)
      HEAP32[tmPtr >> 2] = date.getSeconds()
      HEAP32[(tmPtr + 4) >> 2] = date.getMinutes()
      HEAP32[(tmPtr + 8) >> 2] = date.getHours()
      HEAP32[(tmPtr + 12) >> 2] = date.getDate()
      HEAP32[(tmPtr + 16) >> 2] = date.getMonth()
      HEAP32[(tmPtr + 20) >> 2] = date.getFullYear() - 1900
      HEAP32[(tmPtr + 24) >> 2] = date.getDay()

      var start = new Date(date.getFullYear(), 0, 1)
      var yday =
        ((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) | 0
      HEAP32[(tmPtr + 28) >> 2] = yday
      HEAP32[(tmPtr + 36) >> 2] = -(date.getTimezoneOffset() * 60)

      // Attention: DST is in December in South, and some regions don't have DST at all.
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
      var winterOffset = start.getTimezoneOffset()
      var dst =
        (summerOffset != winterOffset &&
          date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0
      HEAP32[(tmPtr + 32) >> 2] = dst
    }

    function _tzset_impl(timezone, daylight, tzname) {
      var currentYear = new Date().getFullYear()
      var winter = new Date(currentYear, 0, 1)
      var summer = new Date(currentYear, 6, 1)
      var winterOffset = winter.getTimezoneOffset()
      var summerOffset = summer.getTimezoneOffset()

      // Local standard timezone offset. Local standard time is not adjusted for daylight savings.
      // This code uses the fact that getTimezoneOffset returns a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it compares whether the output of the given date the same (Standard) or less (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset)

      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAP32[timezone >> 2] = stdTimezoneOffset * 60

      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset)

      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/)
        return match ? match[1] : "GMT"
      }
      var winterName = extractZone(winter)
      var summerName = extractZone(summer)
      var winterNamePtr = allocateUTF8(winterName)
      var summerNamePtr = allocateUTF8(summerName)
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        HEAP32[tzname >> 2] = winterNamePtr
        HEAP32[(tzname + 4) >> 2] = summerNamePtr
      } else {
        HEAP32[tzname >> 2] = summerNamePtr
        HEAP32[(tzname + 4) >> 2] = winterNamePtr
      }
    }
    function __tzset_js(timezone, daylight, tzname) {
      // TODO: Use (malleable) environment variables instead of system settings.
      if (__tzset_js.called) return
      __tzset_js.called = true
      _tzset_impl(timezone, daylight, tzname)
    }

    function _abort() {
      abort("")
    }

    function _clock() {
      if (_clock.start === undefined) _clock.start = Date.now()
      return ((Date.now() - _clock.start) * (1000000 / 1000)) | 0
    }

    var _emscripten_get_now
    if (ENVIRONMENT_IS_NODE) {
      _emscripten_get_now = () => {
        var t = process["hrtime"]()
        return t[0] * 1e3 + t[1] / 1e6
      }
    } else _emscripten_get_now = () => performance.now()
    var _emscripten_get_now_is_monotonic = true
    function _clock_gettime(clk_id, tp) {
      // int clock_gettime(clockid_t clk_id, struct timespec *tp);
      var now
      if (clk_id === 0) {
        now = Date.now()
      } else if (
        (clk_id === 1 || clk_id === 4) &&
        _emscripten_get_now_is_monotonic
      ) {
        now = _emscripten_get_now()
      } else {
        setErrNo(28)
        return -1
      }
      HEAP32[tp >> 2] = (now / 1000) | 0 // seconds
      HEAP32[(tp + 4) >> 2] = ((now % 1000) * 1000 * 1000) | 0 // nanoseconds
      return 0
    }

    function _difftime(time1, time0) {
      return time1 - time0
    }

    function _emscripten_get_heap_max() {
      return HEAPU8.length
    }

    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num)
    }

    function abortOnCannotGrowMemory(requestedSize) {
      abort("OOM")
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length
      requestedSize = requestedSize >>> 0
      abortOnCannotGrowMemory(requestedSize)
    }

    var ENV = {}

    function getExecutableName() {
      return thisProgram || "./this.program"
    }
    function getEnvStrings() {
      if (!getEnvStrings.strings) {
        // Default values.
        // Browser language detection #8751
        var lang =
          (
            (typeof navigator == "object" &&
              navigator.languages &&
              navigator.languages[0]) ||
            "C"
          ).replace("-", "_") + ".UTF-8"
        var env = {
          USER: "web_user",
          LOGNAME: "web_user",
          PATH: "/",
          PWD: "/",
          HOME: "/home/web_user",
          LANG: lang,
          _: getExecutableName(),
        }
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x]
          else env[x] = ENV[x]
        }
        var strings = []
        for (var x in env) {
          strings.push(x + "=" + env[x])
        }
        getEnvStrings.strings = strings
      }
      return getEnvStrings.strings
    }
    function _environ_get(__environ, environ_buf) {
      var bufSize = 0
      getEnvStrings().forEach(function (string, i) {
        var ptr = environ_buf + bufSize
        HEAP32[(__environ + i * 4) >> 2] = ptr
        writeAsciiToMemory(string, ptr)
        bufSize += string.length + 1
      })
      return 0
    }

    function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings()
      HEAP32[penviron_count >> 2] = strings.length
      var bufSize = 0
      strings.forEach(function (string) {
        bufSize += string.length + 1
      })
      HEAP32[penviron_buf_size >> 2] = bufSize
      return 0
    }

    function _exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      exit(status)
    }

    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        FS.close(stream)
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return e.errno
      }
    }

    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        var num = SYSCALLS.doReadv(stream, iov, iovcnt)
        HEAP32[pnum >> 2] = num
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return e.errno
      }
    }

    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        var HIGH_OFFSET = 0x100000000 // 2^32
        // use an unsigned operator on low and shift high by 32-bits
        var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0)

        var DOUBLE_LIMIT = 0x20000000000000 // 2^53
        // we also check for equality since DOUBLE_LIMIT + 1 == DOUBLE_LIMIT
        if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
          return -61
        }

        FS.llseek(stream, offset, whence)
        ;(tempI64 = [
          stream.position >>> 0,
          ((tempDouble = stream.position),
          +Math.abs(tempDouble) >= 1.0
            ? tempDouble > 0.0
              ? (Math.min(
                  +Math.floor(tempDouble / 4294967296.0),
                  4294967295.0
                ) |
                  0) >>>
                0
              : ~~+Math.ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296.0
                ) >>> 0
            : 0),
        ]),
          (HEAP32[newOffset >> 2] = tempI64[0]),
          (HEAP32[(newOffset + 4) >> 2] = tempI64[1])
        if (stream.getdents && offset === 0 && whence === 0)
          stream.getdents = null // reset readdir state
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return e.errno
      }
    }

    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd)
        var num = SYSCALLS.doWritev(stream, iov, iovcnt)
        HEAP32[pnum >> 2] = num
        return 0
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e
        return e.errno
      }
    }

    function _getTempRet0() {
      return getTempRet0()
    }

    function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
      var info = readSockaddr(sa, salen)
      if (info.errno) {
        return -6
      }
      var port = info.port
      var addr = info.addr

      var overflowed = false

      if (node && nodelen) {
        var lookup
        if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
          if (flags & 8) {
            return -2
          }
        } else {
          addr = lookup
        }
        var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen)

        if (numBytesWrittenExclNull + 1 >= nodelen) {
          overflowed = true
        }
      }

      if (serv && servlen) {
        port = "" + port
        var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen)

        if (numBytesWrittenExclNull + 1 >= servlen) {
          overflowed = true
        }
      }

      if (overflowed) {
        // Note: even when we overflow, getnameinfo() is specced to write out the truncated results.
        return -12
      }

      return 0
    }

    function _gettimeofday(ptr) {
      var now = Date.now()
      HEAP32[ptr >> 2] = (now / 1000) | 0 // seconds
      HEAP32[(ptr + 4) >> 2] = ((now % 1000) * 1000) | 0 // microseconds
      return 0
    }

    function _llvm_eh_typeid_for(type) {
      return type
    }

    function _setTempRet0(val) {
      setTempRet0(val)
    }

    function __isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    }

    function __arraySum(array, index) {
      var sum = 0
      for (var i = 0; i <= index; sum += array[i++]) {
        // no-op
      }
      return sum
    }

    var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    function __addDays(date, days) {
      var newDate = new Date(date.getTime())
      while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear())
        var currentMonth = newDate.getMonth()
        var daysInCurrentMonth = (
          leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR
        )[currentMonth]

        if (days > daysInCurrentMonth - newDate.getDate()) {
          // we spill over to next month
          days -= daysInCurrentMonth - newDate.getDate() + 1
          newDate.setDate(1)
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth + 1)
          } else {
            newDate.setMonth(0)
            newDate.setFullYear(newDate.getFullYear() + 1)
          }
        } else {
          // we stay in current month
          newDate.setDate(newDate.getDate() + days)
          return newDate
        }
      }

      return newDate
    }
    function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html

      var tm_zone = HEAP32[(tm + 40) >> 2]

      var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[(tm + 4) >> 2],
        tm_hour: HEAP32[(tm + 8) >> 2],
        tm_mday: HEAP32[(tm + 12) >> 2],
        tm_mon: HEAP32[(tm + 16) >> 2],
        tm_year: HEAP32[(tm + 20) >> 2],
        tm_wday: HEAP32[(tm + 24) >> 2],
        tm_yday: HEAP32[(tm + 28) >> 2],
        tm_isdst: HEAP32[(tm + 32) >> 2],
        tm_gmtoff: HEAP32[(tm + 36) >> 2],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : "",
      }

      var pattern = UTF8ToString(format)

      // expand format
      var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y", // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        "%D": "%m/%d/%y", // Equivalent to %m / %d / %y
        "%F": "%Y-%m-%d", // Equivalent to %Y - %m - %d
        "%h": "%b", // Equivalent to %b
        "%r": "%I:%M:%S %p", // Replaced by the time in a.m. and p.m. notation
        "%R": "%H:%M", // Replaced by the time in 24-hour notation
        "%T": "%H:%M:%S", // Replaced by the time
        "%x": "%m/%d/%y", // Replaced by the locale's appropriate date representation
        "%X": "%H:%M:%S", // Replaced by the locale's appropriate time representation
        // Modified Conversion Specifiers
        "%Ec": "%c", // Replaced by the locale's alternative appropriate date and time representation.
        "%EC": "%C", // Replaced by the name of the base year (period) in the locale's alternative representation.
        "%Ex": "%m/%d/%y", // Replaced by the locale's alternative date representation.
        "%EX": "%H:%M:%S", // Replaced by the locale's alternative time representation.
        "%Ey": "%y", // Replaced by the offset from %EC (year only) in the locale's alternative representation.
        "%EY": "%Y", // Replaced by the full alternative year representation.
        "%Od": "%d", // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading zeros if there is any alternative symbol for zero; otherwise, with leading <space> characters.
        "%Oe": "%e", // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading <space> characters.
        "%OH": "%H", // Replaced by the hour (24-hour clock) using the locale's alternative numeric symbols.
        "%OI": "%I", // Replaced by the hour (12-hour clock) using the locale's alternative numeric symbols.
        "%Om": "%m", // Replaced by the month using the locale's alternative numeric symbols.
        "%OM": "%M", // Replaced by the minutes using the locale's alternative numeric symbols.
        "%OS": "%S", // Replaced by the seconds using the locale's alternative numeric symbols.
        "%Ou": "%u", // Replaced by the weekday as a number in the locale's alternative representation (Monday=1).
        "%OU": "%U", // Replaced by the week number of the year (Sunday as the first day of the week, rules corresponding to %U ) using the locale's alternative numeric symbols.
        "%OV": "%V", // Replaced by the week number of the year (Monday as the first day of the week, rules corresponding to %V ) using the locale's alternative numeric symbols.
        "%Ow": "%w", // Replaced by the number of the weekday (Sunday=0) using the locale's alternative numeric symbols.
        "%OW": "%W", // Replaced by the week number of the year (Monday as the first day of the week) using the locale's alternative numeric symbols.
        "%Oy": "%y", // Replaced by the year (offset from %C ) using the locale's alternative numeric symbols.
      }
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(
          new RegExp(rule, "g"),
          EXPANSION_RULES_1[rule]
        )
      }

      var WEEKDAYS = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ]
      var MONTHS = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]

      function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || ""
        while (str.length < digits) {
          str = character[0] + str
        }
        return str
      }

      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0")
      }

      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : value > 0 ? 1 : 0
        }

        var compare
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
            compare = sgn(date1.getDate() - date2.getDate())
          }
        }
        return compare
      }

      function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
          case 0: // Sunday
            return new Date(janFourth.getFullYear() - 1, 11, 29)
          case 1: // Monday
            return janFourth
          case 2: // Tuesday
            return new Date(janFourth.getFullYear(), 0, 3)
          case 3: // Wednesday
            return new Date(janFourth.getFullYear(), 0, 2)
          case 4: // Thursday
            return new Date(janFourth.getFullYear(), 0, 1)
          case 5: // Friday
            return new Date(janFourth.getFullYear() - 1, 11, 31)
          case 6: // Saturday
            return new Date(janFourth.getFullYear() - 1, 11, 30)
        }
      }

      function getWeekBasedYear(date) {
        var thisDate = __addDays(
          new Date(date.tm_year + 1900, 0, 1),
          date.tm_yday
        )

        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4)
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4)

        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear)
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear)

        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
          // this date is after the start of the first week of this year
          if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
            return thisDate.getFullYear() + 1
          } else {
            return thisDate.getFullYear()
          }
        } else {
          return thisDate.getFullYear() - 1
        }
      }

      var EXPANSION_RULES_2 = {
        "%a": function (date) {
          return WEEKDAYS[date.tm_wday].substring(0, 3)
        },
        "%A": function (date) {
          return WEEKDAYS[date.tm_wday]
        },
        "%b": function (date) {
          return MONTHS[date.tm_mon].substring(0, 3)
        },
        "%B": function (date) {
          return MONTHS[date.tm_mon]
        },
        "%C": function (date) {
          var year = date.tm_year + 1900
          return leadingNulls((year / 100) | 0, 2)
        },
        "%d": function (date) {
          return leadingNulls(date.tm_mday, 2)
        },
        "%e": function (date) {
          return leadingSomething(date.tm_mday, 2, " ")
        },
        "%g": function (date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year.
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes
          // January 4th, which is also the week that includes the first Thursday of the year, and
          // is also the first week that contains at least four days in the year.
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of
          // the last week of the preceding year; thus, for Saturday 2nd January 1999,
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th,
          // or 31st is a Monday, it and any following days are part of week 1 of the following year.
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.

          return getWeekBasedYear(date).toString().substring(2)
        },
        "%G": function (date) {
          return getWeekBasedYear(date)
        },
        "%H": function (date) {
          return leadingNulls(date.tm_hour, 2)
        },
        "%I": function (date) {
          var twelveHour = date.tm_hour
          if (twelveHour == 0) twelveHour = 12
          else if (twelveHour > 12) twelveHour -= 12
          return leadingNulls(twelveHour, 2)
        },
        "%j": function (date) {
          // Day of the year (001-366)
          return leadingNulls(
            date.tm_mday +
              __arraySum(
                __isLeapYear(date.tm_year + 1900)
                  ? __MONTH_DAYS_LEAP
                  : __MONTH_DAYS_REGULAR,
                date.tm_mon - 1
              ),
            3
          )
        },
        "%m": function (date) {
          return leadingNulls(date.tm_mon + 1, 2)
        },
        "%M": function (date) {
          return leadingNulls(date.tm_min, 2)
        },
        "%n": function () {
          return "\n"
        },
        "%p": function (date) {
          if (date.tm_hour >= 0 && date.tm_hour < 12) {
            return "AM"
          } else {
            return "PM"
          }
        },
        "%S": function (date) {
          return leadingNulls(date.tm_sec, 2)
        },
        "%t": function () {
          return "\t"
        },
        "%u": function (date) {
          return date.tm_wday || 7
        },
        "%U": function (date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Sunday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year + 1900, 0, 1)
          var firstSunday =
            janFirst.getDay() === 0
              ? janFirst
              : __addDays(janFirst, 7 - janFirst.getDay())
          var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday)

          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth =
              __arraySum(
                __isLeapYear(endDate.getFullYear())
                  ? __MONTH_DAYS_LEAP
                  : __MONTH_DAYS_REGULAR,
                endDate.getMonth() - 1
              ) - 31
            var firstSundayUntilEndJanuary = 31 - firstSunday.getDate()
            var days =
              firstSundayUntilEndJanuary +
              februaryFirstUntilEndMonth +
              endDate.getDate()
            return leadingNulls(Math.ceil(days / 7), 2)
          }

          return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
        },
        "%V": function (date) {
          // Replaced by the week number of the year (Monday as the first day of the week)
          // as a decimal number [01,53]. If the week containing 1 January has four
          // or more days in the new year, then it is considered week 1.
          // Otherwise, it is the last week of the previous year, and the next week is week 1.
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4)
          var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4)

          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear)
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear)

          var endDate = __addDays(
            new Date(date.tm_year + 1900, 0, 1),
            date.tm_yday
          )

          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return "53"
          }

          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return "01"
          }

          // given date is in between CW 01..53 of this calendar year
          var daysDifference
          if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
            // first CW of this year starts last year
            daysDifference =
              date.tm_yday + 32 - firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
          }
          return leadingNulls(Math.ceil(daysDifference / 7), 2)
        },
        "%w": function (date) {
          return date.tm_wday
        },
        "%W": function (date) {
          // Replaced by the week number of the year as a decimal number [00,53].
          // The first Monday of January is the first day of week 1;
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1)
          var firstMonday =
            janFirst.getDay() === 1
              ? janFirst
              : __addDays(
                  janFirst,
                  janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1
                )
          var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday)

          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth =
              __arraySum(
                __isLeapYear(endDate.getFullYear())
                  ? __MONTH_DAYS_LEAP
                  : __MONTH_DAYS_REGULAR,
                endDate.getMonth() - 1
              ) - 31
            var firstMondayUntilEndJanuary = 31 - firstMonday.getDate()
            var days =
              firstMondayUntilEndJanuary +
              februaryFirstUntilEndMonth +
              endDate.getDate()
            return leadingNulls(Math.ceil(days / 7), 2)
          }
          return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
        },
        "%y": function (date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year + 1900).toString().substring(2)
        },
        "%Y": function (date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year + 1900
        },
        "%z": function (date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ).
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich).
          var off = date.tm_gmtoff
          var ahead = off >= 0
          off = Math.abs(off) / 60
          // convert from minutes into hhmm format (which means 60 minutes = 100 units)
          off = (off / 60) * 100 + (off % 60)
          return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
        },
        "%Z": function (date) {
          return date.tm_zone
        },
        "%%": function () {
          return "%"
        },
      }

      // Replace %% with a pair of NULLs (which cannot occur in a C string), then
      // re-inject them after processing.
      pattern = pattern.replace(/%%/g, "\0\0")
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(
            new RegExp(rule, "g"),
            EXPANSION_RULES_2[rule](date)
          )
        }
      }
      pattern = pattern.replace(/\0\0/g, "%")

      var bytes = intArrayFromString(pattern, false)
      if (bytes.length > maxsize) {
        return 0
      }

      writeArrayToMemory(bytes, s)
      return bytes.length - 1
    }

    function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm) // no locale support yet
    }

    function _system(command) {
      if (ENVIRONMENT_IS_NODE) {
        if (!command) return 1 // shell is available

        var cmdstr = UTF8ToString(command)
        if (!cmdstr.length) return 0 // this is what glibc seems to do (shell works test?)

        var cp = require("child_process")
        var ret = cp.spawnSync(cmdstr, [], { shell: true, stdio: "inherit" })

        var _W_EXITCODE = (ret, sig) => (ret << 8) | sig

        // this really only can happen if process is killed by signal
        if (ret.status === null) {
          // sadly node doesn't expose such function
          var signalToNumber = (sig) => {
            // implement only the most common ones, and fallback to SIGINT
            switch (sig) {
              case "SIGHUP":
                return 1
              case "SIGINT":
                return 2
              case "SIGQUIT":
                return 3
              case "SIGFPE":
                return 8
              case "SIGKILL":
                return 9
              case "SIGALRM":
                return 14
              case "SIGTERM":
                return 15
            }
            return 2 // SIGINT
          }
          return _W_EXITCODE(0, signalToNumber(ret.signal))
        }

        return _W_EXITCODE(ret.status, 0)
      }
      // int system(const char *command);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/system.html
      // Can't call external programs.
      if (!command) return 0 // no shell available
      setErrNo(52)
      return -1
    }

    function _time(ptr) {
      var ret = (Date.now() / 1000) | 0
      if (ptr) {
        HEAP32[ptr >> 2] = ret
      }
      return ret
    }

    var FSNode = /** @constructor */ function (parent, name, mode, rdev) {
      if (!parent) {
        parent = this // root node sets parent to itself
      }
      this.parent = parent
      this.mount = parent.mount
      this.mounted = null
      this.id = FS.nextInode++
      this.name = name
      this.mode = mode
      this.node_ops = {}
      this.stream_ops = {}
      this.rdev = rdev
    }
    var readMode = 292 /*292*/ | 73 /*73*/
    var writeMode = 146 /*146*/
    Object.defineProperties(FSNode.prototype, {
      read: {
        get: /** @this{FSNode} */ function () {
          return (this.mode & readMode) === readMode
        },
        set: /** @this{FSNode} */ function (val) {
          val ? (this.mode |= readMode) : (this.mode &= ~readMode)
        },
      },
      write: {
        get: /** @this{FSNode} */ function () {
          return (this.mode & writeMode) === writeMode
        },
        set: /** @this{FSNode} */ function (val) {
          val ? (this.mode |= writeMode) : (this.mode &= ~writeMode)
        },
      },
      isFolder: {
        get: /** @this{FSNode} */ function () {
          return FS.isDir(this.mode)
        },
      },
      isDevice: {
        get: /** @this{FSNode} */ function () {
          return FS.isChrdev(this.mode)
        },
      },
    })
    FS.FSNode = FSNode
    FS.staticInit()
    var ASSERTIONS = false

    /** @type {function(string, boolean=, number=)} */
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1
      var u8array = new Array(len)
      var numBytesWritten = stringToUTF8Array(
        stringy,
        u8array,
        0,
        u8array.length
      )
      if (dontAddNull) u8array.length = numBytesWritten
      return u8array
    }

    function intArrayToString(array) {
      var ret = []
      for (var i = 0; i < array.length; i++) {
        var chr = array[i]
        if (chr > 0xff) {
          if (ASSERTIONS) {
            assert(
              false,
              "Character code " +
                chr +
                " (" +
                String.fromCharCode(chr) +
                ")  at offset " +
                i +
                " not in 0x00-0xFF."
            )
          }
          chr &= 0xff
        }
        ret.push(String.fromCharCode(chr))
      }
      return ret.join("")
    }

    var asmLibraryArg = {
      __assert_fail: ___assert_fail,
      __cxa_allocate_exception: ___cxa_allocate_exception,
      __cxa_begin_catch: ___cxa_begin_catch,
      __cxa_current_primary_exception: ___cxa_current_primary_exception,
      __cxa_decrement_exception_refcount: ___cxa_decrement_exception_refcount,
      __cxa_end_catch: ___cxa_end_catch,
      __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2,
      __cxa_find_matching_catch_3: ___cxa_find_matching_catch_3,
      __cxa_find_matching_catch_4: ___cxa_find_matching_catch_4,
      __cxa_find_matching_catch_5: ___cxa_find_matching_catch_5,
      __cxa_find_matching_catch_6: ___cxa_find_matching_catch_6,
      __cxa_free_exception: ___cxa_free_exception,
      __cxa_increment_exception_refcount: ___cxa_increment_exception_refcount,
      __cxa_rethrow: ___cxa_rethrow,
      __cxa_throw: ___cxa_throw,
      __cxa_uncaught_exceptions: ___cxa_uncaught_exceptions,
      __resumeException: ___resumeException,
      __syscall_connect: ___syscall_connect,
      __syscall_dup: ___syscall_dup,
      __syscall_fcntl64: ___syscall_fcntl64,
      __syscall_fstat64: ___syscall_fstat64,
      __syscall_fstatat64: ___syscall_fstatat64,
      __syscall_getcwd: ___syscall_getcwd,
      __syscall_getdents64: ___syscall_getdents64,
      __syscall_ioctl: ___syscall_ioctl,
      __syscall_lstat64: ___syscall_lstat64,
      __syscall_mkdir: ___syscall_mkdir,
      __syscall_open: ___syscall_open,
      __syscall_rmdir: ___syscall_rmdir,
      __syscall_sendto: ___syscall_sendto,
      __syscall_socket: ___syscall_socket,
      __syscall_stat64: ___syscall_stat64,
      __syscall_unlink: ___syscall_unlink,
      _dlopen_js: __dlopen_js,
      _dlsym_js: __dlsym_js,
      _gmtime_js: __gmtime_js,
      _localtime_js: __localtime_js,
      _tzset_js: __tzset_js,
      abort: _abort,
      clock: _clock,
      clock_gettime: _clock_gettime,
      difftime: _difftime,
      emscripten_get_heap_max: _emscripten_get_heap_max,
      emscripten_get_now: _emscripten_get_now,
      emscripten_memcpy_big: _emscripten_memcpy_big,
      emscripten_resize_heap: _emscripten_resize_heap,
      environ_get: _environ_get,
      environ_sizes_get: _environ_sizes_get,
      exit: _exit,
      fd_close: _fd_close,
      fd_read: _fd_read,
      fd_seek: _fd_seek,
      fd_write: _fd_write,
      getTempRet0: _getTempRet0,
      getnameinfo: _getnameinfo,
      gettimeofday: _gettimeofday,
      invoke_di: invoke_di,
      invoke_diii: invoke_diii,
      invoke_fiii: invoke_fiii,
      invoke_i: invoke_i,
      invoke_ii: invoke_ii,
      invoke_iidj: invoke_iidj,
      invoke_iii: invoke_iii,
      invoke_iiii: invoke_iiii,
      invoke_iiiii: invoke_iiiii,
      invoke_iiiiii: invoke_iiiiii,
      invoke_iiiiiii: invoke_iiiiiii,
      invoke_iiiiiiii: invoke_iiiiiiii,
      invoke_iiiiiiiiiii: invoke_iiiiiiiiiii,
      invoke_iiiiiiiiiiii: invoke_iiiiiiiiiiii,
      invoke_iiiiiiiiiiiii: invoke_iiiiiiiiiiiii,
      invoke_iiiiiiiiiiiiiii: invoke_iiiiiiiiiiiiiii,
      invoke_iiijiii: invoke_iiijiii,
      invoke_iiijiiiiii: invoke_iiijiiiiii,
      invoke_iij: invoke_iij,
      invoke_iiji: invoke_iiji,
      invoke_iijii: invoke_iijii,
      invoke_j: invoke_j,
      invoke_ji: invoke_ji,
      invoke_jii: invoke_jii,
      invoke_jiii: invoke_jiii,
      invoke_jiiii: invoke_jiiii,
      invoke_v: invoke_v,
      invoke_vi: invoke_vi,
      invoke_viddj: invoke_viddj,
      invoke_vii: invoke_vii,
      invoke_viid: invoke_viid,
      invoke_viii: invoke_viii,
      invoke_viiii: invoke_viiii,
      invoke_viiiidddi: invoke_viiiidddi,
      invoke_viiiii: invoke_viiiii,
      invoke_viiiiii: invoke_viiiiii,
      invoke_viiiiiii: invoke_viiiiiii,
      invoke_viiiiiiiii: invoke_viiiiiiiii,
      invoke_viiiiiiiiii: invoke_viiiiiiiiii,
      invoke_viiiiiiiiiiii: invoke_viiiiiiiiiiii,
      invoke_viiiiiiiiiiiiiii: invoke_viiiiiiiiiiiiiii,
      invoke_viiij: invoke_viiij,
      invoke_viiijijd: invoke_viiijijd,
      invoke_viij: invoke_viij,
      invoke_viiji: invoke_viiji,
      invoke_viijii: invoke_viijii,
      invoke_vij: invoke_vij,
      invoke_viji: invoke_viji,
      invoke_vijiiii: invoke_vijiiii,
      invoke_vji: invoke_vji,
      invoke_vjiii: invoke_vjiii,
      llvm_eh_typeid_for: _llvm_eh_typeid_for,
      setTempRet0: _setTempRet0,
      strftime: _strftime,
      strftime_l: _strftime_l,
      system: _system,
      time: _time,
    }
    var asm = createWasm()
    /** @type {function(...*):?} */
    var ___wasm_call_ctors = (Module["___wasm_call_ctors"] = function () {
      return (___wasm_call_ctors = Module["___wasm_call_ctors"] =
        Module["asm"]["__wasm_call_ctors"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var _main = (Module["_main"] = function () {
      return (_main = Module["_main"] = Module["asm"]["main"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var ___errno_location = (Module["___errno_location"] = function () {
      return (___errno_location = Module["___errno_location"] =
        Module["asm"]["__errno_location"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var _htons = (Module["_htons"] = function () {
      return (_htons = Module["_htons"] = Module["asm"]["htons"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var _malloc = (Module["_malloc"] = function () {
      return (_malloc = Module["_malloc"] = Module["asm"]["malloc"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var _free = (Module["_free"] = function () {
      return (_free = Module["_free"] = Module["asm"]["free"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var _ntohs = (Module["_ntohs"] = function () {
      return (_ntohs = Module["_ntohs"] = Module["asm"]["ntohs"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var ___dl_seterr = (Module["___dl_seterr"] = function () {
      return (___dl_seterr = Module["___dl_seterr"] =
        Module["asm"]["__dl_seterr"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var _emscripten_main_thread_process_queued_calls = (Module[
      "_emscripten_main_thread_process_queued_calls"
    ] = function () {
      return (_emscripten_main_thread_process_queued_calls = Module[
        "_emscripten_main_thread_process_queued_calls"
      ] =
        Module["asm"]["emscripten_main_thread_process_queued_calls"]).apply(
        null,
        arguments
      )
    })

    /** @type {function(...*):?} */
    var _setThrew = (Module["_setThrew"] = function () {
      return (_setThrew = Module["_setThrew"] =
        Module["asm"]["setThrew"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var stackSave = (Module["stackSave"] = function () {
      return (stackSave = Module["stackSave"] =
        Module["asm"]["stackSave"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var stackRestore = (Module["stackRestore"] = function () {
      return (stackRestore = Module["stackRestore"] =
        Module["asm"]["stackRestore"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var stackAlloc = (Module["stackAlloc"] = function () {
      return (stackAlloc = Module["stackAlloc"] =
        Module["asm"]["stackAlloc"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var ___cxa_can_catch = (Module["___cxa_can_catch"] = function () {
      return (___cxa_can_catch = Module["___cxa_can_catch"] =
        Module["asm"]["__cxa_can_catch"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var ___cxa_is_pointer_type = (Module["___cxa_is_pointer_type"] =
      function () {
        return (___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] =
          Module["asm"]["__cxa_is_pointer_type"]).apply(null, arguments)
      })

    /** @type {function(...*):?} */
    var dynCall_ji = (Module["dynCall_ji"] = function () {
      return (dynCall_ji = Module["dynCall_ji"] =
        Module["asm"]["dynCall_ji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_vij = (Module["dynCall_vij"] = function () {
      return (dynCall_vij = Module["dynCall_vij"] =
        Module["asm"]["dynCall_vij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viddj = (Module["dynCall_viddj"] = function () {
      return (dynCall_viddj = Module["dynCall_viddj"] =
        Module["asm"]["dynCall_viddj"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_vjiii = (Module["dynCall_vjiii"] = function () {
      return (dynCall_vjiii = Module["dynCall_vjiii"] =
        Module["asm"]["dynCall_vjiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_vijiiii = (Module["dynCall_vijiiii"] = function () {
      return (dynCall_vijiiii = Module["dynCall_vijiiii"] =
        Module["asm"]["dynCall_vijiiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viiij = (Module["dynCall_viiij"] = function () {
      return (dynCall_viiij = Module["dynCall_viiij"] =
        Module["asm"]["dynCall_viiij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iidj = (Module["dynCall_iidj"] = function () {
      return (dynCall_iidj = Module["dynCall_iidj"] =
        Module["asm"]["dynCall_iidj"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iijii = (Module["dynCall_iijii"] = function () {
      return (dynCall_iijii = Module["dynCall_iijii"] =
        Module["asm"]["dynCall_iijii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viiijijd = (Module["dynCall_viiijijd"] = function () {
      return (dynCall_viiijijd = Module["dynCall_viiijijd"] =
        Module["asm"]["dynCall_viiijijd"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_jiii = (Module["dynCall_jiii"] = function () {
      return (dynCall_jiii = Module["dynCall_jiii"] =
        Module["asm"]["dynCall_jiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_jii = (Module["dynCall_jii"] = function () {
      return (dynCall_jii = Module["dynCall_jii"] =
        Module["asm"]["dynCall_jii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viij = (Module["dynCall_viij"] = function () {
      return (dynCall_viij = Module["dynCall_viij"] =
        Module["asm"]["dynCall_viij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iij = (Module["dynCall_iij"] = function () {
      return (dynCall_iij = Module["dynCall_iij"] =
        Module["asm"]["dynCall_iij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_j = (Module["dynCall_j"] = function () {
      return (dynCall_j = Module["dynCall_j"] =
        Module["asm"]["dynCall_j"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viiji = (Module["dynCall_viiji"] = function () {
      return (dynCall_viiji = Module["dynCall_viiji"] =
        Module["asm"]["dynCall_viiji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_vji = (Module["dynCall_vji"] = function () {
      return (dynCall_vji = Module["dynCall_vji"] =
        Module["asm"]["dynCall_vji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiji = (Module["dynCall_iiji"] = function () {
      return (dynCall_iiji = Module["dynCall_iiji"] =
        Module["asm"]["dynCall_iiji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiijiiiiii = (Module["dynCall_iiijiiiiii"] = function () {
      return (dynCall_iiijiiiiii = Module["dynCall_iiijiiiiii"] =
        Module["asm"]["dynCall_iiijiiiiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiijiii = (Module["dynCall_iiijiii"] = function () {
      return (dynCall_iiijiii = Module["dynCall_iiijiii"] =
        Module["asm"]["dynCall_iiijiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_vijii = (Module["dynCall_vijii"] = function () {
      return (dynCall_vijii = Module["dynCall_vijii"] =
        Module["asm"]["dynCall_vijii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viji = (Module["dynCall_viji"] = function () {
      return (dynCall_viji = Module["dynCall_viji"] =
        Module["asm"]["dynCall_viji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_jiji = (Module["dynCall_jiji"] = function () {
      return (dynCall_jiji = Module["dynCall_jiji"] =
        Module["asm"]["dynCall_jiji"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiiij = (Module["dynCall_iiiij"] = function () {
      return (dynCall_iiiij = Module["dynCall_iiiij"] =
        Module["asm"]["dynCall_iiiij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_viijii = (Module["dynCall_viijii"] = function () {
      return (dynCall_viijii = Module["dynCall_viijii"] =
        Module["asm"]["dynCall_viijii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_jiiii = (Module["dynCall_jiiii"] = function () {
      return (dynCall_jiiii = Module["dynCall_jiiii"] =
        Module["asm"]["dynCall_jiiii"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiiiij = (Module["dynCall_iiiiij"] = function () {
      return (dynCall_iiiiij = Module["dynCall_iiiiij"] =
        Module["asm"]["dynCall_iiiiij"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiiiijj = (Module["dynCall_iiiiijj"] = function () {
      return (dynCall_iiiiijj = Module["dynCall_iiiiijj"] =
        Module["asm"]["dynCall_iiiiijj"]).apply(null, arguments)
    })

    /** @type {function(...*):?} */
    var dynCall_iiiiiijj = (Module["dynCall_iiiiiijj"] = function () {
      return (dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] =
        Module["asm"]["dynCall_iiiiiijj"]).apply(null, arguments)
    })

    function invoke_iiiii(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vi(index, a1) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_ii(index, a1) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iii(index, a1, a2) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vii(index, a1, a2) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_v(index) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)()
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiii(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_i(index) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)()
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10
    ) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiidddi(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_diii(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_di(index, a1) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10,
      a11,
      a12
    ) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10,
          a11,
          a12
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10
    ) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiiiiiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10,
      a11,
      a12,
      a13,
      a14,
      a15
    ) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10,
          a11,
          a12,
          a13,
          a14,
          a15
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10,
      a11
    ) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10,
          a11
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10,
      a11,
      a12
    ) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10,
          a11,
          a12
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiiiiiiiiiii(
      index,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9,
      a10,
      a11,
      a12,
      a13,
      a14
    ) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10,
          a11,
          a12,
          a13,
          a14
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_fiii(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        return getWasmTableEntry(index)(a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viid(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        getWasmTableEntry(index)(a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_ji(index, a1) {
      var sp = stackSave()
      try {
        return dynCall_ji(index, a1)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vij(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        dynCall_vij(index, a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viddj(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        dynCall_viddj(index, a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vjiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        dynCall_vjiii(index, a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave()
      try {
        dynCall_vijiiii(index, a1, a2, a3, a4, a5, a6, a7)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiij(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        dynCall_viiij(index, a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viij(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        dynCall_viij(index, a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iidj(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        return dynCall_iidj(index, a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iijii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        return dynCall_iijii(index, a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiijijd(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave()
      try {
        dynCall_viiijijd(index, a1, a2, a3, a4, a5, a6, a7, a8, a9)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_jiii(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        return dynCall_jiii(index, a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iij(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        return dynCall_iij(index, a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viiji(index, a1, a2, a3, a4, a5) {
      var sp = stackSave()
      try {
        dynCall_viiji(index, a1, a2, a3, a4, a5)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_vji(index, a1, a2, a3) {
      var sp = stackSave()
      try {
        dynCall_vji(index, a1, a2, a3)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_j(index) {
      var sp = stackSave()
      try {
        return dynCall_j(index)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiji(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        return dynCall_iiji(index, a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viijii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave()
      try {
        dynCall_viijii(index, a1, a2, a3, a4, a5, a6)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiijiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
      var sp = stackSave()
      try {
        return dynCall_iiijiiiiii(
          index,
          a1,
          a2,
          a3,
          a4,
          a5,
          a6,
          a7,
          a8,
          a9,
          a10
        )
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_iiijiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave()
      try {
        return dynCall_iiijiii(index, a1, a2, a3, a4, a5, a6, a7)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_jii(index, a1, a2) {
      var sp = stackSave()
      try {
        return dynCall_jii(index, a1, a2)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_viji(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        dynCall_viji(index, a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    function invoke_jiiii(index, a1, a2, a3, a4) {
      var sp = stackSave()
      try {
        return dynCall_jiiii(index, a1, a2, a3, a4)
      } catch (e) {
        stackRestore(sp)
        if (e !== e + 0 && e !== "longjmp") throw e
        _setThrew(1, 0)
      }
    }

    // === Auto-generated postamble setup entry stuff ===

    var calledRun

    /**
     * @constructor
     * @this {ExitStatus}
     */
    function ExitStatus(status) {
      this.name = "ExitStatus"
      this.message = "Program terminated with exit(" + status + ")"
      this.status = status
    }

    var calledMain = false

    dependenciesFulfilled = function runCaller() {
      // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
      if (!calledRun) run()
      if (!calledRun) dependenciesFulfilled = runCaller // try this again later, after new deps are fulfilled
    }

    function callMain(args) {
      var entryFunction = Module["_main"]

      args = args || []

      var argc = args.length + 1
      var argv = stackAlloc((argc + 1) * 4)
      HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram)
      for (var i = 1; i < argc; i++) {
        HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
      }
      HEAP32[(argv >> 2) + argc] = 0

      try {
        var ret = entryFunction(argc, argv)

        // In PROXY_TO_PTHREAD builds, we should never exit the runtime below, as
        // execution is asynchronously handed off to a pthread.
        // if we're not running an evented main loop, it's time to exit
        exit(ret, /* implicit = */ true)
        return ret
      } catch (e) {
        return handleException(e)
      } finally {
        calledMain = true
      }
    }
    Module["callMain"] = callMain

    /** @type {function(Array=)} */
    function run(args) {
      args = args || arguments_

      if (runDependencies > 0) {
        return
      }

      preRun()

      // a preRun added a dependency, run will be called later
      if (runDependencies > 0) {
        return
      }

      function doRun() {
        // run may have just been called through dependencies being fulfilled just in this very frame,
        // or while the async setStatus time below was happening
        if (calledRun) return
        calledRun = true
        Module["calledRun"] = true

        if (ABORT) return

        initRuntime()

        preMain()

        readyPromiseResolve(Module)
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]()

        if (shouldRunNow) callMain(args)

        postRun()
      }

      if (Module["setStatus"]) {
        Module["setStatus"]("Running...")
        setTimeout(function () {
          setTimeout(function () {
            Module["setStatus"]("")
          }, 1)
          doRun()
        }, 1)
      } else {
        doRun()
      }
    }
    Module["run"] = run

    /** @param {boolean|number=} implicit */
    function exit(status, implicit) {
      EXITSTATUS = status

      if (keepRuntimeAlive()) {
      } else {
        exitRuntime()
      }

      procExit(status)
    }

    function procExit(code) {
      EXITSTATUS = code
      if (!keepRuntimeAlive()) {
        if (Module["onExit"]) Module["onExit"](code)
        ABORT = true
      }
      quit_(code, new ExitStatus(code))
    }

    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function")
        Module["preInit"] = [Module["preInit"]]
      while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
      }
    }

    // shouldRunNow refers to calling main(), not run().
    var shouldRunNow = true

    if (Module["noInitialRun"]) shouldRunNow = false

    run()

    return Module.ready
  }
})()
if (typeof exports === "object" && typeof module === "object")
  module.exports = Module
else if (typeof define === "function" && define["amd"])
  define([], function () {
    return Module
  })
else if (typeof exports === "object") exports["Module"] = Module

export default Module
