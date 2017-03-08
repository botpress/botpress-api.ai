# botpress-api.ai
The easiest way to create an API.AI bot with Botpress

When your bot receives messages, Botpress will make a request to API.AI and return the NLP content in `event.nlp` object. It could be done with *Default Mode*.

## Getting started

```
botpress install api.ai
```

The API.AI module should now be available in your bot UI

## Features

This module has two modes: **Default** (amend incoming events) and **Fulfillment** (respond automatically).

### Default Mode

This mode will inject understanding metadata inside incoming messages through the API.AI middleware.

Events will have an `nlp` property populated with the extracted metadata from API.AI.

**Tip:** Use this mode if you want to handle the conversation flow yourself and only want to extract entities from incoming text. This is great for programmers.

```js
bp.hear({'nlp.action': 'smalltalk.person'}, (event, next) => {
  bp.messenger.sendText(event.user.id, 'My name is James')
})
```

### Fulfillment Mode

This mode will check if there's an available response in the `fulfillment` property of the API.AI response and respond automatically. No code required.

**Note:** Works only with single-response text. We do not support Cards and quick responses.

**Tip:** This is great for non-programmers or if all your conversation logic is hosted on API.AI.

## Community

Pull requests are welcomed! We believe that it takes all of us to create something big and impactful.

There's a [Slack community](https://slack.botpress.io) where you are welcome to join us, ask any question and even help others.

Get an invite and join us now! 👉[https://slack.botpress.io](https://slack.botpress.io)

## License

botpress-api.ai is licensed under [AGPL-3.0](/LICENSE)
