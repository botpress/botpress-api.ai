import checkVersion from 'botpress-version-manager'
import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import crypto from 'crypto'

import axios from 'axios'

let config = null
let service = null

const getAgent = (lang) => {
  if (config.agents.length == 0) {
    // back compatibility
    return {clientToken: config.accessToken}
  }
  
  for (const agent of config.agents) {
    if (agent.langs.includes(lang)) {
      return agent
    }
  }
}

const getAvailableLang = (lang) => {
  if (!lang) {
    return config.lang
  }
  lang = lang.replace('_', '-') // convert bp locale format to api.ai format
  
  for (const agent of config.agents) {
    if (agent.langs.includes(lang)) {
      return lang
    }
  }
  
  const l = lang.split('-')
  if (l.length == 2) {
    return getAvailableLang(l[0])
  }
  
  return config.lang
}

const getClient = (lang) => {
  return axios.create({
    baseURL: 'https://api.api.ai/v1',
    timeout: process.env.BOTPRESS_HTTP_TIMEOUT || 5000,
    headers: {'Authorization': 'Bearer ' + getAgent(lang).clientToken}
  })
}

const setService = () => {
  service = (userId, lang, text) => {
    return getClient(lang).post('/query?v=20170101', {
      query: text,
      lang: lang,
      sessionId: userId
    })
  }
}

const contextAdd = (userId, lang) => (name, lifespan = 1) => {
  return getClient(lang).post('/contexts?v=20170101', [
    { name, lifespan }
  ], { params: {sessionId: userId } })
}

const contextRemove = (userId, lang) => name => {
  return getClient(lang).delete('/contexts/' + name, { params: { sessionId: userId } })
}

const incomingMiddleware = (event, next) => {
  if (event.type === 'message') {

    const lang = getAvailableLang(event.user.locale)
    let shortUserId = event.user.id
    if (shortUserId.length > 36) {
      shortUserId = crypto.createHash('md5').update(shortUserId).digest("hex")
    }

    service(shortUserId, lang, event.text)
    .then(({data}) => {
      const {result} = data
      if (config.mode === 'fulfillment' 
        && result.fulfillment 
        && result.fulfillment.speech
        && result.fulfillment.speech.length > 0) {
        event.bp.middlewares.sendOutgoing({
          type: 'text',
          platform: event.platform,
          text: result.fulfillment.speech,
          raw: {
            to: event.user.id,
            message: result.fulfillment.speech
          }
        })
        return null // swallow the event, don't call next()
      } else {
        event.nlp = Object.assign(result, {
          context: {
            add: contextAdd(shortUserId, lang),
            remove: contextRemove(shortUserId, lang)
          }
        })
        next()
      }
    })
    .catch(error => {
      let err = _.get(error, 'response.data.status')
        || _.get(error, 'message')
        || error
        || 'Unknown error'

      if (err && err.code) {
        err = '[' + err.code + '] Type:' + err.errorType + ':', err.errorDetails
      }

      console.log(error.stack)

      event.bp.logger.warn('botpress-api.ai', 'API Error. Could not process incoming text: ' + err)
      next()
    })
  } else {
    event.nlp = {
      context: {
        add: contextAdd(shortUserId, lang),
        remove: contextRemove(shortUserId, lang)
      }
    }
    
    next()
  }
}

module.exports = {

  config: {
    accessToken: { type: 'string', env: 'APIAI_TOKEN' }, // back compatibility
    agents: { type: 'any', required: true, default: [], validation: v => _.isArray(v) },
    lang: { type: 'string', default: 'en' },
    mode: { type: 'choice', validation: ['fulfillment', 'default'], default: 'default' }
  },

  init: async function(bp, configurator) {
    checkVersion(bp, __dirname)
    
    bp.middlewares.register({
      name: 'apiai.incoming',
      module: 'botpress-api.ai',
      type: 'incoming',
      handler: incomingMiddleware,
      order: 10,
      description: 'Process natural language in the form of text. Structured data with an action and parameters for that action is injected in the incoming message event.'
    })
    
    config = await configurator.loadAll()
    setService()
  },

  ready: async function(bp, configurator) {
    const router = bp.getRouter('botpress-apiai')

    router.get('/config', async (req, res) => {
      res.send(await configurator.loadAll())
    })

    router.post('/config', async (req, res) => {
      const { agents, lang, mode } = req.body
      await configurator.saveAll({ agents, lang, mode })
      config = await configurator.loadAll()
      setService()
      res.sendStatus(200)
    })
  }
}
