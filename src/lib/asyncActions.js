import  {has,ownKeys} from './objectUtils'

const ACTION_PREFIX = ''

export const ACTION_ASYNC_REQUEST_SUFFIX = '@ASYNC_REQUEST'
export const ACTION_ASYNC_SUCCESS_SUFFIX = '@ASYNC_SUCCESS'
export const ACTION_ASYNC_FAILURE_SUFFIX = '@ASYNC_FAILURE'
export const ACTION_ASYNC_PROGRESS_SUFFIX = '@ASYNC_PROGRESS'
export const ACTION_ASYNC_CANCEL_SUFFIX = '@ASYNC_CANCEL'

export const ACTION_ASYNC_SUCCESS_METHOD = 'success'
export const ACTION_ASYNC_FAILURE_METHOD = 'failure'
export const ACTION_ASYNC_PROGRESS_METHOD = 'progress'
export const ACTION_ASYNC_CANCEL_METHOD = 'cancel'

const trivialArgsMapper = (payload, meta) => ({ payload, meta })
/**
 *
 * @param name
 * @param argsMapper
 * @param options: {prefix, defaultMeta}
 * @returns {function(*, *): {type: string, payload: *, meta: *}}
 */
export function makeActionCreator(name, argsMapper = trivialArgsMapper, options) {

  const defaults = {
    prefix: ACTION_PREFIX,
    defaultMeta: undefined,
  }

  options = Object.assign(defaults, options)

  const type = `${options.prefix}${name}`

  const actionCreator = (...args) => {
    const mapped = argsMapper(...args)
    let payload = mapped
    let meta = undefined
    if (mapped) {
      const hasPayload = has(mapped, 'payload')
      const hasMeta = has(mapped, 'meta')
      const hasMore = ownKeys(mapped).length > 2
      if (hasPayload !== hasMeta || hasPayload && hasMeta && hasMore) {
        throw new Error('Full mapper should return both meta and payload, and only these two.')
      }
      if (hasPayload) {
        payload = mapped.payload
        meta = mapped.meta
      }
    }
    return {
      type,
      payload,
      meta: options.defaultMeta ? Object.assign({}, options.defaultMeta, meta) : meta,
    }
  }

  actionCreator.TYPE = type

  return actionCreator

}

makeActionCreator.withDefaults = ({ prefix = ACTION_PREFIX, defaultMeta }) => (baseName, argsMapper, options) => {
  options = Object.assign({}, { prefix, defaultMeta }, options)
  return makeActionCreator(baseName, argsMapper, options)
}


/**
 *
 * @param baseName
 * @param argsMapper
 * @param options
 * @returns {function(*, *): {type: string, payload: *, meta: *}}
 */
export function makeAsyncActionCreator(baseName, argsMapper = trivialArgsMapper, options) {

  const actionCreator = makeActionCreator(`${baseName}${ACTION_ASYNC_REQUEST_SUFFIX}`, argsMapper, options)

  actionCreator[ACTION_ASYNC_SUCCESS_METHOD] = makeActionCreator(`${baseName}${ACTION_ASYNC_SUCCESS_SUFFIX}`, trivialArgsMapper, options)
  actionCreator[ACTION_ASYNC_FAILURE_METHOD] = makeActionCreator(`${baseName}${ACTION_ASYNC_FAILURE_SUFFIX}`, trivialArgsMapper, options)
  actionCreator[ACTION_ASYNC_PROGRESS_METHOD] = makeActionCreator(`${baseName}${ACTION_ASYNC_PROGRESS_SUFFIX}`, trivialArgsMapper, options)
  actionCreator[ACTION_ASYNC_CANCEL_METHOD] = makeActionCreator(`${baseName}${ACTION_ASYNC_CANCEL_SUFFIX}`, trivialArgsMapper, options)

  return actionCreator
}

makeAsyncActionCreator.withDefaults = ({ prefix = ACTION_PREFIX, defaultMeta }) => (baseName, argsMapper, options) => {
  options = Object.assign({}, { prefix, defaultMeta }, options)
  return makeAsyncActionCreator(baseName, argsMapper, options)
}

/**
 *
 * @param actionCreator
 * @param options = {dataProp , shouldDestroyData, defaultData, shouldSpread})
 * @returns {Function}
 */
export function makeAsyncReducer(actionCreator, options) {
  const defaults = { dataProp: 'data', shouldDestroyData: true, defaultData: undefined, shouldSpread: false, shouldSetData: true }
  options = Object.assign(defaults, options)

  const defaultState = options.shouldSpread ?
    { error: undefined, loading: false, ...(options.defaultData || {}) } :
    { error: undefined, loading: false, [options.dataProp]: options.defaultData }

  return function (state = defaultState, { type, payload }) {
    switch (type) {
      case actionCreator.TYPE:
        return options.shouldSpread ?
          { loading: true, ...(options.defaultData || {}) } :
          { loading: true, [options.dataProp]: options.shouldDestroyData ? options.defaultData : state.data }
      case actionCreator.success.TYPE: {
        if (!options.shouldSetData){
          return {loading: false}
        }
        const progress = state && state.progress === undefined ? {} : {progress: 0}
        return options.shouldSpread ?
          {loading: false, ...progress, ...payload} :
          {loading: false, ...progress, [options.dataProp]: payload}
      }
      case actionCreator.progress.TYPE:
        return {...state, progress: payload}
      case actionCreator.failure.TYPE:
        return { loading: false, error: payload }
      default:
        return state
    }
  }
}

makeAsyncReducer.withDefaults = defaults => (actionCreator, options) => {
  options = Object.assign({}, defaults, options)
  return makeAsyncReducer(actionCreator, options)
}


