export const debounce = (fn, time) => {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, time)
  }
}

export const throttle = (fn, time) => {
  let lastTimestamp = null
  return function (...args) {
    if (!lastTimestamp || lastTimestamp + time > Date.now()) {
      fn.call(this, ...args)
      lastTimestamp = Date.now()
    }
  }
}

let worker = null
const promiseResolveMap = {}

export const getWorker = () => {
  if (worker) {
    return worker
  }
  worker = new Worker('worker.js')
  initWorker()
  return worker
}


export const prettierScript = (parser, content) => {
  const _eventKey = '__prettier__'
  return new Promise((resolve, reject) => {
    postWorker({
      parser,
      content,
      _eventKey,
      resolve: data => {
        if (typeof data !== 'object') {
          return resolve('')
        }
        const {
          content
        } = data
        resolve(content)
      },
    })
  })
}

// inner function

function initWorker() {
  worker.onmessage = event => {
    const { data = {} } = event
    if (data._token) {
      const resolveFun = promiseResolveMap[data._token]
      if (resolveFun) resolveFun(data)
      delete promiseResolveMap[data._token]
    }
  }
}

function postWorker(params) {
  const { resolve, ...rst } = params
  const _token = (Math.random() + '').slice('2')
  promiseResolveMap[_token] = resolve
  worker.postMessage({ ...rst, _token })
}

