import React from 'react'
import _ from 'lodash'

import {
  Panel,
  Grid,
  Row,
  Col,
  ControlLabel,
  FormGroup,
  FormControl,
  Alert,
  Button,
  Glyphicon,
  ListGroup,
  ListGroupItem
} from 'react-bootstrap'

import Markdown from 'react-markdown'
import style from './style.scss'

const supportedLanguages = {
  'pt-BR': "Brazilian Portuguese",
  'zh-HK': "Chinese (Cantonese)",
  'zh-CN': "Chinese (Simplified)",
  'zh-TW': "Chinese (Traditional)",
  'en': "English",
  'en-AU': "English (Australian)",
  'en-CA': "English (Canadian)",
  'en-GB': "English (Great Britain)",
  'en-US': "English (United States)",
  'nl': "Dutch",
  'fr': "French",
  'fr-FR': "French (French)",
  'fr-CA': "French (Canadian)",
  'de': "German",
  'it': "Italian",
  'ja': "Japanese",
  'ko': "Korean",
  'pt': "Portuguese",
  'ru': "Russian",
  'es': "Spanish",
  'uk': "Ukrainian"
}

const documentation = {
  languages: `
  ### Multi-Language Agent
  
  You can specify different agents and the languages they support.  
  For each agent you need to specify a name (doesn't need to correspond to api.ai agent name), the client access token of the agent, and the languages it support based on [api.ai reference](https://api.ai/docs/reference/language) seperated by commas (eg: fr,en,it).

  This module will try to query the agent that support the locale of the user based on \`event.user.locale\`.  
  If no agent contains the locale, it will look for the root language (eg: en instead of en-GB) otherwise the fallback language setting is used.
  
  For more information, see "[Multi-language Agents](https://api.ai/docs/multi-language)" on api.ai.
  `
  ,
  default: `
  ### Mode Default

  This mode will inject understanding metadata inside incoming messages through the API.AI middleware.

  Events will have an \`nlp\` property populated with the extracted metadata from API.AI.

  **Tip:** Use this mode if you want to handle the conversation flow yourself and only want to extract entities from incoming text. This is great for programmers.

  \`\`\`js
  bp.hear({'nlp.action': 'smalltalk.person'}, (event, next) => {
    bp.messenger.sendText(event.user.id, 'My name is James')
  })
  \`\`\`
  `
  ,
  fulfillment: `### Mode Fulfillment

  This mode will check if there's an available response in the \`fulfillment\` property of the API.AI response and respond automatically. No code required.

  **Note:** Works only with single-response text. We do not support Cards and quick responses.

  **Tip:** This is great for non-programmers or if all your conversation logic is hosted on API.AI.
  `
}

export default class ApiModule extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      message: null,
      initialStateHash: null
    }

    this.renderAgent = this.renderAgent.bind(this)
    this.renderRadioButton = this.renderRadioButton.bind(this)
    this.renderLanguage = this.renderLanguage.bind(this)

    this.handleAddToAgentList = this.handleAddToAgentList.bind(this)
    this.handleRemoveFromAgentList = this.handleRemoveFromAgentList.bind(this)
    this.handleSaveChanges = this.handleSaveChanges.bind(this)
    this.handleRadioChange = this.handleRadioChange.bind(this)
    this.handleLanguageChange = this.handleLanguageChange.bind(this)
  }

  getStateHash() {
    return this.state.agents + ' ' + this.state.lang + ' ' + this.state.mode
  }

  getAxios() {
    return this.props.bp.axios
  }

  componentDidMount() {
    this.getAxios().get('/api/botpress-apiai/config')
    .then((res) => {
      this.setState({
        loading: false,
        ...res.data
      })

      setImmediate(() => {
        this.setState({
          initialStateHash: this.getStateHash()
        })
      })
    })
  }
  
  handleAddToAgentList() {
    const name = ReactDOM.findDOMNode(this.newAgentName)
    const clientToken = ReactDOM.findDOMNode(this.newAgentClientToken)
    const langs = ReactDOM.findDOMNode(this.newAgentLangs)
    const item = {
      name: name && name.value,
      clientToken: clientToken && clientToken.value,
      langs: langs && langs.value.replace(/\s/g,'').split(',')
    }

    let errors = []
    if (_.some(_.values(item), _.isEmpty)) {
      errors.push("Fields can not be empty")
    }
    if (_.some(item.langs, v => !(v in supportedLanguages))) {
      errors.push("A locale is not a supported language")
    }
    if (_.some(_.map(this.state.agents, 'langs'), a => _.some(a, v => item.langs.includes(v)))) {
      errors.push("A language can only be part of one agent")
    }
    if (_.map(this.state.agents, 'clientToken').includes(item.clientToken)) {
      errors.push("A client token must be unique")
    }
    if (errors.length > 0) {
      this.setState({
        message: {
          type: 'danger',
          text: errors.join("; ")
        }
      })
      return
    }
    
    this.setState({
      agents: _.concat(this.state.agents, item)
    })

    name.value = ''
    clientToken.value = ''
    lang.value = ''
  }

  handleRemoveFromAgentList(value) {
    this.setState({
      agents: _.without(this.state.agents, value)
    })
  }

  handleRadioChange(event) {
    this.setState({
      mode: event.target.value
    })
  }

  handleLanguageChange(event) {
    if (_.some(_.map(this.state.agents, 'langs'), a => a.includes(event.target.value))) {
      this.setState({
        lang: event.target.value
      })
    } else {
      this.setState({
        message: {
          type: 'danger',
          text: "The fallback language " + event.target.key + " is not present in any agents"
        }
      })
    }
  }

  handleSaveChanges() {
    this.setState({ loading:true })

    return this.getAxios().post('/api/botpress-apiai/config', {
      agents: this.state.agents,
      lang: this.state.lang,
      mode: this.state.mode
    })
    .then(() => {
      this.setState({
        loading: false,
        initialStateHash: this.getStateHash()
      })
    })
    .catch((err) => {
      this.setState({
        message: {
          type: 'danger',
          text: 'An error occured during you were trying to save configuration: ' + err.response.data.message
        },
        loading: false,
        initialStateHash: this.getStateHash()
      })
    })
  }
  
  renderAgent(item) {
    const handleRemove = () => this.handleRemoveFromAgentList(item)
    return <ListGroupItem key={item.name}>
        {item.name + ' | ' + item.clientToken + ' | ' + item.langs.join(', ')}
        <Glyphicon
          className="pull-right"
          glyph="remove"
          onClick={handleRemove} />
      </ListGroupItem>
  }
  
  renderAgentList() {
    return (
      <Row>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={3}>
            Agents
          </Col>
          <Col sm={8}>
            <div>
              <FormGroup>
                <Col>
                  <ControlLabel>Current agents:</ControlLabel>
                  <ListGroup>
                    {this.state.agents.map(this.renderAgent)}
                  </ListGroup>
                </Col>
              </FormGroup>
              <FormGroup>
                <Col>
                  <ControlLabel>Add a new agent:</ControlLabel>
                  <FormControl ref={r => this.newAgentName = r} type="text" placeholder="name"/>
                  <FormControl ref={r => this.newAgentClientToken = r} type="text" placeholder="client access token"/>
                  <FormControl ref={r => this.newAgentLangs = r} type="text" placeholder="en,fr"/>
                  <Button className='bp-button' onClick={() => this.handleAddToAgentList()}>
                    Add
                  </Button>
                </Col>
              </FormGroup>
            </div>
          </Col>
        </FormGroup>
      </Row>
    )
  }

  renderRadioButton(label, key, props) {
    return (
      <span className={style.radio} key={key}>
        <label>
          <input type="radio" value={key}
            checked={this.state.mode === key}
            onChange={this.handleRadioChange} />

          <span className={style.radioText}>{label}</span>
        </label>
      </span>
    )
  }

  renderMode() {
    return (
      <Row>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={3}>
            Mode
          </Col>
          <Col sm={8}>
            {this.renderRadioButton('Default', 'default')}
            {this.renderRadioButton('Fulfillment', 'fulfillment')}
          </Col>
        </FormGroup>
      </Row>
    )
  }

  renderLanguageOption(value, key) {
    return <option key={key} value={key}>{value}</option>
  }

  renderLanguage() {
    const langs = _.flatten(_.map(this.state.agents, 'langs'))
    let availableLanguages = {}
    for (const lang of langs) {
      availableLanguages[lang] = supportedLanguages[lang]
    }
    const supportedLanguageOptions = _.mapValues(availableLanguages, this.renderLanguageOption)

    return (
      <Row>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={3}>
            Fallback Language
          </Col>
          <Col sm={8}>
            <FormControl value={this.state.lang} componentClass="select" onChange={this.handleLanguageChange}>
              {_.map(supportedLanguageOptions)}
            </FormControl>
          </Col>
        </FormGroup>
      </Row>
    )
  }

  renderExplication() {
    return (
      <Row className={style.explication}>
        <Col sm={12}>
          <Markdown source={documentation.languages} />
          <Markdown source={documentation[this.state.mode]} />
        </Col>
      </Row>
    )
  }

  renderMessageAlert() {
    return this.state.message
      ? <Alert bsStyle={this.state.message.type}>{this.state.message.text}</Alert>
      : null
  }

  renderSaveButton() {
    const opacityStyle = (this.state.initialStateHash && this.state.initialStateHash !== this.getStateHash())
      ? {opacity:1}
      : {opacity:0}

    return <Button className={style.saveButton} style={opacityStyle} bsStyle="success" onClick={this.handleSaveChanges}>Save</Button>
  }

  render() {
    if (this.state.loading) {
      return <h4>Module is loading...</h4>
    }

    return (
      <Grid className={style.api}>
        <Row>
          <Col md={8} mdOffset={2}>
            {this.renderMessageAlert()}
            <Panel className={style.panel} header="Settings">
              {this.renderSaveButton()}
              <div className={style.settings}>
                {this.renderAgentList()}
                {this.renderLanguage()}
                {this.renderMode()}
              </div>
            </Panel>
            <Panel header="Documentation">
              {this.renderExplication()}
            </Panel>
          </Col>
        </Row>
      </Grid>
    )
  }
}
