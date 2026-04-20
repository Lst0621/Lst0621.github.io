// tsl/wasm/wasm_out_v1/wasm_sample.js
var Module = (() => {
  var _scriptDir = import.meta.url;
  return (function(Module2) {
    Module2 = Module2 || {};
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var moduleOverrides = Object.assign({}, Module2);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = true;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(
              /** @type{!ArrayBuffer} */
              xhr.response
            );
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
      setWindowTitle = (title) => document.title = title;
    } else {
    }
    var out = Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    if (Module2["arguments"]) arguments_ = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["quit"]) quit_ = Module2["quit"];
    var STACK_ALIGN = 16;
    var POINTER_SIZE = 4;
    function getNativeTypeSize(type) {
      switch (type) {
        case "i1":
        case "i8":
          return 1;
        case "i16":
          return 2;
        case "i32":
          return 4;
        case "i64":
          return 8;
        case "float":
          return 4;
        case "double":
          return 8;
        default: {
          if (type[type.length - 1] === "*") {
            return POINTER_SIZE;
          } else if (type[0] === "i") {
            const bits = Number(type.substr(1));
            assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
            return bits / 8;
          } else {
            return 0;
          }
        }
      }
    }
    function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    }
    function convertJsFunctionToWasm(func, sig) {
      if (typeof WebAssembly.Function == "function") {
        var typeNames = {
          "i": "i32",
          "j": "i64",
          "f": "f32",
          "d": "f64"
        };
        var type = {
          parameters: [],
          results: sig[0] == "v" ? [] : [typeNames[sig[0]]]
        };
        for (var i = 1; i < sig.length; ++i) {
          type.parameters.push(typeNames[sig[i]]);
        }
        return new WebAssembly.Function(type, func);
      }
      var typeSection = [
        1,
        // id: section,
        0,
        // length: 0 (placeholder)
        1,
        // count: 1
        96
        // form: func
      ];
      var sigRet = sig.slice(0, 1);
      var sigParam = sig.slice(1);
      var typeCodes = {
        "i": 127,
        // i32
        "j": 126,
        // i64
        "f": 125,
        // f32
        "d": 124
        // f64
      };
      typeSection.push(sigParam.length);
      for (var i = 0; i < sigParam.length; ++i) {
        typeSection.push(typeCodes[sigParam[i]]);
      }
      if (sigRet == "v") {
        typeSection.push(0);
      } else {
        typeSection = typeSection.concat([1, typeCodes[sigRet]]);
      }
      typeSection[1] = typeSection.length - 2;
      var bytes = new Uint8Array([
        0,
        97,
        115,
        109,
        // magic ("\0asm")
        1,
        0,
        0,
        0
        // version: 1
      ].concat(typeSection, [
        2,
        7,
        // import section
        // (import "e" "f" (func 0 (type 0)))
        1,
        1,
        101,
        1,
        102,
        0,
        0,
        7,
        5,
        // export section
        // (export "f" (func 0 (type 0)))
        1,
        1,
        102,
        0,
        0
      ]));
      var module = new WebAssembly.Module(bytes);
      var instance = new WebAssembly.Instance(module, {
        "e": {
          "f": func
        }
      });
      var wrappedFunc = instance.exports["f"];
      return wrappedFunc;
    }
    var freeTableIndexes = [];
    var functionsInTableMap;
    function getEmptyTableSlot() {
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      try {
        wasmTable.grow(1);
      } catch (err2) {
        if (!(err2 instanceof RangeError)) {
          throw err2;
        }
        throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
      }
      return wasmTable.length - 1;
    }
    function updateTableMap(offset, count) {
      for (var i = offset; i < offset + count; i++) {
        var item = getWasmTableEntry(i);
        if (item) {
          functionsInTableMap.set(item, i);
        }
      }
    }
    function addFunction(func, sig) {
      if (!functionsInTableMap) {
        functionsInTableMap = /* @__PURE__ */ new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      if (functionsInTableMap.has(func)) {
        return functionsInTableMap.get(func);
      }
      var ret = getEmptyTableSlot();
      try {
        setWasmTableEntry(ret, func);
      } catch (err2) {
        if (!(err2 instanceof TypeError)) {
          throw err2;
        }
        var wrapped = convertJsFunctionToWasm(func, sig);
        setWasmTableEntry(ret, wrapped);
      }
      functionsInTableMap.set(func, ret);
      return ret;
    }
    function removeFunction(index) {
      functionsInTableMap.delete(getWasmTableEntry(index));
      freeTableIndexes.push(index);
    }
    var tempRet0 = 0;
    var setTempRet0 = (value) => {
      tempRet0 = value;
    };
    var getTempRet0 = () => tempRet0;
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    var noExitRuntime = Module2["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    function setValue(ptr, value, type = "i8", noSafe) {
      if (type.charAt(type.length - 1) === "*") type = "i32";
      switch (type) {
        case "i1":
          HEAP8[ptr >> 0] = value;
          break;
        case "i8":
          HEAP8[ptr >> 0] = value;
          break;
        case "i16":
          HEAP16[ptr >> 1] = value;
          break;
        case "i32":
          HEAP32[ptr >> 2] = value;
          break;
        case "i64":
          tempI64 = [value >>> 0, (tempDouble = value, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
          break;
        case "float":
          HEAPF32[ptr >> 2] = value;
          break;
        case "double":
          HEAPF64[ptr >> 3] = value;
          break;
        default:
          abort("invalid type for setValue: " + type);
      }
    }
    function getValue(ptr, type = "i8", noSafe) {
      if (type.charAt(type.length - 1) === "*") type = "i32";
      switch (type) {
        case "i1":
          return HEAP8[ptr >> 0];
        case "i8":
          return HEAP8[ptr >> 0];
        case "i16":
          return HEAP16[ptr >> 1];
        case "i32":
          return HEAP32[ptr >> 2];
        case "i64":
          return HEAP32[ptr >> 2];
        case "float":
          return HEAPF32[ptr >> 2];
        case "double":
          return Number(HEAPF64[ptr >> 3]);
        default:
          abort("invalid type for getValue: " + type);
      }
      return null;
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    function getCFunc(ident) {
      var func = Module2["_" + ident];
      return func;
    }
    function ccall(ident, returnType, argTypes, args, opts) {
      var toC = {
        "string": function(str) {
          var ret2 = 0;
          if (str !== null && str !== void 0 && str !== 0) {
            var len = (str.length << 2) + 1;
            ret2 = stackAlloc(len);
            stringToUTF8(str, ret2, len);
          }
          return ret2;
        },
        "array": function(arr) {
          var ret2 = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret2);
          return ret2;
        }
      };
      function convertReturnValue(ret2) {
        if (returnType === "string") return UTF8ToString(ret2);
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    }
    function cwrap(ident, returnType, argTypes, opts) {
      argTypes = argTypes || [];
      var numericArgs = argTypes.every(function(type) {
        return type === "number";
      });
      var numericRet = returnType !== "string";
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      };
    }
    var ALLOC_NORMAL = 0;
    var ALLOC_STACK = 1;
    function allocate(slab, allocator) {
      var ret;
      if (allocator == ALLOC_STACK) {
        ret = stackAlloc(slab.length);
      } else {
        ret = _malloc(slab.length);
      }
      if (!slab.subarray && !slab.slice) {
        slab = new Uint8Array(slab);
      }
      HEAPU8.set(slab, ret);
      return ret;
    }
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heap, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr));
      } else {
        var str = "";
        while (idx < endPtr) {
          var u0 = heap[idx++];
          if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
          }
          var u1 = heap[idx++] & 63;
          if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue;
          }
          var u2 = heap[idx++] & 63;
          if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2;
          } else {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63;
          }
          if (u0 < 65536) {
            str += String.fromCharCode(u0);
          } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
          }
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      ;
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0))
        return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF8(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) ++len;
        else if (u <= 2047) len += 2;
        else if (u <= 65535) len += 3;
        else len += 4;
      }
      return len;
    }
    function AsciiToString(ptr) {
      var str = "";
      while (1) {
        var ch = HEAPU8[ptr++ >> 0];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    }
    function stringToAscii(str, outPtr) {
      return writeAsciiToMemory(str, outPtr, false);
    }
    var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : void 0;
    function UTF16ToString(ptr, maxBytesToRead) {
      var endPtr = ptr;
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
      if (endPtr - ptr > 32 && UTF16Decoder) {
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
      } else {
        var str = "";
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
          var codeUnit = HEAP16[ptr + i * 2 >> 1];
          if (codeUnit == 0) break;
          str += String.fromCharCode(codeUnit);
        }
        return str;
      }
    }
    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF16(str) {
      return str.length * 2;
    }
    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0;
      var str = "";
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4;
      }
      return len;
    }
    function allocateUTF8(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }
    function allocateUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8Array(str, HEAP8, ret, size);
      return ret;
    }
    function writeStringToMemory(string, buffer2, dontAddNull) {
      warnOnce("writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!");
      var lastChar, end;
      if (dontAddNull) {
        end = buffer2 + lengthBytesUTF8(string);
        lastChar = HEAP8[end];
      }
      stringToUTF8(string, buffer2, Infinity);
      if (dontAddNull) HEAP8[end] = lastChar;
    }
    function writeArrayToMemory(array, buffer2) {
      HEAP8.set(array, buffer2);
    }
    function writeAsciiToMemory(str, buffer2, dontAddNull) {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer2++ >> 0] = str.charCodeAt(i);
      }
      if (!dontAddNull) HEAP8[buffer2 >> 0] = 0;
    }
    var HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBufferAndViews(buf) {
      buffer = buf;
      Module2["HEAP8"] = HEAP8 = new Int8Array(buf);
      Module2["HEAP16"] = HEAP16 = new Int16Array(buf);
      Module2["HEAP32"] = HEAP32 = new Int32Array(buf);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
      Module2["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
      Module2["HEAPF32"] = HEAPF32 = new Float32Array(buf);
      Module2["HEAPF64"] = HEAPF64 = new Float64Array(buf);
    }
    var TOTAL_STACK = 5242880;
    var INITIAL_MEMORY = Module2["INITIAL_MEMORY"] || 16777216;
    var wasmTable;
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATEXIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    var runtimeExited = false;
    var runtimeKeepaliveCounter = 0;
    function keepRuntimeAlive() {
      return noExitRuntime || runtimeKeepaliveCounter > 0;
    }
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true;
      if (!Module2["noFSInit"] && !FS.init.initialized)
        FS.init();
      FS.ignorePermissions = false;
      TTY.init();
      callRuntimeCallbacks(__ATINIT__);
    }
    function exitRuntime() {
      runtimeExited = true;
    }
    function postRun() {
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnExit(cb) {
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    Module2["preloadedImages"] = {};
    Module2["preloadedAudios"] = {};
    function abort(what) {
      {
        if (Module2["onAbort"]) {
          Module2["onAbort"](what);
        }
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      what += ". Build with -s ASSERTIONS=1 for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    function isFileURI(filename) {
      return filename.startsWith("file://");
    }
    var wasmBinaryFile;
    if (Module2["locateFile"]) {
      wasmBinaryFile = "wasm_sample.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("wasm_sample.wasm", import.meta.url).toString();
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        } else {
          throw "both async and sync fetching of the wasm failed";
        }
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise() {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    function createWasm() {
      var info = {
        "env": asmLibraryArg,
        "wasi_snapshot_preview1": asmLibraryArg
      };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module2["asm"] = exports2;
        wasmMemory = Module2["asm"]["memory"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module2["asm"]["__indirect_function_table"];
        addOnInit(Module2["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          abort(reason);
        });
      }
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(
              receiveInstantiationResult,
              function(reason) {
                err("wasm streaming compile failed: " + reason);
                err("falling back to ArrayBuffer instantiation");
                return instantiateArrayBuffer(receiveInstantiationResult);
              }
            );
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      if (Module2["instantiateWasm"]) {
        try {
          var exports = Module2["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          return false;
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    var tempDouble;
    var tempI64;
    var ASM_CONSTS = {};
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
          callback(Module2);
          continue;
        }
        var func = callback.func;
        if (typeof func == "number") {
          if (callback.arg === void 0) {
            getWasmTableEntry(func)();
          } else {
            getWasmTableEntry(func)(callback.arg);
          }
        } else {
          func(callback.arg === void 0 ? null : callback.arg);
        }
      }
    }
    function withStackSave(f) {
      var stack = stackSave();
      var ret = f();
      stackRestore(stack);
      return ret;
    }
    function demangle(func) {
      return func;
    }
    function demangleAll(text) {
      var regex = /\b_Z[\w\d_]+/g;
      return text.replace(
        regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : y + " [" + x + "]";
        }
      );
    }
    var wasmTableMirror = [];
    function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    }
    function handleException(e) {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    }
    function jsStackTrace() {
      var error = new Error();
      if (!error.stack) {
        try {
          throw new Error();
        } catch (e) {
          error = e;
        }
        if (!error.stack) {
          return "(no stack trace available)";
        }
      }
      return error.stack.toString();
    }
    function setWasmTableEntry(idx, func) {
      wasmTable.set(idx, func);
      wasmTableMirror[idx] = func;
    }
    function stackTrace() {
      var js = jsStackTrace();
      if (Module2["extraStackTrace"]) js += "\n" + Module2["extraStackTrace"]();
      return demangleAll(js);
    }
    function ___cxa_allocate_exception(size) {
      return _malloc(size + 16) + 16;
    }
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 16;
      this.set_type = function(type) {
        HEAP32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAP32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAP32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAP32[this.ptr + 8 >> 2];
      };
      this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount;
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      };
      this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1;
      };
      this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        return prev === 1;
      };
    }
    var exceptionLast = 0;
    var uncaughtExceptionCount = 0;
    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      throw ptr;
    }
    function _abort() {
      abort("");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function _emscripten_get_heap_max() {
      return HEAPU8.length;
    }
    function abortOnCannotGrowMemory(requestedSize) {
      abort("OOM");
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      abortOnCannotGrowMemory(requestedSize);
    }
    var ENV = {};
    function getExecutableName() {
      return thisProgram || "./this.program";
    }
    function getEnvStrings() {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
          "USER": "web_user",
          "LOGNAME": "web_user",
          "PATH": "/",
          "PWD": "/",
          "HOME": "/home/web_user",
          "LANG": lang,
          "_": getExecutableName()
        };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(x + "=" + env[x]);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }
    var PATH = { splitPath: function(filename) {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1);
    }, normalizeArray: function(parts, allowAboveRoot) {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1);
        } else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts.unshift("..");
        }
      }
      return parts;
    }, normalize: function(path) {
      var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter(function(p) {
        return !!p;
      }), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = ".";
      }
      if (path && trailingSlash) {
        path += "/";
      }
      return (isAbsolute ? "/" : "") + path;
    }, dirname: function(path) {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) {
        return ".";
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1);
      }
      return root + dir;
    }, basename: function(path) {
      if (path === "/") return "/";
      path = PATH.normalize(path);
      path = path.replace(/\/$/, "");
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1) return path;
      return path.substr(lastSlash + 1);
    }, extname: function(path) {
      return PATH.splitPath(path)[3];
    }, join: function() {
      var paths = Array.prototype.slice.call(arguments, 0);
      return PATH.normalize(paths.join("/"));
    }, join2: function(l, r) {
      return PATH.normalize(l + "/" + r);
    } };
    function getRandomDevice() {
      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        var randomBuffer = new Uint8Array(1);
        return function() {
          crypto.getRandomValues(randomBuffer);
          return randomBuffer[0];
        };
      } else
        return function() {
          abort("randomDevice");
        };
    }
    var PATH_FS = { resolve: function() {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : FS.cwd();
        if (typeof path != "string") {
          throw new TypeError("Arguments to path.resolve must be strings");
        } else if (!path) {
          return "";
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = path.charAt(0) === "/";
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
        return !!p;
      }), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    }, relative: function(from, to) {
      from = PATH_FS.resolve(from).substr(1);
      to = PATH_FS.resolve(to).substr(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push("..");
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    } };
    var TTY = { ttys: [], init: function() {
    }, shutdown: function() {
    }, register: function(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops };
      FS.registerDevice(dev, TTY.stream_ops);
    }, stream_ops: { open: function(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    }, close: function(stream) {
      stream.tty.ops.flush(stream.tty);
    }, flush: function(stream) {
      stream.tty.ops.flush(stream.tty);
    }, read: function(stream, buffer2, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer2[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now();
      }
      return bytesRead;
    }, write: function(stream, buffer2, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer2[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.timestamp = Date.now();
      }
      return i;
    } }, default_tty_ops: { get_char: function(tty) {
      if (!tty.input.length) {
        var result = null;
        if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else if (typeof readline == "function") {
          result = readline();
          if (result !== null) {
            result += "\n";
          }
        }
        if (!result) {
          return null;
        }
        tty.input = intArrayFromString(result, true);
      }
      return tty.input.shift();
    }, put_char: function(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    } }, default_tty1_ops: { put_char: function(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    } } };
    function zeroMemory(address, size) {
      HEAPU8.fill(0, address, address + size);
    }
    function alignMemory(size, alignment) {
      return Math.ceil(size / alignment) * alignment;
    }
    function mmapAlloc(size) {
      abort();
    }
    var MEMFS = { ops_table: null, mount: function(mount) {
      return MEMFS.createNode(null, "/", 16384 | 511, 0);
    }, createNode: function(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(63);
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
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
      }
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null;
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.timestamp = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.timestamp = node.timestamp;
      }
      return node;
    }, getFileDataAsTypedArray: function(node) {
      if (!node.contents) return new Uint8Array(0);
      if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents);
    }, expandFileStorage: function(node, newCapacity) {
      var prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity) return;
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
      if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
      var oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity);
      if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    }, resizeFileStorage: function(node, newSize) {
      if (node.usedBytes == newSize) return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
      } else {
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize);
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
        }
        node.usedBytes = newSize;
      }
    }, node_ops: { getattr: function(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    }, setattr: function(node, attr) {
      if (attr.mode !== void 0) {
        node.mode = attr.mode;
      }
      if (attr.timestamp !== void 0) {
        node.timestamp = attr.timestamp;
      }
      if (attr.size !== void 0) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    }, lookup: function(parent, name) {
      throw FS.genericErrors[44];
    }, mknod: function(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    }, rename: function(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
      }
      delete old_node.parent.contents[old_node.name];
      old_node.parent.timestamp = Date.now();
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      new_dir.timestamp = old_node.parent.timestamp;
      old_node.parent = new_dir;
    }, unlink: function(parent, name) {
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, readdir: function(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue;
        }
        entries.push(key);
      }
      return entries;
    }, symlink: function(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    }, readlink: function(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    } }, stream_ops: { read: function(stream, buffer2, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        buffer2.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer2[offset + i] = contents[position + i];
      }
      return size;
    }, write: function(stream, buffer2, offset, length, position, canOwn) {
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer2.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer2.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer2.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer2.subarray(offset, offset + length), position);
          return length;
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer2.subarray) {
        node.contents.set(buffer2.subarray(offset, offset + length), position);
      } else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer2[offset + i];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    }, llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, allocate: function(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    }, mmap: function(stream, address, length, position, prot, flags) {
      if (address !== 0) {
        throw new FS.ErrnoError(28);
      }
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && contents.buffer === buffer) {
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        HEAP8.set(contents, ptr);
      }
      return { ptr, allocated };
    }, msync: function(stream, buffer2, offset, length, mmapFlags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (mmapFlags & 2) {
        return 0;
      }
      var bytesWritten = MEMFS.stream_ops.write(stream, buffer2, 0, length, offset, false);
      return 0;
    } } };
    function asyncLoad(url, onload, onerror, noRunDep) {
      var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
      readAsync(url, function(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      }, function(event) {
        if (onerror) {
          onerror();
        } else {
          throw 'Loading data file "' + url + '" failed.';
        }
      });
      if (dep) addRunDependency(dep);
    }
    var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, ErrnoError: null, genericErrors: {}, filesystems: null, syncFSRequests: 0, lookupPath: (path, opts = {}) => {
      path = PATH_FS.resolve(FS.cwd(), path);
      if (!path) return { path: "", node: null };
      var defaults = {
        follow_mount: true,
        recurse_count: 0
      };
      for (var key in defaults) {
        if (opts[key] === void 0) {
          opts[key] = defaults[key];
        }
      }
      if (opts.recurse_count > 8) {
        throw new FS.ErrnoError(32);
      }
      var parts = PATH.normalizeArray(path.split("/").filter((p) => !!p), false);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        current = FS.lookupNode(current, parts[i]);
        current_path = PATH.join2(current_path, parts[i]);
        if (FS.isMountpoint(current)) {
          if (!islast || islast && opts.follow_mount) {
            current = current.mounted.root;
          }
        }
        if (!islast || opts.follow) {
          var count = 0;
          while (FS.isLink(current.mode)) {
            var link = FS.readlink(current_path);
            current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
            var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
            current = lookup.node;
            if (count++ > 40) {
              throw new FS.ErrnoError(32);
            }
          }
        }
      }
      return { path: current_path, node: current };
    }, getPath: (node) => {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
        }
        path = path ? node.name + "/" + path : node.name;
        node = node.parent;
      }
    }, hashName: (parentid, name) => {
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
      }
      return (parentid + hash >>> 0) % FS.nameTable.length;
    }, hashAddNode: (node) => {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    }, hashRemoveNode: (node) => {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next;
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    }, lookupNode: (parent, name) => {
      var errCode = FS.mayLookup(parent);
      if (errCode) {
        throw new FS.ErrnoError(errCode, parent);
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node;
        }
      }
      return FS.lookup(parent, name);
    }, createNode: (parent, name, mode, rdev) => {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    }, destroyNode: (node) => {
      FS.hashRemoveNode(node);
    }, isRoot: (node) => {
      return node === node.parent;
    }, isMountpoint: (node) => {
      return !!node.mounted;
    }, isFile: (mode) => {
      return (mode & 61440) === 32768;
    }, isDir: (mode) => {
      return (mode & 61440) === 16384;
    }, isLink: (mode) => {
      return (mode & 61440) === 40960;
    }, isChrdev: (mode) => {
      return (mode & 61440) === 8192;
    }, isBlkdev: (mode) => {
      return (mode & 61440) === 24576;
    }, isFIFO: (mode) => {
      return (mode & 61440) === 4096;
    }, isSocket: (mode) => {
      return (mode & 49152) === 49152;
    }, flagModes: { "r": 0, "r+": 2, "w": 577, "w+": 578, "a": 1089, "a+": 1090 }, modeStringToFlags: (str) => {
      var flags = FS.flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error("Unknown file open mode: " + str);
      }
      return flags;
    }, flagsToPermissionString: (flag) => {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w";
      }
      return perms;
    }, nodePermissions: (node, perms) => {
      if (FS.ignorePermissions) {
        return 0;
      }
      if (perms.includes("r") && !(node.mode & 292)) {
        return 2;
      } else if (perms.includes("w") && !(node.mode & 146)) {
        return 2;
      } else if (perms.includes("x") && !(node.mode & 73)) {
        return 2;
      }
      return 0;
    }, mayLookup: (dir) => {
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    }, mayCreate: (dir, name) => {
      try {
        var node = FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    }, mayDelete: (dir, name, isdir) => {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) {
        return errCode;
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return 54;
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return 10;
        }
      } else {
        if (FS.isDir(node.mode)) {
          return 31;
        }
      }
      return 0;
    }, mayOpen: (node, flags) => {
      if (!node) {
        return 44;
      }
      if (FS.isLink(node.mode)) {
        return 32;
      } else if (FS.isDir(node.mode)) {
        if (FS.flagsToPermissionString(flags) !== "r" || // opening for write
        flags & 512) {
          return 31;
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
    }, MAX_OPEN_FDS: 4096, nextfd: (fd_start = 0, fd_end = FS.MAX_OPEN_FDS) => {
      for (var fd = fd_start; fd <= fd_end; fd++) {
        if (!FS.streams[fd]) {
          return fd;
        }
      }
      throw new FS.ErrnoError(33);
    }, getStream: (fd) => FS.streams[fd], createStream: (stream, fd_start, fd_end) => {
      if (!FS.FSStream) {
        FS.FSStream = /** @constructor */
        function() {
        };
        FS.FSStream.prototype = {
          object: {
            get: function() {
              return this.node;
            },
            set: function(val) {
              this.node = val;
            }
          },
          isRead: {
            get: function() {
              return (this.flags & 2097155) !== 1;
            }
          },
          isWrite: {
            get: function() {
              return (this.flags & 2097155) !== 0;
            }
          },
          isAppend: {
            get: function() {
              return this.flags & 1024;
            }
          }
        };
      }
      stream = Object.assign(new FS.FSStream(), stream);
      var fd = FS.nextfd(fd_start, fd_end);
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    }, closeStream: (fd) => {
      FS.streams[fd] = null;
    }, chrdev_stream_ops: { open: (stream) => {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
    }, llseek: () => {
      throw new FS.ErrnoError(70);
    } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice: (dev, ops) => {
      FS.devices[dev] = { stream_ops: ops };
    }, getDevice: (dev) => FS.devices[dev], getMounts: (mount) => {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m2 = check.pop();
        mounts.push(m2);
        check.push.apply(check, m2.mounts);
      }
      return mounts;
    }, syncfs: (populate, callback) => {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work");
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) {
          doCallback(null);
        }
      }
      ;
      mounts.forEach((mount) => {
        if (!mount.type.syncfs) {
          return done(null);
        }
        mount.type.syncfs(mount, populate, done);
      });
    }, mount: (type, opts, mountpoint) => {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(10);
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
      }
      var mount = {
        type,
        opts,
        mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot;
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount);
        }
      }
      return mountRoot;
    }, unmount: (mountpoint) => {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(28);
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((hash) => {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.includes(current.mount)) {
            FS.destroyNode(current);
          }
          current = next;
        }
      });
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    }, lookup: (parent, name) => {
      return parent.node_ops.lookup(parent, name);
    }, mknod: (path, mode, dev) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name || name === "." || name === "..") {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.mayCreate(parent, name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.mknod(parent, name, mode, dev);
    }, create: (path, mode) => {
      mode = mode !== void 0 ? mode : 438;
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    }, mkdir: (path, mode) => {
      mode = mode !== void 0 ? mode : 511;
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    }, mkdirTree: (path, mode) => {
      var dirs = path.split("/");
      var d = "";
      for (var i = 0; i < dirs.length; ++i) {
        if (!dirs[i]) continue;
        d += "/" + dirs[i];
        try {
          FS.mkdir(d, mode);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    }, mkdev: (path, mode, dev) => {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    }, symlink: (oldpath, newpath) => {
      if (!PATH_FS.resolve(oldpath)) {
        throw new FS.ErrnoError(44);
      }
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.symlink(parent, newname, oldpath);
    }, rename: (old_path, new_path) => {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      lookup = FS.lookupPath(old_path, { parent: true });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(75);
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(28);
      }
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(55);
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) {
        return;
      }
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(10);
      }
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    }, rmdir: (path) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    }, readdir: (path) => {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(54);
      }
      return node.node_ops.readdir(node);
    }, unlink: (path) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    }, readlink: (path) => {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(44);
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(28);
      }
      return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
    }, stat: (path, dontFollow) => {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(63);
      }
      return node.node_ops.getattr(node);
    }, lstat: (path) => {
      return FS.stat(path, true);
    }, chmod: (path, mode, dontFollow) => {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, {
        mode: mode & 4095 | node.mode & ~4095,
        timestamp: Date.now()
      });
    }, lchmod: (path, mode) => {
      FS.chmod(path, mode, true);
    }, fchmod: (fd, mode) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      FS.chmod(stream.node, mode);
    }, chown: (path, uid, gid, dontFollow) => {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, {
        timestamp: Date.now()
        // we ignore the uid / gid for now
      });
    }, lchown: (path, uid, gid) => {
      FS.chown(path, uid, gid, true);
    }, fchown: (fd, uid, gid) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      FS.chown(stream.node, uid, gid);
    }, truncate: (path, len) => {
      if (len < 0) {
        throw new FS.ErrnoError(28);
      }
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      node.node_ops.setattr(node, {
        size: len,
        timestamp: Date.now()
      });
    }, ftruncate: (fd, len) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(28);
      }
      FS.truncate(stream.node, len);
    }, utime: (path, atime, mtime) => {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      node.node_ops.setattr(node, {
        timestamp: Math.max(atime, mtime)
      });
    }, open: (path, flags, mode, fd_start, fd_end) => {
      if (path === "") {
        throw new FS.ErrnoError(44);
      }
      flags = typeof flags == "string" ? FS.modeStringToFlags(flags) : flags;
      mode = typeof mode == "undefined" ? 438 : mode;
      if (flags & 64) {
        mode = mode & 4095 | 32768;
      } else {
        mode = 0;
      }
      var node;
      if (typeof path == "object") {
        node = path;
      } else {
        path = PATH.normalize(path);
        try {
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072)
          });
          node = lookup.node;
        } catch (e) {
        }
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(20);
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true;
        }
      }
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512;
      }
      if (flags & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      if (flags & 512) {
        FS.truncate(node, 0);
      }
      flags &= ~(128 | 512 | 131072);
      var stream = FS.createStream({
        node,
        path: FS.getPath(node),
        // we want the absolute path to the node
        flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        // used by the file family libc calls (fopen, fwrite, ferror, etc.)
        ungotten: [],
        error: false
      }, fd_start, fd_end);
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
      if (Module2["logReadFiles"] && !(flags & 1)) {
        if (!FS.readFiles) FS.readFiles = {};
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
        }
      }
      return stream;
    }, close: (stream) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream);
        }
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    }, isClosed: (stream) => {
      return stream.fd === null;
    }, llseek: (stream, offset, whence) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(70);
      }
      if (whence != 0 && whence != 1 && whence != 2) {
        throw new FS.ErrnoError(28);
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    }, read: (stream, buffer2, offset, length, position) => {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(28);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesRead = stream.stream_ops.read(stream, buffer2, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    }, write: (stream, buffer2, offset, length, position, canOwn) => {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(28);
      }
      if (stream.seekable && stream.flags & 1024) {
        FS.llseek(stream, 0, 2);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer2, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    }, allocate: (stream, offset, length) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(28);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(138);
      }
      stream.stream_ops.allocate(stream, offset, length);
    }, mmap: (stream, address, length, position, prot, flags) => {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
        throw new FS.ErrnoError(2);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(2);
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(43);
      }
      return stream.stream_ops.mmap(stream, address, length, position, prot, flags);
    }, msync: (stream, buffer2, offset, length, mmapFlags) => {
      if (!stream || !stream.stream_ops.msync) {
        return 0;
      }
      return stream.stream_ops.msync(stream, buffer2, offset, length, mmapFlags);
    }, munmap: (stream) => 0, ioctl: (stream, cmd, arg) => {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(59);
      }
      return stream.stream_ops.ioctl(stream, cmd, arg);
    }, readFile: (path, opts = {}) => {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error('Invalid encoding type "' + opts.encoding + '"');
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf, 0);
      } else if (opts.encoding === "binary") {
        ret = buf;
      }
      FS.close(stream);
      return ret;
    }, writeFile: (path, data, opts = {}) => {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      if (typeof data == "string") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
      } else if (ArrayBuffer.isView(data)) {
        FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      } else {
        throw new Error("Unsupported data type");
      }
      FS.close(stream);
    }, cwd: () => FS.currentPath, chdir: (path) => {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) {
        throw new FS.ErrnoError(44);
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(54);
      }
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.currentPath = lookup.path;
    }, createDefaultDirectories: () => {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    }, createDefaultDevices: () => {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: () => 0,
        write: (stream, buffer2, offset, length, pos) => length
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var random_device = getRandomDevice();
      FS.createDevice("/dev", "random", random_device);
      FS.createDevice("/dev", "urandom", random_device);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories: () => {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({
        mount: () => {
          var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
          node.node_ops = {
            lookup: (parent, name) => {
              var fd = +name;
              var stream = FS.getStream(fd);
              if (!stream) throw new FS.ErrnoError(8);
              var ret = {
                parent: null,
                mount: { mountpoint: "fake" },
                node_ops: { readlink: () => stream.path }
              };
              ret.parent = ret;
              return ret;
            }
          };
          return node;
        }
      }, {}, "/proc/self/fd");
    }, createStandardStreams: () => {
      if (Module2["stdin"]) {
        FS.createDevice("/dev", "stdin", Module2["stdin"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdin");
      }
      if (Module2["stdout"]) {
        FS.createDevice("/dev", "stdout", null, Module2["stdout"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdout");
      }
      if (Module2["stderr"]) {
        FS.createDevice("/dev", "stderr", null, Module2["stderr"]);
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr");
      }
      var stdin = FS.open("/dev/stdin", 0);
      var stdout = FS.open("/dev/stdout", 1);
      var stderr = FS.open("/dev/stderr", 1);
    }, ensureErrnoError: () => {
      if (FS.ErrnoError) return;
      FS.ErrnoError = /** @this{Object} */
      function ErrnoError(errno, node) {
        this.node = node;
        this.setErrno = /** @this{Object} */
        function(errno2) {
          this.errno = errno2;
        };
        this.setErrno(errno);
        this.message = "FS error";
      };
      FS.ErrnoError.prototype = new Error();
      FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      [44].forEach((code) => {
        FS.genericErrors[code] = new FS.ErrnoError(code);
        FS.genericErrors[code].stack = "<generic error, no stack>";
      });
    }, staticInit: () => {
      FS.ensureErrnoError();
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = {
        "MEMFS": MEMFS
      };
    }, init: (input, output, error) => {
      FS.init.initialized = true;
      FS.ensureErrnoError();
      Module2["stdin"] = input || Module2["stdin"];
      Module2["stdout"] = output || Module2["stdout"];
      Module2["stderr"] = error || Module2["stderr"];
      FS.createStandardStreams();
    }, quit: () => {
      FS.init.initialized = false;
      for (var i = 0; i < FS.streams.length; i++) {
        var stream = FS.streams[i];
        if (!stream) {
          continue;
        }
        FS.close(stream);
      }
    }, getMode: (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    }, findObject: (path, dontResolveLastLink) => {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (ret.exists) {
        return ret.object;
      } else {
        return null;
      }
    }, analyzePath: (path, dontResolveLastLink) => {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      ;
      return ret;
    }, createPath: (parent, path, canRead, canWrite) => {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
        }
        parent = current;
      }
      return current;
    }, createFile: (parent, name, properties, canRead, canWrite) => {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.create(path, mode);
    }, createDataFile: (parent, name, data, canRead, canWrite, canOwn) => {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS.getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data == "string") {
          var arr = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
          data = arr;
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
      return node;
    }, createDevice: (parent, name, input, output) => {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(!!input, !!output);
      if (!FS.createDevice.major) FS.createDevice.major = 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open: (stream) => {
          stream.seekable = false;
        },
        close: (stream) => {
          if (output && output.buffer && output.buffer.length) {
            output(10);
          }
        },
        read: (stream, buffer2, offset, length, pos) => {
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = input();
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer2[offset + i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },
        write: (stream, buffer2, offset, length, pos) => {
          for (var i = 0; i < length; i++) {
            try {
              output(buffer2[offset + i]);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }
      });
      return FS.mkdev(path, mode, dev);
    }, forceLoadFile: (obj) => {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (typeof XMLHttpRequest != "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      } else if (read_) {
        try {
          obj.contents = intArrayFromString(read_(obj.url), true);
          obj.usedBytes = obj.contents.length;
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.");
      }
    }, createLazyFile: (parent, name, url, canRead, canWrite) => {
      function LazyUint8Array() {
        this.lengthKnown = false;
        this.chunks = [];
      }
      LazyUint8Array.prototype.get = /** @this{Object} */
      function LazyUint8Array_get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      };
      LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
        this.getter = getter;
      };
      LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
          if (xhr2.response !== void 0) {
            return new Uint8Array(
              /** @type{Array<number>} */
              xhr2.response || []
            );
          } else {
            return intArrayFromString(xhr2.responseText || "", true);
          }
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      };
      if (typeof XMLHttpRequest != "undefined") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array();
        Object.defineProperties(lazyArray, {
          length: {
            get: (
              /** @this{Object} */
              function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            )
          },
          chunkSize: {
            get: (
              /** @this{Object} */
              function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            )
          }
        });
        var properties = { isDevice: false, contents: lazyArray };
      } else {
        var properties = { isDevice: false, url };
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, {
        usedBytes: {
          get: (
            /** @this {FSNode} */
            function() {
              return this.contents.length;
            }
          )
        }
      });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
          FS.forceLoadFile(node);
          return fn.apply(null, arguments);
        };
      });
      stream_ops.read = (stream, buffer2, offset, length, position) => {
        FS.forceLoadFile(node);
        var contents = stream.node.contents;
        if (position >= contents.length)
          return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) {
          for (var i = 0; i < size; i++) {
            buffer2[offset + i] = contents[position + i];
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer2[offset + i] = contents.get(position + i);
          }
        }
        return size;
      };
      node.stream_ops = stream_ops;
      return node;
    }, createPreloadedFile: (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency("cp " + fullname);
      function processData(byteArray) {
        function finish(byteArray2) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS.createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
          }
          if (onload) onload();
          removeRunDependency(dep);
        }
        if (Browser.handledByPreloadPlugin(byteArray, fullname, finish, () => {
          if (onerror) onerror();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == "string") {
        asyncLoad(url, (byteArray) => processData(byteArray), onerror);
      } else {
        processData(url);
      }
    }, indexedDB: () => {
      return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }, DB_NAME: () => {
      return "EM_FS_" + window.location.pathname;
    }, DB_VERSION: 20, DB_STORE_NAME: "FILE_DATA", saveFilesToDB: (paths, onload, onerror) => {
      onload = onload || (() => {
      });
      onerror = onerror || (() => {
      });
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
      } catch (e) {
        return onerror(e);
      }
      openRequest.onupgradeneeded = () => {
        out("creating db");
        var db = openRequest.result;
        db.createObjectStore(FS.DB_STORE_NAME);
      };
      openRequest.onsuccess = () => {
        var db = openRequest.result;
        var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0, fail = 0, total = paths.length;
        function finish() {
          if (fail == 0) onload();
          else onerror();
        }
        paths.forEach((path) => {
          var putRequest = files.put(FS.analyzePath(path).object.contents, path);
          putRequest.onsuccess = () => {
            ok++;
            if (ok + fail == total) finish();
          };
          putRequest.onerror = () => {
            fail++;
            if (ok + fail == total) finish();
          };
        });
        transaction.onerror = onerror;
      };
      openRequest.onerror = onerror;
    }, loadFilesFromDB: (paths, onload, onerror) => {
      onload = onload || (() => {
      });
      onerror = onerror || (() => {
      });
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
      } catch (e) {
        return onerror(e);
      }
      openRequest.onupgradeneeded = onerror;
      openRequest.onsuccess = () => {
        var db = openRequest.result;
        try {
          var transaction = db.transaction([FS.DB_STORE_NAME], "readonly");
        } catch (e) {
          onerror(e);
          return;
        }
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0, fail = 0, total = paths.length;
        function finish() {
          if (fail == 0) onload();
          else onerror();
        }
        paths.forEach((path) => {
          var getRequest = files.get(path);
          getRequest.onsuccess = () => {
            if (FS.analyzePath(path).exists) {
              FS.unlink(path);
            }
            FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
            ok++;
            if (ok + fail == total) finish();
          };
          getRequest.onerror = () => {
            fail++;
            if (ok + fail == total) finish();
          };
        });
        transaction.onerror = onerror;
      };
      openRequest.onerror = onerror;
    } };
    var SYSCALLS = { DEFAULT_POLLMASK: 5, calculateAt: function(dirfd, path, allowEmpty) {
      if (path[0] === "/") {
        return path;
      }
      var dir;
      if (dirfd === -100) {
        dir = FS.cwd();
      } else {
        var dirstream = FS.getStream(dirfd);
        if (!dirstream) throw new FS.ErrnoError(8);
        dir = dirstream.path;
      }
      if (path.length == 0) {
        if (!allowEmpty) {
          throw new FS.ErrnoError(44);
          ;
        }
        return dir;
      }
      return PATH.join2(dir, path);
    }, doStat: function(func, path, buf) {
      try {
        var stat = func(path);
      } catch (e) {
        if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
          return -54;
        }
        throw e;
      }
      HEAP32[buf >> 2] = stat.dev;
      HEAP32[buf + 4 >> 2] = 0;
      HEAP32[buf + 8 >> 2] = stat.ino;
      HEAP32[buf + 12 >> 2] = stat.mode;
      HEAP32[buf + 16 >> 2] = stat.nlink;
      HEAP32[buf + 20 >> 2] = stat.uid;
      HEAP32[buf + 24 >> 2] = stat.gid;
      HEAP32[buf + 28 >> 2] = stat.rdev;
      HEAP32[buf + 32 >> 2] = 0;
      tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
      HEAP32[buf + 48 >> 2] = 4096;
      HEAP32[buf + 52 >> 2] = stat.blocks;
      HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
      HEAP32[buf + 60 >> 2] = 0;
      HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
      HEAP32[buf + 68 >> 2] = 0;
      HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
      HEAP32[buf + 76 >> 2] = 0;
      tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 80 >> 2] = tempI64[0], HEAP32[buf + 84 >> 2] = tempI64[1];
      return 0;
    }, doMsync: function(addr, stream, len, flags, offset) {
      var buffer2 = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer2, offset, len, flags);
    }, doMkdir: function(path, mode) {
      path = PATH.normalize(path);
      if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
      FS.mkdir(path, mode, 0);
      return 0;
    }, doMknod: function(path, mode, dev) {
      switch (mode & 61440) {
        case 32768:
        case 8192:
        case 24576:
        case 4096:
        case 49152:
          break;
        default:
          return -28;
      }
      FS.mknod(path, mode, dev);
      return 0;
    }, doReadlink: function(path, buf, bufsize) {
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len] = endChar;
      return len;
    }, doAccess: function(path, amode) {
      if (amode & ~7) {
        return -28;
      }
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node) {
        return -44;
      }
      var perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && FS.nodePermissions(node, perms)) {
        return -2;
      }
      return 0;
    }, doDup: function(path, flags, suggestFD) {
      var suggest = FS.getStream(suggestFD);
      if (suggest) FS.close(suggest);
      return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
    }, doReadv: function(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[iov + i * 8 >> 2];
        var len = HEAP32[iov + (i * 8 + 4) >> 2];
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
      }
      return ret;
    }, doWritev: function(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[iov + i * 8 >> 2];
        var len = HEAP32[iov + (i * 8 + 4) >> 2];
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
      }
      return ret;
    }, varargs: void 0, get: function() {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
      return ret;
    }, getStr: function(ptr) {
      var ret = UTF8ToString(ptr);
      return ret;
    }, getStreamFromFD: function(fd) {
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(8);
      return stream;
    }, get64: function(low, high) {
      return low;
    } };
    function _environ_get(__environ, environ_buf) {
      var bufSize = 0;
      getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAP32[__environ + i * 4 >> 2] = ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }
    function _environ_sizes_get(penviron_count, penviron_buf_size) {
      var strings = getEnvStrings();
      HEAP32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach(function(string) {
        bufSize += string.length + 1;
      });
      HEAP32[penviron_buf_size >> 2] = bufSize;
      return 0;
    }
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doReadv(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var HIGH_OFFSET = 4294967296;
        var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
        var DOUBLE_LIMIT = 9007199254740992;
        if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
          return -61;
        }
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        ;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doWritev(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function _getentropy(buffer2, size) {
      if (!_getentropy.randomDevice) {
        _getentropy.randomDevice = getRandomDevice();
      }
      for (var i = 0; i < size; i++) {
        HEAP8[buffer2 + i >> 0] = _getentropy.randomDevice();
      }
      return 0;
    }
    function _setTempRet0(val) {
      setTempRet0(val);
    }
    function __isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
      }
      return sum;
    }
    var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
          days -= daysInCurrentMonth - newDate.getDate() + 1;
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth + 1);
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear() + 1);
          }
        } else {
          newDate.setDate(newDate.getDate() + days);
          return newDate;
        }
      }
      return newDate;
    }
    function _strftime(s, maxsize, format, tm) {
      var tm_zone = HEAP32[tm + 40 >> 2];
      var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[tm + 4 >> 2],
        tm_hour: HEAP32[tm + 8 >> 2],
        tm_mday: HEAP32[tm + 12 >> 2],
        tm_mon: HEAP32[tm + 16 >> 2],
        tm_year: HEAP32[tm + 20 >> 2],
        tm_wday: HEAP32[tm + 24 >> 2],
        tm_yday: HEAP32[tm + 28 >> 2],
        tm_isdst: HEAP32[tm + 32 >> 2],
        tm_gmtoff: HEAP32[tm + 36 >> 2],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
      };
      var pattern = UTF8ToString(format);
      var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y",
        // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        "%D": "%m/%d/%y",
        // Equivalent to %m / %d / %y
        "%F": "%Y-%m-%d",
        // Equivalent to %Y - %m - %d
        "%h": "%b",
        // Equivalent to %b
        "%r": "%I:%M:%S %p",
        // Replaced by the time in a.m. and p.m. notation
        "%R": "%H:%M",
        // Replaced by the time in 24-hour notation
        "%T": "%H:%M:%S",
        // Replaced by the time
        "%x": "%m/%d/%y",
        // Replaced by the locale's appropriate date representation
        "%X": "%H:%M:%S",
        // Replaced by the locale's appropriate time representation
        // Modified Conversion Specifiers
        "%Ec": "%c",
        // Replaced by the locale's alternative appropriate date and time representation.
        "%EC": "%C",
        // Replaced by the name of the base year (period) in the locale's alternative representation.
        "%Ex": "%m/%d/%y",
        // Replaced by the locale's alternative date representation.
        "%EX": "%H:%M:%S",
        // Replaced by the locale's alternative time representation.
        "%Ey": "%y",
        // Replaced by the offset from %EC (year only) in the locale's alternative representation.
        "%EY": "%Y",
        // Replaced by the full alternative year representation.
        "%Od": "%d",
        // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading zeros if there is any alternative symbol for zero; otherwise, with leading <space> characters.
        "%Oe": "%e",
        // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading <space> characters.
        "%OH": "%H",
        // Replaced by the hour (24-hour clock) using the locale's alternative numeric symbols.
        "%OI": "%I",
        // Replaced by the hour (12-hour clock) using the locale's alternative numeric symbols.
        "%Om": "%m",
        // Replaced by the month using the locale's alternative numeric symbols.
        "%OM": "%M",
        // Replaced by the minutes using the locale's alternative numeric symbols.
        "%OS": "%S",
        // Replaced by the seconds using the locale's alternative numeric symbols.
        "%Ou": "%u",
        // Replaced by the weekday as a number in the locale's alternative representation (Monday=1).
        "%OU": "%U",
        // Replaced by the week number of the year (Sunday as the first day of the week, rules corresponding to %U ) using the locale's alternative numeric symbols.
        "%OV": "%V",
        // Replaced by the week number of the year (Monday as the first day of the week, rules corresponding to %V ) using the locale's alternative numeric symbols.
        "%Ow": "%w",
        // Replaced by the number of the weekday (Sunday=0) using the locale's alternative numeric symbols.
        "%OW": "%W",
        // Replaced by the week number of the year (Monday as the first day of the week) using the locale's alternative numeric symbols.
        "%Oy": "%y"
        // Replaced by the year (offset from %C ) using the locale's alternative numeric symbols.
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
      }
      var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || "";
        while (str.length < digits) {
          str = character[0] + str;
        }
        return str;
      }
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0");
      }
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : value > 0 ? 1 : 0;
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
            compare = sgn(date1.getDate() - date2.getDate());
          }
        }
        return compare;
      }
      function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
          case 0:
            return new Date(janFourth.getFullYear() - 1, 11, 29);
          case 1:
            return janFourth;
          case 2:
            return new Date(janFourth.getFullYear(), 0, 3);
          case 3:
            return new Date(janFourth.getFullYear(), 0, 2);
          case 4:
            return new Date(janFourth.getFullYear(), 0, 1);
          case 5:
            return new Date(janFourth.getFullYear() - 1, 11, 31);
          case 6:
            return new Date(janFourth.getFullYear() - 1, 11, 30);
        }
      }
      function getWeekBasedYear(date2) {
        var thisDate = __addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
          if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
            return thisDate.getFullYear() + 1;
          } else {
            return thisDate.getFullYear();
          }
        } else {
          return thisDate.getFullYear() - 1;
        }
      }
      var EXPANSION_RULES_2 = {
        "%a": function(date2) {
          return WEEKDAYS[date2.tm_wday].substring(0, 3);
        },
        "%A": function(date2) {
          return WEEKDAYS[date2.tm_wday];
        },
        "%b": function(date2) {
          return MONTHS[date2.tm_mon].substring(0, 3);
        },
        "%B": function(date2) {
          return MONTHS[date2.tm_mon];
        },
        "%C": function(date2) {
          var year = date2.tm_year + 1900;
          return leadingNulls(year / 100 | 0, 2);
        },
        "%d": function(date2) {
          return leadingNulls(date2.tm_mday, 2);
        },
        "%e": function(date2) {
          return leadingSomething(date2.tm_mday, 2, " ");
        },
        "%g": function(date2) {
          return getWeekBasedYear(date2).toString().substring(2);
        },
        "%G": function(date2) {
          return getWeekBasedYear(date2);
        },
        "%H": function(date2) {
          return leadingNulls(date2.tm_hour, 2);
        },
        "%I": function(date2) {
          var twelveHour = date2.tm_hour;
          if (twelveHour == 0) twelveHour = 12;
          else if (twelveHour > 12) twelveHour -= 12;
          return leadingNulls(twelveHour, 2);
        },
        "%j": function(date2) {
          return leadingNulls(date2.tm_mday + __arraySum(__isLeapYear(date2.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3);
        },
        "%m": function(date2) {
          return leadingNulls(date2.tm_mon + 1, 2);
        },
        "%M": function(date2) {
          return leadingNulls(date2.tm_min, 2);
        },
        "%n": function() {
          return "\n";
        },
        "%p": function(date2) {
          if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
            return "AM";
          } else {
            return "PM";
          }
        },
        "%S": function(date2) {
          return leadingNulls(date2.tm_sec, 2);
        },
        "%t": function() {
          return "	";
        },
        "%u": function(date2) {
          return date2.tm_wday || 7;
        },
        "%U": function(date2) {
          var janFirst = new Date(date2.tm_year + 1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
          var endDate = new Date(date2.tm_year + 1900, date2.tm_mon, date2.tm_mday);
          if (compareByDay(firstSunday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
            var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
            var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
            return leadingNulls(Math.ceil(days / 7), 2);
          }
          return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00";
        },
        "%V": function(date2) {
          var janFourthThisYear = new Date(date2.tm_year + 1900, 0, 4);
          var janFourthNextYear = new Date(date2.tm_year + 1901, 0, 4);
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
          var endDate = __addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            return "53";
          }
          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            return "01";
          }
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date2.tm_year + 1900) {
            daysDifference = date2.tm_yday + 32 - firstWeekStartThisYear.getDate();
          } else {
            daysDifference = date2.tm_yday + 1 - firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference / 7), 2);
        },
        "%w": function(date2) {
          return date2.tm_wday;
        },
        "%W": function(date2) {
          var janFirst = new Date(date2.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
          var endDate = new Date(date2.tm_year + 1900, date2.tm_mon, date2.tm_mday);
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
            var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
            var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
            return leadingNulls(Math.ceil(days / 7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00";
        },
        "%y": function(date2) {
          return (date2.tm_year + 1900).toString().substring(2);
        },
        "%Y": function(date2) {
          return date2.tm_year + 1900;
        },
        "%z": function(date2) {
          var off = date2.tm_gmtoff;
          var ahead = off >= 0;
          off = Math.abs(off) / 60;
          off = off / 60 * 100 + off % 60;
          return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
        },
        "%Z": function(date2) {
          return date2.tm_zone;
        },
        "%%": function() {
          return "%";
        }
      };
      pattern = pattern.replace(/%%/g, "\0\0");
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, "%");
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
      writeArrayToMemory(bytes, s);
      return bytes.length - 1;
    }
    function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm);
    }
    var FSNode = (
      /** @constructor */
      function(parent, name, mode, rdev) {
        if (!parent) {
          parent = this;
        }
        this.parent = parent;
        this.mount = parent.mount;
        this.mounted = null;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.node_ops = {};
        this.stream_ops = {};
        this.rdev = rdev;
      }
    );
    var readMode = 292 | 73;
    var writeMode = 146;
    Object.defineProperties(FSNode.prototype, {
      read: {
        get: (
          /** @this{FSNode} */
          function() {
            return (this.mode & readMode) === readMode;
          }
        ),
        set: (
          /** @this{FSNode} */
          function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode;
          }
        )
      },
      write: {
        get: (
          /** @this{FSNode} */
          function() {
            return (this.mode & writeMode) === writeMode;
          }
        ),
        set: (
          /** @this{FSNode} */
          function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode;
          }
        )
      },
      isFolder: {
        get: (
          /** @this{FSNode} */
          function() {
            return FS.isDir(this.mode);
          }
        )
      },
      isDevice: {
        get: (
          /** @this{FSNode} */
          function() {
            return FS.isChrdev(this.mode);
          }
        )
      }
    });
    FS.FSNode = FSNode;
    FS.staticInit();
    ;
    var ASSERTIONS = false;
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    function intArrayToString(array) {
      var ret = [];
      for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
          if (ASSERTIONS) {
            assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
          }
          chr &= 255;
        }
        ret.push(String.fromCharCode(chr));
      }
      return ret.join("");
    }
    var asmLibraryArg = {
      "__cxa_allocate_exception": ___cxa_allocate_exception,
      "__cxa_throw": ___cxa_throw,
      "abort": _abort,
      "emscripten_memcpy_big": _emscripten_memcpy_big,
      "emscripten_resize_heap": _emscripten_resize_heap,
      "environ_get": _environ_get,
      "environ_sizes_get": _environ_sizes_get,
      "fd_close": _fd_close,
      "fd_read": _fd_read,
      "fd_seek": _fd_seek,
      "fd_write": _fd_write,
      "getentropy": _getentropy,
      "setTempRet0": _setTempRet0,
      "strftime_l": _strftime_l
    };
    var asm = createWasm();
    var ___wasm_call_ctors = Module2["___wasm_call_ctors"] = function() {
      return (___wasm_call_ctors = Module2["___wasm_call_ctors"] = Module2["asm"]["__wasm_call_ctors"]).apply(null, arguments);
    };
    var _wasm_number_of_sequences = Module2["_wasm_number_of_sequences"] = function() {
      return (_wasm_number_of_sequences = Module2["_wasm_number_of_sequences"] = Module2["asm"]["wasm_number_of_sequences"]).apply(null, arguments);
    };
    var _wasm_number_of_sequences_all = Module2["_wasm_number_of_sequences_all"] = function() {
      return (_wasm_number_of_sequences_all = Module2["_wasm_number_of_sequences_all"] = Module2["asm"]["wasm_number_of_sequences_all"]).apply(null, arguments);
    };
    var _wasm_get_gl_n_zm_size = Module2["_wasm_get_gl_n_zm_size"] = function() {
      return (_wasm_get_gl_n_zm_size = Module2["_wasm_get_gl_n_zm_size"] = Module2["asm"]["wasm_get_gl_n_zm_size"]).apply(null, arguments);
    };
    var _wasm_get_gl_n_zm = Module2["_wasm_get_gl_n_zm"] = function() {
      return (_wasm_get_gl_n_zm = Module2["_wasm_get_gl_n_zm"] = Module2["asm"]["wasm_get_gl_n_zm"]).apply(null, arguments);
    };
    var _malloc = Module2["_malloc"] = function() {
      return (_malloc = Module2["_malloc"] = Module2["asm"]["malloc"]).apply(null, arguments);
    };
    var _wasm_is_matrix_group = Module2["_wasm_is_matrix_group"] = function() {
      return (_wasm_is_matrix_group = Module2["_wasm_is_matrix_group"] = Module2["asm"]["wasm_is_matrix_group"]).apply(null, arguments);
    };
    var _wasm_matrix_det = Module2["_wasm_matrix_det"] = function() {
      return (_wasm_matrix_det = Module2["_wasm_matrix_det"] = Module2["asm"]["wasm_matrix_det"]).apply(null, arguments);
    };
    var _wasm_matrix_inverse_mod = Module2["_wasm_matrix_inverse_mod"] = function() {
      return (_wasm_matrix_inverse_mod = Module2["_wasm_matrix_inverse_mod"] = Module2["asm"]["wasm_matrix_inverse_mod"]).apply(null, arguments);
    };
    var _gol_create = Module2["_gol_create"] = function() {
      return (_gol_create = Module2["_gol_create"] = Module2["asm"]["gol_create"]).apply(null, arguments);
    };
    var _gol_destroy = Module2["_gol_destroy"] = function() {
      return (_gol_destroy = Module2["_gol_destroy"] = Module2["asm"]["gol_destroy"]).apply(null, arguments);
    };
    var _gol_init = Module2["_gol_init"] = function() {
      return (_gol_init = Module2["_gol_init"] = Module2["asm"]["gol_init"]).apply(null, arguments);
    };
    var _gol_random_init = Module2["_gol_random_init"] = function() {
      return (_gol_random_init = Module2["_gol_random_init"] = Module2["asm"]["gol_random_init"]).apply(null, arguments);
    };
    var _gol_random_init_seed = Module2["_gol_random_init_seed"] = function() {
      return (_gol_random_init_seed = Module2["_gol_random_init_seed"] = Module2["asm"]["gol_random_init_seed"]).apply(null, arguments);
    };
    var _gol_get_seed = Module2["_gol_get_seed"] = function() {
      return (_gol_get_seed = Module2["_gol_get_seed"] = Module2["asm"]["gol_get_seed"]).apply(null, arguments);
    };
    var _gol_evolve = Module2["_gol_evolve"] = function() {
      return (_gol_evolve = Module2["_gol_evolve"] = Module2["asm"]["gol_evolve"]).apply(null, arguments);
    };
    var _gol_set_topology = Module2["_gol_set_topology"] = function() {
      return (_gol_set_topology = Module2["_gol_set_topology"] = Module2["asm"]["gol_set_topology"]).apply(null, arguments);
    };
    var _gol_get_live_cells = Module2["_gol_get_live_cells"] = function() {
      return (_gol_get_live_cells = Module2["_gol_get_live_cells"] = Module2["asm"]["gol_get_live_cells"]).apply(null, arguments);
    };
    var _lr_create = Module2["_lr_create"] = function() {
      return (_lr_create = Module2["_lr_create"] = Module2["asm"]["lr_create"]).apply(null, arguments);
    };
    var _lr_destroy = Module2["_lr_destroy"] = function() {
      return (_lr_destroy = Module2["_lr_destroy"] = Module2["asm"]["lr_destroy"]).apply(null, arguments);
    };
    var _lr_order = Module2["_lr_order"] = function() {
      return (_lr_order = Module2["_lr_order"] = Module2["asm"]["lr_order"]).apply(null, arguments);
    };
    var _lr_evaluate = Module2["_lr_evaluate"] = function() {
      return (_lr_evaluate = Module2["_lr_evaluate"] = Module2["asm"]["lr_evaluate"]).apply(null, arguments);
    };
    var _lr_characteristic_polynomial = Module2["_lr_characteristic_polynomial"] = function() {
      return (_lr_characteristic_polynomial = Module2["_lr_characteristic_polynomial"] = Module2["asm"]["lr_characteristic_polynomial"]).apply(null, arguments);
    };
    var _lr_transition_matrix_size = Module2["_lr_transition_matrix_size"] = function() {
      return (_lr_transition_matrix_size = Module2["_lr_transition_matrix_size"] = Module2["asm"]["lr_transition_matrix_size"]).apply(null, arguments);
    };
    var _lr_transition_matrix_data = Module2["_lr_transition_matrix_data"] = function() {
      return (_lr_transition_matrix_data = Module2["_lr_transition_matrix_data"] = Module2["asm"]["lr_transition_matrix_data"]).apply(null, arguments);
    };
    var _lr_evaluate_poly_at_matrix = Module2["_lr_evaluate_poly_at_matrix"] = function() {
      return (_lr_evaluate_poly_at_matrix = Module2["_lr_evaluate_poly_at_matrix"] = Module2["asm"]["lr_evaluate_poly_at_matrix"]).apply(null, arguments);
    };
    var _wasm_matrix_power = Module2["_wasm_matrix_power"] = function() {
      return (_wasm_matrix_power = Module2["_wasm_matrix_power"] = Module2["asm"]["wasm_matrix_power"]).apply(null, arguments);
    };
    var _wasm_matrix_times_const = Module2["_wasm_matrix_times_const"] = function() {
      return (_wasm_matrix_times_const = Module2["_wasm_matrix_times_const"] = Module2["asm"]["wasm_matrix_times_const"]).apply(null, arguments);
    };
    var _wasm_matrix_add = Module2["_wasm_matrix_add"] = function() {
      return (_wasm_matrix_add = Module2["_wasm_matrix_add"] = Module2["asm"]["wasm_matrix_add"]).apply(null, arguments);
    };
    var _bars_game_create = Module2["_bars_game_create"] = function() {
      return (_bars_game_create = Module2["_bars_game_create"] = Module2["asm"]["bars_game_create"]).apply(null, arguments);
    };
    var _bars_game_destroy = Module2["_bars_game_destroy"] = function() {
      return (_bars_game_destroy = Module2["_bars_game_destroy"] = Module2["asm"]["bars_game_destroy"]).apply(null, arguments);
    };
    var _bars_game_set_seed = Module2["_bars_game_set_seed"] = function() {
      return (_bars_game_set_seed = Module2["_bars_game_set_seed"] = Module2["asm"]["bars_game_set_seed"]).apply(null, arguments);
    };
    var _bars_game_init = Module2["_bars_game_init"] = function() {
      return (_bars_game_init = Module2["_bars_game_init"] = Module2["asm"]["bars_game_init"]).apply(null, arguments);
    };
    var _bars_game_get_state = Module2["_bars_game_get_state"] = function() {
      return (_bars_game_get_state = Module2["_bars_game_get_state"] = Module2["asm"]["bars_game_get_state"]).apply(null, arguments);
    };
    var _bars_game_get_future_state = Module2["_bars_game_get_future_state"] = function() {
      return (_bars_game_get_future_state = Module2["_bars_game_get_future_state"] = Module2["asm"]["bars_game_get_future_state"]).apply(null, arguments);
    };
    var _bars_game_apply_choice = Module2["_bars_game_apply_choice"] = function() {
      return (_bars_game_apply_choice = Module2["_bars_game_apply_choice"] = Module2["asm"]["bars_game_apply_choice"]).apply(null, arguments);
    };
    var _bars_game_is_ended = Module2["_bars_game_is_ended"] = function() {
      return (_bars_game_is_ended = Module2["_bars_game_is_ended"] = Module2["asm"]["bars_game_is_ended"]).apply(null, arguments);
    };
    var _bars_game_state_size = Module2["_bars_game_state_size"] = function() {
      return (_bars_game_state_size = Module2["_bars_game_state_size"] = Module2["asm"]["bars_game_state_size"]).apply(null, arguments);
    };
    var _bars_game_num_choices = Module2["_bars_game_num_choices"] = function() {
      return (_bars_game_num_choices = Module2["_bars_game_num_choices"] = Module2["asm"]["bars_game_num_choices"]).apply(null, arguments);
    };
    var _bars_game_min_val = Module2["_bars_game_min_val"] = function() {
      return (_bars_game_min_val = Module2["_bars_game_min_val"] = Module2["asm"]["bars_game_min_val"]).apply(null, arguments);
    };
    var _bars_game_max_val = Module2["_bars_game_max_val"] = function() {
      return (_bars_game_max_val = Module2["_bars_game_max_val"] = Module2["asm"]["bars_game_max_val"]).apply(null, arguments);
    };
    var _wasm_graph_edge_count = Module2["_wasm_graph_edge_count"] = function() {
      return (_wasm_graph_edge_count = Module2["_wasm_graph_edge_count"] = Module2["asm"]["wasm_graph_edge_count"]).apply(null, arguments);
    };
    var _wasm_graph_all_pairs_bfs_distances = Module2["_wasm_graph_all_pairs_bfs_distances"] = function() {
      return (_wasm_graph_all_pairs_bfs_distances = Module2["_wasm_graph_all_pairs_bfs_distances"] = Module2["asm"]["wasm_graph_all_pairs_bfs_distances"]).apply(null, arguments);
    };
    var _wasm_graph_metric_dimension = Module2["_wasm_graph_metric_dimension"] = function() {
      return (_wasm_graph_metric_dimension = Module2["_wasm_graph_metric_dimension"] = Module2["asm"]["wasm_graph_metric_dimension"]).apply(null, arguments);
    };
    var ___errno_location = Module2["___errno_location"] = function() {
      return (___errno_location = Module2["___errno_location"] = Module2["asm"]["__errno_location"]).apply(null, arguments);
    };
    var _free = Module2["_free"] = function() {
      return (_free = Module2["_free"] = Module2["asm"]["free"]).apply(null, arguments);
    };
    var stackSave = Module2["stackSave"] = function() {
      return (stackSave = Module2["stackSave"] = Module2["asm"]["stackSave"]).apply(null, arguments);
    };
    var stackRestore = Module2["stackRestore"] = function() {
      return (stackRestore = Module2["stackRestore"] = Module2["asm"]["stackRestore"]).apply(null, arguments);
    };
    var stackAlloc = Module2["stackAlloc"] = function() {
      return (stackAlloc = Module2["stackAlloc"] = Module2["asm"]["stackAlloc"]).apply(null, arguments);
    };
    var dynCall_viijii = Module2["dynCall_viijii"] = function() {
      return (dynCall_viijii = Module2["dynCall_viijii"] = Module2["asm"]["dynCall_viijii"]).apply(null, arguments);
    };
    var dynCall_jiji = Module2["dynCall_jiji"] = function() {
      return (dynCall_jiji = Module2["dynCall_jiji"] = Module2["asm"]["dynCall_jiji"]).apply(null, arguments);
    };
    var dynCall_iiiiij = Module2["dynCall_iiiiij"] = function() {
      return (dynCall_iiiiij = Module2["dynCall_iiiiij"] = Module2["asm"]["dynCall_iiiiij"]).apply(null, arguments);
    };
    var dynCall_iiiiijj = Module2["dynCall_iiiiijj"] = function() {
      return (dynCall_iiiiijj = Module2["dynCall_iiiiijj"] = Module2["asm"]["dynCall_iiiiijj"]).apply(null, arguments);
    };
    var dynCall_iiiiiijj = Module2["dynCall_iiiiiijj"] = function() {
      return (dynCall_iiiiiijj = Module2["dynCall_iiiiiijj"] = Module2["asm"]["dynCall_iiiiiijj"]).apply(null, arguments);
    };
    var calledRun;
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = "Program terminated with exit(" + status + ")";
      this.status = status;
    }
    var calledMain = false;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function run(args) {
      args = args || arguments_;
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    Module2["run"] = run;
    function exit(status, implicit) {
      EXITSTATUS = status;
      if (keepRuntimeAlive()) {
      } else {
        exitRuntime();
      }
      procExit(status);
    }
    function procExit(code) {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module2["onExit"]) Module2["onExit"](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    return Module2.ready;
  });
})();
var wasm_sample_default = Module;

// tsl/wasm_api.ts
var moduleInstance = null;
async function createModulePromise() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  const inNode = typeof proc?.versions?.node === "string";
  if (inNode) {
    const nodeFs = "node:fs";
    const nodeUrl = "node:url";
    const nodePath = "node:path";
    const fs = await import(nodeFs);
    const url = await import(nodeUrl);
    const path = await import(nodePath);
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    const mod2 = await wasm_sample_default({ wasmBinary });
    moduleInstance = mod2;
    return mod2;
  }
  const mod = await wasm_sample_default();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m2 = moduleInstance;
  const HEAP32 = m2.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
var BARS_GAME_BASE_INTS = 1280;
var barsGameHandle = null;
var m = () => moduleInstance;
function barsGameCreate() {
  if (!moduleInstance) throw new Error("WASM module not initialized.");
  if (barsGameHandle !== null) {
    m()._bars_game_destroy(barsGameHandle);
  }
  barsGameHandle = m()._bars_game_create();
}
function barsGameSetSeed(seed) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_set_seed(barsGameHandle, seed);
}
function barsGameInit() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_init(barsGameHandle);
}
function barsGameGetState() {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_state(barsGameHandle, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameGetFutureState(choiceIndex) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  const HEAP32 = getHeap32();
  const size = m()._bars_game_state_size(barsGameHandle);
  if (HEAP32.length < BARS_GAME_BASE_INTS + size) throw new Error("WASM memory exhausted");
  m()._bars_game_get_future_state(barsGameHandle, choiceIndex, BARS_GAME_BASE_INTS * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[BARS_GAME_BASE_INTS + i]);
  return out;
}
function barsGameApplyChoice(index) {
  if (!moduleInstance || barsGameHandle === null) throw new Error("Bars game not created. Call barsGameCreate first.");
  m()._bars_game_apply_choice(barsGameHandle, index);
}
function barsGameIsEnded() {
  if (!moduleInstance || barsGameHandle === null) return true;
  return m()._bars_game_is_ended(barsGameHandle) !== 0;
}
function barsGameStateSize() {
  if (!moduleInstance || barsGameHandle === null) return 0;
  return m()._bars_game_state_size(barsGameHandle);
}
function barsGameMaxVal() {
  if (!moduleInstance || barsGameHandle === null) return 2e3;
  return m()._bars_game_max_val(barsGameHandle);
}

// page/bars_game_themes.ts
function txt(b, l) {
  return b[l];
}
var NEUTRAL_THRESHOLD = 50;
function classifyDeltas(state, future) {
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const d = future[i] - state[i];
    if (d > NEUTRAL_THRESHOLD) {
      r[i] = 1;
    } else if (d < -NEUTRAL_THRESHOLD) {
      r[i] = -1;
    }
  }
  return r;
}
function scorePattern(pattern, actual) {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    if (pattern[i] === actual[i]) {
      s += 2;
    } else if (pattern[i] === 0 || actual[i] === 0) {
      s += 1;
    }
  }
  return s;
}
function findMatchingScenario(scenarios, actual0, actual1, rng) {
  if (scenarios.length === 0) {
    return null;
  }
  let best = -1;
  const pool = [];
  for (const sc2 of scenarios) {
    const scoreAB = scorePattern(sc2.patternA, actual0) + scorePattern(sc2.patternB, actual1);
    const scoreBA = scorePattern(sc2.patternA, actual1) + scorePattern(sc2.patternB, actual0);
    const s = Math.max(scoreAB, scoreBA);
    const swapped = scoreBA > scoreAB;
    if (s > best) {
      best = s;
      pool.length = 0;
      pool.push({ scenario: sc2, swapped });
    } else if (s === best) {
      pool.push({ scenario: sc2, swapped });
    }
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(rng() * pool.length)];
}
function getFailureText(theme, state, maxVal, lang) {
  for (let i = 0; i < 4; i++) {
    if (state[i] <= 0) {
      return txt(theme.failLow[i], lang);
    }
    if (state[i] >= maxVal) {
      return txt(theme.failHigh[i], lang);
    }
  }
  return "";
}
function t(cn, en) {
  return { cn, en };
}
function sc(bg, a, pa, b, pb) {
  return { background: bg, choiceA: a, choiceB: b, patternA: pa, patternB: pb };
}
var medievalKingdom = {
  name: t("\u4E2D\u4E16\u7EAA\u738B\u56FD", "Medieval Kingdom"),
  labels: [t("\u56FD\u5E93", "Treasury"), t("\u519B\u529B", "Military"), t("\u6C11\u5FC3", "People"), t("\u4FE1\u4EF0", "Faith")],
  failLow: [
    t("\u738B\u56FD\u7834\u4EA7\uFF0C\u503A\u4E3B\u593A\u53D6\u4E86\u738B\u4F4D\u3002", "The kingdom is bankrupt. Creditors seize the throne."),
    t("\u519B\u961F\u5C3D\u5931\uFF0C\u4FB5\u7565\u8005\u957F\u9A71\u76F4\u5165\u3002", "With no army left, invaders overrun the kingdom."),
    t("\u767E\u59D3\u5C3D\u6563\uFF0C\u738B\u56FD\u6CA6\u4E3A\u65E0\u4EBA\u4E4B\u5730\u3002", "The last citizens flee. The kingdom is a ghost land."),
    t("\u4FE1\u4EF0\u5D29\u584C\uFF0C\u9ED1\u6697\u4E0E\u7EDD\u671B\u541E\u566C\u4E86\u738B\u56FD\u3002", "All faith is lost. Darkness and despair consume the realm.")
  ],
  failHigh: [
    t("\u8D22\u5BCC\u8150\u8680\u671D\u5EF7\uFF0C\u9769\u547D\u7206\u53D1\u3002", "Obscene wealth corrupts the court. Revolution erupts."),
    t("\u5C06\u519B\u52BF\u529B\u8FC7\u5927\uFF0C\u53D1\u52A8\u653F\u53D8\u3002", "The generals grow too powerful and stage a coup."),
    t("\u519C\u6C11\u63A8\u7FFB\u541B\u4E3B\u5236\uFF0C\u6C11\u53D8\u56DB\u8D77\u3002", "The peasants overthrow the monarchy in a populist uprising."),
    t("\u72C2\u70ED\u4FE1\u5F92\u593A\u6743\uFF0C\u795E\u6743\u7EDF\u6CBB\u964D\u4E34\u3002", "Zealots seize absolute power. A theocracy is born.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u652F\u5546\u961F\u62B5\u8FBE\u57CE\u95E8", "A merchant caravan arrives at the gates"),
      t("\u70ED\u60C5\u8FCE\u63A5", "Welcome them warmly"),
      [1, 0, 1, 0],
      t("\u5F81\u6536\u91CD\u7A0E", "Demand heavy tolls"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u90BB\u56FD\u63D0\u8BAE\u7ED3\u76DF", "The neighboring kingdom proposes an alliance"),
      t("\u63A5\u53D7\u6761\u4EF6", "Accept their terms"),
      [-1, 1, 1, 0],
      t("\u62D2\u7EDD\u5E76\u589E\u5175\u8FB9\u5883", "Reject and arm the border"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u6559\u4F1A\u8BF7\u6C42\u62E8\u6B3E\u4FEE\u5EFA\u5927\u6559\u5802", "The church requests funds for a cathedral"),
      t("\u62E8\u6B3E\u4FEE\u5EFA", "Fund the cathedral"),
      [-1, 0, 1, 1],
      t("\u5C06\u8D44\u91D1\u8F6C\u7ED9\u519B\u961F", "Redirect funds to the army"),
      [-1, 1, -1, -1]
    ),
    sc(
      t("\u571F\u532A\u5728\u4E61\u95F4\u8086\u8650", "Bandits terrorize the countryside"),
      t("\u6D3E\u5175\u527F\u706D", "Send troops to hunt them"),
      [-1, 1, 1, 0],
      t("\u62DB\u5B89\u571F\u532A", "Offer the bandits amnesty"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u761F\u75AB\u5A01\u80C1\u57CE\u5E02", "A plague threatens the city"),
      t("\u9694\u79BB\u6551\u6CBB\u75C5\u4EBA", "Quarantine and treat the sick"),
      [-1, 0, 1, 0],
      t("\u5BA3\u5E03\u5168\u6C11\u7948\u7977", "Declare days of prayer"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u519C\u6C11\u8981\u6C42\u51CF\u7A0E", "Peasants demand lower taxes"),
      t("\u964D\u4F4E\u8D4B\u7A0E", "Lower taxes to ease the burden"),
      [-1, 0, 1, 0],
      t("\u65E0\u89C6\u8BC9\u6C42", "Ignore their pleas"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u5C71\u4E2D\u53D1\u73B0\u91D1\u77FF", "Gold is discovered in the mountains"),
      t("\u5F00\u653E\u516C\u5171\u77FF\u573A", "Open public mines"),
      [1, 0, 1, -1],
      t("\u6536\u5F52\u7687\u5BA4\u6240\u6709", "Claim royal ownership"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u5F02\u56FD\u738B\u5B50\u6C42\u5A5A", "A foreign prince offers marriage"),
      t("\u63A5\u53D7\u8054\u59FB", "Accept the match"),
      [1, 1, 0, -1],
      t("\u5A49\u8A00\u8C22\u7EDD", "Politely decline"),
      [0, -1, 1, 1]
    ),
    sc(
      t("\u519B\u961F\u8981\u6C42\u52A0\u9977", "The army demands better pay"),
      t("\u63D0\u9AD8\u519B\u9977", "Increase military wages"),
      [-1, 1, 0, 0],
      t("\u8BB8\u4EE5\u8363\u8000", "Promise glory instead"),
      [0, -1, -1, 1]
    ),
    sc(
      t("\u5F02\u7AEF\u5728\u5E7F\u573A\u5E03\u9053", "Heretics preach in the town square"),
      t("\u902E\u6355\u5E76\u9A71\u9010", "Arrest and silence them"),
      [0, 0, -1, 1],
      t("\u5141\u8BB8\u81EA\u7531\u8FA9\u8BBA", "Allow free discourse"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u6218\u4E71\u56FD\u5EA6\u7684\u96BE\u6C11\u6D8C\u6765", "Refugees arrive from a war-torn land"),
      t("\u6536\u5BB9\u96BE\u6C11", "Welcome them in"),
      [-1, -1, 1, 1],
      t("\u5173\u95ED\u8FB9\u5883", "Close the borders"),
      [0, 1, -1, -1]
    ),
    sc(
      t("\u6709\u4EBA\u63D0\u8BAE\u4E3E\u529E\u9A91\u58EB\u6BD4\u6B66", "A jousting tournament is proposed"),
      t("\u51FA\u8D44\u4E3B\u529E", "Fund and host the event"),
      [-1, 1, 1, 0],
      t("\u53D6\u6D88\u4EE5\u8282\u7701\u5F00\u652F", "Cancel for austerity"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u68EE\u6797\u4E2D\u53D1\u73B0\u53E4\u4EE3\u9057\u8FF9", "An ancient ruin is found in the forest"),
      t("\u53D1\u6398\u5B9D\u85CF", "Excavate for treasure"),
      [1, 0, 0, -1],
      t("\u5C06\u5176\u8BBE\u4E3A\u5723\u6240", "Consecrate it as a shrine"),
      [-1, 0, 0, 1]
    ),
    sc(
      t("\u4E30\u6536\u8282\u5373\u5C06\u6765\u4E34", "The harvest festival approaches"),
      t("\u4E3E\u529E\u76DB\u5927\u5E86\u5178", "Host a grand celebration"),
      [-1, 0, 1, 1],
      t("\u7701\u4E0B\u91D1\u5E01", "Skip it to save gold"),
      [1, 0, -1, -1]
    ),
    sc(
      t("\u57CE\u5821\u4E2D\u6293\u5230\u4E00\u540D\u95F4\u8C0D", "A spy is caught in the castle"),
      t("\u516C\u5F00\u5904\u51B3", "Execute him publicly"),
      [0, 1, -1, 1],
      t("\u7B56\u53CD\u4E3A\u53CC\u9762\u95F4\u8C0D", "Turn him as a double agent"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u6D77\u76D7\u88AD\u51FB\u6CBF\u6D77\u6751\u5E84", "Pirates raid the coastal villages"),
      t("\u6D3E\u51FA\u6D77\u519B", "Deploy the navy"),
      [-1, 1, 0, 0],
      t("\u8C08\u5224\u8D4E\u91D1", "Negotiate a ransom"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u65C5\u884C\u5B66\u8005\u524D\u6765\u732E\u7B56", "A traveling scholar offers rare knowledge"),
      t("\u6B22\u8FCE\u5176\u8BB2\u5B66", "Welcome his teachings"),
      [0, 0, 1, -1],
      t("\u711A\u5176\u4E66\u7C4D\u4E3A\u5F02\u7AEF", "Burn his books as heresy"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u56FD\u5E93\u5373\u5C06\u6EE1\u6EA2", "The royal treasury is nearly full"),
      t("\u6295\u8D44\u516C\u5171\u8BBE\u65BD", "Invest in public works"),
      [-1, 0, 1, 0],
      t("\u6269\u5145\u519B\u961F", "Expand the military"),
      [-1, 1, 0, 0]
    ),
    sc(
      t("\u72FC\u7FA4\u88AD\u51FB\u6751\u5E84\u7272\u755C", "Wolves attack livestock in the villages"),
      t("\u7EC4\u7EC7\u7687\u5BB6\u72E9\u730E", "Organize a royal hunt"),
      [-1, 1, 1, 0],
      t("\u8BA9\u519C\u6C11\u81EA\u884C\u5904\u7406", "Let the farmers handle it"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u56FD\u738B\u7684\u987E\u95EE\u5EFA\u8BAE\u52A0\u7A0E", "The king's advisor suggests raising taxes"),
      t("\u9002\u5EA6\u52A0\u7A0E", "Raise taxes moderately"),
      [1, 0, -1, 0],
      t("\u7EF4\u6301\u73B0\u72B6", "Keep taxes as they are"),
      [0, 0, 1, 0]
    )
  ]
};
var spaceColony = {
  name: t("\u592A\u7A7A\u6B96\u6C11\u5730", "Space Colony"),
  labels: [t("\u80FD\u6E90", "Energy"), t("\u7CAE\u98DF", "Food"), t("\u58EB\u6C14", "Morale"), t("\u79D1\u6280", "Technology")],
  failLow: [
    t("\u5168\u9762\u65AD\u7535\uFF0C\u751F\u547D\u7EF4\u6301\u7CFB\u7EDF\u9677\u5165\u9ED1\u6697\u3002", "Total power failure. Life support goes dark."),
    t("\u9965\u8352\u8513\u5EF6\uFF0C\u6B96\u6C11\u5730\u65E0\u6CD5\u7EF4\u7EED\u3002", "Starvation sets in. The colony cannot survive."),
    t("\u5168\u9762\u53DB\u53D8\uFF0C\u8239\u5458\u653E\u5F03\u4E86\u4EFB\u52A1\u3002", "Complete mutiny. The crew abandons the mission."),
    t("\u5173\u952E\u7CFB\u7EDF\u5931\u6548\uFF0C\u6B96\u6C11\u5730\u9000\u56DE\u6DF7\u4E71\u3002", "Critical systems lost. The colony regresses to chaos.")
  ],
  failHigh: [
    t("\u53CD\u5E94\u5806\u8FC7\u8F7D\uFF0C\u6B96\u6C11\u5730\u5728\u7206\u70B8\u4E2D\u6BC1\u706D\u3002", "Reactor overload. The colony is consumed in a blast."),
    t("\u751F\u7269\u8D28\u5931\u63A7\u751F\u957F\uFF0C\u6DF9\u6CA1\u4E86\u7A7A\u95F4\u7AD9\u3002", "Uncontrolled growth overruns the station with bio-mass."),
    t("\u8239\u5458\u8FC7\u5EA6\u4E50\u89C2\u758F\u5FFD\u804C\u5B88\uFF0C\u7CFB\u7EDF\u6084\u7136\u5D29\u6E83\u3002", "Euphoric crew neglects duties. Systems fail unnoticed."),
    t("AI\u5B9E\u73B0\u5947\u70B9\uFF0C\u5B83\u4E0D\u518D\u9700\u8981\u4EBA\u7C7B\u3002", "The AI achieves singularity. It no longer needs humans.")
  ],
  scenarios: [
    sc(
      t("\u592A\u9633\u80FD\u677F\u9635\u5217\u6025\u9700\u4FEE\u7406", "Solar panel array needs urgent repairs"),
      t("\u8C03\u6D3E\u8239\u5458\u4FEE\u590D", "Divert crew to fix them"),
      [1, 0, -1, 0],
      t("\u9650\u7535\u5E94\u6025", "Ration power instead"),
      [-1, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u9897\u6D41\u6D6A\u5C0F\u884C\u661F\u903C\u8FD1\u7A7A\u95F4\u7AD9", "A rogue asteroid approaches the station"),
      t("\u542F\u52A8\u9632\u5FA1\u6FC0\u5149", "Activate defense lasers"),
      [-1, 0, -1, 1],
      t("\u758F\u6563\u81F3\u907F\u96BE\u6240", "Evacuate to the shelters"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u79D1\u5B66\u5BB6\u63D0\u8BAE\u4E00\u9879\u9AD8\u98CE\u9669\u5B9E\u9A8C", "Scientists propose a risky experiment"),
      t("\u6279\u51C6\u5B9E\u9A8C", "Approve the experiment"),
      [-1, -1, 0, 1],
      t("\u4F18\u5148\u4FDD\u969C\u5B89\u5168", "Prioritize colony safety"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u6C34\u57F9\u4ED3\u66B4\u53D1\u771F\u83CC\u611F\u67D3", "Hydroponic bay has a fungal outbreak"),
      t("\u711A\u6BC1\u5E76\u91CD\u65B0\u79CD\u690D", "Burn and replant everything"),
      [-1, -1, -1, 0],
      t("\u5C1D\u8BD5\u5B9E\u9A8C\u6027\u6740\u83CC\u5242", "Try experimental fungicide"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u8FDC\u7A0B\u626B\u63CF\u4EEA\u53D1\u73B0\u4E00\u8258\u8865\u7ED9\u8239", "A supply ship appears on long-range scanners"),
      t("\u6D88\u8017\u71C3\u6599\u524D\u5F80\u62E6\u622A", "Burn fuel to intercept it"),
      [-1, 1, 1, 0],
      t("\u8010\u5FC3\u7B49\u5F85", "Wait for it patiently"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u8239\u5458\u8BF7\u6C42\u4F11\u606F\u65E5", "Crew requests a recreation day"),
      t("\u6279\u51C6\u5168\u5929\u4F11\u5047", "Grant a full day off"),
      [-1, 0, 1, -1],
      t("\u5B89\u6392\u534A\u5929\u8F6E\u4F11", "Offer half-day rotations"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u9644\u8FD1\u53D1\u73B0\u5730\u70ED\u55B7\u53E3", "A geothermal vent is found nearby"),
      t("\u5F00\u91C7\u80FD\u6E90", "Tap it for energy"),
      [1, 0, -1, 0],
      t("\u91C7\u96C6\u7814\u7A76\u6570\u636E", "Study it for research data"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u751F\u547D\u7EF4\u6301\u7CFB\u7EDF\u4E8C\u6C27\u5316\u78B3\u6D53\u5EA6\u4E0A\u5347", "Life support CO2 levels are rising"),
      t("\u589E\u5F3A\u51C0\u5316\u5668\u529F\u7387", "Boost scrubber power"),
      [-1, 0, 1, 0],
      t("\u7D27\u6025\u79CD\u690D\u85FB\u7C7B", "Plant emergency algae crops"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u901A\u8BAF\u9635\u5217\u622A\u83B7\u4E00\u6BB5\u4FE1\u53F7", "Communication array picks up a signal"),
      t("\u8C03\u67E5\u4FE1\u53F7\u6765\u6E90", "Investigate the source"),
      [-1, 0, 0, 1],
      t("\u5E7F\u64AD\u4EE5\u9F13\u821E\u58EB\u6C14", "Broadcast it to boost morale"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u6C34\u5FAA\u73AF\u88C5\u7F6E\u6545\u969C", "Water recycler is failing"),
      t("\u5168\u529B\u7EF4\u4FEE\uFF0C\u8C03\u914D\u8D44\u6E90", "Full repair \u2014 divert resources"),
      [-1, -1, 0, 0],
      t("\u4E34\u65F6\u4FEE\u8865\u51D1\u5408", "Jury-rig a temporary fix"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u540D\u8239\u5458\u60F3\u5F00\u8F9F\u82B1\u56ED", "A crew member wants to start a garden"),
      t("\u5206\u914D\u7A7A\u95F4\u548C\u79CD\u5B50", "Allocate space and seeds"),
      [-1, 1, 1, 0],
      t("\u62D2\u7EDD\uFF0C\u8D44\u6E90\u7D27\u5F20", "Deny \u2014 too many resources"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u5730\u8868\u53D1\u73B0\u65B0\u77FF\u85CF", "New mineral deposits found on the surface"),
      t("\u5F00\u91C7\u7528\u4E8E\u5EFA\u8BBE", "Mine for construction"),
      [1, 0, -1, 0],
      t("\u5206\u6790\u4EE5\u7814\u53D1\u65B0\u6280\u672F", "Analyze for new tech"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u7535\u7F51\u6EE1\u8D1F\u8377\u8FD0\u884C", "Power grid is running at full capacity"),
      t("\u4FEE\u5EFA\u65B0\u592A\u9633\u80FD\u9635\u5217", "Build a new solar array"),
      [-1, 0, 0, 1],
      t("\u5B9E\u65BD\u8F6E\u6D41\u505C\u7535", "Implement rolling blackouts"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u4E00\u540D\u8239\u5458\u751F\u65E5\u5C06\u81F3", "A crew birthday is coming up"),
      t("\u4E3E\u529E\u60CA\u559C\u6D3E\u5BF9", "Throw a surprise party"),
      [-1, -1, 1, 0],
      t("\u7167\u5E38\u5DE5\u4F5C", "Business as usual"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u539F\u578B\u805A\u53D8\u7535\u6C60\u53EF\u4EE5\u6D4B\u8BD5\u4E86", "Prototype fusion cell ready for testing"),
      t("\u7ACB\u5373\u6D4B\u8BD5", "Test it immediately"),
      [1, 0, -1, 1],
      t("\u5148\u8FDB\u884C\u66F4\u591A\u6A21\u62DF", "Run more simulations first"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u6C27\u6C14\u5FAA\u73AF\u6548\u7387\u4E0B\u964D", "Oxygen recycling efficiency is declining"),
      t("\u5168\u9762\u68C0\u4FEE\u7CFB\u7EDF", "Overhaul the system"),
      [-1, 0, -1, 1],
      t("\u591A\u79CD\u690D\u4F9B\u6C27\u690D\u7269", "Grow more oxygen plants"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u884C\u661F\u6838\u5FC3\u4F20\u6765\u5F02\u5E38\u8BFB\u6570", "Strange readings from the planet's core"),
      t("\u6D3E\u9063\u63A2\u6D4B\u961F", "Send a probe expedition"),
      [-1, 0, -1, 1],
      t("\u8FDC\u7A0B\u76D1\u63A7", "Monitor remotely"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u8239\u5458\u56E0\u5DE5\u4F5C\u8D1F\u62C5\u4EA7\u751F\u6469\u64E6", "Crew tensions rising over workload"),
      t("\u5F3A\u5236\u8F6E\u4F11\u5236\u5EA6", "Mandatory rest rotations"),
      [0, -1, 1, -1],
      t("\u53D1\u653E\u5956\u91D1\u6FC0\u52B1", "Incentivize with bonuses"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u65E7\u8BBE\u5907\u53EF\u4EE5\u62A5\u5E9F", "Old equipment can be scrapped"),
      t("\u62C6\u89E3\u83B7\u53D6\u539F\u6750\u6599", "Scrap for raw materials"),
      [1, 0, 0, -1],
      t("\u6539\u88C5\u7528\u4E8E\u7814\u7A76", "Repurpose for research"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u9897\u51B0\u8D28\u5F57\u661F\u7ECF\u8FC7\u9644\u8FD1", "An ice comet passes within range"),
      t("\u91C7\u96C6\u6C34\u51B0\u7528\u4E8E\u79CD\u690D", "Harvest water ice for crops"),
      [0, 1, -1, 0],
      t("\u62CD\u6444\u7167\u7247\u9F13\u821E\u58EB\u6C14", "Photograph it for morale"),
      [0, 0, 1, 0]
    )
  ]
};
var pirateCaptain = {
  name: t("\u6D77\u76D7\u8239\u957F", "Pirate Captain"),
  labels: [t("\u91D1\u5E01", "Gold"), t("\u8239\u5458", "Crew"), t("\u8239\u51B5", "Ship"), t("\u58F0\u671B", "Reputation")],
  failLow: [
    t("\u4E00\u4E2A\u94DC\u677F\u4E0D\u5269\uFF0C\u8239\u5458\u54D7\u53D8\u3002", "Not a doubloon left. Your crew turns to mutiny."),
    t("\u8239\u4E0A\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u4F60\u72EC\u81EA\u6F02\u6D41\u3002", "No crew remains. You drift alone into the abyss."),
    t("\u8239\u6C89\u6D77\u5E95\uFF0C\u4E00\u5207\u5316\u4E3A\u4E4C\u6709\u3002", "The ship sinks beneath the waves. All is lost."),
    t("\u4F60\u7684\u540D\u5B57\u88AB\u9057\u5FD8\uFF0C\u65E0\u6E2F\u53EF\u6CCA\u3002", "Your name is forgotten. No port will have you.")
  ],
  failHigh: [
    t("\u4F60\u7684\u5B9D\u85CF\u5F15\u6765\u4E86\u5404\u56FD\u6D77\u519B\u3002", "Your legendary hoard attracts every navy in the world."),
    t("\u8239\u4E0A\u6D77\u76D7\u592A\u591A\uFF0C\u5185\u8BA7\u4F7F\u4F60\u6C89\u8239\u3002", "Too many pirates aboard. Chaos and infighting sink you."),
    t("\u6218\u8230\u6210\u4E3A\u4F20\u5947\uFF0C\u5F15\u6765\u65E0\u5C3D\u6311\u6218\u8005\u3002", "The ship becomes a floating legend, drawing endless challengers."),
    t("\u6076\u540D\u60CA\u52A8\u7687\u5BB6\u8230\u961F\u5168\u9762\u8FFD\u527F\u3002", "Your infamy brings the entire royal armada after you.")
  ],
  scenarios: [
    sc(
      t("\u8FDC\u5904\u53D1\u73B0\u4E00\u8258\u5546\u8239", "A merchant vessel spotted on the horizon"),
      t("\u53D1\u8D77\u653B\u51FB\u63A0\u593A", "Attack and plunder"),
      [1, -1, -1, 1],
      t("\u6536\u53D6\u8FC7\u8DEF\u8D39\u653E\u884C", "Offer safe passage for a fee"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u5927\u526F\u63D0\u8BAE\u5236\u5B9A\u65B0\u8239\u89C4", "Your first mate proposes new crew rules"),
      t("\u5E73\u5206\u6218\u5229\u54C1", "Share the loot equally"),
      [-1, 1, 0, 0],
      t("\u94C1\u8155\u7EDF\u6CBB", "Rule with an iron fist"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u573A\u66B4\u98CE\u5373\u5C06\u6765\u88AD", "A fierce storm approaches"),
      t("\u76F4\u63A5\u7A7F\u8D8A\u98CE\u66B4", "Sail straight through it"),
      [0, -1, -1, 1],
      t("\u627E\u6D77\u6E7E\u907F\u98CE", "Seek shelter in a cove"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u6E2F\u53E3\u5C0F\u9547\u6B63\u5728\u4E3E\u884C\u5E86\u5178", "A port town is hosting a festival"),
      t("\u8BA9\u8239\u5458\u4E0A\u5CB8\u4F11\u606F", "Give crew shore leave"),
      [-1, 1, 0, 0],
      t("\u8D81\u9632\u5B88\u677E\u61C8\u7A81\u88AD", "Raid while defenses are down"),
      [1, -1, -1, 1]
    ),
    sc(
      t("\u8239\u8EAB\u9700\u8981\u4FEE\u7406", "The ship needs hull repairs"),
      t("\u82B1\u94B1\u8BF7\u4EBA\u4FEE\u7F2E", "Pay for proper repairs"),
      [-1, 0, 1, 0],
      t("\u8239\u5458\u81EA\u5DF1\u4FEE\u8865", "Crew patches it themselves"),
      [0, -1, 0, -1]
    ),
    sc(
      t("\u654C\u5BF9\u6D77\u76D7\u4E0B\u6218\u4E66", "Rival pirates challenge you to a duel"),
      t("\u63A5\u53D7\u6311\u6218", "Accept the challenge"),
      [0, 0, -1, 1],
      t("\u667A\u53D6\u5BF9\u624B", "Outsmart them instead"),
      [1, 1, 0, -1]
    ),
    sc(
      t("\u4E00\u5F20\u85CF\u5B9D\u56FE\u843D\u5165\u624B\u4E2D", "A treasure map falls into your hands"),
      t("\u7ACB\u5373\u5BFB\u5B9D", "Follow the map immediately"),
      [1, -1, -1, 0],
      t("\u5356\u7ED9\u51FA\u4EF7\u6700\u9AD8\u8005", "Sell it to the highest bidder"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u6D77\u519B\u5728\u9644\u8FD1\u5DE1\u903B", "Navy ships patrol nearby waters"),
      t("\u591C\u95F4\u6084\u6084\u6E9C\u8FC7", "Slip past under cover of night"),
      [0, 0, 1, 0],
      t("\u6B63\u9762\u4EA4\u950B", "Engage and show no fear"),
      [-1, -1, -1, 1]
    ),
    sc(
      t("\u7532\u677F\u4E0B\u53D1\u73B0\u5077\u6E21\u5BA2", "A stowaway is found below deck"),
      t("\u6536\u7F16\u5165\u4F19", "Welcome them aboard"),
      [0, 1, 0, -1],
      t("\u6D41\u653E\u8352\u5C9B", "Maroon them on an island"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u6717\u59C6\u9152\u5E93\u5B58\u89C1\u5E95", "Cargo hold is running low on rum"),
      t("\u5230\u4E0B\u4E2A\u6E2F\u53E3\u91C7\u8D2D", "Buy rum at the next port"),
      [-1, 1, 0, 0],
      t("\u7F29\u51CF\u914D\u7ED9", "Tighten rations"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u4FD8\u864F\u7684\u6C34\u624B\u613F\u610F\u63D0\u4F9B\u60C5\u62A5", "A captured sailor offers information"),
      t("\u91CA\u653E\u6362\u60C5\u62A5", "Free him for the intel"),
      [0, 0, 0, 1],
      t("\u7D22\u8981\u8D4E\u91D1", "Ransom him back"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u8239\u5E95\u957F\u6EE1\u85E4\u58F6\uFF0C\u901F\u5EA6\u4E0B\u964D", "Barnacles coat the hull, slowing you down"),
      t("\u9760\u5CB8\u6E05\u7406", "Beach the ship and scrape"),
      [0, -1, 1, 0],
      t("\u5148\u7EE7\u7EED\u822A\u884C", "Keep sailing, deal with it later"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8D35\u65CF\u63D0\u4F9B\u96C7\u4F63\u5408\u540C", "A wealthy nobleman offers a contract"),
      t("\u63A5\u53D7\u79C1\u63A0\u4EFB\u52A1", "Accept the privateer job"),
      [1, 0, 0, 1],
      t("\u6D77\u76D7\u4E0D\u4E3A\u4EBA\u5356\u547D", "Pirates answer to no one"),
      [-1, 1, 0, 1]
    ),
    sc(
      t("\u8239\u5458\u8981\u9009\u4E3E\u65B0\u519B\u9700\u5B98", "Crew wants to elect a new quartermaster"),
      t("\u5141\u8BB8\u6295\u7968", "Allow the vote"),
      [0, 1, 0, 0],
      t("\u6307\u5B9A\u4F60\u7684\u5FC3\u8179", "Appoint your loyal ally"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u53D1\u73B0\u4E00\u5EA7\u6709\u91CE\u5473\u7684\u5C9B\u5C7F", "An island with wild game is spotted"),
      t("\u4E0A\u5CB8\u730E\u98DF", "Hunt and feast ashore"),
      [-1, 1, 0, 0],
      t("\u7EE7\u7EED\u8D76\u8DEF", "Press on to the next target"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u8258\u5E7D\u7075\u8239\u6F02\u5165\u89C6\u7EBF", "A ghost ship drifts into your path"),
      t("\u767B\u8239\u641C\u522E", "Board and salvage it"),
      [1, -1, 0, 0],
      t("\u907F\u5F00\uFF0C\u53EF\u80FD\u6709\u8BC5\u5492", "Avoid it \u2014 could be cursed"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u9886\u822A\u5458\u5EFA\u8BAE\u65B0\u822A\u7EBF", "Your navigator suggests a new route"),
      t("\u5C1D\u8BD5\u65B0\u8DEF\u7EBF", "Try the new route"),
      [1, 0, 1, 0],
      t("\u8D70\u8001\u8DEF", "Stick to known waters"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E00\u5EA7\u6D77\u5CB8\u5821\u5792\u9632\u5B88\u8584\u5F31", "A coastal fort has weak defenses"),
      t("\u53D1\u8D77\u7A81\u88AD", "Storm the fort"),
      [1, -1, -1, 1],
      t("\u7ED5\u9053\u907F\u9669", "Bypass and avoid the risk"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u9644\u8FD1\u4F20\u95FB\u6709\u6D77\u602A\u51FA\u6CA1", "A sea monster is rumored nearby"),
      t("\u730E\u6740\u4EE5\u626C\u540D", "Hunt it for glory"),
      [0, -1, -1, 1],
      t("\u6539\u53D8\u822A\u7EBF", "Change course to safety"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u63A0\u6765\u7684\u8D27\u7269\u9700\u8981\u51FA\u624B", "Captured loot needs to be fenced"),
      t("\u5728\u9ED1\u5E02\u51FA\u552E", "Sell at a shady port"),
      [1, 0, -1, -1],
      t("\u7B49\u66F4\u597D\u7684\u4E70\u5BB6", "Wait for a better buyer"),
      [0, 0, 0, 1]
    )
  ]
};
var startupCeo = {
  name: t("\u521B\u4E1A\u516C\u53F8", "Startup CEO"),
  labels: [t("\u8D44\u91D1", "Funding"), t("\u56E2\u961F", "Team"), t("\u4EA7\u54C1", "Product"), t("\u7528\u6237", "Users")],
  failLow: [
    t("\u516C\u53F8\u8D44\u91D1\u8017\u5C3D\uFF0C\u6C38\u8FDC\u5173\u95E8\u5927\u5409\u3002", "The company runs out of money. Doors close forever."),
    t("\u6240\u6709\u4EBA\u8F9E\u804C\uFF0C\u521B\u4E1A\u516C\u53F8\u65E0\u4EBA\u53EF\u7528\u3002", "Everyone quits. The startup dies with no one left."),
    t("\u4EA7\u54C1\u65E0\u6CD5\u4F7F\u7528\uFF0C\u7528\u6237\u7EB7\u7EB7\u79BB\u5F00\u3002", "The product is unusable. Users abandon ship."),
    t("\u7528\u6237\u5F52\u96F6\uFF0C\u6295\u8D44\u4EBA\u64A4\u8D44\u3002", "Zero users remain. Investors pull the plug.")
  ],
  failHigh: [
    t("\u6295\u8D44\u4EBA\u593A\u53D6\u63A7\u5236\u6743\uFF0C\u521B\u59CB\u4EBA\u88AB\u8E22\u51FA\u5C40\u3002", "Investors seize control. The founder is ousted."),
    t("\u56E2\u961F\u8FC7\u4E8E\u5E9E\u5927\uFF0C\u5B98\u50DA\u4E3B\u4E49\u627C\u6740\u521B\u65B0\u3002", "The team is too large to manage. Bureaucracy kills innovation."),
    t("\u8FC7\u5EA6\u8BBE\u8BA1\uFF0C\u4EA7\u54C1\u5728\u590D\u6742\u6027\u4E2D\u5D29\u6E83\u3002", "Over-engineering collapses under its own complexity."),
    t("\u7206\u53D1\u5F0F\u589E\u957F\u538B\u57AE\u670D\u52A1\u5668\uFF0C\u516C\u53F8\u5D29\u76D8\u3002", "Hypergrowth crashes the servers. The company implodes.")
  ],
  scenarios: [
    sc(
      t("\u6295\u8D44\u4EBA\u9012\u6765\u6295\u8D44\u610F\u5411\u4E66", "An investor offers a term sheet"),
      t("\u63A5\u53D7\u878D\u8D44", "Accept the funding"),
      [1, 0, 0, 0],
      t("\u4E89\u53D6\u66F4\u597D\u6761\u4EF6", "Negotiate harder terms"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u6838\u5FC3\u5DE5\u7A0B\u5E08\u5A01\u80C1\u8F9E\u804C", "A key engineer threatens to quit"),
      t("\u7ED9\u4ED6\u52A0\u85AA", "Give them a raise"),
      [-1, 1, 0, 0],
      t("\u653E\u4ED6\u8D70\uFF0C\u62DB\u66F4\u4FBF\u5B9C\u7684", "Let them go, hire cheaper"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u7528\u6237\u53CD\u9988\u4E25\u91CDbug", "Users report a major bug"),
      t("\u505C\u4E0B\u4E00\u5207\u7D27\u6025\u4FEE\u590D", "Drop everything to fix it"),
      [0, -1, 1, 1],
      t("\u6392\u5230\u4E0B\u4E2A\u8FED\u4EE3", "Schedule it for next sprint"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u7ADE\u4E89\u5BF9\u624B\u63A8\u51FA\u540C\u7C7B\u4EA7\u54C1", "A competitor launches a rival product"),
      t("\u4EF7\u683C\u6218", "Undercut their pricing"),
      [-1, 0, 1, 1],
      t("\u52A0\u7D27\u5F00\u53D1\u529F\u80FD", "Double down on features"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u884C\u4E1A\u5927\u4F1A\u8D5E\u52A9\u673A\u4F1A", "Conference sponsorship opportunity"),
      t("\u8D5E\u52A9\u53C2\u5C55", "Sponsor the event"),
      [-1, 1, 0, 1],
      t("\u7701\u94B1\u4E0D\u53BB", "Skip it and save money"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u56E2\u961F\u63D0\u8BAE\u5927\u5E45\u8F6C\u578B", "The team proposes a risky pivot"),
      t("\u6279\u51C6\u8F6C\u578B", "Approve the pivot"),
      [-1, 0, 1, -1],
      t("\u575A\u6301\u5F53\u524D\u65B9\u5411", "Stay the current course"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u77E5\u540D\u79D1\u6280\u535A\u5BA2\u60F3\u91C7\u8BBF", "A famous tech blog wants an interview"),
      t("\u63A5\u53D7\u91C7\u8BBF", "Do the interview"),
      [0, 0, -1, 1],
      t("\u4E13\u5FC3\u505A\u4EA7\u54C1", "Focus on building instead"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u670D\u52A1\u5668\u6210\u672C\u8D85\u51FA\u9884\u671F", "Server costs are higher than expected"),
      t("\u4F18\u5316\u57FA\u7840\u8BBE\u65BD", "Optimize infrastructure"),
      [0, -1, 1, 0],
      t("\u5411\u4ED8\u8D39\u7528\u6237\u8F6C\u5AC1\u6210\u672C", "Pass costs to premium users"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u6F5C\u5728\u6536\u8D2D\u65B9\u627E\u4E0A\u95E8", "A potential acquirer reaches out"),
      t("\u8003\u8651\u6536\u8D2D", "Explore the offer"),
      [1, -1, 0, 0],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [0, 1, 0, 0]
    ),
    sc(
      t("\u5F00\u6E90\u793E\u533A\u60F3\u53C2\u4E0E\u8D21\u732E", "Open-source community wants to contribute"),
      t("\u6B22\u8FCE\u8D21\u732E\u8005", "Welcome contributors"),
      [0, -1, 1, 1],
      t("\u4FDD\u6301\u4EE3\u7801\u95ED\u6E90", "Keep the codebase private"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u4EA7\u54C1\u53D1\u5E03\u65E5\u5230\u4E86", "Product launch day has arrived"),
      t("\u5927\u89C4\u6A21\u8425\u9500\u53D1\u5E03", "Launch with marketing blitz"),
      [-1, 0, 0, 1],
      t("\u5C0F\u8303\u56F4\u5185\u6D4B", "Soft launch to test waters"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u56E2\u961F\u60F3\u5168\u9762\u8FDC\u7A0B\u529E\u516C", "Team wants to work remotely full-time"),
      t("\u5168\u9762\u8FDC\u7A0B", "Go fully remote"),
      [1, 1, -1, 0],
      t("\u6DF7\u5408\u529E\u516C", "Require hybrid schedule"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4E2A\u5E73\u53F0\u63D0\u4F9BAPI\u5408\u4F5C", "A platform offers API partnership"),
      t("\u7ACB\u5373\u63A5\u5165", "Integrate immediately"),
      [0, -1, 0, 1],
      t("\u5148\u8C08\u5206\u6210", "Negotiate revenue share first"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u7528\u6237\u589E\u957F\u9677\u5165\u74F6\u9888", "User growth is plateauing"),
      t("\u63A8\u51FA\u63A8\u8350\u5956\u52B1\u8BA1\u5212", "Launch a referral program"),
      [-1, 0, 0, 1],
      t("\u6539\u5584\u7559\u5B58\u529F\u80FD", "Improve retention features"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u9AD8\u5F3A\u5EA6\u52A0\u73ED\u540E\u56E2\u961F\u58EB\u6C14\u4F4E\u843D", "Team morale is slipping after crunch"),
      t("\u7EC4\u7EC7\u56E2\u5EFA\u6D3B\u52A8", "Host a team retreat"),
      [-1, 1, -1, 0],
      t("\u627F\u8BFA\u671F\u6743\u6FC0\u52B1", "Promise equity refresh"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u6280\u672F\u503A\u52A1\u5806\u79EF\u5982\u5C71", "Technical debt is piling up"),
      t("\u6682\u505C\u529F\u80FD\uFF0C\u91CD\u6784\u4EE3\u7801", "Pause features for refactoring"),
      [0, 1, 1, -1],
      t("\u7EE7\u7EED\u8D76\u5DE5\u53D1\u5E03", "Keep shipping features"),
      [0, -1, -1, 1]
    ),
    sc(
      t("\u540D\u4EBA\u5728\u793E\u4EA4\u5A92\u4F53\u63D0\u5230\u4F60\u7684\u4EA7\u54C1", "A celebrity tweets about your product"),
      t("\u8D81\u70ED\u6253\u94C1\u505A\u8425\u9500", "Capitalize with a campaign"),
      [-1, 0, -1, 1],
      t("\u8BA9\u70ED\u5EA6\u81EA\u7136\u53D1\u9175", "Let organic buzz grow"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u65B0\u9690\u79C1\u6CD5\u89C4\u751F\u6548", "New privacy regulations take effect"),
      t("\u5168\u9762\u5408\u89C4\u6295\u5165", "Invest in full compliance"),
      [-1, -1, 1, 0],
      t("\u505A\u6700\u4F4E\u9650\u5EA6\u5E94\u5BF9", "Do the minimum required"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u81EA\u7531\u8BBE\u8BA1\u5E08\u6BDB\u9042\u81EA\u8350", "A freelance designer offers help"),
      t("\u8058\u7528\u5E76\u91CD\u65B0\u8BBE\u8BA1UI", "Accept and redesign the UI"),
      [0, 0, 1, 1],
      t("\u4FDD\u6301\u73B0\u6709\u8BBE\u8BA1", "Keep the current look"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u8463\u4E8B\u4F1A\u4F1A\u8BAE\u4E34\u8FD1", "Board meeting is approaching"),
      t("\u5C55\u793A\u589E\u957F\u8BA1\u5212", "Pitch a growth-focused plan"),
      [-1, -1, 0, 1],
      t("\u5C55\u793A\u76C8\u5229\u6570\u636E", "Show profitability metrics"),
      [1, 0, -1, 0]
    )
  ]
};
var wizardAcademy = {
  name: t("\u9B54\u6CD5\u5B66\u9662", "Wizard Academy"),
  labels: [t("\u9B54\u529B", "Mana"), t("\u5B66\u8BC6", "Knowledge"), t("\u5B66\u751F", "Students"), t("\u58F0\u671B", "Prestige")],
  failLow: [
    t("\u9B54\u529B\u4E4B\u6CC9\u67AF\u7AED\uFF0C\u6CD5\u672F\u5931\u7075\uFF0C\u5B66\u9662\u574D\u584C\u3002", "The mana well runs dry. Spells fail and the academy crumbles."),
    t("\u6240\u6709\u77E5\u8BC6\u5931\u4F20\uFF0C\u5B66\u9662\u9677\u5165\u8499\u6627\u3002", "All knowledge is lost. The academy sinks into ignorance."),
    t("\u6700\u540E\u4E00\u540D\u5B66\u751F\u79BB\u53BB\uFF0C\u5B66\u9662\u7A7A\u8361\u8361\u3002", "The last student leaves. The halls stand empty forever."),
    t("\u5B66\u9662\u58F0\u8A89\u5C3D\u6BC1\uFF0C\u88AB\u8FEB\u5173\u95ED\u3002", "The academy's reputation is ruined. It shuts its doors.")
  ],
  failHigh: [
    t("\u5931\u63A7\u7684\u9B54\u529B\u6495\u88C2\u4E86\u901A\u5F80\u5F02\u754C\u7684\u88C2\u7F1D\u3002", "Uncontrolled mana tears a rift to another dimension."),
    t("\u7981\u5FCC\u77E5\u8BC6\u5C06\u5B66\u8005\u4EEC\u903C\u5165\u75AF\u72C2\u3002", "Forbidden knowledge drives the scholars to madness."),
    t("\u5B66\u751F\u8FC7\u591A\u5BFC\u81F4\u6DF7\u4E71\uFF0C\u6821\u56ED\u4E0D\u53EF\u6536\u62FE\u3002", "Overcrowding leads to chaos. The campus is unmanageable."),
    t("\u50B2\u6162\u8499\u853D\u4E86\u8BC4\u8BAE\u4F1A\uFF0C\u88AB\u654C\u6821\u5077\u88AD\u3002", "Arrogance blinds the council. A rival school strikes.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u672C\u73CD\u7A00\u6CD5\u672F\u4E66\u6B63\u5728\u62CD\u5356", "A rare spellbook is up for auction"),
      t("\u79EF\u6781\u7ADE\u62CD", "Bid aggressively"),
      [-1, 1, 0, 0],
      t("\u8BA9\u5BF9\u624B\u5B66\u9662\u62CD\u53BB", "Let a rival school win it"),
      [0, -1, 0, -1]
    ),
    sc(
      t("\u6821\u9645\u9B54\u6CD5\u9526\u6807\u8D5B\u5F00\u8D5B", "Inter-school magic tournament announced"),
      t("\u6D3E\u6700\u4F18\u79C0\u7684\u5B66\u751F\u53C2\u8D5B", "Enter your best students"),
      [0, 0, -1, 1],
      t("\u4E13\u6CE8\u8BFE\u5802\u6559\u5B66", "Focus on classroom teaching"),
      [0, 1, 1, -1]
    ),
    sc(
      t("\u6821\u56ED\u4E0B\u65B9\u7684\u7075\u8109\u6CE2\u52A8\u5F02\u5E38", "A ley line beneath campus is fluctuating"),
      t("\u6C72\u53D6\u80FD\u91CF", "Harness the surge"),
      [1, 0, -1, 0],
      t("\u5B89\u5168\u5730\u7A33\u5B9A\u5B83", "Stabilize it safely"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u6821\u53CB\u63D0\u4F9B\u5927\u7B14\u6350\u8D60", "Alumni offer a large donation"),
      t("\u63A5\u53D7\u9644\u5E26\u6761\u4EF6\u7684\u6350\u8D60", "Accept with their conditions"),
      [1, -1, 1, 0],
      t("\u5A49\u62D2\u4EE5\u4FDD\u6301\u72EC\u7ACB", "Decline to preserve independence"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u540D\u5B66\u751F\u610F\u5916\u53EC\u5524\u51FA\u6076\u9B54", "A student accidentally summons a demon"),
      t("\u6D88\u8017\u9B54\u529B\u9A71\u9010", "Banish it with academy mana"),
      [-1, 1, 0, 1],
      t("\u758F\u6563\u5E76\u5C01\u9501", "Evacuate and contain"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u6E38\u5386\u8D24\u8005\u613F\u6765\u8BB2\u5B66", "A wandering sage offers to lecture"),
      t("\u9080\u8BF7\u4ED6\u9A7B\u6821\u4E00\u5B66\u671F", "Invite them for a semester"),
      [-1, 1, 1, 0],
      t("\u5A49\u62D2\uFF0C\u540D\u989D\u5DF2\u6EE1", "Politely decline \u2014 full roster"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u9B54\u6CD5\u56FE\u4E66\u9986\u6B63\u5728\u8001\u5316", "The enchanted library is decaying"),
      t("\u5168\u9762\u4FEE\u590D", "Fund full restoration"),
      [-1, 1, 0, 0],
      t("\u5C06\u85CF\u4E66\u8F6C\u79FB\u4ED6\u5904", "Transfer books elsewhere"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u654C\u5BF9\u5B66\u9662\u6316\u8D70\u4F60\u7684\u6559\u6388", "A rival school poaches your professor"),
      t("\u52A0\u85AA\u633D\u7559", "Counter-offer with more pay"),
      [-1, 1, 0, 1],
      t("\u5185\u90E8\u63D0\u62D4", "Promote from within"),
      [0, -1, 1, -1]
    ),
    sc(
      t("\u5B66\u751F\u8BF7\u613F\u5F00\u8BBE\u5B9E\u8DF5\u8BFE", "Students petition for practical classes"),
      t("\u589E\u8BBE\u6218\u6597\u9B54\u6CD5\u8BFE", "Add combat magic courses"),
      [-1, 0, 1, 0],
      t("\u575A\u6301\u7406\u8BBA\u6559\u5B66", "Maintain theoretical focus"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u6821\u56ED\u4E2D\u51FA\u571F\u4E00\u4EF6\u5F3A\u529B\u795E\u5668", "A powerful artifact is unearthed on campus"),
      t("\u9001\u5165\u5B9E\u9A8C\u5BA4\u7814\u7A76", "Study it in the lab"),
      [0, 1, -1, 1],
      t("\u5438\u6536\u5176\u9B54\u529B\u50A8\u5907", "Absorb its mana reserves"),
      [1, 0, 0, -1]
    ),
    sc(
      t("\u5165\u5B66\u7533\u8BF7\u8702\u62E5\u800C\u81F3", "Enrollment applications flood in"),
      t("\u6269\u5927\u62DB\u751F", "Accept more students"),
      [-1, 0, 1, 0],
      t("\u63D0\u9AD8\u5165\u5B66\u95E8\u69DB", "Raise admission standards"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u4E00\u573A\u9B54\u6CD5\u761F\u75AB\u4FB5\u88AD\u5B66\u751F", "A magical plague affects students"),
      t("\u9694\u79BB\u6551\u6CBB", "Quarantine and heal them"),
      [-1, 0, 1, 0],
      t("\u7814\u7A76\u6C38\u4E45\u6CBB\u6108\u4E4B\u6CD5", "Research a permanent cure"),
      [-1, -1, -1, 1]
    ),
    sc(
      t("\u5E74\u5EA6\u9B54\u529B\u6C34\u6676\u91C7\u6536\u5C06\u81F3", "Annual mana crystal harvest approaches"),
      t("\u52A0\u500D\u91C7\u6536", "Double the harvest"),
      [1, 0, -1, -1],
      t("\u53EF\u6301\u7EED\u91C7\u6536", "Harvest sustainably"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u4E00\u4E2A\u8D35\u65CF\u5BB6\u5EAD\u8981\u6C42\u5165\u5B66\u7279\u6743", "A noble family wants their child enrolled"),
      t("\u7834\u683C\u5F55\u53D6\u5E76\u7ED9\u4E88\u5956\u5B66\u91D1", "Admit with a scholarship"),
      [-1, 0, 1, 1],
      t("\u8981\u6C42\u6807\u51C6\u8003\u6838", "Require standard testing"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u6709\u4EBA\u63D0\u8BAE\u4E00\u9879\u7981\u5FCC\u5B9E\u9A8C", "A forbidden experiment is proposed"),
      t("\u79D8\u5BC6\u6279\u51C6", "Approve it secretly"),
      [-1, 1, 0, -1],
      t("\u516C\u5F00\u7981\u6B62", "Ban it publicly"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u9B54\u529B\u4E4B\u6CC9\u5373\u5C06\u67AF\u7AED", "The mana well is running dry"),
      t("\u5BFB\u627E\u65B0\u9B54\u529B\u6E90", "Seek a new mana source"),
      [-1, 0, 0, 1],
      t("\u9650\u91CF\u914D\u7ED9", "Ration mana for essentials"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u4E00\u53EA\u5E7D\u7075\u51FA\u6CA1\u5BBF\u820D", "A ghost haunts the dormitory"),
      t("\u4EE5\u4EEA\u5F0F\u9A71\u9010", "Exorcise it with a ritual"),
      [-1, 1, 1, 0],
      t("\u7559\u4E0B\u6765\u7814\u7A76", "Study it for research"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u6CD5\u5E08\u8BC4\u8BAE\u4F1A\u9080\u8BF7\u53C2\u52A0\u5CF0\u4F1A", "Council of Mages invites you to a summit"),
      t("\u4EB2\u81EA\u51FA\u5E2D", "Attend and network"),
      [-1, 0, -1, 1],
      t("\u6D3E\u4EE3\u8868\u524D\u5F80", "Send a representative"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u5B66\u751F\u53D1\u73B0\u4E00\u6761\u9690\u79D8\u901A\u9053", "Students discover a hidden passage"),
      t("\u63A2\u7D22\u5E76\u8BB0\u5F55", "Explore and document it"),
      [0, 1, 1, 0],
      t("\u5C01\u95ED\u4EE5\u4FDD\u5B89\u5168", "Seal it for safety"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u8BFE\u5802\u4E0A\u4E00\u573A\u9B54\u6CD5\u51B3\u6597\u5931\u63A7", "A magical duel goes wrong in class"),
      t("\u5F00\u9664\u8087\u4E8B\u5B66\u751F", "Expel the responsible student"),
      [0, 0, -1, 1],
      t("\u4F5C\u4E3A\u6559\u5B66\u6848\u4F8B", "Use it as a teaching moment"),
      [-1, 1, 1, -1]
    )
  ]
};
var zombieSurvival = {
  name: t("\u672B\u65E5\u6C42\u751F", "Zombie Survival"),
  labels: [t("\u7269\u8D44", "Supplies"), t("\u6B66\u5668", "Weapons"), t("\u5E78\u5B58\u8005", "Survivors"), t("\u5E0C\u671B", "Hope")],
  failLow: [
    t("\u7269\u8D44\u8017\u5C3D\uFF0C\u9965\u997F\u541E\u566C\u4E86\u8425\u5730\u3002", "No supplies left. Starvation claims the camp."),
    t("\u624B\u65E0\u5BF8\u94C1\uFF0C\u8425\u5730\u88AB\u4E27\u5C38\u653B\u9677\u3002", "Defenseless against the horde. The camp is overrun."),
    t("\u65E0\u4EBA\u751F\u8FD8\uFF0C\u6700\u540E\u7684\u706F\u706B\u7184\u706D\u3002", "No one is left. The last light goes out."),
    t("\u5E0C\u671B\u7834\u706D\uFF0C\u5E78\u5B58\u8005\u56DB\u6563\u9003\u5165\u8352\u91CE\u3002", "All hope is lost. The survivors scatter into the wasteland.")
  ],
  failHigh: [
    t("\u8FC7\u5EA6\u56E4\u79EF\u5F15\u6765\u532A\u5E2E\uFF0C\u4E00\u5207\u88AB\u593A\u8D70\u3002", "Hoarding attracts raiders. They take everything by force."),
    t("\u8D70\u706B\u5F15\u53D1\u707E\u96BE\u6027\u7206\u70B8\u3002", "An accidental discharge triggers a catastrophic explosion."),
    t("\u4EBA\u53E3\u8FC7\u591A\uFF0C\u8425\u5730\u5728\u81EA\u8EAB\u91CD\u538B\u4E0B\u5D29\u6E83\u3002", "Too many mouths. The camp collapses under its own weight."),
    t("\u76F2\u76EE\u81EA\u4FE1\u5BFC\u81F4\u9C81\u83BD\u884C\u52A8\uFF0C\u917F\u6210\u5927\u7978\u3002", "Overconfidence leads to a reckless mission. It ends in disaster.")
  ],
  scenarios: [
    sc(
      t("\u4E24\u4E2A\u8857\u533A\u5916\u53D1\u73B0\u4E00\u5BB6\u8D85\u5E02", "A supermarket is spotted two blocks away"),
      t("\u5168\u5458\u51FA\u52A8\u5927\u641C\u522E", "Send everyone for a big haul"),
      [1, 0, -1, 0],
      t("\u6D3E\u5C0F\u961F\u8C28\u614E\u884C\u52A8", "Send a small careful team"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u4E00\u7FA4\u5E78\u5B58\u8005\u5728\u5C4B\u9876\u6C42\u6551", "A survivor group signals from a rooftop"),
      t("\u5C1D\u8BD5\u8425\u6551", "Attempt a rescue"),
      [-1, -1, 1, 1],
      t("\u53EF\u80FD\u662F\u9677\u9631\uFF0C\u4E0D\u7406\u4F1A", "It could be a trap \u2014 ignore it"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u8425\u5730\u6C34\u6E90\u88AB\u6C61\u67D3", "The camp's water supply is contaminated"),
      t("\u70E7\u6C34\u5E76\u4E25\u683C\u914D\u7ED9", "Boil all water, ration carefully"),
      [-1, 0, -1, 0],
      t("\u5BFB\u627E\u65B0\u6C34\u6E90", "Search for a new source"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u9644\u8FD1\u6709\u4E00\u8F86\u519B\u7528\u8F66\u6B8B\u9AB8", "A military convoy wreck is nearby"),
      t("\u641C\u522E\u6B66\u5668\u5F39\u836F", "Scavenge weapons and ammo"),
      [0, 1, -1, 0],
      t("\u62C6\u5378\u83B7\u53D6\u7269\u8D44", "Strip it for supplies instead"),
      [1, 0, 0, 0]
    ),
    sc(
      t("\u4E00\u4E2A\u964C\u751F\u4EBA\u63D0\u51FA\u4EA4\u6613", "A stranger approaches with a trade offer"),
      t("\u7528\u7269\u8D44\u6362\u6B66\u5668", "Trade supplies for weapons"),
      [-1, 1, 0, 0],
      t("\u62D2\u7EDD\uFF0C\u8C01\u4E5F\u4E0D\u4FE1", "Refuse \u2014 trust no one"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E27\u5C38\u5728\u4E1C\u5899\u5916\u96C6\u7ED3", "Zombies are massing near the east wall"),
      t("\u52A0\u56FA\u9632\u7EBF\u5E94\u6218", "Fortify and fight"),
      [0, -1, 0, 1],
      t("\u64A4\u9000\u81F3\u5907\u7528\u636E\u70B9", "Evacuate to backup location"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u5728\u5EFA\u7B51\u7269\u4E2D\u53D1\u73B0\u4E00\u4E2A\u5C0F\u5B69", "A child is found hiding in a building"),
      t("\u6536\u7559", "Take them in"),
      [-1, 0, 1, 1],
      t("\u7ED9\u4E9B\u98DF\u7269\u8BA9\u4ED6\u79BB\u5F00", "Give food and send them away"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u65E7\u7535\u53F0\u6536\u5230\u4E00\u6BB5\u5750\u6807\u5E7F\u64AD", "An old radio broadcast gives coordinates"),
      t("\u524D\u5F80\u8C03\u67E5", "Investigate the signal"),
      [-1, 0, -1, 1],
      t("\u7559\u5B88\uFF0C\u592A\u5371\u9669\u4E86", "Stay put \u2014 too risky"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u591C\u88AD\u6108\u53D1\u9891\u7E41", "Night raids are getting more frequent"),
      t("\u589E\u52A0\u54E8\u5175", "Post extra guards"),
      [0, -1, 0, 1],
      t("\u5728\u5468\u56F4\u5E03\u8BBE\u9677\u9631", "Set traps around the perimeter"),
      [0, 1, -1, 0]
    ),
    sc(
      t("\u836F\u54C1\u544A\u6025", "Medicine is running dangerously low"),
      t("\u7A81\u88AD\u9644\u8FD1\u836F\u623F", "Raid the nearby pharmacy"),
      [1, 0, -1, 0],
      t("\u7528\u8349\u836F\u66FF\u4EE3", "Use herbal remedies"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u4E00\u540D\u88AB\u54AC\u7684\u5E78\u5B58\u8005\u9690\u7792\u4F24\u53E3", "A bitten survivor hides their wound"),
      t("\u9694\u79BB\u5E76\u5584\u5F85", "Quarantine them with compassion"),
      [-1, 0, 0, 1],
      t("\u7ACB\u5373\u9A71\u9010", "Exile them immediately"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u66B4\u96E8\u6DF9\u6CA1\u8425\u5730", "Rain floods the camp"),
      t("\u8F6C\u79FB\u5230\u9AD8\u5730", "Move to higher ground"),
      [-1, 0, -1, 0],
      t("\u6316\u6392\u6C34\u6C9F\u7559\u5B88", "Dig drainage and stay"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u53E6\u4E00\u4E2A\u56E2\u4F53\u63D0\u8BAE\u5408\u5E76\u8425\u5730", "Another group proposes merging camps"),
      t("\u5408\u5E76\u5171\u4EAB\u8D44\u6E90", "Merge and share resources"),
      [-1, -1, 1, 1],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u53D1\u7535\u673A\u71C3\u6599\u5373\u5C06\u8017\u5C3D", "Generator fuel is running out"),
      t("\u4ECE\u5E9F\u5F03\u8F66\u8F86\u4E2D\u62BD\u53D6", "Siphon from abandoned cars"),
      [1, 0, -1, 0],
      t("\u5173\u706F\u8282\u7EA6", "Go dark and conserve"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E00\u5927\u7FA4\u4E27\u5C38\u6B63\u671D\u8FD9\u91CC\u79FB\u52A8", "A zombie horde is heading this way"),
      t("\u6B8A\u6B7B\u62B5\u6297", "Stand and fight"),
      [0, -1, -1, 1],
      t("\u64A4\u79BB\u5BFB\u627E\u65B0\u5E87\u62A4\u6240", "Flee and find new shelter"),
      [-1, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u53EA\u72D7\u8D70\u8FDB\u4E86\u8425\u5730", "A dog wanders into camp"),
      t("\u6536\u517B\u4F5C\u4E3A\u54E8\u5175", "Adopt it as a lookout"),
      [-1, 0, 1, 1],
      t("\u8D76\u8D70\u5B83", "Shoo it away"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u6709\u4EBA\u53D1\u73B0\u4E00\u8F86\u80FD\u5F00\u7684\u8F66", "Someone finds a working car"),
      t("\u7528\u4E8E\u7269\u8D44\u8FD0\u8F93", "Use it for supply runs"),
      [1, 0, -1, 0],
      t("\u7559\u4F5C\u7D27\u6025\u64A4\u79BB", "Save it for emergency escape"),
      [0, 0, 1, 1]
    ),
    sc(
      t("\u51AC\u5929\u5373\u5C06\u6765\u4E34", "Winter is approaching fast"),
      t("\u56E4\u79EF\u67F4\u706B\u548C\u6BDB\u6BEF", "Stockpile firewood and blankets"),
      [-1, 0, 1, 0],
      t("\u52A0\u56FA\u4F4F\u6240", "Build better shelter instead"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u5F20\u5730\u56FE\u6807\u6CE8\u4E86\u4F20\u95FB\u4E2D\u7684\u5B89\u5168\u533A", "A map shows a rumored safe zone"),
      t("\u51FA\u53D1\u5BFB\u627E", "Set out to find it"),
      [-1, 0, -1, 1],
      t("\u52A0\u5F3A\u73B0\u6709\u9632\u5FA1", "Improve current defenses"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u5730\u4E0B\u5BA4\u53D1\u73B0\u4E00\u6279\u7F50\u5934", "Canned food cache found in a basement"),
      t("\u5E73\u5206\u7ED9\u6BCF\u4E2A\u4EBA", "Share equally with everyone"),
      [1, 0, 1, 0],
      t("\u4E25\u683C\u914D\u7ED9", "Ration it strictly"),
      [1, 0, -1, 0]
    )
  ]
};
var restaurantOwner = {
  name: t("\u9910\u5385\u7ECF\u8425", "Restaurant Owner"),
  labels: [t("\u8D44\u91D1", "Money"), t("\u5458\u5DE5", "Staff"), t("\u5BA2\u6D41", "Customers"), t("\u53E3\u7891", "Reviews")],
  failLow: [
    t("\u7834\u4EA7\u4E86\uFF0C\u9910\u5385\u6C38\u8FDC\u5173\u95E8\u3002", "Bankrupt. The restaurant closes its doors for good."),
    t("\u53A8\u5E08\u670D\u52A1\u5458\u5168\u8D70\u4E86\uFF0C\u540E\u53A8\u51B7\u9505\u51B7\u7076\u3002", "No one left to cook or serve. The kitchen goes cold."),
    t("\u6BCF\u665A\u7A7A\u65E0\u4E00\u4EBA\uFF0C\u4EA4\u4E0D\u8D77\u623F\u79DF\u3002", "Empty tables every night. You can't pay the rent."),
    t("\u5DEE\u8BC4\u94FA\u5929\u76D6\u5730\uFF0C\u65E0\u4EBA\u613F\u6765\u7528\u9910\u3002", "Devastating reviews go viral. No one will eat here.")
  ],
  failHigh: [
    t("\u7A0E\u52A1\u7A3D\u67E5\u53D1\u73B0\u8D26\u76EE\u95EE\u9898\uFF0C\u9762\u4E34\u6CD5\u5F8B\u5371\u673A\u3002", "Tax audit reveals irregular books. You face legal ruin."),
    t("\u4EBA\u5458\u8FC7\u5269\u6D88\u8017\u8D44\u91D1\uFF0C\u88C1\u5458\u91CD\u521B\u58EB\u6C14\u3002", "Overstaffing bleeds money dry. Layoffs destroy morale."),
    t("\u9700\u6C42\u66B4\u589E\u628A\u56E2\u961F\u7D2F\u57AE\uFF0C\u54C1\u8D28\u6025\u5267\u4E0B\u964D\u3002", "Overwhelming demand burns out the team. Quality collapses."),
    t("\u7092\u4F5C\u8FC7\u5EA6\u8131\u79BB\u5B9E\u9645\uFF0C\u53CD\u566C\u53C8\u5FEB\u53C8\u731B\u3002", "The hype exceeds reality. The backlash is swift and brutal.")
  ],
  scenarios: [
    sc(
      t("\u4ECA\u665A\u6709\u7F8E\u98DF\u8BC4\u8BBA\u5BB6\u6765\u7528\u9910", "A food critic is dining tonight"),
      t("\u5168\u529B\u4EE5\u8D74", "Pull out all the stops"),
      [-1, -1, 0, 1],
      t("\u7167\u5E38\u51FA\u54C1", "Serve the regular menu"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u660E\u661F\u53A8\u5E08\u63D0\u8BAE\u5408\u4F5C", "A celebrity chef offers a collaboration"),
      t("\u8054\u5408\u4E3E\u529E\u7279\u522B\u6D3B\u52A8", "Co-host a special event"),
      [-1, 1, 1, 1],
      t("\u5A49\u62D2\uFF0C\u4FDD\u6301\u672C\u8272", "Decline \u2014 stay authentic"),
      [0, 0, -1, 0]
    ),
    sc(
      t("\u79DF\u7EA6\u7EED\u7B7E\u5728\u5373", "The lease renewal is coming up"),
      t("\u5F3A\u786C\u8C08\u5224", "Negotiate aggressively"),
      [1, -1, 0, 0],
      t("\u63A5\u53D7\u6DA8\u79DF", "Accept the increase peacefully"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u9694\u58C1\u5F00\u4E86\u4E00\u5BB6\u7ADE\u4E89\u5BF9\u624B", "A competitor opens next door"),
      t("\u63A8\u51FA\u6253\u6298\u6D3B\u52A8", "Launch a discount campaign"),
      [-1, 0, 1, -1],
      t("\u52A0\u500D\u63D0\u5347\u54C1\u8D28", "Double down on quality"),
      [-1, -1, 0, 1]
    ),
    sc(
      t("\u4E3B\u53A8\u63D0\u8BAE\u5168\u9762\u66F4\u65B0\u83DC\u5355", "Head chef wants a menu overhaul"),
      t("\u6279\u51C6\u65B0\u83DC\u5355", "Approve the new menu"),
      [-1, 1, 0, 1],
      t("\u4FDD\u7559\u62DB\u724C\u83DC", "Keep the proven favorites"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u6536\u5230\u4E00\u4EFD\u5927\u578B\u5BB4\u4F1A\u8BA2\u5355", "A catering contract is offered"),
      t("\u63A5\u4E0B\u5927\u5355", "Accept the big contract"),
      [1, -1, -1, 0],
      t("\u4E13\u6CE8\u5802\u98DF", "Focus on the restaurant"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u53A8\u623F\u8BBE\u5907\u8001\u5316\u635F\u574F", "Kitchen equipment is breaking down"),
      t("\u8D2D\u4E70\u65B0\u8BBE\u5907", "Buy new equipment"),
      [-1, 1, 0, 0],
      t("\u4FEE\u7406\u65E7\u8BBE\u5907", "Repair the old stuff"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u660E\u5929\u536B\u751F\u68C0\u67E5", "Health inspector is visiting tomorrow"),
      t("\u8FDE\u591C\u5927\u626B\u9664", "Deep clean everything tonight"),
      [-1, -1, -1, 1],
      t("\u542C\u5929\u7531\u547D", "Hope for the best"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u5458\u5DE5\u96C6\u4F53\u8981\u6C42\u52A0\u85AA", "Staff asks for a raise"),
      t("\u540C\u610F\u52A0\u85AA", "Grant the raises"),
      [-1, 1, 0, 0],
      t("\u6539\u5584\u798F\u5229\u66FF\u4EE3", "Offer perks instead"),
      [0, 1, 0, -1]
    ),
    sc(
      t("\u4E00\u6761\u77ED\u89C6\u9891\u8BA9\u4F60\u7684\u83DC\u706B\u4E86", "A viral TikTok features your dish"),
      t("\u8D81\u70ED\u63A8\u51FA\u6D3B\u52A8", "Capitalize with a promo"),
      [-1, -1, 1, 1],
      t("\u8BA9\u70ED\u5EA6\u81EA\u7136\u53D1\u5C55", "Let the buzz grow naturally"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u5916\u5356\u5E73\u53F0\u9080\u8BF7\u5165\u9A7B", "Delivery app wants a partnership"),
      t("\u52A0\u5165\u5E73\u53F0", "Join the platform"),
      [1, -1, -1, 0],
      t("\u575A\u6301\u5802\u98DF", "Stay dine-in only"),
      [0, 0, 1, 0]
    ),
    sc(
      t("\u672C\u5730\u6148\u5584\u673A\u6784\u8BF7\u6C42\u6350\u8D60", "Local charity asks for a donation"),
      t("\u6350\u8D60\u4E00\u684C\u9152\u5E2D", "Donate a catered meal"),
      [-1, 1, 1, 1],
      t("\u5A49\u62D2", "Politely decline"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u62DB\u724C\u98DF\u6750\u4F9B\u5E94\u7D27\u5F20", "Signature ingredient is hard to source"),
      t("\u82B1\u9AD8\u4EF7\u4FDD\u8D28\u91CF", "Pay premium for quality"),
      [-1, 0, 0, 1],
      t("\u6682\u65F6\u4E0B\u67B6\u8BE5\u83DC\u54C1", "Remove the dish temporarily"),
      [0, 0, -1, -1]
    ),
    sc(
      t("\u4E00\u4F4D\u5E38\u5BA2\u5F00\u59CB\u95F9\u4E8B", "A regular customer becomes disruptive"),
      t("\u597D\u8A00\u76F8\u529D", "Have a gentle talk"),
      [0, -1, 1, 0],
      t("\u76F4\u63A5\u62C9\u9ED1", "Ban them from the restaurant"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u9644\u8FD1\u4E3E\u529E\u7F8E\u98DF\u5361\u8F66\u8282", "Food truck festival in the neighborhood"),
      t("\u8BBE\u644A\u53C2\u52A0", "Set up a stall too"),
      [-1, -1, 1, 0],
      t("\u5E97\u5185\u63A8\u51FA\u7279\u60E0", "Offer indoor specials instead"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u7535\u89C6\u8282\u76EE\u60F3\u6765\u62CD\u6444", "A TV show wants to film here"),
      t("\u5141\u8BB8\u62CD\u6444", "Allow the filming"),
      [-1, -1, 0, 1],
      t("\u62D2\u7EDD\uFF0C\u592A\u6253\u6270\u4E86", "Decline \u2014 too disruptive"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u8282\u65E5\u65FA\u5B63\u6765\u4E86", "Holiday season approaches"),
      t("\u63A8\u51FA\u8282\u65E5\u9650\u5B9A\u83DC\u5355", "Create a seasonal menu"),
      [-1, 1, 1, 1],
      t("\u7B80\u5355\u5E94\u5BF9", "Keep things simple"),
      [1, 0, -1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8D44\u6DF1\u53A8\u5E08\u6765\u5E94\u8058", "A veteran cook applies for a job"),
      t("\u9AD8\u85AA\u8058\u7528", "Hire them at top rate"),
      [-1, 1, 0, 0],
      t("\u9884\u7B97\u4E0D\u591F\uFF0C\u4E0D\u62DB", "Pass \u2014 budget is tight"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u70B9\u8BC4\u7F51\u7AD9\u5199\u624B\u5A01\u80C1\u7ED9\u5DEE\u8BC4", "Yelp reviewer threatens a bad write-up"),
      t("\u514D\u5355\u6253\u53D1", "Comp their meal"),
      [-1, 0, 0, 1],
      t("\u4E0D\u7406\u4F1A\u5A01\u80C1", "Ignore the threat"),
      [0, 0, 0, -1]
    ),
    sc(
      t("\u6536\u5230\u7F8E\u98DF\u8282\u76EE\u9080\u8BF7", "You're offered a spot on a food show"),
      t("\u4E0A\u8282\u76EE", "Appear on the show"),
      [-1, -1, 0, 1],
      t("\u7559\u5728\u53A8\u623F", "Stay in the kitchen"),
      [0, 0, 1, -1]
    )
  ]
};
var bandManager = {
  name: t("\u4E50\u961F\u7ECF\u7EAA", "Band Manager"),
  labels: [t("\u9884\u7B97", "Budget"), t("\u58EB\u6C14", "Morale"), t("\u7C89\u4E1D", "Fans"), t("\u521B\u4F5C\u529B", "Creativity")],
  failLow: [
    t("\u7834\u4EA7\u4E86\uFF0C\u8FDE\u7434\u5F26\u90FD\u4E70\u4E0D\u8D77\u3002", "Broke. The band can't afford strings, let alone a tour."),
    t("\u4E50\u961F\u89E3\u6563\uFF0C\u521B\u4F5C\u5206\u6B67\u6BC1\u4E86\u4E00\u5207\u3002", "The band breaks up. Creative differences destroy everything."),
    t("\u89C2\u4F17\u6D88\u5931\uFF0C\u53F0\u4E0B\u7A7A\u65E0\u4E00\u4EBA\u3002", "No audience left. You're playing to empty rooms."),
    t("\u7075\u611F\u67AF\u7AED\uFF0C\u97F3\u4E50\u5C31\u6B64\u6B7B\u53BB\u3002", "Writer's block becomes permanent. The music dies.")
  ],
  failHigh: [
    t("\u5531\u7247\u516C\u53F8\u63A5\u7BA1\u4E00\u5207\uFF0C\u827A\u672F\u81EA\u7531\u8361\u7136\u65E0\u5B58\u3002", "The label takes over. Artistic freedom is gone forever."),
    t("\u81EA\u6211\u81A8\u80C0\u5230\u6781\u70B9\uFF0C\u4E50\u961F\u81EA\u6211\u6BC1\u706D\u3002", "Egos inflate to bursting. The band self-destructs."),
    t("\u6F14\u5531\u4F1A\u53D1\u751F\u9A9A\u4E71\uFF0C\u917F\u6210\u4E25\u91CD\u4E8B\u6545\u3002", "Mob mentality at a concert leads to a dangerous incident."),
    t("\u4F5C\u54C1\u8FC7\u4E8E\u62BD\u8C61\uFF0C\u8FDE\u7C89\u4E1D\u4E5F\u542C\u4E0D\u61C2\u4E86\u3002", "The art becomes so abstract even fans can't follow.")
  ],
  scenarios: [
    sc(
      t("\u4E00\u5BB6\u5531\u7247\u516C\u53F8\u9012\u6765\u5408\u7EA6", "A record label offers a deal"),
      t("\u7B7E\u7EA6", "Sign the contract"),
      [1, -1, 0, -1],
      t("\u4FDD\u6301\u72EC\u7ACB", "Stay independent"),
      [-1, 1, 0, 1]
    ),
    sc(
      t("\u9F13\u624B\u60F3\u641E\u4E2A\u4EBA\u9879\u76EE", "The drummer wants to try a solo project"),
      t("\u652F\u6301\u4ED6\uFF0C\u4E50\u961F\u4F11\u606F", "Support it \u2014 take a break"),
      [-1, 1, -1, 1],
      t("\u529D\u4ED6\u4E13\u6CE8\u4E50\u961F", "Convince them to stay focused"),
      [0, -1, 1, 0]
    ),
    sc(
      t("\u5927\u578B\u97F3\u4E50\u8282\u9080\u8BF7\u4F60\u4EEC\u6F14\u51FA", "A big festival invites you to play"),
      t("\u63A5\u53D7\u5E76\u5168\u529B\u51C6\u5907", "Accept and go all out"),
      [-1, 1, 1, 0],
      t("\u5A49\u62D2\uFF0C\u4E13\u5FC3\u505A\u4E13\u8F91", "Decline to work on the album"),
      [0, 0, -1, 1]
    ),
    sc(
      t("\u7C89\u4E1D\u8981\u6C42\u6F14\u51FA\u65F6\u5531\u8001\u6B4C", "Fans demand you play old hits at shows"),
      t("\u6F14\u594F\u7ECF\u5178\u66F2\u76EE", "Play the classics"),
      [1, -1, 1, -1],
      t("\u9996\u6F14\u65B0\u4F5C\u54C1", "Premiere new material instead"),
      [-1, 0, -1, 1]
    ),
    sc(
      t("\u4E3B\u5531\u55D3\u5B50\u51FA\u4E86\u95EE\u9898", "The lead singer is losing their voice"),
      t("\u53D6\u6D88\u6F14\u51FA\u517B\u55D3", "Cancel shows for recovery"),
      [-1, 0, -1, 0],
      t("\u5E26\u75C5\u575A\u6301\u5DE1\u6F14", "Push through the tour"),
      [1, -1, 1, -1]
    ),
    sc(
      t("\u4E00\u4E2A\u54C1\u724C\u60F3\u8BF7\u4E50\u961F\u62CD\u5E7F\u544A", "A brand wants the band in a commercial"),
      t("\u63A5\u53D7\u5546\u4E1A\u5408\u4F5C", "Take the sponsor deal"),
      [1, -1, -1, 0],
      t("\u62D2\u7EDD\u5546\u4E1A\u5316", "Refuse to sell out"),
      [0, 1, 0, 1]
    ),
    sc(
      t("\u6709\u6253\u6298\u7684\u5F55\u97F3\u68DA\u6863\u671F", "Studio time is available at a discount"),
      t("\u7ACB\u5373\u9884\u8BA2", "Book it immediately"),
      [-1, 1, 0, 1],
      t("\u7701\u94B1\u5728\u5BB6\u6392\u7EC3", "Save money, practice at home"),
      [0, 0, 0, 0]
    ),
    sc(
      t("\u4F60\u4EEC\u7684\u6B4C\u88AB\u4EBA\u7FFB\u5531\u540E\u706B\u4E86", "A cover of your song goes viral"),
      t("\u4E0E\u7FFB\u5531\u8005\u5408\u4F5C", "Collaborate with the creator"),
      [0, 1, 1, 0],
      t("\u8981\u6C42\u4E0B\u67B6", "Demand a takedown"),
      [1, -1, -1, 0]
    ),
    sc(
      t("\u4E50\u961F\u56E0\u521B\u4F5C\u65B9\u5411\u4E89\u5435", "Band fights over creative direction"),
      t("\u6C11\u4E3B\u6295\u7968\u51B3\u5B9A", "Hold a democratic vote"),
      [0, 1, 0, -1],
      t("\u575A\u6301\u521B\u59CB\u4EBA\u7684\u613F\u666F", "Follow the founder's vision"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u573A\u5927\u724C\u6F14\u51FA\u63D0\u4F9B\u6696\u573A\u673A\u4F1A", "Opening slot for a major act is offered"),
      t("\u63A5\u53D7\u6696\u573A", "Take the opening slot"),
      [-1, 0, 1, 0],
      t("\u53EA\u63A5\u5934\u724C\u6F14\u51FA", "Only accept headlining gigs"),
      [0, 1, -1, 1]
    ),
    sc(
      t("MV\u9884\u7B97\u7D27\u5F20", "Music video budget is tight"),
      t("\u62CD\u4F4E\u6210\u672CDIY\u98CE\u683C", "Make a lo-fi DIY video"),
      [0, 1, 0, 1],
      t("\u501F\u94B1\u62CD\u4E13\u4E1AMV", "Go into debt for a pro video"),
      [-1, 0, 1, 0]
    ),
    sc(
      t("\u7C89\u4E1D\u4F1A\u8981\u6C42\u4E3E\u529E\u89C1\u9762\u4F1A", "Fan club wants exclusive meetups"),
      t("\u4E3E\u529E\u7C89\u4E1D\u6D3B\u52A8", "Host fan events"),
      [-1, 1, 1, -1],
      t("\u4FDD\u6301\u795E\u79D8\u611F", "Keep a mysterious distance"),
      [0, -1, 0, 1]
    ),
    sc(
      t("\u4E00\u4F4D\u5236\u4F5C\u4EBA\u60F3\u91CD\u65B0\u6DF7\u97F3\u4F60\u4EEC\u7684\u6B4C", "A producer offers to remix your track"),
      t("\u63A5\u53D7\u6DF7\u97F3", "Accept the remix"),
      [0, 0, 1, -1],
      t("\u4FDD\u7559\u539F\u7248", "Keep the original sound"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u5468\u8FB9\u5546\u63D0\u8BAE\u63A8\u51FA\u65B0\u4EA7\u54C1\u7EBF", "Merch vendor proposes a new line"),
      t("\u63A8\u51FA\u5468\u8FB9", "Launch the merch line"),
      [1, 0, 1, -1],
      t("\u4E13\u6CE8\u97F3\u4E50", "Focus on the music"),
      [0, 1, -1, 1]
    ),
    sc(
      t("\u4E00\u4E2A\u4E89\u8BAE\u8BDD\u9898\u53EF\u4EE5\u5199\u6210\u6B4C\u8BCD", "A controversial topic could inspire lyrics"),
      t("\u5927\u80C6\u521B\u4F5C", "Write about it boldly"),
      [0, 0, -1, 1],
      t("\u6C42\u7A33\u4E0D\u78B0", "Play it safe"),
      [0, 0, 1, -1]
    ),
    sc(
      t("\u5DE1\u6F14\u5927\u5DF4\u629B\u951A\u4E86", "The tour bus breaks down"),
      t("\u79DF\u4E00\u8F86\u66FF\u4EE3", "Rent a replacement"),
      [-1, 1, 0, 0],
      t("\u53D6\u6D88\u51E0\u573A\u6F14\u51FA", "Cancel the next few dates"),
      [0, -1, -1, 0]
    ),
    sc(
      t("\u6D41\u5A92\u4F53\u5E73\u53F0\u63D0\u4F9B\u63A8\u8350\u4F4D", "A streaming platform offers a playlist spot"),
      t("\u63A5\u53D7\u72EC\u5BB6\u6761\u6B3E", "Accept exclusivity clause"),
      [1, 0, 1, -1],
      t("\u7559\u5728\u6240\u6709\u5E73\u53F0", "Stay on all platforms"),
      [0, 0, 0, 1]
    ),
    sc(
      t("\u4E50\u961F\u6210\u5458\u5199\u4E86\u4E00\u9996\u5F88\u79C1\u4EBA\u7684\u6B4C", "Band member writes a deeply personal song"),
      t("\u6536\u5165\u4E13\u8F91", "Include it on the album"),
      [0, 1, 0, 1],
      t("\u7559\u7ED9\u4ED6\u4E2A\u4EBA\u53D1\u884C", "Save it for a solo release"),
      [0, -1, 0, 0]
    ),
    sc(
      t("\u4E00\u5BB6\u672C\u5730\u9152\u5427\u63D0\u4F9B\u9A7B\u573A\u673A\u4F1A", "Local venue offers a residency"),
      t("\u63A5\u53D7\u9A7B\u573A", "Accept the residency"),
      [1, 0, 1, -1],
      t("\u7EE7\u7EED\u5DE1\u6F14", "Keep touring instead"),
      [-1, -1, 1, 0]
    ),
    sc(
      t("\u4E00\u4F4D\u8001\u961F\u53CB\u60F3\u56DE\u5F52", "An old bandmate wants to rejoin"),
      t("\u6B22\u8FCE\u56DE\u6765", "Welcome them back"),
      [0, 1, 0, -1],
      t("\u4FDD\u6301\u73B0\u6709\u9635\u5BB9", "Keep the current lineup"),
      [0, 0, 1, 1]
    )
  ]
};
var ALL_THEMES = [
  medievalKingdom,
  spaceColony,
  pirateCaptain,
  startupCeo,
  wizardAcademy,
  zombieSurvival,
  restaurantOwner,
  bandManager
];

// page/bars_game_cpp.ts
var CANVAS_ID = "bars-game-canvas";
var BTN_0_ID = "bars-game-btn-0";
var BTN_1_ID = "bars-game-btn-1";
var RESTART_ID = "bars-game-restart";
var STATUS_ID = "bars-game-status";
var PREVIEW_ID = "bars-game-preview";
var SEED_ID = "bars-game-seed";
var SHOW_NUMBERS_ID = "bars-game-show-numbers";
var HEAD_SPAN_ID = "head_span";
var LABELS_ID = "bars-game-labels";
var SCENARIO_ID = "bars-game-scenario";
var LANG_TOGGLE_ID = "bars-game-lang-toggle";
var BAR_COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];
var LIGHT_BAR_COLORS = ["rgba(96, 165, 250, 0.95)", "rgba(244, 114, 182, 0.95)", "rgba(52, 211, 153, 0.95)", "rgba(251, 191, 36, 0.95)"];
var INCREASE_BAR_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];
var DECREASE_BAR_COLORS = ["#2563eb", "#db2777", "#059669", "#d97706"];
var BAR_REGION_COLOR = "#000000";
var hoverChoice = null;
var currentSeed = 0;
var showNumbers = false;
var activeTheme = null;
var currentLang = "cn";
var cachedMatch = null;
function getCanvas() {
  const el = document.getElementById(CANVAS_ID);
  if (!el || !(el instanceof HTMLCanvasElement)) {
    throw new Error(`Canvas #${CANVAS_ID} not found`);
  }
  return el;
}
function getButtons() {
  const btn0 = document.getElementById(BTN_0_ID);
  const btn1 = document.getElementById(BTN_1_ID);
  const restart2 = document.getElementById(RESTART_ID);
  if (!btn0 || !(btn0 instanceof HTMLButtonElement) || !btn1 || !(btn1 instanceof HTMLButtonElement) || !restart2 || !(restart2 instanceof HTMLButtonElement)) {
    throw new Error(`Buttons not found`);
  }
  return { btn0, btn1, restart: restart2 };
}
function barLayout(width, height, n) {
  const barWidth = width * 0.8 / n;
  const gap = (width - barWidth * n) / (n + 1);
  const scale = height / Math.max(1, barsGameMaxVal());
  return { barWidth, gap, scale, n };
}
function drawBars(ctx, values, x, width, height, maxVal) {
  const n = values.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  for (let i = 0; i < n; i++) {
    const bx = x + gap + i * (barWidth + gap);
    const barHeight = Math.max(0, values[i] / maxVal * fullHeight);
    const by = height - barHeight;
    ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
    ctx.fillRect(bx, by, barWidth, barHeight);
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(values[i]), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function drawBarsWithDiff(ctx, state, future, width, height, maxVal) {
  const n = state.length;
  if (n === 0) {
    return;
  }
  const { barWidth, gap, scale } = barLayout(width, height, n);
  const fullHeight = height;
  const bottom = height;
  for (let i = 0; i < n; i++) {
    const bx = gap + i * (barWidth + gap);
    const s = state[i];
    const f = future[i];
    const hCurrent = s / maxVal * fullHeight;
    const hFuture = f / maxVal * fullHeight;
    const yCurrent = bottom - hCurrent;
    const yFuture = bottom - hFuture;
    const idx = i % BAR_COLORS.length;
    const baseColor = LIGHT_BAR_COLORS[idx];
    const increaseColor = INCREASE_BAR_COLORS[idx];
    const decreaseColor = DECREASE_BAR_COLORS[idx];
    if (f < s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture);
      ctx.fillStyle = decreaseColor;
      ctx.fillRect(bx, yCurrent, barWidth, yFuture - yCurrent);
    } else if (f > s) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
      ctx.fillStyle = increaseColor;
      ctx.fillRect(bx, yFuture, barWidth, hFuture - hCurrent);
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, yCurrent, barWidth, hCurrent);
    }
    if (f === 0 || f === maxVal) {
      ctx.strokeStyle = "#c00";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, yFuture, barWidth, hFuture);
    }
    const val = future[i];
    if (showNumbers) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      const by = bottom - hFuture;
      const barHeight = hFuture;
      ctx.fillText(String(val), bx + barWidth / 2, by + barHeight / 2 + 4);
      ctx.textAlign = "left";
    }
  }
}
function selectRandomTheme() {
  activeTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
}
function updateLabels() {
  const el = document.getElementById(LABELS_ID);
  if (!el || !activeTheme) {
    return;
  }
  const canvas = getCanvas();
  const border = 15;
  const cw = canvas.width;
  const n = 4;
  const barWidth = cw * 0.8 / n;
  const gap = (cw - barWidth * n) / (n + 1);
  el.innerHTML = activeTheme.labels.map((label, i) => {
    const cx = border + gap + i * (barWidth + gap) + barWidth / 2;
    return `<span style="position:absolute;left:${cx}px;transform:translateX(-50%);color:${BAR_COLORS[i]};font-weight:bold;white-space:nowrap">${txt(label, currentLang)}</span>`;
  }).join("");
}
function updateButtonText() {
  const { btn0, btn1 } = getButtons();
  const scenarioEl = document.getElementById(SCENARIO_ID);
  if (!activeTheme) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      scenarioEl.textContent = "\xA0";
    }
    return;
  }
  if (barsGameIsEnded()) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      const state2 = barsGameGetState();
      scenarioEl.textContent = getFailureText(activeTheme, state2, barsGameMaxVal(), currentLang);
    }
    return;
  }
  const state = barsGameGetState();
  const f0 = barsGameGetFutureState(0);
  const f1 = barsGameGetFutureState(1);
  const d0 = classifyDeltas(state, f0);
  const d1 = classifyDeltas(state, f1);
  cachedMatch = findMatchingScenario(activeTheme.scenarios, d0, d1, Math.random);
  if (!cachedMatch) {
    btn0.textContent = "Choice 0";
    btn1.textContent = "Choice 1";
    if (scenarioEl) {
      scenarioEl.textContent = "\xA0";
    }
    return;
  }
  const { scenario, swapped } = cachedMatch;
  if (scenarioEl) {
    scenarioEl.textContent = txt(scenario.background, currentLang);
  }
  if (swapped) {
    btn0.textContent = txt(scenario.choiceB, currentLang);
    btn1.textContent = txt(scenario.choiceA, currentLang);
  } else {
    btn0.textContent = txt(scenario.choiceA, currentLang);
    btn1.textContent = txt(scenario.choiceB, currentLang);
  }
}
function draw() {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const height = canvas.height;
  const maxVal = Math.max(1, barsGameMaxVal());
  const stateSize = barsGameStateSize();
  if (stateSize === 0) {
    return;
  }
  ctx.fillStyle = BAR_REGION_COLOR;
  ctx.fillRect(0, 0, width, height);
  const state = barsGameGetState();
  if (hoverChoice !== null && !barsGameIsEnded()) {
    const future = barsGameGetFutureState(hoverChoice);
    drawBarsWithDiff(ctx, state, future, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = `Preview: Choice ${hoverChoice} (lighter = up, darker = down)`;
    }
  } else {
    drawBars(ctx, state, 0, width, height, maxVal);
    const previewEl = document.getElementById(PREVIEW_ID);
    if (previewEl) {
      previewEl.textContent = "\xA0";
    }
  }
}
function logState() {
  if (barsGameStateSize() === 0) {
    return;
  }
  console.log("bars", barsGameGetState());
}
function updateSeedDisplay() {
  const el = document.getElementById(SEED_ID);
  if (el) {
    el.textContent = `Seed: ${currentSeed}  `;
  }
}
function updateStatus() {
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = barsGameIsEnded() ? " Game over." : "";
  }
  const head = document.getElementById(HEAD_SPAN_ID);
  if (head) {
    const title = activeTheme ? txt(activeTheme.name, currentLang) : "Bars game (C++ / WASM)";
    head.textContent = barsGameIsEnded() ? `${title} \u2014 Game Over` : title;
  }
  updateSeedDisplay();
}
function setButtonsEnabled(enabled) {
  const { btn0, btn1 } = getButtons();
  btn0.disabled = !enabled;
  btn1.disabled = !enabled;
}
function onChoice(index) {
  if (barsGameIsEnded()) {
    return;
  }
  barsGameApplyChoice(index);
  logState();
  updateStatus();
  if (barsGameIsEnded()) {
    setButtonsEnabled(false);
    hoverChoice = null;
  } else {
    hoverChoice = index;
  }
  updateButtonText();
  draw();
}
function restart() {
  selectRandomTheme();
  const seed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  currentSeed = seed;
  barsGameSetSeed(seed);
  barsGameInit();
  logState();
  setButtonsEnabled(true);
  updateLabels();
  updateButtonText();
  updateStatus();
  draw();
}
async function main() {
  await modulePromise;
  barsGameCreate();
  selectRandomTheme();
  currentSeed = Date.now() >>> 0 ^ (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : 0);
  barsGameSetSeed(currentSeed);
  barsGameInit();
  logState();
  const showNumbersEl = document.getElementById(SHOW_NUMBERS_ID);
  if (showNumbersEl && showNumbersEl instanceof HTMLInputElement) {
    showNumbers = showNumbersEl.checked;
    showNumbersEl.addEventListener("change", () => {
      showNumbers = showNumbersEl.checked;
      draw();
    });
  }
  const langToggle = document.getElementById(LANG_TOGGLE_ID);
  if (langToggle && langToggle instanceof HTMLButtonElement) {
    langToggle.textContent = currentLang === "cn" ? "EN" : "\u4E2D\u6587";
    langToggle.addEventListener("click", () => {
      currentLang = currentLang === "cn" ? "en" : "cn";
      langToggle.textContent = currentLang === "cn" ? "EN" : "\u4E2D\u6587";
      updateLabels();
      updateButtonText();
      updateStatus();
    });
  }
  updateLabels();
  updateButtonText();
  draw();
  updateStatus();
  setButtonsEnabled(true);
  const { btn0, btn1, restart: restartBtn } = getButtons();
  btn0.addEventListener("click", () => onChoice(0));
  btn1.addEventListener("click", () => onChoice(1));
  restartBtn.addEventListener("click", restart);
  btn0.addEventListener("mouseenter", () => {
    hoverChoice = 0;
    draw();
  });
  btn0.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  btn1.addEventListener("mouseenter", () => {
    hoverChoice = 1;
    draw();
  });
  btn1.addEventListener("mouseleave", () => {
    hoverChoice = null;
    draw();
  });
  document.addEventListener("keydown", (e) => {
    if (barsGameIsEnded()) {
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (hoverChoice === 0) {
        onChoice(0);
      } else {
        hoverChoice = 0;
      }
      draw();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (hoverChoice === 1) {
        onChoice(1);
      } else {
        hoverChoice = 1;
      }
      draw();
    }
  });
}
main().catch((err) => {
  console.error(err);
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.textContent = " Error loading game.";
  }
});
