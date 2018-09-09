import prettier from 'prettier/standalone'
import parserBabylon from 'prettier/parser-babylon'
import parserVue from 'prettier/parser-vue'
import parserPostcss from 'prettier/parser-postcss'
import parserTypescript from 'prettier/parser-typescript'

const prettierPlugins = [parserBabylon, parserVue, parserPostcss, parserTypescript]

const formatterScripts = (parser, content) => prettier.format(content, {
  parser,
  plugins: prettierPlugins
})

self.onmessage = function (event) {
  const { data = {}} = event
  if (data._eventKey === '__prettier__') {
    const { _token, parser, content } = data;
    let newContent = ''
    try {
      newContent = formatterScripts(parser, content)
    } catch(e) {
      console.error
    }
    console.log('__worker__postMessage')
    self.postMessage({
      _token,
      _eventKey: data._eventKey,
      content: newContent
    })
  }
}
